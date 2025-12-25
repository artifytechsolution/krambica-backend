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
import Razorpay from 'razorpay';
import { IPromotionsService } from '../../interfaces/promotions-service.interface';

@injectable()
export class OrdersService implements IService, IOrdersService {
  static dependencies = [
    'LoggerService',
    'DatabaseService',
    'ConfigService',
    'AuthService',
    'ProductsService',
    'CuponService',
    'PromotionService',
  ];
  static optionalDependencies: string[] = [];

  private logger: ILoggerService;
  private db: IDatabaseService;
  private config: IConfigService;
  private auth: IAuthService;
  private product: IProductsService;
  private Cupon: ICouponService;
  private promotion: IPromotionsService;
  private razorpay: any;

  constructor(
    logger: ILoggerService,
    db: IDatabaseService,
    config: IConfigService,
    auth: IAuthService,
    product: IProductsService,
    CuponService: ICouponService,
    PromotionService: IPromotionsService,
  ) {
    this.logger = logger;
    this.db = db;
    this.config = config;
    this.auth = auth;
    this.product = product;
    this.Cupon = CuponService;
    this.promotion = PromotionService;
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    console.log('✅ OrdersService instantiated');
  }

  async initialize() {
    console.log('✅ OrdersService initialized');
  }

  // Configuration
  private readonly CONFIG = {
    TAX_RATE: 0,
    FREE_SHIPPING_THRESHOLD: 500,
    SHIPPING_COST: 0,
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
  // private calculateOrderTotals(totalAmount: number, discount: number = 0) {
  //   const discountedAmount = totalAmount - discount;
  //   const tax = discountedAmount * this.CONFIG.TAX_RATE;
  //   const shippingCost =
  //     discountedAmount >= this.CONFIG.FREE_SHIPPING_THRESHOLD ? 0 : this.CONFIG.SHIPPING_COST;
  //   const grandTotal = discountedAmount + tax + shippingCost;

  //   console.log('💰 Calculated order totals', {
  //     totalAmount: discountedAmount,
  //     discount,
  //     tax,
  //     shippingCost,
  //     grandTotal,
  //   });

  //   return {
  //     totalAmount: parseFloat(discountedAmount.toFixed(2)),
  //     tax: parseFloat(tax.toFixed(2)),
  //     shippingCost,
  //     grandTotal: parseFloat(grandTotal.toFixed(2)),
  //   };
  // }
  //LATEST
  private calculateOrderTotals(
    totalAmount: number,
    discount: number,
  ): {
    totalAmount: number;
    discount: number;
    tax: number;
    shippingCost: number;
    grandTotal: number;
  } {
    const subtotal = totalAmount - discount;
    const tax = 0; // here implement text
    // const shippingCost = subtotal > 1000 ? 0 : 50; // Free shipping above ₹1000
    const shippingCost = 0;
    const grandTotal = subtotal + tax + shippingCost;

    return {
      totalAmount,
      discount,
      tax,
      shippingCost,
      grandTotal: Math.round(grandTotal),
    };
  }

  private async validateSelectedFreeProducts(
    promotionId: string,
    selectedFreeItems: any[],
    freeItemsEarned: number,
  ): Promise<void> {
    console.log('🔍 Validating selected free products...');

    if (!selectedFreeItems || selectedFreeItems.length === 0) {
      throw new InvalidInputError('No free products selected');
    }

    const selectedQuantity = selectedFreeItems.reduce((sum, item) => sum + item.quantity, 0);

    console.log('Selected free items:', {
      count: selectedFreeItems.length,
      totalQuantity: selectedQuantity,
      earned: freeItemsEarned,
      promotionId: promotionId,
    });
    console.log('Selected free items:');
    console.log(selectedFreeItems);

    if (selectedQuantity > freeItemsEarned) {
      throw new InvalidInputError(
        `You can only select ${freeItemsEarned} free item(s), but selected ${selectedQuantity}`,
      );
    }

    // Validate each free product
    const promotion = await this.db.client.Promotion.findUnique({
      where: { promotion_id: promotionId },
      include: { freeProducts: true },
    });

    if (!promotion) {
      throw new InvalidInputError('Promotion not found');
    }

    for (const freeItem of selectedFreeItems) {
      const isValid = promotion.freeProducts.some(
        (fp: any) =>
          fp.product_id === freeItem.product_id || fp.size_variant_id === freeItem.size_variant_id,
      );

      if (!isValid) {
        throw new InvalidInputError(
          `Product ${freeItem.product_id} is not eligible as a free product`,
        );
      }

      // Check stock
      const variant = await this.db.client.ProductSizeVariant.findUnique({
        where: { product_size_var_id: freeItem.size_variant_id },
      });

      if (!variant || variant.stock < freeItem.quantity) {
        throw new InvalidInputError(
          `Free product out of stock (Available: ${variant?.stock || 0})`,
        );
      }

      console.log(
        `  ✅ Valid free item: Product ${freeItem.product_id}, Qty: ${freeItem.quantity}`,
      );
    }
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

  // private async calculateItemsTotalAmount(items: any[]): Promise<number> {
  //   console.log('💰 Calculating items total amount', { itemsCount: items.length });

  //   let totalAmount = 0;

  //   for (const item of items) {
  //     const variantExist = await this.product.getProductVariantById(item.variant_id);
  //     console.log('product variant is exist------->');
  //     console.log(variantExist);

  //     if (variantExist?.length <= 0) {
  //       console.error(`❌ Variant not found`, { variantId: item.variant_id });
  //       throw new Error(`Variant ${item.variant_id} not found`);
  //     }

  //     totalAmount += variantExist[0].price * item.quantity;
  //   }

  //   console.log('✅ Total amount calculated', { totalAmount });
  //   return totalAmount;
  // }
  //LATEST
  private async calculateItemsTotalAmount(items: any[]): Promise<number> {
    console.log('💰 Calculating items total amount...');

    if (!items || items.length === 0) {
      throw new InvalidInputError('Cart is empty');
    }
    console.log('items ------->');
    console.log(items);

    // OPTIMIZATION: Fetch all variants in single query
    const variantIds = items.map((item) => item.variant_id);
    const variants = await this.db.client.ProductSizeVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        productColor: {
          include: { product: true },
        },
      },
    });

    const variantMap = new Map(variants.map((v: any) => [v.id, v]));
    let totalAmount = 0;

    for (const item of items) {
      const variant: any = variantMap.get(item.variant_id);

      if (!variant) {
        throw new InvalidInputError(`Product variant ${item.variant_id} not found`);
      }

      // Check product availability
      if (!variant.productColor?.product?.isVisible) {
        throw new InvalidInputError(
          `Product "${variant.productColor?.product?.name}" is no longer available`,
        );
      }

      // Check variant availability
      if (!variant.isAvailable) {
        throw new InvalidInputError(`Size "${variant.size}" is no longer available`);
      }

      // Check stock
      if (variant.stock < item.quantity) {
        throw new InvalidInputError(
          `Insufficient stock for "${variant.productColor?.product?.name}" - Size: ${variant.size}. Available: ${variant.stock}, Requested: ${item.quantity}`,
        );
      }

      totalAmount += variant.price * item.quantity;

      console.log(
        `  ✅ ${variant.productColor?.product?.name} (${variant.size}): ${item.quantity} × ₹${variant.price} = ₹${variant.price * item.quantity}`,
      );
    }

    console.log('✅ Total amount:', `₹${totalAmount}`);
    return totalAmount;
  }

  private async createOrderItems(orderId: string, orderIdNum: number, items: any[]): Promise<void> {
    console.log('📦 Creating order items', { orderId, itemsCount: items.length });

    const itemPromises = items.map(async (item: any) => {
      const productExist: any = await this.product.getById(item.product_id);

      if (!productExist) {
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
  async getAll(data?: any): Promise<any> {
    console.log('order is comminggg-----<');
    console.log(data);

    try {
      const allowedFields = {
        // ========== Direct Order Fields ==========
        id: 'uuid',
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

        // ========== User Relations ==========
        'user.id': 'uuid',
        'user.user_id': 'int',
        'user.name': 'string',
        'user.email': 'string',
        'user.phone': 'string',

        // ========== Shipping Address Relations ==========
        'shippingAddress.id': 'uuid',
        'shippingAddress.fullName': 'string',
        'shippingAddress.addressLine1': 'string',
        'shippingAddress.addressLine2': 'string',
        'shippingAddress.city': 'string',
        'shippingAddress.state': 'string',
        'shippingAddress.zipCode': 'string',
        'shippingAddress.country': 'string',
      } as const;

      // Handle both body and query params format
      let filters = [];
      let page = 1;
      let limit = 10;
      let globalSearch = '';

      if (data) {
        if (data.filters && Array.isArray(data.filters)) {
          // Body format
          filters = data.filters;
          page = data.page || 1;
          limit = data.limit || 10;
          globalSearch = data.globalSearch || '';
        } else {
          // Query params format
          const parsed = parseQueryParams(data);
          filters = parsed.filters;
          page = parsed.page;
          limit = parsed.limit;
          globalSearch = parsed.globalSearch || '';
        }
      }

      const combineFieldsGroups = [
        ['user.name', 'user.email', 'user.phone'],
        ['shippingAddress.fullName', 'shippingAddress.city', 'shippingAddress.state'],
      ];

      // Build dynamic filters
      const { where, orderBy, skip, take } = buildPrismaQuery(
        filters,
        allowedFields,
        page,
        limit,
        globalSearch,
        combineFieldsGroups,
      );

      // Execute queries
      const [orders, totalCount] = await Promise.all([
        this.db.client.order.findMany({
          where,
          orderBy: orderBy.length > 0 ? orderBy : [{ createdAt: 'desc' }],
          skip,
          take,
          include: {
            user: {
              select: {
                user_id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            shippingAddress: true,
            items: {
              include: {
                sizeVariant: {
                  include: {
                    productColor: {
                      include: {
                        product: {
                          select: {
                            product_id: true,
                            name: true,
                            slug: true,
                          },
                        },
                        images: {
                          take: 1,
                          orderBy: {
                            displayOrder: 'asc',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        this.db.client.order.count({ where }),
      ]);

      // Return with pagination metadata
      const totalPages = Math.ceil(totalCount / take);

      return {
        success: true,
        data: orders,
        pagination: {
          total: totalCount,
          page,
          limit: take,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error: any) {
      throw new InvalidInputError(error.message);
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

  //latest 2
  // async create(data: any): Promise<Order> {
  //   try {
  //     console.log('🟢 Creating new order', {
  //       userId: data.user_id,
  //       itemsCount: data.items.length,
  //       discount: data.discount || 0,
  //       couponCode: data.couponCode || 'None',
  //     });

  //     // Validate user and address
  //     const user = await this.validateUser(data.user_id);
  //     const address = await this.validateAddress(data.address_id, data.user_id);
  //     this.validateOrderItems(data.items);
  //     const couponService = this.Cupon; // Assume injected CouponService
  //     console.log('----->cupon service is comming------>');

  //     // Reserve stock for items
  //     await this.reserveStock(data.items);

  //     // Calculate total amount (orderValue)
  //     const totalAmount = await this.calculateItemsTotalAmount(data.items);
  //     console.log(`🟡 Calculated totalAmount (orderValue): ${totalAmount}`);

  //     if (typeof totalAmount !== 'number' || totalAmount < 0) {
  //       throw new Error('Invalid order value');
  //     }

  //     let discount = data.discount || 0;
  //     let couponRedemption = null;

  //     // Handle coupon if provided
  //     if (data.couponCode) {
  //       console.log(`🟡 Validating coupon: ${data.couponCode}`);

  //       const user = await this.db.client.user.findUnique({
  //         where: { user_id: data.user_id },
  //       });
  //       if (!user) {
  //         throw new InvalidInputError('user is not found');
  //       }

  //       const validationResult = await couponService.validate({
  //         code: data.couponCode,
  //         orderValue: totalAmount,
  //         userId: user.id,
  //       });
  //       console.log('🟢 Coupon validation result:', validationResult);

  //       discount = validationResult.discountAmount;
  //       console.log(`🟢 Coupon discount applied: ${discount}`);
  //     }

  //     // Calculate order totals with verified discount
  //     const totals = this.calculateOrderTotals(totalAmount, discount);
  //     console.log(`🟡 Order totals:`, totals);

  //     const { items, couponCode, appliedPromotion, ...orderData } = data; // get appliedPromotion here

  //     const razorpayOrderOptions = {
  //       amount: Math.round(totals.grandTotal * 100), // amount in paise (smallest currency unit)
  //       currency: 'INR',
  //       receipt: `order_rcpt_${Date.now()}`,
  //     };

  //     const razorpayOrder = await this.razorpay.orders.create(razorpayOrderOptions);
  //     console.log('🟢 Razorpay order created:', razorpayOrder.id);

  //     // Create order
  //     const createOrder = await executePrismaOperation(
  //       'Order',
  //       {
  //         operation: PrismaOperationType.CREATE,
  //         data: {
  //           ...orderData,
  //           user_id: user.user_id,
  //           totalAmount: totals.totalAmount,
  //           discount,
  //           tax: totals.tax,
  //           shippingCost: totals.shippingCost,
  //           grandTotal: totals.grandTotal,
  //           status: OrderStatus.PENDING,
  //           paymentStatus: PaymentStatus.UNPAID,
  //           placedAt: new Date(),
  //         },
  //       },
  //       this.db.client,
  //       this.logger,
  //     );

  //     console.log('create order is herere----->');
  //     console.log(createOrder);

  //     // Create order items
  //     await this.createOrderItems(createOrder.data.id, createOrder.data.order_id, items);

  //     // ===== Add Promotion Redemption Handling Here =====

  //     let promotionRedemption = null;

  //     if (appliedPromotion && appliedPromotion.promotion_id) {
  //       // Create promotion redemption record
  //       promotionRedemption = await this.db.client.promotionRedemption.create({
  //         data: {
  //           promotion_id: appliedPromotion.promotion_id,
  //           order_id: createOrder.data.order_id,
  //           user_id: user.user_id,
  //           purchasedQuantity: items.reduce((sum: number, item: any) => sum + item.quantity, 0),
  //           freeQuantity:
  //             appliedPromotion.selectedFreeItems?.reduce(
  //               (sum: number, item: any) => sum + item.quantity,
  //               0,
  //             ) || 0,
  //           appliedAt: new Date(),
  //         },
  //       });

  //       // Create free item records and adjust stock
  //       for (const freeItem of appliedPromotion.selectedFreeItems || []) {
  //         await this.db.client.promotionFreeItem.create({
  //           data: {
  //             redemption_id: promotionRedemption.promotion_redemption_id,
  //             product_id: freeItem.product_id,
  //             size_variant_id: freeItem.size_variant_id,
  //             quantity: freeItem.quantity,
  //           },
  //         });

  //         // Deduct stock for free item
  //         await this.db.client.productSizeVariant.update({
  //           where: { product_size_var_id: freeItem.size_variant_id },
  //           data: {
  //             stock: { decrement: freeItem.quantity },
  //             availableStock: { decrement: freeItem.quantity },
  //           },
  //         });

  //         // Optionally, create inventory log for transparency
  //         if (this.db.client.sizeVariantInventoryLog) {
  //           await this.db.client.sizeVariantInventoryLog.create({
  //             data: {
  //               product_size_var_id: freeItem.size_variant_id,
  //               changeType: 'SALE',
  //               quantityChanged: freeItem.quantity,
  //               stockBeforeChange: 0, // should be real stock before change if tracked
  //               stockAfterChange: 0, // should be real stock after change if tracked
  //               referenceType: 'MANUAL',
  //               referenceId: promotionRedemption.promotion_redemption_id.toString(),
  //               changed_by: user.user_id,
  //               remarks: `Free promotional item from promotion_id: ${appliedPromotion.promotion_id}`,
  //             },
  //           });
  //         }
  //       }
  //     }

  //     // Redeem coupon if present (existing logic)
  //     if (data.couponCode) {
  //       const user = await this.db.client.user.findUnique({
  //         where: { user_id: data.user_id },
  //       });
  //       if (!user) {
  //         throw new InvalidInputError('user is not found');
  //       }
  //       console.log(`🟡 Redeeming coupon: ${data.couponCode}`);
  //       couponRedemption = await couponService.redeem({
  //         code: data.couponCode,
  //         orderValue: totalAmount,
  //         userId: user.id,
  //         orderId: createOrder.data.order_id,
  //       });
  //       console.log('🟢 Coupon redemption result:', couponRedemption);
  //     }

  //     // Fetch complete order
  //     const completeOrder = await this.getById(createOrder.data.order_id);

  //     console.log(
  //       `✅ Order #${createOrder.data.order_id} created successfully with reserved stock`,
  //       { couponApplied: !!data.couponCode, discount, promotionRedemption },
  //     );

  //     return {
  //       ...completeOrder,
  //       razorpay_order_id: razorpayOrder.id,
  //       razorpay_amount: razorpayOrder.amount,
  //       razorpay_currency: razorpayOrder.currency,
  //       razorpay_receipt: razorpayOrder.receipt,
  //     } as any;
  //   } catch (error: any) {
  //     console.error('❌ Error creating order', { error: error.message });
  //     throw new Error(error.message);
  //   }
  // }
  async create(data: any): Promise<any> {
    console.log('🟢 ===== STARTING ORDER CREATION =====');
    console.log('Order data:', {
      userId: data.user_id,
      itemsCount: data.items?.length || 0,
      hasPromotion: !!data.appliedPromotion,
      hasCoupon: !!data.couponCode,
      promotionType: data.appliedPromotion?.type || 'None',
    });

    try {
      const { items, couponCode, appliedPromotion, ...orderData } = data;

      // =====================================================
      // STEP 1: VALIDATE BASIC DATA
      // =====================================================
      console.log('\n📋 STEP 1: Validating basic order data...');

      if (!items || items.length === 0) {
        throw new InvalidInputError('Cart is empty');
      }

      const user = await this.validateUser(data.user_id);
      console.log('✅ User validated:', user.user_id);

      const address = await this.validateAddress(data.address_id, data.user_id);
      console.log('✅ Address validated:', address.address_id);

      this.validateOrderItems(items);
      console.log('✅ Order items validated:', items.length);

      // =====================================================
      // ✅ FIX 1: FETCH ACTUAL PRICES BEFORE VALIDATION
      // =====================================================
      console.log('\n💰 Fetching actual prices...');

      const variantIds = items.map((item: any) => item.variant_id);
      const variants = await this.db.client.ProductSizeVariant.findMany({
        where: { id: { in: variantIds } },
        include: {
          productColor: {
            include: { product: true },
          },
        },
      });

      const variantMap = new Map(variants.map((v: any) => [v.id, v]));
      console.log(`✅ Fetched ${variants.length} variant prices`);

      // =====================================================
      // STEP 2: VALIDATE PROMOTION (ALL TYPES)
      // =====================================================
      console.log('\n🎁 STEP 2: Validating promotion...');

      let promotionValidation: any = null;
      let promotionDiscount = 0;

      if (appliedPromotion?.promotion_id) {
        console.log('🔍 Promotion ID:', appliedPromotion.promotion_id);
        console.log('🔍 Promotion Type:', appliedPromotion.type);

        try {
          // ✅ FIX 2: Map items with ACTUAL PRICES (not 0)
          const promotionItems = items.map((item: any) => {
            const variant: any = variantMap.get(item.variant_id);
            return {
              product_id: item.product_id,
              product_size_var_id: item.variant_id,
              quantity: item.quantity,
              price: variant?.price || 0, // ✅ FIXED: Real price from DB
            };
          });

          console.log('🛒 Cart items for validation:', promotionItems);

          // ✅ FIX 3: Use 'userid' (lowercase) not 'user_id'
          const validationResults = await this.promotion.validateCart({
            items: promotionItems,
            user_id: data.user_id, // ✅ FIXED: lowercase 'userid'
          });

          console.log('📊 Validation results:', validationResults);

          // ✅ FIX 4: Use 'promotionid' not 'promotion_id'
          promotionValidation = validationResults.find(
            (v: any) => v.promotion_id === appliedPromotion.promotion_id, // ✅ FIXED
          );

          console.log('🔍 Matched promotion:', promotionValidation);

          if (!promotionValidation || !promotionValidation.isEligible) {
            throw new InvalidInputError('Promotion is not applicable to this cart');
          }

          console.log('✅ Promotion validation passed!', {
            type: promotionValidation.type,
            isEligible: promotionValidation.isEligible,
            freeItems: promotionValidation.freeItemsEarned || 0,
          });

          // Calculate discount
          const discountCalculation = await this.promotion.calculateDiscount(
            appliedPromotion.promotion_id,
            promotionItems,
          );

          promotionDiscount = discountCalculation.discountAmount || 0;

          console.log('💰 Promotion discount calculated:', {
            discountAmount: promotionDiscount,
            type: promotionValidation.type,
          });

          // For BUY_X_GET_Y_FREE: Validate selected free products
          if (promotionValidation.type === 'BUY_X_GET_Y_FREE') {
            if (
              !appliedPromotion.selectedFreeItems ||
              appliedPromotion.selectedFreeItems.length === 0
            ) {
              throw new InvalidInputError(
                `Please select ${promotionValidation.freeItemsEarned} free item(s)`,
              );
            }

            console.log('🎁 Validating selected free products...');
            await this.validateSelectedFreeProducts(
              appliedPromotion.promotion_id,
              appliedPromotion.selectedFreeItems,
              promotionValidation.freeItemsEarned,
            );
            console.log('✅ Free products validated');
          }
        } catch (error: any) {
          console.error('❌ Promotion validation failed:', error.message);
          throw new InvalidInputError(`Promotion error: ${error.message}`);
        }
      } else {
        console.log('ℹ️ No promotion applied');
      }

      // =====================================================
      // STEP 3: CALCULATE TOTALS
      // =====================================================
      console.log('\n💰 STEP 3: Calculating totals...');

      const totalAmount = await this.calculateItemsTotalAmount(items);
      console.log('🛒 Cart total:', `₹${totalAmount}`);

      let discount = promotionDiscount;
      console.log('🎁 Promotion discount:', `₹${promotionDiscount}`);

      // Apply coupon (optional, stackable)
      let couponRedemption: any = null;
      if (couponCode) {
        console.log('🎫 Validating coupon:', couponCode);

        try {
          const validationResult = await this.Cupon.validate({
            code: couponCode,
            orderValue: totalAmount - promotionDiscount,
            userId: user.id,
          });

          const couponDiscount = validationResult.discountAmount;
          discount += couponDiscount;

          console.log('✅ Coupon valid!', {
            code: couponCode,
            discount: `₹${couponDiscount}`,
          });
        } catch (error: any) {
          console.warn('⚠️ Coupon validation failed:', error.message);
          console.log('ℹ️ Continuing without coupon...');
        }
      }

      const totals = this.calculateOrderTotals(totalAmount, discount);
      console.log('📊 Final totals:', {
        subtotal: `₹${totalAmount}`,
        discount: `₹${discount}`,
        tax: `₹${totals.tax}`,
        shipping: `₹${totals.shippingCost}`,
        grandTotal: `₹${totals.grandTotal}`,
      });

      // =====================================================
      // STEP 4: CREATE RAZORPAY ORDER
      // =====================================================
      console.log('\n💳 STEP 4: Creating Razorpay order...');

      const razorpayOrder = await this.razorpay.orders.create({
        amount: Math.round(totals.grandTotal * 100),
        currency: 'INR',
        receipt: `order_rcpt_${Date.now()}`,
      });

      console.log('✅ Razorpay order created:', {
        id: razorpayOrder.id,
        amount: `₹${razorpayOrder.amount / 100}`,
      });

      // =====================================================
      // STEP 5: ATOMIC TRANSACTION (ALL OR NOTHING)
      // =====================================================
      console.log('\n🔄 STEP 5: Starting database transaction...');

      const result = await this.db.client.$transaction(async (tx: any) => {
        console.log('📝 Creating order record...');

        // 5.1 CREATE ORDER
        const order = await tx.Order.create({
          data: {
            ...orderData,
            user_id: user.user_id,
            address_id: address.address_id,
            totalAmount: totals.totalAmount,
            razorpayOrderId: razorpayOrder.id,
            discount,
            tax: totals.tax || 0,
            shippingCost: totals.shippingCost || 0,
            grandTotal: totals.grandTotal,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.UNPAID,
            placedAt: new Date(),
          },
        });

        console.log('✅ Order created:', `#${order.order_id}`);

        // 5.2 CREATE ORDER ITEMS (PURCHASED)
        console.log('📦 Creating order items...');

        for (const item of items) {
          const variant = await tx.ProductSizeVariant.findUnique({
            where: { id: item.variant_id },
            include: {
              productColor: {
                include: { product: true },
              },
            },
          });

          if (!variant || variant.stock < item.quantity) {
            throw new InvalidInputError(
              `Insufficient stock for ${variant?.productColor?.product?.name || 'product'}`,
            );
          }

          console.log(
            `  ✅ ${variant.productColor?.product?.name} (${variant.size}) - Qty: ${item.quantity} × ₹${variant.price}`,
          );

          // Create order item
          await tx.OrderItem.create({
            data: {
              order_id: order.order_id,
              product_size_var_id: variant.product_size_var_id,
              quantity: item.quantity,
              price: variant.price,
              total: variant.price * item.quantity,
              isFree: false,
            },
          });

          // Deduct stock
          await tx.ProductSizeVariant.update({
            where: { id: item.variant_id },
            data: {
              stock: { decrement: item.quantity },
              availableStock: { decrement: item.quantity },
            },
          });

          console.log(`     Stock: ${variant.stock} → ${variant.stock - item.quantity}`);
        }

        console.log(`✅ ${items.length} paid items created`);

        // =====================================================
        // 5.3 HANDLE PROMOTION REDEMPTION
        // =====================================================
        let promotionRedemption = null;

        if (appliedPromotion?.promotion_id && promotionValidation?.isEligible) {
          console.log(`\n🎁 Processing ${promotionValidation.type} promotion...`);

          // Create redemption record
          promotionRedemption = await tx.PromotionRedemption.create({
            data: {
              promotion_id: appliedPromotion.promotion_id,
              order_id: order.order_id,
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

          console.log('✅ Promotion redemption record created');

          // ✅ FIX 5: Handle different promotion types
          switch (promotionValidation.type) {
            case 'BUY_X_GET_Y_FREE':
              if (appliedPromotion.selectedFreeItems?.length > 0) {
                console.log(`🎁 Adding ${appliedPromotion.selectedFreeItems.length} free items...`);

                for (const freeItem of appliedPromotion.selectedFreeItems) {
                  const freeVariant = await tx.ProductSizeVariant.findUnique({
                    where: { product_size_var_id: freeItem.size_variant_id },
                    include: {
                      productColor: {
                        include: { product: true },
                      },
                    },
                  });

                  if (!freeVariant || freeVariant.stock < freeItem.quantity) {
                    throw new InvalidInputError(
                      `Free item out of stock: ${freeVariant?.productColor?.product?.name}`,
                    );
                  }

                  console.log(
                    `  🎁 FREE: ${freeVariant.productColor?.product?.name} (${freeVariant.size}) - Qty: ${freeItem.quantity}`,
                  );

                  // CREATE ORDER ITEM FOR FREE PRODUCT
                  await tx.OrderItem.create({
                    data: {
                      order_id: order.order_id,
                      product_size_var_id: freeItem.size_variant_id,
                      quantity: freeItem.quantity,
                      price: 0,
                      total: 0,
                      isFree: true,
                    },
                  });

                  // Track in PromotionFreeItem
                  await tx.PromotionFreeItem.create({
                    data: {
                      redemption_id: promotionRedemption.promotion_redemption_id,
                      product_id: freeItem.product_id,
                      size_variant_id: freeItem.size_variant_id,
                      quantity: freeItem.quantity,
                    },
                  });

                  // Deduct stock for free item
                  await tx.ProductSizeVariant.update({
                    where: { product_size_var_id: freeItem.size_variant_id },
                    data: {
                      stock: { decrement: freeItem.quantity },
                      availableStock: { decrement: freeItem.quantity },
                    },
                  });

                  // CREATE INVENTORY LOG
                  await tx.SizeVariantInventoryLog.create({
                    data: {
                      product_size_var_id: freeItem.size_variant_id,
                      changeType: 'SALE',
                      quantityChanged: freeItem.quantity,
                      referenceType: 'ORDER',
                      referenceId: promotionRedemption.promotion_redemption_id.toString(),
                      changed_by: user.user_id,
                      remarks: `Free item from promotion #${appliedPromotion.promotion_id}`,
                      stockBeforeChange: freeVariant.stock,
                      stockAfterChange: freeVariant.stock - freeItem.quantity,
                    },
                  });

                  console.log(
                    `     Stock: ${freeVariant.stock} → ${freeVariant.stock - freeItem.quantity}`,
                  );
                }

                console.log(`✅ ${appliedPromotion.selectedFreeItems.length} free items added`);
              }
              break;

            case 'QUANTITY_DISCOUNT':
              console.log(`💰 QUANTITY_DISCOUNT applied: ₹${promotionDiscount}`);
              break;

            case 'BUNDLE_DEAL':
              console.log(`📦 BUNDLE_DEAL applied: ₹${promotionDiscount}`);
              break;

            case 'TIERED_DISCOUNT':
              console.log(`🏆 TIERED_DISCOUNT applied: ₹${promotionDiscount}`);
              break;
          }

          // INCREMENT PROMOTION USAGE COUNT (ATOMIC)
          await tx.Promotion.update({
            where: { promotion_id: appliedPromotion.promotion_id },
            data: {
              usedCount: { increment: 1 },
            },
          });

          console.log('✅ Promotion usage count incremented');
        }

        // 5.4 REDEEM COUPON (OPTIONAL)
        if (couponCode) {
          console.log('🎫 Redeeming coupon:', couponCode);

          try {
            couponRedemption = await this.Cupon.redeem({
              code: couponCode,
              orderValue: totalAmount,
              userId: user.id,
              orderId: order.order_id,
            });
            console.log('✅ Coupon redeemed successfully');
          } catch (error: any) {
            console.warn('⚠️ Coupon redemption failed:', error.message);
          }
        }

        return { order, promotionRedemption, couponRedemption };
      });

      console.log('\n✅ Transaction completed successfully!');

      // =====================================================
      // STEP 6: FETCH COMPLETE ORDER
      // =====================================================
      console.log('📦 Fetching complete order details...');

      const completeOrder = await this.getById(result.order.order_id);

      console.log('\n🎉 ===== ORDER CREATED SUCCESSFULLY =====');
      console.log('📊 Order Summary:', {
        orderId: result.order.order_id,
        promotionType: promotionValidation?.type || 'None',
        promotionApplied: !!appliedPromotion,
        couponApplied: !!couponCode,
        totalDiscount: `₹${discount}`,
        grandTotal: `₹${totals.grandTotal}`,
        paidItems: items.length,
        freeItems: appliedPromotion?.selectedFreeItems?.length || 0,
      });

      return {
        ...completeOrder,
        razorpay_order_id: razorpayOrder.id,
        razorpay_amount: razorpayOrder.amount,
        razorpay_currency: razorpayOrder.currency,
        razorpay_receipt: razorpayOrder.receipt,
      };
    } catch (error: any) {
      console.error('\n❌ ===== ORDER CREATION FAILED =====');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
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

  //LATEST METHOD
}
