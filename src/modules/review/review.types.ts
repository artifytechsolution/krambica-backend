export interface Review {
  id: number;
  name: string;
  createdAt: string;
}
export interface ReviewListQuery {
  productId: string;
  page?: number;
  limit?: number;
  tab?: string;
  ratings?: string;
}

export interface CreateReviewInput {
  product_id: string;
  rating: number;
  reviewText?: string;
  media?: Array<{
    url: string;
    type: string;
  }>;
}

export interface UpdateReviewInput {
  rating?: number;
  reviewText?: string;
  media?: Array<{
    url: string;
    type: string;
  }>;
}
