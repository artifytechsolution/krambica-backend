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
  delete(id: number): Promise<any>;

  // Product Variants
  createproductvariant(data: any): Promise<any>;
  deleteProductVariant(id: string): Promise<any>;

  // Image Management (Essential only)
  uploadSingleImage(data: UploadSingleImageData): Promise<any>;
  uploadMultipleImages(data: UploadMultipleImagesData): Promise<any>;
  getProductImages(productId: number): Promise<any>;
  deleteProductImage(imageId: number): Promise<any>;
  setPrimaryProductImage(imageId: number): Promise<any>;
  updateProductImage(imageId: number, updateData: any): Promise<any>;
  getProductVariantById(id: string | number): any;
  addToWishlist(userId: any, productId: any): any;
  removeFromWishlist(wishlistId: any, userId: any): any;
  clearWishlist(userId: any): any;
  getWishlistByUserId(userId: any): any;
}
