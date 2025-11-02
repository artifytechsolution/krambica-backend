import { injectable } from '../../services/di-container';
import { IService } from '../../interfaces/service.interface';
import { ILoggerService } from '../../services/logger.service';
import { IOrdersService } from '../../interfaces/orders-service.interface';
import { IDatabaseService } from '../../interfaces/database-service.interface';
import { IConfigService } from '../../services/config.service';
import { IAuthService } from '../../interfaces/auth-service.interface';
import { IProductsService } from '../../interfaces/products-service.interface';
import { OrderStatus, PaymentStatus } from '../../generated/prisma';
import {
  Order,
  OrderItem,
  CreateOrderDTO,
  UpdateOrderDTO,
  OrderStats,
  OrderWithDetails,
  OrderTrackingInfo,
  PaginatedOrderResponse,
} from './orders.types';
import { executePrismaOperation, PrismaOperationType } from '../../utils/prisma.utils';
import { buildPrismaQuery, parseQueryParams } from '../../utils/prisma-query-builder';
import { stockNamespace } from '../../main';
import { ICouponService } from '../../interfaces/ICouponService.interface';
import { InvalidInputError } from '../../utils/error.utils';

@injectable()
export class OrdersService implements IService, IOrdersService {
  static dependencies = [
    'LoggerService',
    'DatabaseService',
    'ConfigService',
    'AuthService',
    'ProductsService',
    'CuponService',
  ];
  static optionalDependencies: string[] = [];

  private logger: ILoggerService;
  private db: IDatabaseService;
  private config: IConfigService;
  private auth: IAuthService;
  private product: IProductsService;
  private Cupon: ICouponService;

  constructor(
    logger: ILoggerService,
    db: IDatabaseService,
    config: IConfigService,
    auth: IAuthService,
    product: IProductsService,
    CuponService: ICouponService,
  ) {
    this.logger = logger;
    this.db = db;
    this.config = config;
    this.auth = auth;
    this.product = product;
    this.Cupon = CuponService;

    console.log('✅ OrdersService instantiated');
  }

  async initialize() {
    console.log('✅ OrdersService initialized');
  }

  // Configuration
  private readonly CONFIG = {
    TAX_RATE: 0.18,
    FREE_SHIPPING_THRESHOLD: 500,
    SHIPPING_COST: 50,
    ESTIMATED_DELIVERY_DAYS: 5,
    LOW_STOCK_THRESHOLD: 10,
  };

  private readonly INCLUDE_RELATIONS = {
    user: {
      select: {
        user_id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
      },
    },
    shippingAddress: true,
    items: {
      include: {
        product: {
          select: {
            product_id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        variant: {
          select: {
            variant_id: true,
            size: true,
            color: true,
            price: true,
            stock: true,
            sku: true,
          },
        },
      },
    },
  };

  // Helpers
  private calculateOrderTotals(totalAmount: number, discount: number = 0) {
    const discountedAmount = totalAmount - discount;
    const tax = discountedAmount * this.CONFIG.TAX_RATE;
    const shippingCost =
      discountedAmount >= this.CONFIG.FREE_SHIPPING_THRESHOLD ? 0 : this.CONFIG.SHIPPING_COST;
    const grandTotal = discountedAmount + tax + shippingCost;

    console.log('💰 Calculated order totals', {
      totalAmount: discountedAmount,
      discount,
      tax,
      shippingCost,
      grandTotal,
    });

    return {
      totalAmount: parseFloat(discountedAmount.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      shippingCost,
      grandTotal: parseFloat(grandTotal.toFixed(2)),
    };
  }

  private async reserveStock(
    items: Array<{ product_id: string; variant_id: string; quantity: number }>,
  ): Promise<void> {
    console.log('🟢 Reserving stock for pending order', { itemsCount: items.length });

    const productIds = items.map((item) => item.product_id);
    console.log('product id is comming');
    console.log(productIds);
    const variantIds = items.map((item) => item.variant_id);
    console.log('variants id is comming----->');
    console.log(variantIds);

    const products = await this.db.client.Product.findMany({
      where: { id: { in: productIds } },
    });
    console.log(products);

    await this.db.client.$transaction(async (tx: any) => {
      console.log('iniside tx function------->');
      const products = await tx.Product.findMany({
        where: { id: { in: productIds } },
      });
      console.log('product is of data =========>>');
      console.log(products);
      if (products.length !== productIds.length) {
        console.error('❌ Some products not found', {
          expected: productIds.length,
          found: products.length,
        });
        throw new Error('Some products not found');
      }

      const variants = await tx.ProductSizeVariant.findMany({
        where: { id: { in: variantIds } },
      });
      console.log('variants=======>>>');
      console.log(variants);

      if (variants.length !== variantIds.length) {
        console.error('❌ Some variants not found', {
          expected: variantIds.length,
          found: variants.length,
        });
        throw new Error('Some variants not found');
      }

      for (const item of items) {
        const variant = variants.find((v: any) => v.id === item.variant_id);

        if (!variant) {
          console.error(`❌ Variant not found`, { variantId: item.variant_id });
          throw new Error(`Variant ${item.variant_id} not found`);
        }

        if (!variant.isAvailable) {
          console.warn(`⚠️ Variant is not available`, { variantId: variant.id });
          throw new Error(`Variant ${variant.id} is not available`);
        }

        if (variant.available_quantity < item.quantity) {
          console.warn('⚠️ Insufficient stock', {
            variantId: variant.id,
            available: variant.available_quantity,
            requested: item.quantity,
          });
          throw new Error(
            `Insufficient stock for variant ${variant.id}. Available: ${variant.available_quantity}, Requested: ${item.quantity}`,
          );
        }

        const updatedVariant = await tx.ProductSizeVariant.update({
          where: { id: item.variant_id },
          data: {
            reservedStock: { increment: item.quantity },
            availableStock: { decrement: item.quantity },
          },
        });
        console.log('updated variant -------<>');
        console.log(updatedVariant);

        console.log(`✅ Reserved stock for variant`, {
          variantId: item.variant_id,
          quantity: item.quantity,
          newAvailable: updatedVariant.availableStock,
        });

        if (updatedVariant.availableStock < this.CONFIG.LOW_STOCK_THRESHOLD) {
          stockNamespace.emit('stockUpdate', {
            product_id: item.product_id,
            variant_id: item.variant_id,
            available: updatedVariant.available_quantity,
            message: `⚠️ Low stock: Only ${updatedVariant.available_quantity} left!`,
          });
          console.warn('⚠️ Low stock alert emitted', {
            variantId: item.variant_id,
            available: updatedVariant.available_quantity,
          });
        }
      }
    });

    console.log('✅ Stock reservation completed successfully');
  }

  private async deductReservedStock(items: OrderItem[]): Promise<void> {
    console.log('🟢 Deducting reserved stock for confirmed order', {
      itemsCount: items.length,
    });

    await this.db.client.$transaction(async (tx: any) => {
      for (const item of items) {
        await tx.ProductVariant.update({
          where: { id: item.variant_id },
          data: {
            stock: { decrement: item.quantity },
            reserved_stock: { decrement: item.quantity },
          },
        });

        await tx.product.update({
          where: { id: item.product_id },
          data: { stock: { decrement: item.quantity } },
        });

        console.log(`✅ Deducted reserved stock`, {
          variantId: item.variant_id,
          quantity: item.quantity,
        });
      }
    });

    console.log('✅ Stock deduction completed successfully');
  }

  private async releaseReservedStock(items: OrderItem[]): Promise<void> {
    console.log('🔄 Releasing reserved stock for cancelled order', {
      itemsCount: items.length,
    });

    await this.db.client.$transaction(async (tx: any) => {
      for (const item of items) {
        await tx.ProductVariant.update({
          where: { id: item.variant_id },
          data: {
            reserved_stock: { decrement: item.quantity },
            available_quantity: { increment: item.quantity },
          },
        });

        console.log(`✅ Released reserved stock`, {
          variantId: item.variant_id,
          quantity: item.quantity,
        });
      }
    });

    console.log('✅ Stock release completed successfully');
  }

  private async restoreSoldStock(items: OrderItem[]): Promise<void> {
    console.log('🔄 Restoring sold stock for cancelled order', {
      itemsCount: items.length,
    });

    await this.db.client.$transaction(async (tx: any) => {
      for (const item of items) {
        await tx.ProductVariant.update({
          where: { id: item.variant_id },
          data: {
            stock: { increment: item.quantity },
            available_quantity: { increment: item.quantity },
          },
        });

        await tx.product.update({
          where: { id: item.product_id },
          data: { stock: { increment: item.quantity } },
        });

        console.log(`✅ Restored sold stock`, {
          variantId: item.variant_id,
          quantity: item.quantity,
        });
      }
    });

    console.log('✅ Stock restoration completed successfully');
  }

  private async validateUser(userId: number): Promise<any> {
    console.log('🔍 Validating user', { userId });

    const user = await this.db.client.user.findUnique({
      where: { user_id: userId },
    });

    if (!user) {
      console.error(`❌ User not found`, { userId });
      throw new Error(`User ${userId} not found`);
    }

    console.log(`✅ User validated`, { userId });
    return user;
  }

  private async validateAddress(addressId: number, userId: number): Promise<any> {
    console.log('🔍 Validating address', { addressId, userId });

    const address = await this.db.client.address.findUnique({
      where: { address_id: addressId },
    });

    if (!address) {
      console.error(`❌ Address not found`, { addressId });
      throw new Error(`Address ${addressId} not found`);
    }

    if (address.user_id !== userId) {
      console.error('❌ Address does not belong to user', { addressId, userId });
      throw new Error('Address does not belong to user');
    }

    console.log(`✅ Address validated`, { addressId });
    return address;
  }

  private validateOrderItems(items: any[]): void {
    console.log('🔍 Validating order items', { itemsCount: items.length });

    if (!items || items.length === 0) {
      console.error('❌ Order must contain at least one item');
      throw new Error('Order must contain at least one item');
    }

    for (const item of items) {
      if (!item.product_id || !item.variant_id) {
        console.error('❌ Invalid item structure', { item });
        throw new Error('Each item must have product_id and variant_id');
      }

      if (!item.quantity || item.quantity <= 0) {
        console.error('❌ Invalid quantity', { item });
        throw new Error('Each item must have quantity > 0');
      }
    }

    console.log('✅ Order items validated');
  }

  private async calculateItemsTotalAmount(items: any[]): Promise<number> {
    console.log('💰 Calculating items total amount', { itemsCount: items.length });

    let totalAmount = 0;

    for (const item of items) {
      const variantExist = await this.product.getProductVariantById(item.variant_id);
      console.log('product variant is exist------->');
      console.log(variantExist);

      if (variantExist?.length <= 0) {
        console.error(`❌ Variant not found`, { variantId: item.variant_id });
        throw new Error(`Variant ${item.variant_id} not found`);
      }

      totalAmount += variantExist[0].price * item.quantity;
    }

    console.log('✅ Total amount calculated', { totalAmount });
    return totalAmount;
  }

  private async createOrderItems(orderId: string, orderIdNum: number, items: any[]): Promise<void> {
    console.log('📦 Creating order items', { orderId, itemsCount: items.length });

    const itemPromises = items.map(async (item: any) => {
      const productExist: any = await this.product.getById(item.product_id);
      console.log('product is commingggg----->');
      console.log(productExist);
      if (!productExist?.data) {
        console.error(`❌ Product not found`, { productId: item.product_id });
        throw new Error(`Product ${item.product_id} not found`);
      }

      const variantExist = await this.product.getProductVariantById(item.variant_id);
      console.log('createOrderItems variant id -------->>');
      console.log(variantExist);
      if (variantExist.length <= 0) {
        console.error(`❌ Variant not found`, { variantId: item.variant_id });
        throw new Error(`Variant ${item.variant_id} not found`);
      }

      return executePrismaOperation(
        'OrderItem',
        {
          operation: PrismaOperationType.CREATE,
          data: {
            order_id: orderIdNum,
            product_size_var_id: variantExist[0].product_size_var_id,
            quantity: item.quantity,
            price: variantExist[0].price,
            total: parseFloat((variantExist[0].price * item.quantity).toFixed(2)),
          },
        },
        this.db.client,
        this.logger,
      );
    });

    await Promise.all(itemPromises);
    console.log('✅ Order items created successfully');
  }

  private buildOrderTimeline(order: any): any[] {
    return [
      {
        status: OrderStatus.PENDING,
        date: order.placedAt,
        completed: true,
        description: '🛒 Order placed',
      },
      {
        status: OrderStatus.CONFIRMED,
        date: order.status !== OrderStatus.PENDING ? order.updatedAt : null,
        completed: ![OrderStatus.PENDING, OrderStatus.CANCELLED].includes(order.status),
        description: '✅ Order confirmed',
      },
      {
        status: OrderStatus.SHIPPED,
        date: [OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(order.status)
          ? order.updatedAt
          : null,
        completed: [OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(order.status),
        description: '🚚 Order shipped',
      },
      {
        status: OrderStatus.DELIVERED,
        date: order.deliveredAt,
        completed: order.status === OrderStatus.DELIVERED,
        description: '📦 Order delivered',
      },
    ];
  }

  // GET ALL
  async getAll(queryParams: any): Promise<any> {
    try {
      const allowedFields: Record<string, 'string' | 'int' | 'float' | 'enum' | 'datetime'> = {
        order_id: 'int',
        user_id: 'int',
        status: 'enum',
        paymentStatus: 'enum',
        paymentMethod: 'enum',
        shippingMethod: 'enum',
        totalAmount: 'float',
        grandTotal: 'float',
        discount: 'float',
        tax: 'float',
        shippingCost: 'float',
        placedAt: 'datetime',
        deliveredAt: 'datetime',
        cancelledAt: 'datetime',
        createdAt: 'datetime',
        updatedAt: 'datetime',
        'user.name': 'string',
        'user.email': 'string',
        'user.phone': 'string',
        'shippingAddress.fullName': 'string',
        'shippingAddress.city': 'string',
        'shippingAddress.state': 'string',
        'shippingAddress.zipCode': 'string',
      };

      const combineSearchGroups: string[][] = [
        ['user.name', 'shippingAddress.city'],
        ['user.email', 'user.phone'],
      ];

      const { filters, page, limit, globalSearch } = parseQueryParams(queryParams);

      const { where, orderBy, skip, take } = buildPrismaQuery(
        filters,
        allowedFields,
        page,
        limit,
        globalSearch,
        combineSearchGroups,
      );

      console.log('🔍 Fetching orders', { page, limit, globalSearch });

      const [orders, total] = await Promise.all([
        this.db.client.order.findMany({
          where,
          skip,
          take,
          orderBy,
        }),
        this.db.client.order.count({ where }),
      ]);

      console.log(`✅ Retrieved ${orders.length} orders out of ${total} total`);

      return {
        data: orders as any,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
        filters: {
          applied: filters,
          search: globalSearch,
        },
      };
    } catch (error: any) {
      console.error('❌ Error fetching orders', { error: error.message });
      throw new Error(error.message);
    }
  }

  // GET BY ID
  async getById(id: any): Promise<OrderWithDetails> {
    try {
      console.log('🔍 Fetching order by ID', { orderId: id });

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
        console.error(`❌ Order not found`, { orderId: id });
        throw new Error(`Order ${id} not found`);
      }

      console.log(`✅ Order retrieved`, { orderId: id });
      return findOrder.data;
    } catch (error: any) {
      console.error('❌ Error fetching order', { orderId: id, error: error.message });
      throw new Error(error.message);
    }
  }

  // CREATE
  //   async create(data: any): Promise<Order> {
  //     try {
  //       console.log('🟢 Creating new order', {
  //         userId: data.user_id,
  //         itemsCount: data.items.length,
  //         discount: data.discount || 0,
  //       });

  //       const user = await this.validateUser(data.user_id);
  //       const address = await this.validateAddress(data.address_id, data.user_id);
  //       this.validateOrderItems(data.items);

  //       await this.reserveStock(data.items);

  //       const totalAmount = await this.calculateItemsTotalAmount(data.items);

  //       const discount = data.discount || 0;

  //       const totals = this.calculateOrderTotals(totalAmount, discount);

  //       const { items, ...orderData } = data;
  //       const createOrder = await executePrismaOperation(
  //         'Order',
  //         {
  //           operation: PrismaOperationType.CREATE,
  //           data: {
  //             ...orderData,
  //             user_id: user.user_id,
  //             totalAmount: totals.totalAmount,
  //             discount: discount,
  //             tax: totals.tax,
  //             shippingCost: totals.shippingCost,
  //             grandTotal: totals.grandTotal,
  //             status: OrderStatus.PENDING,
  //             paymentStatus: PaymentStatus.UNPAID,
  //             placedAt: new Date(),
  //           },
  //         },
  //         this.db.client,
  //         this.logger,
  //       );

  //       await this.createOrderItems(createOrder.data.id, createOrder.data.order_id, items);

  //       const completeOrder = await this.getById(createOrder.data.id);

  //       console.log(
  //         `✅ Order #${createOrder.data.order_id} created successfully with reserved stock`,
  //       );

  //       return completeOrder as any;
  //     } catch (error: any) {
  //       console.error('❌ Error creating order', { error: error.message });
  //       throw new Error(error.message);
  //     }
  //   }

  //old and latest create code beafore implement promotion

  //   async create(data: any): Promise<Order> {
  //     try {
  //       console.log('🟢 Creating new order', {
  //         userId: data.user_id,
  //         itemsCount: data.items.length,
  //         discount: data.discount || 0,
  //         couponCode: data.couponCode || 'None',
  //       });

  //       // Validate user and address
  //       const user = await this.validateUser(data.user_id);
  //       const address = await this.validateAddress(data.address_id, data.user_id);
  //       this.validateOrderItems(data.items);
  //       const couponService = this.Cupon; // Assume injected CouponService
  //       console.log('----->cupon service is comming------>');
  //       //   console.log(await couponService.getById('7fc2938f-cc7e-497a-af7f-996748285b08'));

  //       // Reserve stock for items
  //       await this.reserveStock(data.items);

  //       // Calculate total amount (orderValue)
  //       const totalAmount = await this.calculateItemsTotalAmount(data.items);
  //       console.log(`🟡 Calculated totalAmount (orderValue): ${totalAmount}`);

  //       // Re-verify totalAmount (orderValue)
  //       if (typeof totalAmount !== 'number' || totalAmount < 0) {
  //         throw new Error('Invalid order value');
  //       }

  //       let discount = data.discount || 0;
  //       let couponRedemption = null;

  //       // Handle coupon if provided
  //       if (data.couponCode) {
  //         console.log(`🟡 Validating coupon: ${data.couponCode}`);

  //         // Verify coupon with CuponService.validate

  //         const user = await this.db.client.user.findUnique({
  //           where: {
  //             user_id: data.user_id,
  //           },
  //         });
  //         console.log('user is comming----->');
  //         console.log(user);
  //         if (!user) {
  //           throw new InvalidInputError('user is not found');
  //         }

  //         const validationResult = await couponService.validate({
  //           code: data.couponCode,
  //           orderValue: totalAmount,
  //           userId: user.id,
  //         });
  //         console.log('🟢 Coupon validation result:', validationResult);

  //         // Apply discount from coupon
  //         discount = validationResult.discountAmount;
  //         console.log(`🟢 Coupon discount applied: ${discount}`);
  //       }
  //       console.log('cuspon code is not coming----->');
  //       // Calculate order totals with verified discount
  //       const totals = this.calculateOrderTotals(totalAmount, discount);
  //       console.log(`🟡 Order totals:`, totals);

  //       // Prepare order data
  //       const { items, couponCode, ...orderData } = data;
  //       const createOrder = await executePrismaOperation(
  //         'Order',
  //         {
  //           operation: PrismaOperationType.CREATE,
  //           data: {
  //             ...orderData,
  //             user_id: user.user_id,
  //             totalAmount: totals.totalAmount,
  //             discount,
  //             tax: totals.tax,
  //             shippingCost: totals.shippingCost,
  //             grandTotal: totals.grandTotal,
  //             status: OrderStatus.PENDING,
  //             paymentStatus: PaymentStatus.UNPAID,
  //             placedAt: new Date(),
  //           },
  //         },
  //         this.db.client,
  //         this.logger,
  //       );

  //       console.log('create order is herere----->');
  //       console.log(createOrder);
  //       // Create order items
  //       await this.createOrderItems(createOrder.data.id, createOrder.data.order_id, items);

  //       // Redeem coupon if provided
  //       if (data.couponCode) {
  //         const user = await this.db.client.user.findUnique({
  //           where: {
  //             user_id: data.user_id,
  //           },
  //         });
  //         console.log('user is comming----->');
  //         console.log(user);
  //         if (!user) {
  //           throw new InvalidInputError('user is not found');
  //         }
  //         console.log(`🟡 Redeeming coupon: ${data.couponCode}`);
  //         couponRedemption = await couponService.redeem({
  //           code: data.couponCode,
  //           orderValue: totalAmount,
  //           userId: user.id,
  //           orderId: createOrder.data.order_id,
  //         });
  //         console.log('🟢 Coupon redemption result:', couponRedemption);
  //       }

  //       // Fetch complete order
  //       const completeOrder = await this.getById(createOrder.data.order_id);

  //       console.log(
  //         `✅ Order #${createOrder.data.order_id} created successfully with reserved stock`,
  //         { couponApplied: !!data.couponCode, discount, redemption: couponRedemption },
  //       );

  //       return completeOrder as any;
  //     } catch (error: any) {
  //       console.error('❌ Error creating order', { error: error.message });
  //       throw new Error(error.message);
  //     }
  //   }
  //create updated

  async create(data: any): Promise<Order> {
    try {
      console.log('🟢 Creating new order', {
        userId: data.user_id,
        itemsCount: data.items.length,
        discount: data.discount || 0,
        couponCode: data.couponCode || 'None',
      });

      // Validate user and address
      const user = await this.validateUser(data.user_id);
      const address = await this.validateAddress(data.address_id, data.user_id);
      this.validateOrderItems(data.items);
      const couponService = this.Cupon; // Assume injected CouponService
      console.log('----->cupon service is comming------>');

      // Reserve stock for items
      await this.reserveStock(data.items);

      // Calculate total amount (orderValue)
      const totalAmount = await this.calculateItemsTotalAmount(data.items);
      console.log(`🟡 Calculated totalAmount (orderValue): ${totalAmount}`);

      if (typeof totalAmount !== 'number' || totalAmount < 0) {
        throw new Error('Invalid order value');
      }

      let discount = data.discount || 0;
      let couponRedemption = null;

      // Handle coupon if provided
      if (data.couponCode) {
        console.log(`🟡 Validating coupon: ${data.couponCode}`);

        const user = await this.db.client.user.findUnique({
          where: { user_id: data.user_id },
        });
        if (!user) {
          throw new InvalidInputError('user is not found');
        }

        const validationResult = await couponService.validate({
          code: data.couponCode,
          orderValue: totalAmount,
          userId: user.id,
        });
        console.log('🟢 Coupon validation result:', validationResult);

        discount = validationResult.discountAmount;
        console.log(`🟢 Coupon discount applied: ${discount}`);
      }

      // Calculate order totals with verified discount
      const totals = this.calculateOrderTotals(totalAmount, discount);
      console.log(`🟡 Order totals:`, totals);

      const { items, couponCode, appliedPromotion, ...orderData } = data; // get appliedPromotion here

      // Create order
      const createOrder = await executePrismaOperation(
        'Order',
        {
          operation: PrismaOperationType.CREATE,
          data: {
            ...orderData,
            user_id: user.user_id,
            totalAmount: totals.totalAmount,
            discount,
            tax: totals.tax,
            shippingCost: totals.shippingCost,
            grandTotal: totals.grandTotal,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.UNPAID,
            placedAt: new Date(),
          },
        },
        this.db.client,
        this.logger,
      );

      console.log('create order is herere----->');
      console.log(createOrder);

      // Create order items
      await this.createOrderItems(createOrder.data.id, createOrder.data.order_id, items);

      // ===== Add Promotion Redemption Handling Here =====

      let promotionRedemption = null;

      if (appliedPromotion && appliedPromotion.promotion_id) {
        // Create promotion redemption record
        promotionRedemption = await this.db.client.promotionRedemption.create({
          data: {
            promotion_id: appliedPromotion.promotion_id,
            order_id: createOrder.data.order_id,
            user_id: user.user_id,
            purchasedQuantity: items.reduce((sum: number, item: any) => sum + item.quantity, 0),
            freeQuantity:
              appliedPromotion.selectedFreeItems?.reduce(
                (sum: number, item: any) => sum + item.quantity,
                0,
              ) || 0,
            appliedAt: new Date(),
          },
        });

        // Create free item records and adjust stock
        for (const freeItem of appliedPromotion.selectedFreeItems || []) {
          await this.db.client.promotionFreeItem.create({
            data: {
              redemption_id: promotionRedemption.promotion_redemption_id,
              product_id: freeItem.product_id,
              size_variant_id: freeItem.size_variant_id,
              quantity: freeItem.quantity,
            },
          });

          // Deduct stock for free item
          await this.db.client.productSizeVariant.update({
            where: { product_size_var_id: freeItem.size_variant_id },
            data: {
              stock: { decrement: freeItem.quantity },
              availableStock: { decrement: freeItem.quantity },
            },
          });

          // Optionally, create inventory log for transparency
          if (this.db.client.sizeVariantInventoryLog) {
            await this.db.client.sizeVariantInventoryLog.create({
              data: {
                product_size_var_id: freeItem.size_variant_id,
                changeType: 'SALE',
                quantityChanged: freeItem.quantity,
                stockBeforeChange: 0, // should be real stock before change if tracked
                stockAfterChange: 0, // should be real stock after change if tracked
                referenceType: 'MANUAL',
                referenceId: promotionRedemption.promotion_redemption_id.toString(),
                changed_by: user.user_id,
                remarks: `Free promotional item from promotion_id: ${appliedPromotion.promotion_id}`,
              },
            });
          }
        }
      }

      // Redeem coupon if present (existing logic)
      if (data.couponCode) {
        const user = await this.db.client.user.findUnique({
          where: { user_id: data.user_id },
        });
        if (!user) {
          throw new InvalidInputError('user is not found');
        }
        console.log(`🟡 Redeeming coupon: ${data.couponCode}`);
        couponRedemption = await couponService.redeem({
          code: data.couponCode,
          orderValue: totalAmount,
          userId: user.id,
          orderId: createOrder.data.order_id,
        });
        console.log('🟢 Coupon redemption result:', couponRedemption);
      }

      // Fetch complete order
      const completeOrder = await this.getById(createOrder.data.order_id);

      console.log(
        `✅ Order #${createOrder.data.order_id} created successfully with reserved stock`,
        { couponApplied: !!data.couponCode, discount, promotionRedemption },
      );

      return completeOrder as any;
    } catch (error: any) {
      console.error('❌ Error creating order', { error: error.message });
      throw new Error(error.message);
    }
  }

  // UPDATE
  async update(id: number, data: UpdateOrderDTO): Promise<Order> {
    try {
      console.log(`🔄 Updating order #${id}`);

      const existingOrder: any = await this.getById(id);

      if (existingOrder.status !== OrderStatus.PENDING) {
        console.warn(`⚠️ Only pending orders can be updated`, {
          orderId: id,
          status: existingOrder.status,
        });
        throw new Error('Only pending orders can be updated');
      }

      if (data.address_id) {
        await this.validateAddress(data.address_id, existingOrder.user_id);
      }

      await executePrismaOperation(
        'Order',
        {
          operation: PrismaOperationType.UPDATE,
          where: { order_id: id },
          data: {
            address_id: data.address_id,
            shippingMethod: data.shippingMethod,
            status: data.status,
            paymentStatus: data.paymentStatus,
          },
        },
        this.db.client,
        this.logger,
      );

      console.log(`✅ Order #${id} updated`);
      return (await this.getById(id)) as any;
    } catch (error: any) {
      console.error(`❌ Error updating order #${id}`, { error: error.message });
      throw new Error(error.message);
    }
  }

  // DELETE // order delete means cancel
  async delete(id: string): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting order #${id}`);

      const order: any = await this.getById(id);

      if ([OrderStatus.DELIVERED, OrderStatus.CANCELLED].includes(order.status)) {
        console.warn(`⚠️ Cannot delete delivered/cancelled orders`, {
          orderId: id,
          status: order.status,
        });
        throw new Error('Cannot delete delivered/cancelled orders');
      }
      console.log('order comming is here123------');
      console.log(order);
      await this.cancelOrder(order.id, 'Order deleted');

      console.log(`✅ Order #${id} deleted`);
      return true;
    } catch (error: any) {
      console.error(`❌ Error deleting order #${id}`, { error: error.message });
      throw new Error(error.message);
    }
  }

  // CONFIRM ORDER
  async confirmOrder(id: string): Promise<Order> {
    try {
      console.log(`✅ Confirming order #${id}`);

      const order: any = await this.getById(id);

      console.log('order is commminggg');
      console.log(order);

      if (order.status !== OrderStatus.PENDING) {
        console.warn(`⚠️ Only pending orders can be confirmed`, {
          orderId: id,
          status: order.status,
        });
        throw new Error('Only pending orders can be confirmed');
      }

      if (order.paymentStatus !== PaymentStatus.PAID) {
        console.warn(`⚠️ Payment must be completed`, {
          orderId: id,
          paymentStatus: order.paymentStatus,
        });
        throw new Error('Payment must be completed');
      }

      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          const variant = await this.db.client.ProductVariant.findUnique({
            where: { id: item.variant_id },
          });

          if (!variant) {
            console.error(`❌ Variant no longer exists`, { variantId: item.variant_id });
            throw new Error(`Variant ${item.variant_id} no longer exists`);
          }

          if (variant.reserved_stock < item.quantity) {
            console.error(`❌ Reserved stock insufficient`, {
              variantId: item.variant_id,
              reserved: variant.reserved_stock,
              required: item.quantity,
            });
            throw new Error(
              `Reserved stock insufficient for variant ${item.variant_id}. Order may have been modified.`,
            );
          }
        }

        await this.deductReservedStock(order.items);
      }

      await executePrismaOperation(
        'Order',
        {
          operation: PrismaOperationType.UPDATE,
          where: { id: id },
          data: { status: OrderStatus.CONFIRMED },
        },
        this.db.client,
        this.logger,
      );

      console.log(`✅ Order #${id} confirmed and stock deducted`);
      return (await this.getById(id)) as any;
    } catch (error: any) {
      console.error(`❌ Error confirming order #${id}`, { error: error.message });
      throw new Error(error.message);
    }
  }

  // SHIP ORDER
  async shipOrder(id: string, trackingNumber?: string, carrier?: string): Promise<Order> {
    try {
      console.log(`🚚 Shipping order #${id}`, { trackingNumber, carrier });

      const order: any = await this.getById(id);

      if (order.status !== OrderStatus.CONFIRMED) {
        console.warn(`⚠️ Only confirmed orders can be shipped`, {
          orderId: id,
          status: order.status,
        });
        throw new Error('Only confirmed orders can be shipped');
      }

      await executePrismaOperation(
        'Order',
        {
          operation: PrismaOperationType.UPDATE,
          where: { id: id },
          data: { status: OrderStatus.SHIPPED },
        },
        this.db.client,
        this.logger,
      );

      console.log(`✅ Order #${id} shipped`);
      return (await this.getById(id)) as any;
    } catch (error: any) {
      console.error(`❌ Error shipping order #${id}`, { error: error.message });
      throw new Error(error.message);
    }
  }

  // DELIVER ORDER
  async deliverOrder(id: string): Promise<Order> {
    try {
      console.log(`📦 Delivering order #${id}`);

      const order: any = await this.getById(id);

      if (order.status !== OrderStatus.SHIPPED) {
        console.warn(`⚠️ Only shipped orders can be delivered`, {
          orderId: id,
          status: order.status,
        });
        throw new Error('Only shipped orders can be delivered');
      }

      await executePrismaOperation(
        'Order',
        {
          operation: PrismaOperationType.UPDATE,
          where: { id: id },
          data: {
            status: OrderStatus.DELIVERED,
            deliveredAt: new Date(),
          },
        },
        this.db.client,
        this.logger,
      );

      console.log(`✅ Order #${id} delivered`);
      return (await this.getById(id)) as any;
    } catch (error: any) {
      console.error(`❌ Error delivering order #${id}`, { error: error.message });
      throw new Error(error.message);
    }
  }

  // CANCEL ORDER
  async cancelOrder(id: string, reason?: string): Promise<boolean> {
    try {
      console.log(`❌ Cancelling order #${id}`, { reason: reason || 'Not specified' });

      const order: any = await this.getById(id);

      if ([OrderStatus.DELIVERED, OrderStatus.CANCELLED].includes(order.status)) {
        console.warn(`⚠️ Cannot cancel delivered/cancelled orders`, {
          orderId: id,
          status: order.status,
        });
        throw new Error('Cannot cancel delivered/cancelled orders');
      }

      if (order.items && order.items.length > 0) {
        if (order.status === OrderStatus.PENDING) {
          await this.releaseReservedStock(order.items);
          console.log('✅ Released reserved stock for pending order');
        } else if ([OrderStatus.CONFIRMED, OrderStatus.SHIPPED].includes(order.status)) {
          await this.restoreSoldStock(order.items);
          console.log('✅ Restored sold stock for confirmed/shipped order');
        }
      }

      await executePrismaOperation(
        'Order',
        {
          operation: PrismaOperationType.UPDATE,
          where: { order_id: order.order_id },
          data: {
            status: OrderStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        },
        this.db.client,
        this.logger,
      );

      console.log(`✅ Order #${id} cancelled successfully`);
      return true;
    } catch (error: any) {
      console.error(`❌ Error cancelling order #${id}`, { error: error.message });
      throw new Error(error.message);
    }
  }

  // GET ACTIVE ORDERS
  async getActiveOrders(userId: number): Promise<Order[]> {
    try {
      console.log('🔍 Fetching active orders', { userId });

      const orders = await this.db.client.order.findMany({
        where: {
          user_id: userId,
          status: {
            in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.SHIPPED],
          },
        },
        include: this.INCLUDE_RELATIONS,
        orderBy: { placedAt: 'desc' },
      });

      console.log(`✅ Retrieved ${orders.length} active orders for user #${userId}`);
      return orders as any;
    } catch (error: any) {
      console.error('❌ Error fetching active orders', { userId, error: error.message });
      throw new Error(error.message);
    }
  }

  // TRACK ORDER
  async trackOrder(userId: number, orderId: number): Promise<OrderTrackingInfo> {
    try {
      console.log('🔍 Tracking order', { userId, orderId });

      const order = await this.db.client.order.findFirst({
        where: {
          order_id: orderId,
          user_id: userId,
        },
        include: this.INCLUDE_RELATIONS,
      });

      if (!order) {
        console.error(`❌ Order not found`, { orderId, userId });
        throw new Error(`Order #${orderId} not found`);
      }

      const timeline = this.buildOrderTimeline(order);

      let estimatedDelivery: Date | undefined;
      if (order.status === OrderStatus.SHIPPED) {
        estimatedDelivery = new Date(order.updatedAt);
        estimatedDelivery.setDate(
          estimatedDelivery.getDate() + this.CONFIG.ESTIMATED_DELIVERY_DAYS,
        );
      }

      console.log(`✅ Order tracking retrieved`, { orderId });

      return {
        order: order as any,
        timeline,
        currentStatus: order.status,
        estimatedDelivery,
      };
    } catch (error: any) {
      console.error('❌ Error tracking order', { orderId, userId, error: error.message });
      throw new Error(error.message);
    }
  }

  // GET ORDER STATS
  async getOrderStats(dateFrom?: Date, dateTo?: Date): Promise<OrderStats> {
    try {
      console.log('📊 Fetching order statistics', { dateFrom, dateTo });

      const where: any = {};
      if (dateFrom || dateTo) {
        where.placedAt = {};
        if (dateFrom) where.placedAt.gte = dateFrom;
        if (dateTo) where.placedAt.lte = dateTo;
      }

      const [
        totalOrders,
        pendingOrders,
        confirmedOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        revenueData,
      ] = await Promise.all([
        this.db.client.order.count({ where }),
        this.db.client.order.count({ where: { ...where, status: OrderStatus.PENDING } }),
        this.db.client.order.count({ where: { ...where, status: OrderStatus.CONFIRMED } }),
        this.db.client.order.count({ where: { ...where, status: OrderStatus.SHIPPED } }),
        this.db.client.order.count({ where: { ...where, status: OrderStatus.DELIVERED } }),
        this.db.client.order.count({ where: { ...where, status: OrderStatus.CANCELLED } }),
        this.db.client.order.aggregate({
          where: { ...where, status: OrderStatus.DELIVERED },
          _sum: { grandTotal: true },
        }),
      ]);

      const totalRevenue = revenueData._sum.grandTotal || 0;
      const averageOrderValue = deliveredOrders > 0 ? totalRevenue / deliveredOrders : 0;

      console.log('✅ Order statistics retrieved', { totalOrders, totalRevenue });

      return {
        totalOrders,
        pendingOrders,
        confirmedOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
      };
    } catch (error: any) {
      console.error('❌ Error fetching order stats', { error: error.message });
      throw new Error(error.message);
    }
  }

  // GET REVENUE STATS
  async getRevenueStats(dateFrom?: Date, dateTo?: Date, groupBy: string = 'day'): Promise<any[]> {
    try {
      console.log('💰 Fetching revenue statistics', { dateFrom, dateTo, groupBy });

      const where: any = { status: OrderStatus.DELIVERED };

      if (dateFrom || dateTo) {
        where.deliveredAt = {};
        if (dateFrom) where.deliveredAt.gte = dateFrom;
        if (dateTo) where.deliveredAt.lte = dateTo;
      }

      const orders = await this.db.client.order.findMany({
        where,
        select: { deliveredAt: true, grandTotal: true },
        orderBy: { deliveredAt: 'asc' },
      });

      const revenueMap = new Map<string, number>();

      orders.forEach((order: any) => {
        if (order.deliveredAt) {
          const date = new Date(order.deliveredAt);
          let dateKey: string;

          if (groupBy === 'month') {
            dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          } else if (groupBy === 'year') {
            dateKey = `${date.getFullYear()}`;
          } else {
            dateKey = date.toISOString().split('T')[0];
          }

          const currentRevenue = revenueMap.get(dateKey) || 0;
          revenueMap.set(dateKey, currentRevenue + (order.grandTotal || 0));
        }
      });

      const result = Array.from(revenueMap.entries()).map(([date, revenue]) => ({
        date,
        revenue: parseFloat(revenue.toFixed(2)),
      }));

      console.log(`✅ Revenue statistics retrieved with ${result.length} data points`);
      return result;
    } catch (error: any) {
      console.error('❌ Error fetching revenue stats', { error: error.message });
      throw new Error(error.message);
    }
  }
}
