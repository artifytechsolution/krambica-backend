// Interface for upload data
interface UploadSingleImageData {
  product_id: number;
  altText?: string;
  isPrimary?: boolean;
  file: Express.Multer.File;
}

interface UploadMultipleImagesData {
  product_id: number;
  files: Express.Multer.File[];
}

export interface IProductsService {
  // Basic CRUD
  getAll(): Promise<any>;
  getById(id: string): Promise<any>;
  create(data: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<any>;

  // Product Color Management
  getAllColorsByProduct(productId: string): Promise<any>;
  createColor(data: any): Promise<any>;
  updateColor(colorId: string, data: any): Promise<any>;
  deleteColor(colorId: string): Promise<boolean>;

  // Product Color Images
  getColorImages(colorId: string): Promise<any>;
  uploadMultipleColorImages(data: any): Promise<any>;
  updateColorImage(imageId: number, updateData: any): Promise<any>;
  deleteColorImage(imageId: number): Promise<boolean>;

  // Product Size Variants
  getSizeVariantsByColor(colorId: string): Promise<any>;
  createSizeVariant(data: any): Promise<any>;
  updateSizeVariant(variantId: string, data: any): Promise<any>;
  deleteSizeVariant(variantId: string): Promise<boolean>;

  // Product Images (General)
  uploadSingleImage(data: UploadSingleImageData): Promise<any>;
  uploadMultipleImages(data: UploadMultipleImagesData): Promise<any>;
  getProductImages(productId: string): Promise<any>;
  deleteProductImage(imageId: number): Promise<any>;
  setPrimaryProductImage(imageId: number): Promise<any>;
  updateProductImage(imageId: number, updateData: any): Promise<any>;

  // Stock and Inventory Management
  getStock(variantId: string): Promise<any>;
  updateStock(variantId: string, newStock: number): Promise<any>;
  adjustStock(variantId: string, adjustmentData: any): Promise<any>;
  getInventoryLogs(variantId: string): Promise<any>;
  getStockAlerts(variantId: string): Promise<any>;
  resolveStockAlert(alertId: number): Promise<any>;

  // Wishlist Management
  addToWishlist(userId: any, productId: any): Promise<any>;
  removeFromWishlist(wishlistId: any, userId: any): Promise<any>;
  clearWishlist(userId: any): Promise<any>;
  getWishlistByUserId(userId: any): Promise<any>;

  // Legacy/Old Product Variants (if still needed)
  createproductvariant(data: any): Promise<any>;
  deleteProductVariant(id: string): Promise<any>;
  getProductVariantById(id: string | number): Promise<any>;
}
