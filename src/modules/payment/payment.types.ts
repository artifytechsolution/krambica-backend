export interface CreateRazorpayOrderInput {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, any>;
}

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, any>;
  created_at: number;
}

export interface VerifyPaymentInput {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  order_id: number;
}

export interface PaymentVerificationResult {
  verified: boolean;
  payment_id: string;
  order_id: number;
  payment_method?: string;
  payment_details?: PaymentDetails;
}

export interface PaymentDetails {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string;
  method: string;
  captured: boolean;
  email: string;
  contact: string;
  created_at: number;
  description?: string;
  card_id?: string;
  bank?: string;
  wallet?: string;
  vpa?: string;
  fee?: number;
  tax?: number;
  error_code?: string;
  error_description?: string;
  amount_refunded?: number;
  refund_status?: string;
}

export interface CapturePaymentInput {
  payment_id: string;
  amount: number;
  currency?: string;
}

export interface RefundInput {
  payment_id: string;
  amount?: number;
  notes?: Record<string, any>;
  speed?: 'normal' | 'optimum';
}

export interface RefundResponse {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  payment_id: string;
  status: string;
  speed: string;
  created_at: number;
  notes?: Record<string, any>;
  receipt?: string;
}

export interface FetchPaymentsOptions {
  from?: number;
  to?: number;
  count?: number;
  skip?: number;
}

export interface WebhookEvent {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment?: {
      entity: PaymentDetails;
    };
    order?: {
      entity: RazorpayOrder;
    };
    refund?: {
      entity: RefundResponse;
    };
  };
  created_at: number;
}
