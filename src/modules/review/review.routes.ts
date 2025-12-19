import { Router } from 'express';
import { ReviewController } from './review.controller';
import { AuthMiddleware } from '../../middleware/authMiddleware';
import multer from 'multer';
import upload, { handleUploadSuccess } from '../../config/multer.config';

export const reviewRoutes = (controller: ReviewController): Router => {
  const router = Router();

  // Public routes
  router.get('/products/:productId/reviews/summary', controller.getRatingSummary.bind(controller));
  router.get('/products/:productId/reviews', controller.getReviews.bind(controller));
  router.get('/reviews/:reviewId', controller.getReviewById.bind(controller));

  // Protected routes (require authentication)
  router.post('/products/:productId/reviews', controller.createReview.bind(controller));
  router.patch(
    '/products/:productId/reviews/:reviewId',
    AuthMiddleware('access'),
    controller.updateReview.bind(controller),
  );
  router.delete('/products/:productId/reviews/:reviewId', controller.deleteReview.bind(controller));
  router.post(
    '/upload-review-media',
    upload.array('files', 3), // accepts up to 10 files,
    handleUploadSuccess,
    controller.uploadMultipleImages.bind(controller),
  );

  return router;
};
