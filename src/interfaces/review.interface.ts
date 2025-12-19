import {
  CreateReviewInput,
  UpdateReviewInput,
  ReviewListQuery,
} from '../modules/review/review.types';
export interface IReviewServices {
  getRatingSummary(productId: string): Promise<any>;
  getReviews(query: ReviewListQuery): Promise<any>;
  getReviewById(reviewId: string): Promise<any>;
  createReview(userId: string, data: any): Promise<any>;
  updateReview(reviewId: string, userId: string, data: UpdateReviewInput): Promise<any>;
  deleteReview(reviewId: string, userId: string): Promise<string>;
  uploadReviewMedia(data: any): Promise<any>;
}
