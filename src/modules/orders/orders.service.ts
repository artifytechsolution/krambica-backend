import { injectable } from '../../services/di-container';
import { IService } from '../../interfaces/service.interface';
import { ILoggerService } from '../../services/logger.service';
import { IOrdersService } from '../../interfaces/orders-service.interface';
import { Order } from './orders.types';
import { InvalidInputError } from '../../utils/error.utils';
import { executePrismaOperation, PrismaOperationType } from '../../utils/prisma.utils';
import { IDatabaseService } from '../../interfaces/database-service.interface';
import { IConfigService } from '../../services/config.service';
import { IAuthService } from '../../interfaces/auth-service.interface';
import { IProductsService } from '../../interfaces/products-service.interface';
import { stockNamespace } from '../../main';

@injectable()
export class OrdersService implements IService, IOrdersService {
  static dependencies = [
    'LoggerService',
    'DatabaseService',
    'ConfigService',
    'AuthService',
    'ProductsService',
  ];
  static optionalDependencies: string[] = [];
  private orders: Order[] = [
    { id: 1, name: 'Sample Order 1', createdAt: new Date().toISOString() },
    { id: 2, name: 'Sample Order 2', createdAt: new Date().toISOString() },
  ];
  private logger: ILoggerService;
  private db: IDatabaseService;
  private config: IConfigService;
  private auth;
  private product;

  constructor(
    logger: ILoggerService,
    db: IDatabaseService,
    config: IConfigService,
    auth: IAuthService,
    product: IProductsService,
  ) {
    this.logger = logger;
    this.logger.info('OrdersService instantiated');
    this.db = db;
    this.config = config;
    this.auth = auth;
    this.product = product;
  }

  async initialize() {
    this.logger.info('OrdersService initialized with in-memory data');
  }

  async getAll(): Promise<any> {
    try {
      const findOrder = await executePrismaOperation(
        'Order',
        {
          operation: PrismaOperationType.READ,
        },
        this.db.client,
        this.logger,
      );
      return findOrder;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async getById(id: any): Promise<any> {
    try {
      const findOrder = await executePrismaOperation(
        'Order',
        {
          operation: PrismaOperationType.READ_UNIQUE,
          where: parseInt(id) ? { order_id: parseInt(id) } : { id: id },
        },
        this.db.client,
        this.logger,
      );
      if (!findOrder.data) {
        throw new InvalidInputError('order is not exist');
      }
      return findOrder;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async create(data: any): Promise<any> {
    try {
      //user is avilable
      const user = await this.auth.getById(data.user_id);
      const { items, ...newdata } = data;
      console.log('data is comming for order creation ----------');
      console.log(data);

      await this.checkQuantity(items);
      console.log('checkQuantity completed successfully, proceeding to create order.');
      console.log('cupon id is ------------------', data.coupon_id);

      //create order
      let coupon;
      if (data.coupon_id != null && data.coupon_id != undefined) {
        coupon = await this.db.client.coupon.findUnique({
          where: {
            id: data.coupon_id,
          },
        });
        console.log('cupon details are ------------------', coupon);
        if (!coupon) {
          throw new InvalidInputError('Cupon is not valid');
        }
      }

      const createOrder = await executePrismaOperation(
        'Order',
        {
          operation: PrismaOperationType.CREATE,
          data: {
            ...newdata,
            coupon_id: coupon?.coupon_id ?? null,
            user_id: user.user_id,
          },
        },
        this.db.client,
        this.logger,
      );

      console.log('order createdd sucessfully --------------');
      console.log(createOrder);
      try {
        await Promise.all(
          items.map(async (item: any) => {
            await this.createOrderItem({
              ...item,
              order_id: createOrder.data.id,
            });
          }),
        );
      } catch (e: any) {
        throw new InvalidInputError(`Failed to create order item: ${e?.message}`);
      }

      return createOrder;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async update(
    id: number,
    data: Partial<Omit<Order, 'id' | 'createdAt'>>,
  ): Promise<Order | undefined> {
    const item = this.orders.find((r) => r.id === id);
    if (!item) throw new InvalidInputError('Order not found');
    Object.assign(item, data);
    return item;
  }

  async delete(id: number): Promise<boolean> {
    const index = this.orders.findIndex((r) => r.id === id);
    if (index === -1) throw new InvalidInputError('Order not found');
    this.orders.splice(index, 1);
    return true;
  }

  async createOrderItem(data: any) {
    try {
      // Check order existence
      console.log('order data is commmmmmmingggggggggggg..........', data);
      const orderExist = await this.getById(data.order_id);
      if (!orderExist?.data) {
        throw new InvalidInputError('Order not found');
      }

      // Check product existence
      const productExist: any = await this.product.getById(data.product_id);
      if (!productExist?.data) {
        throw new InvalidInputError('Product not found');
      }

      // Check variant existence
      const variantExist = await this.product.getProductVariantById(data.variant_id);
      if (!variantExist?.data) {
        throw new InvalidInputError('Variant not found');
      }

      // If all exist, create order item
      const createItems = await executePrismaOperation(
        'OrderItem',
        {
          operation: PrismaOperationType.CREATE,
          data: {
            ...data,
            order_id: orderExist.data.order_id,
            product_id: productExist.data.product_id,
            variant_id: variantExist.data.variant_id,
          },
        },
        this.db.client,
        this.logger,
      );

      return createItems;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async checkQuantity(data: { product_id: string; variant_id: string; quantity: number }[]) {
    console.log('🟢 Incoming data -----------------');
    console.log(data);

    const productIds = data.map((item) => item.product_id);
    const variantIds = data.map((item) => item.variant_id);

    console.log('🟢 Variant IDs:', variantIds);

    try {
      await this.db.client.$transaction(async (tx: any) => {
        // ✅ Find products
        const products = await tx.product.findMany({
          where: {
            id: {
              in: productIds,
            },
          },
        });

        console.log('✅ Products found:', products);
        if (!products || products.length === 0) {
          throw new Error('Products are not available');
        }

        // ✅ Find variants
        const variants = await tx.ProductVariant.findMany({
          where: {
            id: {
              in: variantIds,
            },
          },
        });

        console.log('✅ Variants found:', variants);
        if (!variants || variants.length === 0) {
          throw new Error('Variants are not available');
        }

        // ✅ Check each variant quantity and update stock
        for (const item of data) {
          const variant = variants.find((v: any) => v.id === item.variant_id);
          if (!variant) {
            throw new Error(`Variant ${item.variant_id} not found`);
          }

          if (variant.available_quantity < item.quantity) {
            throw new Error(
              `Variant ${variant.id} does not have enough stock. Available: ${variant.available_quantity}, requested: ${item.quantity}`,
            );
          }

          // ✅ Decrement variant stock
          const updatedVariant = await tx.ProductVariant.update({
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
            where: {
              id: item.variant_id,
            },
          });

          // ✅ Decrement product stock
          await tx.product.update({
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
            where: {
              id: item.product_id,
            },
          });

          console.log(
            `✅ Stock decremented for variant ${variant.id} and product ${item.product_id}`,
          );

          // ✅ Send low stock notification
          if (updatedVariant.stock < 100) {
            stockNamespace.emit('stockUpdate', {
              product_id: item.product_id,
              variant_id: item.variant_id,
              available: updatedVariant.available_quantity,
              message: `Only ${updatedVariant.available_quantity} left!`,
            });

            console.log(
              `⚠️ Low stock event emitted for variant ${variant.id}: Only ${updatedVariant.available_quantity} left`,
            );
          }
        }

        console.log('✅ All stock checks and updates completed successfully');
      });
    } catch (error: any) {
      console.error('❌ Error during stock check and update:', error.message);
      throw new Error(`Failed to check or update stock: ${error.message}`);
    }
  }

  async stockAvilable(data: any) {}
}
