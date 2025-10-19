import { Router } from 'express';
import { ProductsController } from './products.controller';
import { validateId } from '../../middleware/validation.middleware';
import upload, { handleUploadSuccess } from '../../config/multer.config';

export const productsRoutes = (controller: ProductsController): Router => {
  const router = Router();

  router.get('/', controller.getAll.bind(controller));
  router.get('/:id', validateId, controller.getById.bind(controller));
  router.post('/', controller.create.bind(controller));
  router.patch('/:id', validateId, controller.update.bind(controller));
  router.post('/productvariant', controller.productvariant.bind(controller));
  router.delete('/:id', controller.deleteproductvariant.bind(controller));

  router.post(
    '/images/upload/multiple',
    upload.array('images', 15),
    handleUploadSuccess,
    controller.uploadMultipleImages.bind(controller),
  );

  router.post(
    '/images/upload/single',
    upload.single('image'),
    handleUploadSuccess,
    controller.uploadSingleImage.bind(controller),
  );

  router.get('/:productId/images', controller.getProductImages.bind(controller));

  /**
   * Delete a product image
   * DELETE /products/images/:imageId
   */
  router.delete('/images/:imageId', controller.deleteProductImage.bind(controller));

  /**
   * Set primary image for a product
   * PATCH /products/images/:imageId/primary
   */
  router.patch('/images/:imageId/primary', controller.setPrimaryProductImage.bind(controller));

  /**
   * Update product image details
   * PUT /products/images/:imageId
   */
  router.put('/images/:imageId', controller.updateProductImage.bind(controller));

  // ==================== WISHLIST ROUTES ====================

  /**
   * Add product to wishlist
   * POST /products/wishlist/add
   * Body: { user_id: number, product_id: number }
   */
  router.post('/wishlist/add', controller.addToWishlist.bind(controller));

  /**
   * Remove item from wishlist
   * DELETE /products/wishlist/remove/:wishlistId
   * Body: { user_id: number }
   */
  router.delete(
    '/wishlist/remove/:wishlistId',
    validateId,
    controller.removeFromWishlist.bind(controller),
  );

  /**
   * Clear all wishlist items for user
   * DELETE /products/wishlist/clear
   * Body: { user_id: number }
   */
  router.delete('/wishlist/clear', controller.clearWishlist.bind(controller));

  /**
   * Get wishlist items for a user
   * GET /products/wishlist/:userId
   */
  router.get('/wishlist/:userId', validateId, controller.getWishlistByUserId.bind(controller));

  return router;
};
