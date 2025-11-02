import {
  RazorpayOrder,
  CreateRazorpayOrderInput,
  VerifyPaymentInput,
  PaymentDetails,
  RefundInput,
  RefundResponse,
  WebhookEvent,
  CapturePaymentInput,
  PaymentVerificationResult,
  FetchPaymentsOptions,
} from '../modules/payment/payment.types';

export interface IPaymentService {
  initialize(): Promise<void>;
  createRazorpayOrder(data: CreateRazorpayOrderInput): Promise<RazorpayOrder>;
  verifyPaymentSignature(data: VerifyPaymentInput): Promise<PaymentVerificationResult>;
  fetchPaymentDetails(paymentId: string): Promise<PaymentDetails>;
  fetchAllPayments(options?: FetchPaymentsOptions): Promise<any>;
  capturePayment(data: CapturePaymentInput): Promise<any>;
  createRefund(data: RefundInput): Promise<RefundResponse>;
  fetchRefundDetails(refundId: string): Promise<RefundResponse>;
  fetchAllRefunds(paymentId: string): Promise<any>;
  verifyWebhookSignature(body: string, signature: string): boolean;
  handleWebhookEvent(event: WebhookEvent): Promise<void>;
  getRazorpayKeyId(): string;
}
