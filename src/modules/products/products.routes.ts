import { Router } from 'express';
import { ProductsController } from './products.controller';
import { validateId } from '../../middleware/validation.middleware';
import upload, { handleUploadSuccess } from '../../config/multer.config';

export const productsRoutes = (controller: ProductsController): Router => {
  const router = Router();

  // =================== BASIC PRODUCT CRUD ===================
  router.get('/', controller.getAll.bind(controller));
  router.get('/:id', validateId, controller.getById.bind(controller));
  router.post('/', controller.create.bind(controller));
  router.patch('/:id', validateId, controller.update.bind(controller));
  router.delete('/:id', validateId, controller.delete.bind(controller));

  // =================== PRODUCT COLOR MANAGEMENT ===================
  router.get('/:productId/colors', controller.getAllColors.bind(controller));
  router.post('/colors', controller.createColor.bind(controller));
  router.patch('/colors/:colorId', controller.updateColor.bind(controller));
  router.delete('/colors/:colorId', controller.deleteColor.bind(controller));

  // =================== PRODUCT COLOR IMAGES ===================
  router.get('/colors/:colorId/images', controller.getColorImages.bind(controller));
  router.post(
    '/colors/images/upload/multiple',
    upload.array('images', 15),
    handleUploadSuccess,
    controller.uploadMultipleColorImages.bind(controller),
  );
  router.patch('/colors/images/:imageId', controller.updateColorImage.bind(controller));
  router.delete('/colors/images/:imageId', controller.deleteColorImage.bind(controller));

  // =================== PRODUCT SIZE VARIANTS ===================
  router.get('/colors/:colorId/sizes', controller.getSizeVariants.bind(controller));
  router.post('/sizes', controller.createSizeVariant.bind(controller));
  router.patch('/sizes/:variantId', controller.updateSizeVariant.bind(controller));
  router.delete('/sizes/:variantId', controller.deleteSizeVariant.bind(controller));

  // =================== PRODUCT IMAGES (General Product Level) ===================
  router.get('/:productId/images', controller.getProductImages.bind(controller));
  router.post(
    '/images/upload/single',
    upload.single('image'),
    handleUploadSuccess,
    controller.uploadSingleImage.bind(controller),
  );
  router.post(
    '/images/upload/multiple',
    upload.array('images', 15),
    handleUploadSuccess,
    controller.uploadMultipleImages.bind(controller),
  );
  router.delete('/images/:imageId', controller.deleteProductImage.bind(controller));
  router.patch('/images/:imageId/primary', controller.setPrimaryProductImage.bind(controller));
  router.put('/images/:imageId', controller.updateProductImage.bind(controller));

  // =================== STOCK AND INVENTORY MANAGEMENT ===================
  router.get('/sizes/:variantId/stock', controller.getStock.bind(controller));
  router.put('/sizes/:variantId/stock', controller.updateStock.bind(controller));
  router.post('/sizes/:variantId/stock/adjust', controller.adjustStock.bind(controller));
  router.get('/sizes/:variantId/inventory-logs', controller.getInventoryLogs.bind(controller));
  router.get('/sizes/:variantId/stock-alerts', controller.getStockAlerts.bind(controller));
  router.patch('/stock-alerts/:alertId/resolve', controller.resolveStockAlert.bind(controller));

  // =================== WISHLIST MANAGEMENT ===================
  router.post('/wishlist/add', controller.addToWishlist.bind(controller));
  router.delete('/wishlist/clear', controller.clearWishlist.bind(controller));
  router.delete(
    '/wishlist/remove/:wishlist_id',
    validateId,
    controller.removeFromWishlist.bind(controller),
  );
  router.get('/wishlist/:userId', validateId, controller.getWishlistByUserId.bind(controller));

  // // =================== LEGACY PRODUCT VARIANTS ===================
  //old way
  // router.post('/productvariant', controller.productvariant.bind(controller));
  // router.delete('/productvariant/:id', controller.deleteproductvariant.bind(controller));

  // =================== MULTER ERROR HANDLER ===================
  router.use(controller.handleMulterError.bind(controller));

  return router;
};
