// promotion.service.ts

import { injectable } from '../../services/di-container';
import { IService } from '../../interfaces/service.interface';
import { ILoggerService } from '../../services/logger.service';
import { IPromotionsService } from '../../interfaces/promotions-service.interface';
import {
  Promotion,
  CreatePromotionDTO,
  UpdatePromotionDTO,
  ValidateCartRequest,
  PromotionValidationResult,
  AddEligibleProductDTO,
  AddFreeProductDTO,
  PromotionStatsResponse,
  CartItem,
  PromotionType,
  PromotionStatus,
  DiscountCalculation,
  FreeProductOption,
  UserPromotionHistoryItem,
} from './promotion.types';
import { InvalidInputError } from '../../utils/error.utils';
import { executePrismaOperation, PrismaOperationType } from '../../utils/prisma.utils';
import { IDatabaseService } from '../../interfaces/database-service.interface';
import { buildPrismaQuery, parseQueryParams } from '../../utils/prisma-query-builder';
import _, { includes } from 'lodash';
import { IProductsService } from '../../interfaces/products-service.interface';

@injectable()
export class PromotionService implements IService, IPromotionsService {
  static dependencies = ['LoggerService', 'DatabaseService', 'ProductsService'];
  static optionalDependencies: string[] = [];

  private promotion: any[] = [
    { id: 1, name: 'Sample Promotion 1', createdAt: new Date().toISOString() },
    { id: 2, name: 'Sample Promotion 2', createdAt: new Date().toISOString() },
  ];

  private db: IDatabaseService;
  private logger: ILoggerService;
  private productService: IProductsService;

  // Allowed fields for filtering
  private readonly getAllPromotionsFields = {
    promotion_id: 'int' as const,
    name: 'string' as const,
    description: 'string' as const,
    type: 'enum' as const,
    status: 'enum' as const,
    buyQuantity: 'int' as const,
    getQuantity: 'int' as const,
    priority: 'int' as const,
    validFrom: 'datetime' as const,
    validTo: 'datetime' as const,
    usageLimit: 'int' as const,
    usedCount: 'int' as const,
    perUserLimit: 'int' as const,
    minPurchaseAmount: 'float' as const,
    createdAt: 'datetime' as const,
    updatedAt: 'datetime' as const,
  };

  private readonly getPromotionReportFields = {
    promotion_id: 'int' as const,
    name: 'string' as const,
    type: 'enum' as const,
    status: 'enum' as const,
    priority: 'int' as const,
    validFrom: 'datetime' as const,
    validTo: 'datetime' as const,
    usedCount: 'int' as const,
    usageLimit: 'int' as const,
    createdAt: 'datetime' as const,
    updatedAt: 'datetime' as const,
  };

  private readonly getEligibleProductsFields = {
    promotion_eligible_prod_id: 'int' as const,
    product_id: 'int' as const,
    category_id: 'int' as const,
    'product.name': 'string' as const,
    'product.slug': 'string' as const,
    'product.basePrice': 'float' as const,
    'product.isVisible': 'boolean' as const,
    'category.name': 'string' as const,
    'category.slug': 'string' as const,
    createdAt: 'datetime' as const,
  };

  private readonly getFreeProductsFields = {
    promotion_free_prod_id: 'int' as const,
    product_id: 'int' as const,
    size_variant_id: 'int' as const,
    maxQuantity: 'int' as const,
    displayOrder: 'int' as const,
    'product.name': 'string' as const,
    'product.basePrice': 'float' as const,
    'sizeVariant.size': 'string' as const,
    'sizeVariant.price': 'float' as const,
    'sizeVariant.stock': 'int' as const,
    'sizeVariant.isAvailable': 'boolean' as const,
    createdAt: 'datetime' as const,
  };

  private readonly getUserPromotionHistoryFields = {
    promotion_redemption_id: 'int' as const,
    'promotion.name': 'string' as const,
    'promotion.type': 'enum' as const,
    'order.order_id': 'int' as const,
    'order.grandTotal': 'float' as const,
    'order.placedAt': 'datetime' as const,
    'order.status': 'enum' as const,
    purchasedQuantity: 'int' as const,
    freeQuantity: 'int' as const,
    appliedAt: 'datetime' as const,
    createdAt: 'datetime' as const,
  };

  constructor(logger: ILoggerService, db: IDatabaseService, productservice: IProductsService) {
    this.logger = logger;
    this.logger.info('PromotionService instantiated');
    this.db = db;
    this.productService = productservice;
  }

  async initialize() {
    this.logger.info('PromotionService initialized with in-memory data');
  }

  async createPromotion(data: CreatePromotionDTO): Promise<Promotion> {
    try {
      this.validatePromotionDates(new Date(data.validFrom), new Date(data.validTo));
      this.validatePromotionQuantities(data.buyQuantity, data.getQuantity, data.type);

      const result = await executePrismaOperation(
        'promotion',
        {
          operation: PrismaOperationType.CREATE,
          data: {
            name: data.name,
            description: data.description,
            type: data.type,
            status: this.determineInitialStatus(new Date(data.validFrom)),
            buyQuantity: data.buyQuantity,
            getQuantity: data.getQuantity,
            priority: data.priority || 0,
            validFrom: new Date(data.validFrom),
            validTo: new Date(data.validTo),
            usageLimit: data.usageLimit,
            perUserLimit: data.perUserLimit,
            minPurchaseAmount: data.minPurchaseAmount,
            usedCount: 0,
          },
        },
        this.db.client,
        this.logger,
      );

      return result.data;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async getAllPromotions(queryParams?: any): Promise<any> {
    try {
      const { filters, page, limit, globalSearch } = parseQueryParams(queryParams || {});

      const { where, orderBy, skip, take } = buildPrismaQuery(
        filters,
        this.getAllPromotionsFields,
        page,
        limit,
        globalSearch,
        [['name', 'description']],
        false,
      );

      const promotions = await this.db.client.promotion.findMany({
        where,
        orderBy: orderBy.length > 0 ? orderBy : { priority: 'desc' },
        skip,
        take,
        include: {
          eligibleProducts: {
            include: {
              product: {
                select: {
                  product_id: true,
                  name: true,
                  slug: true,
                  basePrice: true,
                },
              },
              category: {
                select: {
                  category_id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          freeProducts: {
            include: {
              product: {
                select: {
                  product_id: true,
                  name: true,
                  basePrice: true,
                },
              },
              sizeVariant: {
                select: {
                  product_size_var_id: true,
                  size: true,
                  price: true,
                  stock: true,
                },
              },
            },
          },
          _count: {
            select: {
              redemptions: true,
            },
          },
        },
      });

      const total = await this.db.client.promotion.count({ where });

      return {
        data: promotions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / take),
        },
      };
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async getPromotionById(id: string): Promise<Promotion> {
    try {
      const promotion = await executePrismaOperation(
        'promotion',
        {
          operation: PrismaOperationType.READ_UNIQUE,
          where: { id: id },
          include: {
            eligibleProducts: {
              include: {
                product: {
                  include: {
                    colors: {
                      include: {
                        sizeVariants: {
                          where: { isAvailable: true },
                        },
                      },
                    },
                    images: true,
                  },
                },
                category: {
                  include: {
                    products: {
                      select: {
                        product_id: true,
                        name: true,
                        basePrice: true,
                      },
                    },
                  },
                },
              },
            },
            freeProducts: {
              include: {
                product: {
                  include: {
                    colors: {
                      include: {
                        images: true,
                        sizeVariants: {
                          where: { isAvailable: true },
                        },
                      },
                    },
                    images: true,
                  },
                },
                sizeVariant: {
                  include: {
                    productColor: {
                      include: {
                        product: true,
                        images: true,
                      },
                    },
                  },
                },
              },
            },
            _count: {
              select: {
                redemptions: true,
              },
            },
          },
        },
        this.db.client,
        this.logger,
      );

      if (!promotion.data) {
        throw new InvalidInputError('Promotion not found');
      }

      return promotion.data;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async updatePromotion(id: string, data: UpdatePromotionDTO): Promise<Promotion> {
    try {
      const item = await this.getPromotionById(id);
      if (!item) throw new InvalidInputError('Promotion not found');

      if (data.validFrom && data.validTo) {
        this.validatePromotionDates(new Date(data.validFrom), new Date(data.validTo));
      }

      const updateData: any = { ...data };
      if (data.validFrom) updateData.validFrom = new Date(data.validFrom);
      if (data.validTo) updateData.validTo = new Date(data.validTo);

      const result = await executePrismaOperation(
        'promotion',
        {
          operation: PrismaOperationType.UPDATE,
          where: { id: id },
          data: {
            ...updateData,
            updatedAt: new Date(),
          },
          include: {
            eligibleProducts: true,
            freeProducts: true,
          },
        },
        this.db.client,
        this.logger,
      );

      return result.data;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async updatePromotionStatus(id: string, status: string): Promise<Promotion> {
    try {
      const item = await this.getPromotionById(id);
      if (!item) throw new InvalidInputError('Promotion not found');

      if (!Object.values(PromotionStatus).includes(status as PromotionStatus)) {
        throw new InvalidInputError('Invalid promotion status');
      }

      const result = await executePrismaOperation(
        'promotion',
        {
          operation: PrismaOperationType.UPDATE,
          where: { id: id },
          data: {
            status: status as PromotionStatus,
            updatedAt: new Date(),
          },
        },
        this.db.client,
        this.logger,
      );

      return result.data;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async deletePromotion(id: string): Promise<boolean> {
    try {
      const item = await this.getPromotionById(id);
      console.log('item data =========>>');
      console.log(item);
      if (!item) throw new InvalidInputError('Promotion not found');

      const redemptionCount = await this.db.client.promotionRedemption.count({
        where: { promotion_id: item.promotion_id },
      });
      console.log('redemptionCount =========>>');
      console.log(redemptionCount);
      if (redemptionCount > 0) {
        await this.db.client.promotion.update({
          where: { id: id },
          data: { status: PromotionStatus.INACTIVE },
        });
      } else {
        await this.db.client.promotion.delete({
          where: { id: id },
        });
      }

      return true;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async addEligibleProducts(promotionId: string, data: any): Promise<any> {
    try {
      console.log('data is coming');
      console.log(data);

      const promotion = await this.getPromotionById(promotionId);
      if (!promotion) throw new InvalidInputError('Promotion not found');

      if (!data || data.length === 0) {
        throw new InvalidInputError('No products or categories provided');
      }

      // Collect all product IDs to validate
      let allProductIds: string[] = [];
      const errors: string[] = [];

      for (const item of data) {
        if (!item.product_id && !item.category_id) {
          errors.push('Either product_id or category_id is required');
          continue;
        }

        if (item.product_id) {
          const existproduct = await this.db.client.product.findUnique({
            where: { id: item.product_id },
          });

          if (!existproduct) {
            errors.push(`Product not found: ${item.product_id}`);
            continue;
          }

          console.log('exist product:', existproduct);
          allProductIds.push(existproduct.product_id);
        } else if (item.category_id) {
          const findcategory = await this.db.client.Category.findUnique({
            where: { id: item.category_id },
          });

          if (!findcategory) {
            errors.push(`Category not found: ${item.category_id}`);
            continue;
          }

          // Fetch all products in this category
          const productsInCategory = await this.db.client.product.findMany({
            where: { category_id: findcategory.category_id },
            select: { product_id: true },
          });

          console.log('products in category:', productsInCategory);

          if (!productsInCategory || productsInCategory.length === 0) {
            errors.push(`No products found for category: ${item.category_id}`);
            continue;
          }

          allProductIds.push(...productsInCategory.map((p: any) => p.product_id));
        }
      }

      // After checking all items, throw errors if any
      if (errors.length > 0) {
        throw new InvalidInputError(errors.join('; '));
      }

      console.log('all products:', allProductIds);

      // Remove duplicates
      allProductIds = Array.from(new Set(allProductIds));

      // Check if all product IDs exist in product table
      const existingProducts = await this.db.client.product.findMany({
        where: { product_id: { in: allProductIds } },
        select: { product_id: true },
      });

      console.log('existing products:', existingProducts);
      const existingProductIds = existingProducts.map((p: any) => p.product_id);
      console.log('existingProductIds:', existingProductIds);

      const missingProducts = allProductIds.filter((id) => !existingProductIds.includes(id));
      if (missingProducts.length > 0) {
        throw new InvalidInputError(`Products not available: ${missingProducts.join(', ')}`);
      }

      // Verify promotion exists
      const isexistPromotion = await this.db.client.promotion.findUnique({
        where: { id: promotionId },
      });

      if (!isexistPromotion) {
        throw new InvalidInputError('Promotion is not exist');
      }

      console.log('promotion:', promotion);

      // Remove products already added to this promotion
      const alreadyAddedProducts = await this.db.client.promotionEligibleProduct.findMany({
        where: {
          promotion_id: isexistPromotion.promotion_id,
          product_id: { in: allProductIds },
        },
        select: { product_id: true },
      });

      console.log('alreadyAddedProducts:', alreadyAddedProducts);
      const alreadyAddedIds = alreadyAddedProducts.map((p: any) => p.product_id);
      console.log('alreadyAddedIds:', alreadyAddedIds);

      const newProductIds = allProductIds.filter((id) => !alreadyAddedIds.includes(id));
      console.log('newProductIds:', newProductIds);

      if (newProductIds.length === 0) {
        throw new InvalidInputError('All products are already eligible for this promotion');
      }

      // Add eligible products
      const eligibleProducts = [];
      for (const productId of newProductIds) {
        const result = await executePrismaOperation(
          'promotionEligibleProduct',
          {
            operation: PrismaOperationType.CREATE,
            data: {
              promotion_id: isexistPromotion.promotion_id,
              product_id: productId,
              category_id: null,
            },
            include: {
              product: true,
              category: true,
            },
          },
          this.db.client,
          this.logger,
        );
        eligibleProducts.push(result.data);
      }

      return eligibleProducts;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async ListEligibleProducts(data?: any): Promise<any> {
    try {
      // Define allowed fields for filtering and search
      const allowedFields = {
        // ========== Direct PromotionEligibleProduct Fields ==========
        id: 'uuid',
        promotion_id: 'uuid',
        product_id: 'uuid',
        category_id: 'uuid',
        discountType: 'enum',
        discountValue: 'float',
        maxDiscountAmount: 'float',
        minPurchaseAmount: 'float',
        createdAt: 'datetime',
        updatedAt: 'datetime',

        'product.name': 'string',
        'product.slug': 'string',

        // ========== Category Relations ==========
        'category.id': 'uuid',
        'category.category_id': 'int',
        'category.name': 'string',
        'category.slug': 'string',
        'category.description': 'string',

        // ========== Promotion Relations ==========

        'promotion.name': 'string',
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

      // Define fields to combine for global search
      const combineFieldsGroups = [
        ['product.name', 'product.slug', 'product.sku'],
        ['category.name', 'category.slug'],
        ['promotion.name', 'promotion.code'],
      ];

      // Build dynamic filters using buildPrismaQuery
      const { where, orderBy, skip, take } = buildPrismaQuery(
        filters,
        allowedFields,
        page,
        limit,
        globalSearch,
        combineFieldsGroups,
      );

      // Execute queries in parallel
      const [eligibleProducts, totalCount] = await Promise.all([
        this.db.client.promotionEligibleProduct.findMany({
          where,
          orderBy: orderBy.length > 0 ? orderBy : { createdAt: 'desc' },
          skip,
          take,
          include: {
            product: {
              include: {
                colors: {
                  take: 1, // Only fetch the first color
                  include: {
                    images: {
                      where: { isPrimary: true },
                      take: 2, // Fetch primary image + video if available
                    },
                    sizeVariants: true,
                  },
                },
                category: true,
                images: {
                  where: { isPrimary: true },
                },
              },
            },
            category: {
              include: {
                products: {
                  select: {
                    product_id: true,
                    name: true,
                    basePrice: true,
                    slug: true,
                  },
                  take: 5, // Limit related products
                },
              },
            },
            promotion: true,
          },
        }),
        this.db.client.promotionEligibleProduct.count({ where }),
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / take);

      return {
        success: true,
        data: eligibleProducts,
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

  async getEligibleProducts(promotionId: string, queryParams?: any): Promise<any> {
    try {
      const item = await this.getPromotionById(promotionId);
      if (!item) throw new InvalidInputError('Promotion not found');

      const { filters, page, limit, globalSearch } = parseQueryParams(queryParams || {});

      const {
        where: filterWhere,
        orderBy,
        skip,
        take,
      } = buildPrismaQuery(
        filters,
        this.getEligibleProductsFields,
        page,
        limit,
        globalSearch,
        [['product.name']],
        false,
      );

      const where = {
        promotion_id: item.promotion_id,
        ...filterWhere,
      };

      const eligibleProducts = await this.db.client.promotionEligibleProduct.findMany({
        where,
        include: {
          product: {
            include: {
              colors: {
                include: {
                  sizeVariants: {
                    where: { isAvailable: true },
                  },
                },
              },
              images: true,
              category: true,
            },
          },
          category: {
            include: {
              products: {
                select: {
                  product_id: true,
                  name: true,
                  basePrice: true,
                  slug: true,
                },
              },
            },
          },
        },
        orderBy: orderBy.length > 0 ? orderBy : { createdAt: 'desc' },
        skip,
        take,
      });

      const total = await this.db.client.promotionEligibleProduct.count({ where });

      return {
        data: eligibleProducts,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / take),
        },
      };
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async removeEligibleProduct(promotionId: string, productId: string): Promise<boolean> {
    try {
      console.log('promotionId and productId:', promotionId, productId);
      const item = await this.getPromotionById(promotionId);
      if (!item) throw new InvalidInputError('Promotion not found');
      const product = await this.productService.getById(productId);
      if (!product) throw new InvalidInputError('product not found');
      const eligibleProduct = await this.db.client.promotionEligibleProduct.findFirst({
        where: {
          promotion_id: item.promotion_id,
          product_id: product.product_id,
        },
      });

      if (!eligibleProduct) {
        throw new InvalidInputError('Eligible product not found');
      }

      await this.db.client.promotionEligibleProduct.delete({
        where: { promotion_eligible_prod_id: eligibleProduct.promotion_eligible_prod_id },
      });

      return true;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async addFreeProducts(promotionId: string, data: AddFreeProductDTO[]): Promise<any> {
    try {
      const item = await this.getPromotionById(promotionId);
      if (!item) throw new InvalidInputError('Promotion not found');

      if (item.type !== PromotionType.BUY_X_GET_Y_FREE) {
        throw new InvalidInputError(
          'Free products can only be added to BUY_X_GET_Y_FREE promotions',
        );
      }

      if (!data || data.length === 0) {
        throw new InvalidInputError('No free products provided');
      }

      const freeProducts: AddFreeProductDTO[] = [];

      for (const product of data) {
        if (!product.product_id) {
          throw new InvalidInputError('product_id is required for all free products');
        }

        // Verify each product exists
        const productExists = await this.db.client.product.findUnique({
          where: { id: product.product_id },
        });
        if (!productExists) {
          throw new InvalidInputError(`Product with ID ${product.product_id} does not exist`);
        }

        const alreadyInPromotion = await this.db.client.promotionFreeProduct.findFirst({
          where: {
            promotion_id: item.promotion_id,
            product_id: productExists.product_id,
          },
        });
        if (alreadyInPromotion) {
          throw new InvalidInputError(`Product  is already added to this promotion`);
        }

        // Create promotionFreeProduct record
        await executePrismaOperation(
          'promotionFreeProduct',
          {
            operation: PrismaOperationType.CREATE,
            data: {
              promotion_id: item.promotion_id,
              product_id: productExists.product_id,
              size_variant_id: null, // always null
              maxQuantity: product.maxQuantity,
              displayOrder: product.displayOrder || 0,
            },
          },
          this.db.client,
          this.logger,
        );

        // Store in the same format as request body
        freeProducts.push({
          product_id: product.product_id,
          maxQuantity: product.maxQuantity,
          displayOrder: product.displayOrder || 0,
        });
      }

      return { products: freeProducts }; // same format as request body
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async getFreeProducts(promotionId: string, queryParams?: any): Promise<any> {
    try {
      const item = await this.db.client.promotion.findFirst({
        where: {
          id: promotionId,
        },
      });
      console.log('promotion is herere------>');
      console.log(promotionId);
      if (!item) throw new InvalidInputError('Promotion not found');

      const { filters, page, limit, globalSearch } = parseQueryParams(queryParams || {});

      const {
        where: filterWhere,
        orderBy,
        skip,
        take,
      } = buildPrismaQuery(
        filters,
        this.getFreeProductsFields,
        page,
        limit,
        globalSearch,
        [['product.name']],
        false,
      );

      const where = {
        promotion_id: item.promotion_id,
        ...filterWhere,
      };

      const freeProducts = await this.db.client.promotionFreeProduct.findMany({
        where,
        include: {
          product: {
            include: {
              reviews: true,
              category: true,
              colors: {
                take: 1, // only fetch the first color
                include: {
                  images: {
                    where: { isPrimary: true },
                    take: 2, // fetch image + video if available
                  },
                },
              },
              images: {
                where: { isPrimary: true },
              },
            },
          },
          sizeVariant: {
            include: {
              productColor: {
                include: {
                  product: {
                    include: {
                      images: true,
                    },
                  },
                  images: true,
                },
              },
            },
          },
        },
        orderBy: orderBy.length > 0 ? orderBy : { displayOrder: 'asc' },
        skip,
        take,
      });

      const total = await this.db.client.promotionFreeProduct.count({ where });

      return {
        data: freeProducts,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / take),
        },
      };
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async removeFreeProduct(promotionId: string, freeProductId: string): Promise<boolean> {
    try {
      const item: any = await this.getPromotionById(promotionId);
      if (!item) throw new InvalidInputError('Promotion not found');

      const freeProduct = await this.db.client.promotionFreeProduct.findUnique({
        where: { id: freeProductId },
      });

      if (!freeProduct || freeProduct.promotion_id !== item?.promotion_id) {
        throw new InvalidInputError('Free product not found');
      }

      await this.db.client.promotionFreeProduct.delete({
        where: { id: freeProduct?.id },
      });

      return true;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async validateCart(data: ValidateCartRequest): Promise<PromotionValidationResult[]> {
    try {
      if (!data.items || data.items.length === 0) {
        throw new InvalidInputError('Cart is empty');
      }

      const activePromotions = await this.db.client.promotion.findMany({
        where: {
          status: PromotionStatus.ACTIVE,
          validFrom: { lte: new Date() },
          validTo: { gte: new Date() },
        },
        include: {
          eligibleProducts: {
            include: {
              product: true,
              category: true,
            },
          },
          freeProducts: {
            include: {
              product: true,
              sizeVariant: true,
            },
          },
        },
        orderBy: { priority: 'desc' },
      });
      console.log('active promotions:');
      console.log(activePromotions);

      const validationResults: PromotionValidationResult[] = [];

      for (const promotion of activePromotions) {
        if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) {
          continue;
        }

        if (data.user_id && promotion.perUserLimit) {
          const userRedemptionCount = await this.db.client.promotionRedemption.count({
            where: {
              promotion_id: promotion.promotion_id,
              user_id: data.user_id,
            },
          });
          console.log(
            'userRedemptionCount for promotion',
            promotion.promotion_id,
            ':',
            userRedemptionCount,
          );

          if (userRedemptionCount >= promotion.perUserLimit) {
            continue;
          }
        }

        let result: PromotionValidationResult;

        switch (promotion.type) {
          case PromotionType.BUY_X_GET_Y_FREE:
            console.log('hello PromotionType.BUY_X_GET_Y_FREE');
            result = await this.validateBuyXGetY(promotion, data.items);
            break;
          case PromotionType.QUANTITY_DISCOUNT:
            result = await this.validateQuantityDiscount(promotion, data.items);
            break;
          case PromotionType.BUNDLE_DEAL:
            result = await this.validateBundleDeal(promotion, data.items);
            break;
          case PromotionType.TIERED_DISCOUNT:
            result = await this.validateTieredDiscount(promotion, data.items);
            break;
          default:
            result = { isEligible: false };
        }

        if (result.isEligible) {
          result.promotionName = promotion.name;
          validationResults.push(result);
        }
      }

      return validationResults;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async getActivePromotions(): Promise<Promotion[]> {
    try {
      const promotions = await this.db.client.promotion.findMany({
        where: {
          status: PromotionStatus.ACTIVE,
          validFrom: { lte: new Date() },
          validTo: { gte: new Date() },
        },
        include: {
          eligibleProducts: {
            include: {
              product: {
                select: {
                  product_id: true,
                  name: true,
                  slug: true,
                  basePrice: true,
                },
              },
              category: {
                select: {
                  category_id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
        orderBy: { priority: 'desc' },
      });

      return promotions;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  // async getAvailableFreeProducts(
  //   promotionId: string,
  //   cartItems: CartItem[],
  // ): Promise<FreeProductOption[]> {
  //   try {
  //     const promotion = await this.getPromotionById(promotionId);
  //     if (!promotion) throw new InvalidInputError('Promotion not found');

  //     if (promotion.type !== PromotionType.BUY_X_GET_Y_FREE) {
  //       throw new InvalidInputError('This promotion does not offer free products');
  //     }

  //     const validation = await this.validateBuyXGetY(promotion, cartItems);
  //     if (!validation.isEligible || !validation.freeItemsEarned) {
  //       throw new InvalidInputError('Cart does not qualify for free products');
  //     }

  //     const freeProducts = await this.db.client.promotionFreeProduct.findMany({
  //       where: { promotion_id: promotion.promotion_id },
  //       include: {
  //         product: {
  //           include: {
  //             images: true,
  //             colors: {
  //               include: {
  //                 images: true,
  //                 sizeVariants: {
  //                   where: {
  //                     isAvailable: true,
  //                     stock: { gt: 0 },
  //                   },
  //                 },
  //               },
  //             },
  //           },
  //         },
  //         sizeVariant: {
  //           where: {
  //             isAvailable: true,
  //             stock: { gt: 0 },
  //           },
  //           include: {
  //             productColor: {
  //               include: {
  //                 product: true,
  //                 images: true,
  //               },
  //             },
  //           },
  //         },
  //       },
  //       orderBy: { displayOrder: 'asc' },
  //     });

  //     const availableFreeProducts: FreeProductOption[] = freeProducts
  //       .filter((fp: any) => {
  //         if (fp.size_variant_id) {
  //           return fp.sizeVariant && fp.sizeVariant.stock > 0;
  //         }
  //         if (fp.product_id) {
  //           return (
  //             fp.product &&
  //             fp.product.colors.some((color: any) =>
  //               color.sizeVariants.some((sv: any) => sv.stock > 0),
  //             )
  //           );
  //         }
  //         return false;
  //       })
  //       .map((fp: any) => {
  //         const maxSelectableQuantity = Math.min(
  //           validation.freeItemsEarned!,
  //           fp.maxQuantity || validation.freeItemsEarned!,
  //         );

  //         let productName = '';
  //         let colorName = '';
  //         let size = '';
  //         let price = 0;
  //         let stock = 0;
  //         let images: string[] = [];

  //         if (fp.size_variant_id && fp.sizeVariant) {
  //           const sv = fp.sizeVariant;
  //           productName = sv.productColor.product.name;
  //           colorName = sv.productColor.color_name;
  //           size = sv.size;
  //           price = sv.price;
  //           stock = sv.stock;
  //           images = sv.productColor.images.map((img: any) => img.url);
  //         } else if (fp.product_id && fp.product) {
  //           productName = fp.product.name;
  //           price = fp.product.basePrice;
  //           stock = fp.product.colors.reduce(
  //             (sum: any, color: any) =>
  //               sum + color.sizeVariants.reduce((s: any, sv: any) => s + sv.stock, 0),
  //             0,
  //           );
  //           images = fp.product.images.map((img: any) => img.url);
  //         }

  //         return {
  //           promotion_free_prod_id: fp.promotion_free_prod_id,
  //           product_id: fp.product_id,
  //           size_variant_id: fp.size_variant_id,
  //           productName,
  //           colorName,
  //           size,
  //           price,
  //           stock,
  //           maxSelectableQuantity,
  //           images,
  //           displayOrder: fp.displayOrder,
  //         };
  //       });

  //     return availableFreeProducts;
  //   } catch (error: any) {
  //     throw new InvalidInputError(error.message);
  //   }
  // }

  //latest code properly implemented - 2 buy 1 free
  async getAvailableFreeProducts(
    promotionId: string,
    cartItems: CartItem[],
  ): Promise<FreeProductOption[]> {
    try {
      const promotion = await this.getPromotionById(promotionId);
      if (!promotion) throw new InvalidInputError('Promotion not found');

      if (promotion.type !== PromotionType.BUY_X_GET_Y_FREE) {
        throw new InvalidInputError('This promotion does not offer free products');
      }

      // Validate cart eligibility
      const validation = await this.validateBuyXGetY(promotion, cartItems);
      if (!validation.isEligible || !validation.freeItemsEarned) {
        throw new InvalidInputError('Cart does not qualify for free products');
      }

      // Fetch all available free products configured for this promotion
      const freeProducts = await this.db.client.promotionFreeProduct.findMany({
        where: {
          promotion_id: promotion.promotion_id,
        },
        include: {
          product: {
            include: {
              images: true,
              colors: {
                include: {
                  images: true,
                  sizeVariants: {
                    where: {
                      isAvailable: true,
                      stock: { gt: 0 },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { displayOrder: 'asc' },
      });

      // Format free products with full details for frontend display
      const availableFreeProducts: FreeProductOption[] = [];

      for (const fp of freeProducts) {
        if (!fp.product) continue;

        // Check if product has available stock
        const hasStock = fp.product.colors.some((color: any) =>
          color.sizeVariants.some((sv: any) => sv.stock > 0),
        );

        if (!hasStock) continue;

        // Get all available size variants across all colors
        const availableVariants: any[] = [];
        for (const color of fp.product.colors) {
          for (const sizeVariant of color.sizeVariants) {
            if (sizeVariant.stock > 0 && sizeVariant.isAvailable) {
              availableVariants.push({
                product_size_var_id: sizeVariant.product_size_var_id,
                size: sizeVariant.size,
                price: sizeVariant.price,
                stock: sizeVariant.stock,
                colorName: color.color_name,
                colorCode: color.color_code,
                colorId: color.product_color_var_id,
                images: color.images.map((img: any) => img.url),
              });
            }
          }
        }

        if (availableVariants.length === 0) continue;

        // Calculate max selectable quantity for this product
        // User earned freeItemsEarned total free items, but each product has maxQuantity limit
        const maxSelectableQuantity = Math.min(
          validation.freeItemsEarned!,
          fp.maxQuantity || validation.freeItemsEarned!,
        );

        // Add product to available list
        availableFreeProducts.push({
          promotion_free_prod_id: fp.promotion_free_prod_id,
          product_id: fp.product_id,
          productName: fp.product.name,
          basePrice: fp.product.basePrice,
          maxSelectableQuantity, // How many of THIS product user can select
          totalFreeItemsEarned: validation.freeItemsEarned!, // Total free items user earned
          displayOrder: fp.displayOrder,
          availableVariants, // All size/color combinations with stock
          primaryImage:
            fp.product.images.find((img: any) => img.isPrimary)?.url ||
            fp.product.images[0]?.url ||
            '',
        });
      }

      return availableFreeProducts;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  // async calculateDiscount(
  //   promotionId: string,
  //   cartItems: CartItem[],
  // ): Promise<DiscountCalculation> {
  //   try {
  //     const promotion = await this.getPromotionById(promotionId);
  //     console.log('i am in calculatediscount promotion section');
  //     console.log(promotion);
  //     if (!promotion) throw new InvalidInputError('Promotion not found');

  //     if (promotion.status !== PromotionStatus.ACTIVE) {
  //       throw new InvalidInputError('Promotion is not active');
  //     }

  //     const now = new Date();
  //     if (now < new Date(promotion.validFrom) || now > new Date(promotion.validTo)) {
  //       throw new InvalidInputError('Promotion is not valid at this time');
  //     }

  //     let discountDetails: any;

  //     switch (promotion.type) {
  //       case PromotionType.BUY_X_GET_Y_FREE:
  //         discountDetails = await this.calculateBuyXGetYDiscount(promotion, cartItems);
  //         break;
  //       case PromotionType.QUANTITY_DISCOUNT:
  //         discountDetails = await this.calculateQuantityDiscountAmount(promotion, cartItems);
  //         break;
  //       case PromotionType.BUNDLE_DEAL:
  //         discountDetails = await this.calculateBundleDiscount(promotion, cartItems);
  //         break;
  //       case PromotionType.TIERED_DISCOUNT:
  //         discountDetails = await this.calculateTieredDiscountAmount(promotion, cartItems);
  //         break;
  //       default:
  //         throw new InvalidInputError('Unknown promotion type');
  //     }

  //     const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  //     const finalAmount = cartTotal - discountDetails.discountAmount;

  //     return {
  //       promotion_id: promotion.promotion_id,
  //       promotionName: promotion.name,
  //       type: promotion.type,
  //       cartTotal,
  //       discountAmount: discountDetails.discountAmount,
  //       finalAmount,
  //       savings: discountDetails.discountAmount,
  //       details: discountDetails,
  //     };
  //   } catch (error: any) {
  //     throw new InvalidInputError(error.message);
  //   }
  // }
  async calculateDiscount(
    promotionId: string,
    cartItems: CartItem[],
  ): Promise<DiscountCalculation> {
    try {
      console.log(promotionId);
      const promotion = await this.db.client.promotion.findUnique({
        where: {
          promotion_id: promotionId,
        },
        include: {
          eligibleProducts: true,
        },
      });
      console.log('i am in calculatediscount promotion section');
      console.log(promotion);
      if (!promotion) throw new InvalidInputError('Promotion not found');

      if (promotion.status !== PromotionStatus.ACTIVE) {
        throw new InvalidInputError('Promotion is not active');
      }

      const now = new Date();
      if (now < new Date(promotion.validFrom) || now > new Date(promotion.validTo)) {
        throw new InvalidInputError('Promotion is not valid at this time');
      }
      console.log('cartItems123-------->');
      console.log(cartItems);
      // First, retrieve actual price from productSizeVariant table for each cart item
      const sizeVariantIds = cartItems.map((item) => item.product_size_var_id);
      const variantData = await this.db.client.productSizeVariant.findMany({
        where: { id: { in: sizeVariantIds } },
        select: {
          product_size_var_id: true,
          price: true,
        },
      });

      // Map the actual variant prices back into cart items
      const updatedCartItems = cartItems.map((item) => {
        const variant = variantData.find(
          (v: any) => v.product_size_var_id === item.product_size_var_id,
        );
        return {
          ...item,
          price: variant ? variant.price : item.price, // use variant price if found, else fallback
        };
      });

      let discountDetails: any;
      console.log('discount details ie here----->');
      console.log(discountDetails);
      console.log(updatedCartItems);

      switch (promotion.type) {
        case PromotionType.BUY_X_GET_Y_FREE:
          console.log('hello inside switch ------ BUY_X_GET_Y_FREE');
          discountDetails = await this.calculateBuyXGetYDiscount(promotion, updatedCartItems);
          break;
        case PromotionType.QUANTITY_DISCOUNT:
          console.log('hello inside switch ------QUANTITY_DISCOUNT');
          console.log(updatedCartItems);
          discountDetails = await this.calculateQuantityDiscountAmount(promotion, updatedCartItems);
          break;
        case PromotionType.BUNDLE_DEAL:
          discountDetails = await this.calculateBundleDiscount(promotion, updatedCartItems);
          break;
        case PromotionType.TIERED_DISCOUNT:
          discountDetails = await this.calculateTieredDiscountAmount(promotion, updatedCartItems);
          break;
        default:
          throw new InvalidInputError('Unknown promotion type');
      }
      console.log('final discount details ie here----->');
      console.log(discountDetails);

      // Calculate cart total from updated items with real prices
      const cartTotal = updatedCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const finalAmount = cartTotal - discountDetails.discountAmount;

      return {
        promotion_id: promotion.promotion_id,
        promotionName: promotion.name,
        type: promotion.type,
        cartTotal,
        discountAmount: discountDetails.discountAmount,
        finalAmount,
        savings: discountDetails.discountAmount,
        details: discountDetails,
      };
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async getPromotionsByProduct(productId: string): Promise<Promotion[]> {
    try {
      // if (productId <= 0) throw new InvalidInputError('Invalid product ID');

      const product = await this.db.client.product.findUnique({
        where: { product_id: productId },
        select: { category_id: true },
      });

      if (!product) throw new InvalidInputError('Product not found');

      const promotions = await this.db.client.promotion.findMany({
        where: {
          status: PromotionStatus.ACTIVE,
          validFrom: { lte: new Date() },
          validTo: { gte: new Date() },
          eligibleProducts: {
            some: {
              OR: [{ product_id: productId }, { category_id: product.category_id }],
            },
          },
        },
        include: {
          eligibleProducts: {
            include: {
              product: {
                select: {
                  product_id: true,
                  name: true,
                },
              },
              category: {
                select: {
                  category_id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { priority: 'desc' },
      });

      return promotions;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async getPromotionStats(promotionId: string): Promise<PromotionStatsResponse> {
    try {
      const promotion = await this.getPromotionById(promotionId);
      if (!promotion) throw new InvalidInputError('Promotion not found');

      const redemptions = await this.db.client.promotionRedemption.findMany({
        where: { promotion_id: promotionId },
        include: {
          order: true,
        },
      });

      const totalRedemptions = redemptions.length;
      const uniqueUsers = new Set(redemptions.map((r: any) => r.user_id)).size;
      const totalRevenue = redemptions.reduce(
        (sum: any, r: any) => sum + (r.order.grandTotal || 0),
        0,
      );
      const averageOrderValue = totalRedemptions > 0 ? totalRevenue / totalRedemptions : 0;

      const totalOrdersInPeriod = await this.db.client.order.count({
        where: {
          createdAt: {
            gte: promotion.validFrom,
            lte: promotion.validTo,
          },
        },
      });

      const conversionRate =
        totalOrdersInPeriod > 0 ? (totalRedemptions / totalOrdersInPeriod) * 100 : 0;

      return {
        promotion_id: promotion.promotion_id,
        promotionName: promotion.name,
        totalRedemptions,
        totalRevenue,
        uniqueUsers,
        averageOrderValue,
        conversionRate,
        period: {
          validFrom: promotion.validFrom,
          validTo: promotion.validTo,
        },
      };
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async getPromotionReport(queryParams?: any): Promise<any> {
    try {
      const { filters, page, limit, globalSearch } = parseQueryParams(queryParams || {});

      const { where, orderBy, skip, take } = buildPrismaQuery(
        filters,
        this.getPromotionReportFields,
        page,
        limit,
        globalSearch,
        [['name']],
        false,
      );

      const promotions = await this.db.client.promotion.findMany({
        where,
        include: {
          redemptions: {
            include: {
              order: true,
            },
          },
        },
        orderBy: orderBy.length > 0 ? orderBy : { createdAt: 'desc' },
        skip,
        take,
      });

      const total = await this.db.client.promotion.count({ where });

      const report = promotions.map((promotion: any) => {
        const totalRedemptions = promotion.redemptions.length;
        const totalRevenue = promotion.redemptions.reduce(
          (sum: any, r: any) => sum + (r.order.grandTotal || 0),
          0,
        );
        const uniqueUsers = new Set(promotion.redemptions.map((r: any) => r.user_id)).size;

        return {
          promotion_id: promotion.promotion_id,
          name: promotion.name,
          type: promotion.type,
          status: promotion.status,
          totalRedemptions,
          totalRevenue,
          uniqueUsers,
          usageRate: promotion.usageLimit ? (totalRedemptions / promotion.usageLimit) * 100 : null,
          validFrom: promotion.validFrom,
          validTo: promotion.validTo,
        };
      });

      return {
        totalPromotions: total,
        totalRedemptions: report.reduce((sum: any, r: any) => sum + r.totalRedemptions, 0),
        totalRevenue: report.reduce((sum: any, r: any) => sum + r.totalRevenue, 0),
        pagination: {
          total,
          page,
          limit: take,
          totalPages: Math.ceil(total / take),
        },
        promotions: report,
      };
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async checkUserEligibility(promotionId: string, userId: number): Promise<boolean> {
    try {
      if (userId <= 0) throw new InvalidInputError('Invalid user ID');

      const promotion = await this.getPromotionById(promotionId);
      if (!promotion) throw new InvalidInputError('Promotion not found');

      if (promotion.status !== PromotionStatus.ACTIVE) {
        return false;
      }

      const now = new Date();
      if (now < new Date(promotion.validFrom) || now > new Date(promotion.validTo)) {
        return false;
      }

      if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) {
        return false;
      }

      if (promotion.perUserLimit) {
        const userRedemptionCount = await this.db.client.promotionRedemption.count({
          where: {
            promotion_id: promotionId,
            user_id: userId,
          },
        });

        if (userRedemptionCount >= promotion.perUserLimit) {
          return false;
        }
      }

      return true;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async getUserPromotionHistory(userId: string, queryParams?: any): Promise<any> {
    try {
      // if (userId <= 0) throw new InvalidInputError('Invalid user ID');

      const { filters, page, limit, globalSearch } = parseQueryParams(queryParams || {});

      const {
        where: filterWhere,
        orderBy,
        skip,
        take,
      } = buildPrismaQuery(
        filters,
        this.getUserPromotionHistoryFields,
        page,
        limit,
        globalSearch,
        [['promotion.name']],
        false,
      );

      const where = {
        user_id: userId,
        ...filterWhere,
      };

      const redemptions = await this.db.client.promotionRedemption.findMany({
        where,
        include: {
          promotion: true,
          order: true,
          freeItems: {
            include: {
              product: {
                select: {
                  product_id: true,
                  name: true,
                  basePrice: true,
                },
              },
              sizeVariant: {
                include: {
                  productColor: {
                    include: {
                      product: {
                        select: {
                          product_id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: orderBy.length > 0 ? orderBy : { appliedAt: 'desc' },
        skip,
        take,
      });

      const total = await this.db.client.promotionRedemption.count({ where });

      const history: UserPromotionHistoryItem[] = redemptions.map((redemption: any) => {
        const savingsAmount = redemption.freeItems.reduce((sum: any, item: any) => {
          const price = item.sizeVariant ? item.sizeVariant.price : item.product?.basePrice || 0;
          return sum + price * item.quantity;
        }, 0);

        return {
          redemption_id: redemption.promotion_redemption_id,
          promotion: {
            id: redemption.promotion.promotion_id,
            name: redemption.promotion.name,
            type: redemption.promotion.type as PromotionType,
          },
          order: {
            id: redemption.order.order_id,
            total: redemption.order.grandTotal || 0,
            placedAt: redemption.order.placedAt,
          },
          purchasedQuantity: redemption.purchasedQuantity,
          freeQuantity: redemption.freeQuantity,
          freeItems: redemption.freeItems,
          savingsAmount,
          appliedAt: redemption.appliedAt,
        };
      });

      return {
        data: history,
        pagination: {
          total,
          page,
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      };
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  // private async validateBuyXGetY(
  //   promotion: any,
  //   cartItems: CartItem[],
  // ): Promise<PromotionValidationResult> {
  //   console.log('validateBuyXGetY called');
  //   console.log('promotion:', promotion);
  //   const eligibleProductIds = this.getEligibleProductIds(promotion);
  //   console.log('eligibleProductIds:', eligibleProductIds);
  //   const eligibleCategoryIds = this.getEligibleCategoryIds(promotion);
  //   console.log('eligibleCategoryIds', eligibleCategoryIds);
  //   const categoryProducts = await this.getProductsInCategories(eligibleCategoryIds);
  //   console.log('categoryProducts:', categoryProducts);
  //   const allEligibleProductIds = [
  //     ...eligibleProductIds,
  //     ...categoryProducts.map((p) => p.product_id),
  //   ];
  //   console.log('allEligibleProductIds:', allEligibleProductIds);

  //   const eligibleQuantity = cartItems
  //     .filter((item) => allEligibleProductIds.includes(item.product_id))
  //     .reduce((sum, item) => sum + item.quantity, 0);
  //   console.log(eligibleQuantity);
  //   const totalSets = promotion.buyQuantity + promotion.getQuantity;
  //   console.log('totel set is hereêee', totalSets);
  //   const qualifyingSets = Math.floor(eligibleQuantity / totalSets);
  //   console.log('qualifyingSets:', qualifyingSets);
  //   const freeItemsEarned = qualifyingSets * promotion.getQuantity;
  //   console.log('freeItemsEarned:', freeItemsEarned);

  //   if (freeItemsEarned > 0) {
  //     return {
  //       isEligible: true,
  //       promotion_id: promotion.promotion_id,
  //       type: PromotionType.BUY_X_GET_Y_FREE,
  //       freeItemsEarned,
  //       message: `Buy ${promotion.buyQuantity}, Get ${promotion.getQuantity} Free! You've earned ${freeItemsEarned} free item(s).`,
  //       details: {
  //         purchasedQuantity: eligibleQuantity,
  //         qualifyingSets,
  //         buyQuantity: promotion.buyQuantity,
  //         getQuantity: promotion.getQuantity,
  //       },
  //     };
  //   }

  //   return { isEligible: false };
  // }
  //latest code validateBuyXGetY - after 2 buy 1 free (OLD 2)
  // private async validateBuyXGetY(
  //   promotion: any,
  //   cartItems: CartItem[],
  // ): Promise<PromotionValidationResult> {
  //   console.log('validateBuyXGetY called');
  //   console.log('promotion:', promotion);

  //   // Get eligible product IDs from promotion
  //   const eligibleProductIds = this.getEligibleProductIds(promotion);
  //   console.log('eligibleProductIds:', eligibleProductIds);

  //   // Get eligible categories
  //   const eligibleCategoryIds = this.getEligibleCategoryIds(promotion);
  //   console.log('eligibleCategoryIds', eligibleCategoryIds);

  //   // Get all products in eligible categories
  //   const categoryProducts = await this.getProductsInCategories(eligibleCategoryIds);
  //   console.log('categoryProducts:', categoryProducts);

  //   // Combine product IDs from both direct products and categories
  //   const allEligibleProductIds = [
  //     ...eligibleProductIds,
  //     ...categoryProducts.map((p) => p.product_id),
  //   ];
  //   console.log('allEligibleProductIds:', allEligibleProductIds);

  //   // CRITICAL FIX: Count ONLY eligible products in cart (not total sets)
  //   const eligibleQuantity = cartItems
  //     .filter((item) => allEligibleProductIds.includes(item.product_id))
  //     .reduce((sum, item) => sum + item.quantity, 0);
  //   console.log('eligibleQuantity (purchased):', eligibleQuantity);

  //   // Check if user has bought minimum required quantity
  //   // Example: promotion.buyQuantity = 2 (Buy 2)
  //   if (eligibleQuantity < promotion.buyQuantity) {
  //     // Not enough items purchased to qualify
  //     return {
  //       isEligible: false,
  //       message: `Buy ${promotion.buyQuantity} eligible items to get ${promotion.getQuantity} free item(s). You have ${eligibleQuantity} eligible items.`,
  //     };
  //   }

  //   // Calculate how many complete "Buy X" sets the user has
  //   // Example: User bought 5 items, buyQuantity = 2
  //   // qualifyingSets = Math.floor(5 / 2) = 2 sets
  //   const qualifyingSets = Math.floor(eligibleQuantity / promotion.buyQuantity);
  //   console.log('qualifyingSets:', qualifyingSets);

  //   // Calculate free items earned
  //   // Example: qualifyingSets = 2, getQuantity = 1
  //   // freeItemsEarned = 2 * 1 = 2 free items
  //   const freeItemsEarned = qualifyingSets * promotion.getQuantity;
  //   console.log('freeItemsEarned:', freeItemsEarned);

  //   // User qualifies for free products
  //   if (freeItemsEarned > 0) {
  //     return {
  //       isEligible: true,
  //       promotion_id: promotion.promotion_id,
  //       type: PromotionType.BUY_X_GET_Y_FREE,
  //       freeItemsEarned, // How many free items user can select
  //       message: `Buy ${promotion.buyQuantity}, Get ${promotion.getQuantity} Free! You've earned ${freeItemsEarned} free item(s).`,
  //       details: {
  //         purchasedQuantity: eligibleQuantity,
  //         qualifyingSets,
  //         buyQuantity: promotion.buyQuantity,
  //         getQuantity: promotion.getQuantity,
  //         eligibleProductIds: allEligibleProductIds, // For frontend validation
  //       },
  //     };
  //   }

  //   return {
  //     isEligible: false,
  //     message: `Not enough qualifying items purchased.`,
  //   };
  // }
  private async validateBuyXGetY(
    promotion: any,
    cartItems: CartItem[],
  ): Promise<PromotionValidationResult> {
    try {
      console.log('🔍 Validating Buy X Get Y promotion', {
        promotionId: promotion.promotion_id,
        cartItemsCount: cartItems.length,
        buyQuantity: promotion.buyQuantity,
        getQuantity: promotion.getQuantity,
      });

      // ✅ 1. CHECK PROMOTION STATUS
      if (promotion.status !== 'ACTIVE') {
        console.log('❌ Promotion is not active', { status: promotion.status });
        return {
          isEligible: false,
          message: 'Promotion is not active',
        };
      }

      // ✅ 2. CHECK EXPIRY
      const now = new Date();
      if (now < new Date(promotion.validFrom) || now > new Date(promotion.validTo)) {
        console.log('❌ Promotion expired or not started', {
          now: now.toISOString(),
          validFrom: promotion.validFrom,
          validTo: promotion.validTo,
        });
        return {
          isEligible: false,
          message: 'Promotion has expired or not yet started',
        };
      }

      // ✅ 3. GET ELIGIBLE PRODUCTS
      const eligibleProductIds = this.getEligibleProductIds(promotion);
      const eligibleCategoryIds = this.getEligibleCategoryIds(promotion);

      console.log('📦 Eligible products/categories', {
        productIds: eligibleProductIds,
        categoryIds: eligibleCategoryIds,
      });

      // Get products in eligible categories
      let categoryProducts: any[] = [];
      try {
        categoryProducts = await this.getProductsInCategories(eligibleCategoryIds);
        console.log('✅ Category products fetched', { count: categoryProducts.length });
      } catch (error) {
        console.error('❌ Failed to get category products', error);
        return {
          isEligible: false,
          message: 'Error validating promotion eligibility',
        };
      }

      // Combine all eligible product IDs
      const allEligibleProductIds = [
        ...eligibleProductIds,
        ...categoryProducts.map((p) => p.product_id),
      ];

      console.log('📋 All eligible product IDs', {
        totalCount: allEligibleProductIds.length,
        productIds: allEligibleProductIds,
      });

      if (allEligibleProductIds.length === 0) {
        console.warn('⚠️ No eligible products found for promotion', {
          promotionId: promotion.promotion_id,
        });
        return {
          isEligible: false,
          message: 'No eligible products in promotion',
        };
      }
      console.log('allEligibleProductIds-------');
      console.log(allEligibleProductIds);
      // ✅ 4. COUNT ELIGIBLE ITEMS IN CART
      const eligibleQuantity = cartItems
        .filter((item) => allEligibleProductIds.includes(item.product_id))
        .reduce((sum, item) => sum + item.quantity, 0);
      console.log('eligibleQuantity----->');
      console.log(eligibleQuantity);

      console.log('🛒 Eligible quantity calculated', {
        eligibleQuantity,
        requiredQuantity: promotion.buyQuantity,
        cartItems: cartItems.map((item) => ({
          productId: item.product_id,
          quantity: item.quantity,
          isEligible: allEligibleProductIds.includes(item.product_id),
        })),
      });

      // ✅ 5. CHECK MINIMUM PURCHASE REQUIREMENT
      if (eligibleQuantity < promotion.buyQuantity) {
        console.log('❌ Not enough items to qualify', {
          required: promotion.buyQuantity,
          current: eligibleQuantity,
          remaining: promotion.buyQuantity - eligibleQuantity,
        });

        return {
          isEligible: false,
          message: `Buy ${promotion.buyQuantity} eligible items to get ${promotion.getQuantity} free. You have ${eligibleQuantity} eligible items.`,
          details: {
            required: promotion.buyQuantity,
            current: eligibleQuantity,
            remaining: promotion.buyQuantity - eligibleQuantity,
          },
        };
      }

      // ✅ 6. CALCULATE QUALIFYING SETS
      const qualifyingSets = Math.floor(eligibleQuantity / promotion.buyQuantity);
      const freeItemsEarned = qualifyingSets * promotion.getQuantity;
      const remainingItems = eligibleQuantity % promotion.buyQuantity;

      console.log('✅ Promotion qualification successful!', {
        promotionId: promotion.promotion_id,
        promotionName: promotion.name,
        eligibleQuantity,
        qualifyingSets,
        freeItemsEarned,
        remainingItems,
      });

      // ✅ 7. RETURN SUCCESS
      if (freeItemsEarned > 0) {
        return {
          isEligible: true,
          promotion_id: promotion.promotion_id,
          promotionName: promotion.name,
          type: PromotionType.BUY_X_GET_Y_FREE,
          freeItemsEarned,
          message: `Buy ${promotion.buyQuantity}, Get ${promotion.getQuantity} Free! You've earned ${freeItemsEarned} free item(s).`,
          details: {
            purchasedQuantity: eligibleQuantity,
            qualifyingSets,
            buyQuantity: promotion.buyQuantity,
            getQuantity: promotion.getQuantity,
            eligibleProductIds: allEligibleProductIds,
            remainingItems, // Items that don't form a complete set
          },
        };
      }

      // Should never reach here, but safety fallback
      console.warn('⚠️ Unexpected state: freeItemsEarned is 0', {
        qualifyingSets,
        getQuantity: promotion.getQuantity,
      });

      return {
        isEligible: false,
        message: 'Not enough qualifying items purchased.',
      };
    } catch (error) {
      console.error('❌ Error validating Buy X Get Y promotion', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        promotionId: promotion.promotion_id,
      });

      return {
        isEligible: false,
        message: 'Error validating promotion',
      };
    }
  }
  // aa function an help thi tame khali validate kari sako cho ke cart ma quantity discount eligible chhe ke nahi
  private async validateQuantityDiscount(
    promotion: any,
    cartItems: CartItem[],
  ): Promise<PromotionValidationResult> {
    const eligibleProductIds = this.getEligibleProductIds(promotion);
    const eligibleCategoryIds = this.getEligibleCategoryIds(promotion);
    const categoryProducts = await this.getProductsInCategories(eligibleCategoryIds);
    const allEligibleProductIds = [
      ...eligibleProductIds,
      ...categoryProducts.map((p) => p.product_id),
    ];
    console.log('allEligibleProductIds');
    console.log(allEligibleProductIds);
    console.log('hello------>');
    console.log(cartItems);

    const eligibleItems = cartItems.filter((item) =>
      allEligibleProductIds.includes(item.product_id),
    );

    const eligibleQuantity = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);
    console.log('eligibleQuantity');
    console.log(eligibleQuantity);
    console.log(eligibleQuantity >= promotion.buyQuantity);

    if (eligibleQuantity >= promotion.buyQuantity) {
      const discountPercentage = Math.min(
        10 + Math.floor(eligibleQuantity / promotion.buyQuantity) * 5,
        50,
      );
      console.log(discountPercentage);
      console.log('eligibleItems------>');
      console.log(eligibleItems);
      const eligibleTotal = eligibleItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      console.log('eligibleTotal----->');
      console.log(eligibleTotal);
      const discountAmount = (eligibleTotal * discountPercentage) / 100;
      console.log('dicsounted amount is heree----->');
      console.log(discountAmount);
      console.log({
        isEligible: true,
        promotion_id: promotion.promotion_id,
        type: PromotionType.QUANTITY_DISCOUNT,
        discountAmount,
        message: `Buy ${promotion.buyQuantity}+ items, get ${discountPercentage}% off!`,
        details: {
          eligibleQuantity,
          discountPercentage,
          eligibleTotal,
          requiredQuantity: promotion.buyQuantity,
        },
      });

      return {
        isEligible: true,
        promotion_id: promotion.promotion_id,
        type: PromotionType.QUANTITY_DISCOUNT,
        discountAmount,
        message: `Buy ${promotion.buyQuantity}+ items, get ${discountPercentage}% off!`,
        details: {
          eligibleQuantity,
          discountPercentage,
          eligibleTotal,
          requiredQuantity: promotion.buyQuantity,
        },
      };
    }

    return { isEligible: false };
  }

  private async validateBundleDeal(
    promotion: any,
    cartItems: CartItem[],
  ): Promise<PromotionValidationResult> {
    const requiredProducts = promotion.eligibleProducts;
    if (!requiredProducts || requiredProducts.length === 0) {
      return { isEligible: false };
    }

    const hasAllBundleItems = requiredProducts.every((req: any) => {
      if (req.product_id) {
        return cartItems.some((item) => item.product_id === req.product_id);
      }
      return false;
    });

    if (hasAllBundleItems) {
      const bundleTotal = requiredProducts.reduce((sum: number, req: any) => {
        const cartItem = cartItems.find((item) => item.product_id === req.product_id);
        return sum + (cartItem ? cartItem.price : 0);
      }, 0);
      const discountAmount = bundleTotal * 0.15;

      return {
        isEligible: true,
        promotion_id: promotion.promotion_id,
        type: PromotionType.BUNDLE_DEAL,
        discountAmount,
        message: 'Complete bundle discount applied!',
        details: { bundleTotal, discountPercentage: 15, requiredItems: requiredProducts.length },
      };
    }

    return { isEligible: false };
  }

  private async validateTieredDiscount(
    promotion: any,
    cartItems: CartItem[],
  ): Promise<PromotionValidationResult> {
    const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (cartTotal >= (promotion.minPurchaseAmount || 0)) {
      let discountPercentage = 0;
      if (cartTotal >= 10000) discountPercentage = 25;
      else if (cartTotal >= 6000) discountPercentage = 20;
      else if (cartTotal >= 4000) discountPercentage = 15;
      else if (cartTotal >= 2000) discountPercentage = 10;

      const discountAmount = (cartTotal * discountPercentage) / 100;

      return {
        isEligible: true,
        promotion_id: promotion.promotion_id,
        type: PromotionType.TIERED_DISCOUNT,
        discountAmount,
        message: `Spend ₹${promotion.minPurchaseAmount}+, get ${discountPercentage}% off!`,
        details: { cartTotal, threshold: promotion.minPurchaseAmount, discountPercentage },
      };
    }

    return { isEligible: false };
  }

  private async calculateBuyXGetYDiscount(promotion: any, cartItems: CartItem[]): Promise<any> {
    const validation = await this.validateBuyXGetY(promotion, cartItems);
    console.log('validation data------>');
    console.log(validation);
    if (!validation.isEligible || !validation.freeItemsEarned) {
      return { discountAmount: 0 };
    }

    const eligibleProductIds = this.getEligibleProductIds(promotion);
    console.log('eligibleProductIds--------->');
    console.log(eligibleProductIds);
    const eligibleCategoryIds = this.getEligibleCategoryIds(promotion);
    console.log('eligibleCategoryIds--------->');
    console.log(eligibleCategoryIds);
    const categoryProducts = await this.getProductsInCategories(eligibleCategoryIds);
    console.log('categoryProducts--------->');
    console.log(categoryProducts);
    const allEligibleProductIds = [
      ...eligibleProductIds,
      ...categoryProducts.map((p) => p.product_id),
    ];
    console.log('allEligibleProductIds--------->');
    console.log(allEligibleProductIds);

    const eligibleItems = cartItems
      .filter((item) => allEligibleProductIds.includes(item.product_id))
      .sort((a, b) => a.price - b.price);

    console.log('eligibleItems --------->>');
    console.log(eligibleItems);

    let discountAmount = 0;
    let freeItemsRemaining = validation.freeItemsEarned;

    for (const item of eligibleItems) {
      if (freeItemsRemaining <= 0) break;
      const freeQty = Math.min(item.quantity, freeItemsRemaining);
      discountAmount += item.price * freeQty;
      freeItemsRemaining -= freeQty;
    }

    return { discountAmount, freeItemsCount: validation.freeItemsEarned };
  }

  private async calculateQuantityDiscountAmount(
    promotion: any,
    cartItems: CartItem[],
  ): Promise<any> {
    const validation = await this.validateQuantityDiscount(promotion, cartItems);
    console.log('calculateQuantityDiscountAmount validation');
    console.log(validation);
    if (!validation.isEligible) return { discountAmount: 0 };
    return {
      discountAmount: validation.discountAmount,
      discountPercentage: validation.details?.discountPercentage,
    };
  }

  private async calculateBundleDiscount(promotion: any, cartItems: CartItem[]): Promise<any> {
    const validation = await this.validateBundleDeal(promotion, cartItems);
    if (!validation.isEligible) return { discountAmount: 0 };
    return {
      discountAmount: validation.discountAmount,
      bundleTotal: validation.details?.bundleTotal,
    };
  }

  private async calculateTieredDiscountAmount(promotion: any, cartItems: CartItem[]): Promise<any> {
    const validation = await this.validateTieredDiscount(promotion, cartItems);
    if (!validation.isEligible) return { discountAmount: 0 };
    return {
      discountAmount: validation.discountAmount,
      discountPercentage: validation.details?.discountPercentage,
    };
  }

  private getEligibleProductIds(promotion: any): number[] {
    return promotion.eligibleProducts
      .filter((ep: any) => ep.product_id)
      .map((ep: any) => ep.product_id);
  }

  private getEligibleCategoryIds(promotion: any): number[] {
    return promotion.eligibleProducts
      .filter((ep: any) => ep.category_id)
      .map((ep: any) => ep.category_id);
  }

  private async getProductsInCategories(categoryIds: number[]): Promise<any[]> {
    if (categoryIds.length === 0) return [];
    return await this.db.client.product.findMany({
      where: { category_id: { in: categoryIds }, deletedAt: null },
      select: { product_id: true },
    });
  }

  private validatePromotionDates(validFrom: Date, validTo: Date): void {
    if (validFrom >= validTo) {
      throw new InvalidInputError('validFrom must be before validTo');
    }
    if (validTo < new Date()) {
      throw new InvalidInputError('validTo cannot be in the past');
    }
  }

  private validatePromotionQuantities(
    buyQuantity: number,
    getQuantity: number,
    type: PromotionType,
  ): void {
    if (type === PromotionType.BUY_X_GET_Y_FREE) {
      if (buyQuantity <= 0) throw new InvalidInputError('buyQuantity must be greater than 0');
      if (getQuantity <= 0) throw new InvalidInputError('getQuantity must be greater than 0');
    }
  }

  private determineInitialStatus(validFrom: Date): PromotionStatus {
    return validFrom > new Date() ? PromotionStatus.SCHEDULED : PromotionStatus.ACTIVE;
  }
}
