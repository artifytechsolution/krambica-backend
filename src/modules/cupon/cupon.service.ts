import { injectable } from '../../services/di-container';
import { IService } from '../../interfaces/service.interface';
import { ILoggerService } from '../../services/logger.service';

import { InvalidInputError } from '../../utils/error.utils';
import { executePrismaOperation, PrismaOperationType } from '../../utils/prisma.utils';
import { IDatabaseService } from '../../interfaces/database-service.interface';

import { IConfigService } from '../../services/config.service';
import _ from 'lodash';

import { IEmailService } from '../../interfaces/send-mail-service.interface';
import { PrismaClient } from '@prisma/client';
import { ICouponService } from '../../interfaces/ICouponService.interface';
import { buildPrismaQuery, parseQueryParams } from '../../utils/prisma-query-builder';

@injectable()
export class CuponService implements ICouponService, IService {
  static dependencies = ['LoggerService', 'DatabaseService', 'ConfigService', 'EmailService'];
  static optionalDependencies: string[] = [];

  private auth: any = [
    { id: 1, name: 'Sample Auth 1', createdAt: new Date().toISOString() },
    { id: 2, name: 'Sample Auth 2', createdAt: new Date().toISOString() },
  ];

  private db: IDatabaseService;
  private logger: ILoggerService;
  private config: IConfigService;
  private JWT_SECRET: string;
  private REFRESH_SECRET: string;
  private mailConfig: IEmailService;

  constructor(
    logger: ILoggerService,
    db: IDatabaseService,
    config: IConfigService,
    mail: IEmailService,
  ) {
    this.logger = logger;
    this.logger.info('AuthService instantiated');
    this.db = db;
    this.config = config;
    this.JWT_SECRET = this.config.get('JWT_ACCESS_SECRET') as string;
    this.REFRESH_SECRET = this.config.get('REFRESH_ACCESS_SECRET') as string;
    this.mailConfig = mail;
  }

  async initialize() {
    this.logger.info('AuthService initialized with in-memory data');
  }

  async generateCouponCode() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `COUP${timestamp}${random}`;
  }

  validateCouponBusinessLogic = async (coupon: any, orderValue: any, userId = null) => {
    const errors: string[] = [];
    const now = new Date();

    const userExist = await executePrismaOperation<'UserInput'>(
      'user',
      {
        operation: PrismaOperationType.READ_UNIQUE,
        where: {
          id: userId,
        },
      },
      this.db.client,
      this.logger,
    );
    console.log('in valid cupon user is exist or not???');
    console.log(userExist);
    if (coupon.data.status !== 'ACTIVE') {
      errors.push('Coupon is not active');
    }

    if (coupon.data.validFrom && now < coupon.data.validFrom) {
      errors.push('Coupon is not yet valid');
    }

    if (coupon.data.validTo && now > coupon.data.validTo) {
      errors.push('Coupon has expired');
    }

    if (coupon.data.usageLimit && coupon.data.usedCount >= coupon.data.usageLimit) {
      errors.push('Coupon usage limit exceeded');
    }

    if (coupon.data.minOrderValue && orderValue < coupon.data.minOrderValue) {
      errors.push(`Minimum order value of ${coupon.data.minOrderValue} required`);
    }

    if (userId && coupon.data.perUserLimit) {
      console.log('userRedemptions start->>>>>>>>>>');
      console.log(coupon.data.coupon_id);
      console.log(userId);

      const userRedemptions = await this.db.client.couponRedemption.count({
        where: {
          user_id: userExist.data.user_id,
          coupon_id: coupon.data.coupon_id,
        },
      });

      console.log('userRedemptions end->>>>>>>>>>');
      console.log(userRedemptions);

      if (userRedemptions >= coupon.data.perUserLimit) {
        errors.push('Per user limit exceeded');
      }
    }

    console.log(errors);
    return errors;
  };

  calculateDiscount = (coupon: any, orderValue: any) => {
    let discountAmount = 0;
    console.log('coupan value is', coupon);
    console.log('orderValue', orderValue);

    if (coupon.data.type === 'PERCENTAGE' && coupon.data.value) {
      console.log('inside if statement');
      console.log(coupon.data.type);
      console.log(coupon.data.value);
      console.log(orderValue * coupon.data.value);
      discountAmount = (orderValue * coupon.data.value) / 100;
      console.log('discount amount is heere------>');
      console.log(discountAmount);
      if (coupon.data.maxDiscount && discountAmount > coupon.data.maxDiscount) {
        discountAmount = coupon.data.maxDiscount;
        console.log('discount amount is herer----->');
        console.log(discountAmount);
      }
    } else if (coupon.data.type === 'FIXED_AMOUNT' && coupon.data.value) {
      discountAmount = Math.min(coupon.data.value, orderValue);
      console.log('discount amount is herer----->');
      console.log(discountAmount);
    } else if (coupon.data.type === 'FREE_SHIPPING') {
      discountAmount = 0;
    }
    console.log('hello final discount------->');
    console.log(discountAmount);
    return parseFloat(discountAmount.toFixed(2));
  };

  async Create(data: any): Promise<any> {
    if (!data.code) {
      data.code = await this.generateCouponCode();
    }
    // Business logic validation
    if (data.type === 'PERCENTAGE' && data.value && data.value > 100) {
      throw new InvalidInputError('Percentage discount cannot exceed 100%');
    }

    if ((data.type === 'FIXED_AMOUNT' || data.type === 'PERCENTAGE') && !data.value) {
      throw new InvalidInputError(`${data.type} discount requires a value`);
    }
    if (data.type === 'FREE_SHIPPING') {
      data.value = 0;
    }
    // Check duplicate code
    const existingCoupon = await executePrismaOperation<any>(
      'Coupon',
      {
        operation: PrismaOperationType.READ_UNIQUE,
        where: {
          code: data.code,
        },
      },
      this.db.client,
      this.logger,
    );
    console.log('cupon code is exist');
    console.log(existingCoupon);

    if (existingCoupon.data) {
      throw new InvalidInputError(`Coupon code already exists`);
    }

    // create cupon code
    const createCupon = await executePrismaOperation<any>(
      'Coupon',
      {
        operation: PrismaOperationType.CREATE,
        data: {
          ...data,
          validFrom: data.validFrom ? new Date(data.validFrom) : null,
          validTo: data.validTo ? new Date(data.validTo) : null,
        },
      },
      this.db.client,
      this.logger,
    );

    return createCupon;
  }
  async getAll(queryParams: any): Promise<any> {
    try {
      // Define allowed fields with their types for filtering/searching
      const allowedFields: Record<string, 'string' | 'int' | 'float' | 'enum' | 'datetime'> = {
        coupon_id: 'int',
        code: 'string',
        description: 'string',
        type: 'enum', // PERCENTAGE, FIXED
        value: 'float',
        minOrderValue: 'float',
        maxDiscount: 'float',
        usageLimit: 'int',
        usedCount: 'int',
        perUserLimit: 'int',
        validFrom: 'datetime',
        validTo: 'datetime',
        status: 'enum', // ACTIVE, INACTIVE, EXPIRED
        createdAt: 'datetime',
        updatedAt: 'datetime',
      };

      // Define search groups - fields that should be combined in OR search
      const combineSearchGroups: string[][] = [
        ['code', 'description'], // Search across code and description together
      ];

      // Extract directly from your request body format
      // { "filters": [], "globalSearch": "keval-kurti-test", "page": 1, "limit": 9 }
      const filters = queryParams.filters || [];
      const page = queryParams.page || 1;
      const limit = queryParams.limit || 10;
      const globalSearch = queryParams.globalSearch || '';

      console.log('🔍 Fetching coupons', { page, limit, globalSearch, filters });

      // Build Prisma query with filters, pagination, and search
      const { where, orderBy, skip, take } = buildPrismaQuery(
        filters,
        allowedFields,
        page,
        limit,
        globalSearch,
        combineSearchGroups,
      );

      // Execute parallel queries for data and count
      const [coupons, totalCount] = await Promise.all([
        this.db.client.coupon.findMany({
          where,
          skip,
          take,
          orderBy: orderBy.length > 0 ? orderBy : [{ createdAt: 'desc' }],
        }),
        this.db.client.coupon.count({ where }),
      ]);

      console.log(`✅ Retrieved ${coupons.length} coupons out of ${totalCount} total`);

      const totalPages = Math.ceil(totalCount / take);

      // Return structured response matching your format
      return {
        data: coupons,
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
      console.error('❌ Error fetching coupons', { error: error.message });
      throw new InvalidInputError(error.message);
    }
  }

  // async list(query: any = {}): Promise<any> {
  //   const {
  //     status,
  //     type,
  //     page = 1,
  //     limit = 10,
  //     search,
  //     sortBy = 'createdAt',
  //     sortOrder = 'desc',
  //   } = query;

  //   const skip = (parseInt(page) - 1) * parseInt(limit);
  //   const where: any = {};

  //   // Apply filters
  //   if (status) where.status = status;
  //   if (type) where.type = type;
  //   if (search) {
  //     where.OR = [
  //       { code: { contains: search, mode: 'insensitive' } },
  //       { description: { contains: search, mode: 'insensitive' } },
  //     ];
  //   }

  //   const [coupons, total] = await Promise.all([
  //     executePrismaOperation<any>(
  //       'Coupon',
  //       {
  //         operation: PrismaOperationType.READ,
  //         where,
  //         skip,
  //         take: parseInt(limit),
  //         orderBy: { [sortBy]: sortOrder },
  //         include: {
  //           _count: {
  //             select: {
  //               orders: true,
  //               redemptions: true,
  //             },
  //           },
  //         },
  //       },
  //       this.db.client,
  //       this.logger,
  //     ),
  //     executePrismaOperation<any>(
  //       'Coupon',
  //       {
  //         operation: PrismaOperationType.COUNT,
  //         where,
  //       },
  //       this.db.client,
  //       this.logger,
  //     ),
  //   ]);

  //   return {
  //     coupons,
  //     pagination: {
  //       total,
  //       page: parseInt(page),
  //       limit: parseInt(limit),
  //       totalPages: Math.ceil(total / parseInt(limit)),
  //     },
  //   };
  // }

  async getById(id: any): Promise<any> {
    // if (!id || isNaN(parseInt(id))) {
    //   throw new InvalidInputError('Invalid coupon ID');
    // }
    console.log('getBtyId  service is called-------');
    console.log(id);
    // const findcupon = await executePrismaOperation<any>(
    //   'Coupon',
    //   {
    //     operation: PrismaOperationType.READ_FIRST,
    //     where: {
    //       id: id,
    //     },
    //   },
    //   this.db,
    //   this.logger,
    // );
    // console.log(findcupon);
    // if (!findcupon.data) {
    //   throw new InvalidInputError('cupon is not found');
    // }
    // console.log('cupon is comming----<<');
    // console.log(findcupon);

    console.log('existing is start------>');
    const existingCoupon = await executePrismaOperation<any>(
      'Coupon',
      {
        operation: PrismaOperationType.READ_UNIQUE,
        where: {
          id: id,
        },
      },
      this.db.client,
      this.logger,
    );
    console.log(existingCoupon);
    console.log(parseInt(existingCoupon.data.coupon_id));

    const coupon = await executePrismaOperation<any>(
      'Coupon',
      {
        operation: PrismaOperationType.READ_UNIQUE,
        where: { coupon_id: 1 },
        include: {
          _count: {
            select: {
              orders: true,
              redemptions: true,
            },
          },
          redemptions: true,
        },
      },
      this.db.client,
      this.logger,
    );
    console.log('cupon is end----->');
    console.log(coupon);

    if (!coupon.data) {
      throw new InvalidInputError('Coupon not found');
    }

    return coupon.data;
  }

  async getByCode(code: any): Promise<any> {
    if (!code || code.trim().length === 0) {
      throw new InvalidInputError('Invalid coupon code');
    }

    const coupon = await executePrismaOperation<any>(
      'Coupon',
      {
        operation: PrismaOperationType.READ_UNIQUE,
        where: { code: code.trim() },
        include: {
          _count: {
            select: {
              orders: true,
              redemptions: true,
            },
          },
        },
      },
      this.db.client,
      this.logger,
    );

    if (!coupon) {
      throw new InvalidInputError('Coupon not found');
    }

    return coupon.data;
  }

  async update(id: any, data: any): Promise<any> {
    if (!id || isNaN(parseInt(id))) {
      throw new InvalidInputError('Invalid coupon ID');
    }

    // Check if coupon exists
    const existingCoupon: any = await executePrismaOperation<any>(
      'Coupon',
      {
        operation: PrismaOperationType.READ_UNIQUE,
        where: { id: id },
      },
      this.db.client,
      this.logger,
    );

    if (!existingCoupon) {
      throw new InvalidInputError('Coupon not found');
    }

    // Check duplicate code if code is being updated
    if (data.code && data.code !== existingCoupon.code) {
      const duplicateCoupon = await executePrismaOperation<any>(
        'Coupon',
        {
          operation: PrismaOperationType.READ_UNIQUE,
          where: { code: data.code },
        },
        this.db.client,
        this.logger,
      );

      if (duplicateCoupon) {
        throw new InvalidInputError('Coupon code already exists');
      }
    }

    // Business logic validation
    if (data.type === 'PERCENTAGE' && data.value && data.value > 100) {
      throw new InvalidInputError('Percentage discount cannot exceed 100%');
    }

    // Handle FREE_SHIPPING type
    if (data.type === 'FREE_SHIPPING') {
      data.value = 0;
    }

    const updatedCoupon = await executePrismaOperation<any>(
      'Coupon',
      {
        operation: PrismaOperationType.UPDATE,
        where: { coupon_id: parseInt(id) },
        data: {
          ...data,
          validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
          validTo: data.validTo ? new Date(data.validTo) : undefined,
        },
      },
      this.db.client,
      this.logger,
    );

    return updatedCoupon;
  }

  async delete(id: any): Promise<any> {
    const existingCoupon = await executePrismaOperation<any>(
      'Coupon',
      {
        operation: PrismaOperationType.READ_UNIQUE,
        where: { id: id },
      },
      this.db.client,
      this.logger,
    );
    console.log('cupon is comming--->');
    console.log(existingCoupon);

    if (!existingCoupon.data) {
      throw new InvalidInputError('Coupon not found');
    }

    // Soft delete by setting status to INACTIVE
    const deletedCoupon = await executePrismaOperation<any>(
      'Coupon',
      {
        operation: PrismaOperationType.UPDATE,
        where: { id: id },
        data: { status: 'EXPIRED' },
      },
      this.db.client,
      this.logger,
    );

    return deletedCoupon;
  }

  async validate(data: any): Promise<any> {
    const { code, orderValue, userId } = data;
    console.log('validate is called------->');
    console.log(data);

    if (!code || code.trim().length === 0) {
      throw new InvalidInputError('Invalid coupon code');
    }

    const coupon: any = await executePrismaOperation<any>(
      'Coupon',
      {
        operation: PrismaOperationType.READ_UNIQUE,
        where: { code: code.trim() },
      },
      this.db.client,
      this.logger,
    );
    console.log('cupon daya is here------->');
    console.log(coupon);

    if (!coupon.data) {
      throw new InvalidInputError('Coupon not found');
    }

    // Business logic validation
    const validationErrors = await this.validateCouponBusinessLogic(coupon, orderValue, userId);

    if (validationErrors.length > 0) {
      throw new InvalidInputError(`Coupon validation failed: ${validationErrors.join(', ')}`);
    }

    // Calculate discount
    console.log('order value is ------->');
    console.log(orderValue);
    const discountAmount = this.calculateDiscount(coupon, orderValue);

    return {
      coupon: {
        id: coupon.data.id,
        code: coupon.data.code,
        type: coupon.data.type,
        value: coupon.data.value,
        description: coupon.data.description,
      },
      discountAmount,
      finalAmount: parseFloat((orderValue - discountAmount).toFixed(2)),
    };
  }

  async updateStatus(id: any, status: any): Promise<any> {
    if (!id || isNaN(parseInt(id))) {
      throw new InvalidInputError('Invalid coupon ID');
    }

    if (!['ACTIVE', 'INACTIVE', 'EXPIRED'].includes(status)) {
      throw new InvalidInputError('Invalid status. Must be ACTIVE, INACTIVE, or EXPIRED');
    }

    const existingCoupon = await executePrismaOperation<any>(
      'Coupon',
      {
        operation: PrismaOperationType.READ_UNIQUE,
        where: { coupon_id: parseInt(id) },
      },
      this.db.client,
      this.logger,
    );

    if (!existingCoupon) {
      throw new InvalidInputError('Coupon not found');
    }

    const updatedCoupon = await executePrismaOperation<any>(
      'Coupon',
      {
        operation: PrismaOperationType.UPDATE,
        where: { coupon_id: parseInt(id) },
        data: { status },
      },
      this.db.client,
      this.logger,
    );

    return updatedCoupon;
  }

  async getCouponStatistics(id: any): Promise<any> {
    console.log('statastics is start-------->>');
    if (!id || isNaN(parseInt(id))) {
      throw new InvalidInputError('Invalid coupon ID');
    }

    const coupon: any = await executePrismaOperation<any>(
      'Coupon',
      {
        operation: PrismaOperationType.READ_UNIQUE,
        where: { coupon_id: parseInt(id) },
        include: {
          _count: {
            select: {
              orders: true,
              redemptions: true,
            },
          },
          orders: true,
          redemptions: true,
        },
        // include: {
        //   _count: {
        //     select: {
        //       orders: true,
        //       CouponRedemption: true,
        //     },
        //   },
        //   // redemptions: {
        //   //   select: {
        //   //     orderValue: true,
        //   //     discountAmount: true,
        //   //     createdAt: true,
        //   //   },
        //   // },
        //   // CouponRedemption: true,
        // },
      },
      this.db.client,
      this.logger,
    );
    console.log('cuspon is called');
    console.log(coupon);

    if (!coupon.data) {
      throw new InvalidInputError('Coupon not found');
    }

    const totalDiscount = coupon.redemptions.reduce(
      (sum: any, redemption: any) => sum + redemption.discountAmount,
      0,
    );

    const totalOrderValue = coupon.redemptions.reduce(
      (sum: any, redemption: any) => sum + redemption.orderValue,
      0,
    );

    const averageOrderValue =
      coupon.redemptions.length > 0 ? totalOrderValue / coupon.redemptions.length : 0;

    const usageRate = coupon.usageLimit
      ? ((coupon.usedCount / coupon.usageLimit) * 100).toFixed(2)
      : null;

    // Group redemptions by date
    const redemptionsByDate = coupon.redemptions.reduce((acc: any, redemption: any) => {
      const date = redemption.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return {
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
      },
      statistics: {
        totalRedemptions: coupon._count.redemptions,
        totalOrders: coupon._count.orders,
        totalDiscount,
        totalOrderValue,
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
        usageRate,
        remainingUsage: coupon.usageLimit ? coupon.usageLimit - coupon.usedCount : null,
        redemptionsByDate,
      },
    };
  }

  // async getRedemptionHistory(code: any, query: any = {}): Promise<any> {
  //   const { page = 1, limit = 10 } = query;
  //   const skip = (page - 1) * limit;

  //   const coupon = await executePrismaOperation<any>(
  //     'Coupon',
  //     {
  //       operation: PrismaOperationType.READ_UNIQUE,
  //       where: { code },
  //     },
  //     this.db.client,
  //     this.logger,
  //   );

  //   if (!coupon) {
  //     throw new InvalidInputError('Coupon not found');
  //   }

  //   const [redemptions, total] = await Promise.all([
  //     executePrismaOperation<any>(
  //       'CouponRedemption',
  //       {
  //         operation: PrismaOperationType.READ_MANY,
  //         where: { couponId: coupon.id },
  //         skip: parseInt(skip),
  //         take: parseInt(limit),
  //         orderBy: { createdAt: 'desc' },
  //         select: {
  //           id: true,
  //           userId: true,
  //           orderId: true,
  //           orderValue: true,
  //           discountAmount: true,
  //           createdAt: true,
  //         },
  //       },
  //       this.db.client,
  //       this.logger,
  //     ),
  //     executePrismaOperation<any>(
  //       'CouponRedemption',
  //       {
  //         operation: PrismaOperationType.COUNT,
  //         where: { couponId: coupon.id },
  //       },
  //       this.db.client,
  //       this.logger,
  //     ),
  //   ]);

  //   return {
  //     coupon: {
  //       code: coupon.code,
  //       type: coupon.type,
  //       value: coupon.value,
  //     },
  //     redemptions,
  //     pagination: {
  //       total,
  //       page: parseInt(page),
  //       limit: parseInt(limit),
  //       totalPages: Math.ceil(total / limit),
  //     },
  //   };
  // }

  async getUserCoupons(userId: any, query: any = {}): Promise<any> {
    const { status } = query;
    const where: any = { userId };

    // Add status filter if provided
    if (status) {
      where.coupon = { status };
    }

    const [redemptions, total]: any = await Promise.all([
      executePrismaOperation<any>(
        'CouponRedemption',
        {
          operation: PrismaOperationType.READ,
          where,
          include: {
            coupon: {
              select: {
                code: true,
                description: true,
                type: true,
                value: true,
                status: true,
              },
            },
          },
        },
        this.db.client,
        this.logger,
      ),
      executePrismaOperation<any>(
        'CouponRedemption',
        {
          operation: PrismaOperationType.COUNT,
          where,
        },
        this.db.client,
        this.logger,
      ),
    ]);

    const totalSavings = redemptions?.reduce(
      (sum: any, redemption: any) => sum + redemption.discountAmount,
      0,
    );

    return {
      userId,
      redemptions,
      summary: {
        totalRedemptions: total,
        totalSavings: parseFloat(totalSavings.toFixed(2)),
      },
    };
  }

  async redeem(data: any) {
    const { orderValue, userId, orderId, code } = data;
    console.log('redeeem is herer----->');
    console.log(data);

    if (!code || code.trim().length === 0) {
      throw new InvalidInputError('Invalid coupon code');
    }
    const userExist = await executePrismaOperation<'UserInput'>(
      'user',
      {
        operation: PrismaOperationType.READ,
        where: {
          id: userId,
        },
      },
      this.db.client,
      this.logger,
    );
    console.log('find user is always exist or not');
    console.log(userExist);

    if (!userExist) {
      throw new InvalidInputError('user is not found');
    }

    // Fetch coupon
    const coupon = await executePrismaOperation<any>(
      'Coupon',
      {
        operation: PrismaOperationType.READ_UNIQUE,
        where: { code: code.trim() },
      },
      this.db.client,
      this.logger,
    );
    console.log('coupon data -------->');
    console.log(coupon);
    if (!coupon.data) {
      throw new InvalidInputError('Coupon code not found');
    }

    // Validate business logic (expiry, user limits, min order value, etc.)
    const validationErrors = await this.validateCouponBusinessLogic(coupon, orderValue, userId);
    console.log('validationErrors------->');
    console.log(validationErrors);

    if (validationErrors.length > 0) {
      throw new InvalidInputError('Coupon validation failed');
    }

    const discountAmount = this.calculateDiscount(coupon, orderValue);
    console.log('hello finalest discount======>');
    console.log(discountAmount);

    // Run everything in a transaction
    const result = await this.db.client.$transaction(async (prisma: any) => {
      // Update coupon usage count
      const updatedCoupon = await prisma.coupon.update({
        where: { code: code.trim() },
        data: {
          usedCount: { increment: 1 },
        },
      });
      console.log('cupon code updated sucessfully=======>');
      console.log(updatedCoupon);

      // Create redemption record
      const redemption = await this.db.client.CouponRedemption.create({
        data: {
          coupon_id: updatedCoupon.coupon_id, // Use 'id' instead of 'coupon_id'
          user_id: userExist.data[0].user_id,
          order_id: orderId,
        },
      });

      return { updatedCoupon, redemption, discountAmount };
    });
    console.log('readmeee final result is here----->');
    console.log(result);

    return {
      success: true,
      discountAmount: result.discountAmount,
      redemption: result.redemption,
    };
  }

  async revert(data: any) {
    const { code, redemptionId, userId, orderId } = data;

    if (!redemptionId && (!userId || !orderId)) {
      throw new InvalidInputError('Either redemption ID or user ID and order ID are required');
    }
    if (!code || code.trim().length === 0) {
      throw new InvalidInputError('Invalid coupon code');
    }

    const coupon: any = await executePrismaOperation(
      'Coupon',
      {
        operation: PrismaOperationType.READ_UNIQUE,
        where: {
          code: code.trim(),
        },
      },
      this.db.client,
      this.logger,
    );
    console.log('cupon is found and not------->>');
    console.log(coupon);

    if (!coupon.data) {
      throw new InvalidInputError('Coupon not found');
    }

    const whereClause: any = { coupon_id: coupon.data.coupon_id };
    if (redemptionId) {
      whereClause.id = redemptionId;
    } else {
      whereClause.userId = userId;
      whereClause.orderId = orderId;
    }
    console.log('where clused calld');
    console.log(whereClause);
    // Find redemption
    const redemption: any = await executePrismaOperation(
      'CouponRedemption',
      {
        operation: PrismaOperationType.READ_FIRST,
        where: whereClause,
      },
      this.db.client,
      this.logger,
    );
    console.log('first reduption is here------>');
    console.log(redemption);

    if (!redemption.data) {
      throw new InvalidInputError('Redemption not found');
    }

    await this.db.client.$transaction(async (prisma: any) => {
      // Delete redemption record
      await prisma.couponRedemption.delete({
        where: {
          id: redemption.data.id,
        },
      });

      // Decrement coupon usage count
      await prisma.coupon.update({
        where: { id: coupon.data.id },
        data: { usedCount: { decrement: 1 } },
      });
    });

    return 'Coupon redemption reverted successfully';
  }
}
