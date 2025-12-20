import Razorpay from 'razorpay';
import crypto from 'crypto';
import { injectable } from '../../services/di-container';
import { IService } from '../../interfaces/service.interface';
import { IPaymentService } from '../../interfaces/payment-service.interface';
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
} from './payment.types';
import { InvalidInputError, AppError } from '../../utils/error.utils';
import { IConfigService } from '../../services/config.service';
import { IDatabaseService } from '../../interfaces/database-service.interface';

@injectable()
export class PaymentService implements IService, IPaymentService {
  static dependencies = ['ConfigService', 'DatabaseService'];
  static optionalDependencies: string[] = [];

  private config: IConfigService;
  private razorpayInstance: Razorpay;
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;
  private db: IDatabaseService;

  constructor(config: IConfigService, db: IDatabaseService) {
    this.config = config;
    this.db = db;

    // Load credentials from config
    this.keyId = this.config.get('RAZORPAY_KEY_ID') as string;
    this.keySecret = this.config.get('RAZORPAY_KEY_SECRET') as string;
    this.webhookSecret = this.config.get('RAZORPAY_WEBHOOK_SECRET') as string;

    if (!this.keyId || !this.keySecret) {
      throw new InvalidInputError('Razorpay credentials not configured');
    }

    this.razorpayInstance = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });
  }

  async initialize(): Promise<void> {
    console.log('PaymentService initialized with Razorpay SDK');
  }

  /**
   * Get Razorpay Key ID (for frontend use)
   */
  getRazorpayKeyId(): string {
    return this.keyId;
  }

  /**
   * Create Razorpay Order
   */
  async createRazorpayOrder(data: CreateRazorpayOrderInput): Promise<RazorpayOrder> {
    try {
      if (!data.amount || data.amount <= 0) {
        throw new InvalidInputError('Invalid amount. Amount must be greater than 0');
      }

      const options = {
        amount: Math.round(data.amount * 100), // Convert to paise
        currency: data.currency || 'INR',
        receipt: data.receipt || `receipt_${Date.now()}`,
        notes: data.notes || {},
      };

      console.log('Creating Razorpay order', {
        amount: options.amount,
        receipt: options.receipt,
      });

      const order = await this.razorpayInstance.orders.create(options);

      console.log(`Razorpay order created successfully: ${order.id}`);

      return order as RazorpayOrder;
    } catch (error: any) {
      console.error('Error creating Razorpay order', error);
      throw new InvalidInputError(error.message || 'Failed to create Razorpay order');
    }
  }

  /**
   * Verify Payment Signature
   */
  async verifyPaymentSignature(data: VerifyPaymentInput): Promise<PaymentVerificationResult> {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = data;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new InvalidInputError('Missing payment verification parameters');
      }

      console.log('Verifying payment signature', {
        razorpay_payment_id,
        order_id,
      });

      // Generate signature
      const generatedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      const isValid = generatedSignature === razorpay_signature;

      if (isValid) {
        console.log(`Payment verified successfully: ${razorpay_payment_id}`);

        // Fetch payment details from Razorpay
        const paymentDetails = await this.fetchPaymentDetails(razorpay_payment_id);

        return {
          verified: true,
          payment_id: razorpay_payment_id,
          order_id: order_id,
          payment_method: paymentDetails.method,
          payment_details: paymentDetails,
        };
      } else {
        console.warn(`Payment verification failed: ${razorpay_payment_id}`);

        return {
          verified: false,
          payment_id: razorpay_payment_id,
          order_id: order_id,
        };
      }
    } catch (error: any) {
      console.error('Error verifying payment', error);
      throw new InvalidInputError(error.message || 'Payment verification failed');
    }
  }

  /**
   * Fetch Payment Details from Razorpay
   */
  async fetchPaymentDetails(paymentId: string): Promise<PaymentDetails> {
    try {
      if (!paymentId) {
        throw new InvalidInputError('Payment ID is required');
      }

      console.log(`Fetching payment details: ${paymentId}`);

      const payment = await this.razorpayInstance.payments.fetch(paymentId);

      console.log(`Payment details fetched successfully: ${paymentId}`);

      return payment as PaymentDetails;
    } catch (error: any) {
      console.error('Error fetching payment details', error);
      throw new InvalidInputError(error.message || 'Failed to fetch payment details');
    }
  }

  /**
   * Fetch All Payments
   */
  async fetchAllPayments(options?: FetchPaymentsOptions): Promise<any> {
    try {
      const queryOptions = {
        from: options?.from,
        to: options?.to,
        count: options?.count || 10,
        skip: options?.skip || 0,
      };

      console.log('Fetching all payments', queryOptions);

      const payments = await this.razorpayInstance.payments.all(queryOptions);

      console.log(`Fetched ${payments.items.length} payments`);

      return payments;
    } catch (error: any) {
      console.error('Error fetching all payments', error);
      throw new InvalidInputError(error.message || 'Failed to fetch payments');
    }
  }

  /**
   * Capture Payment (for manual capture)
   */
  async capturePayment(data: CapturePaymentInput): Promise<any> {
    try {
      const { payment_id, amount, currency } = data;

      if (!payment_id || !amount) {
        throw new InvalidInputError('Payment ID and amount are required');
      }

      if (amount <= 0) {
        throw new InvalidInputError('Amount must be greater than 0');
      }

      console.log('Capturing payment', {
        payment_id,
        amount,
      });

      const capturedPayment = await this.razorpayInstance.payments.capture(
        payment_id,
        Math.round(amount * 100), // Convert to paise
        currency || 'INR',
      );

      console.log(`Payment captured successfully: ${payment_id}`);

      return capturedPayment;
    } catch (error: any) {
      console.error('Error capturing payment', error);
      throw new InvalidInputError(error.message || 'Failed to capture payment');
    }
  }

  /**
   * Create Refund
   */
  async createRefund(data: RefundInput): Promise<RefundResponse> {
    try {
      const { payment_id, amount, notes, speed } = data;

      if (!payment_id) {
        throw new InvalidInputError('Payment ID is required');
      }

      const refundOptions: any = {
        speed: speed || 'normal',
      };

      if (amount) {
        if (amount <= 0) {
          throw new InvalidInputError('Refund amount must be greater than 0');
        }
        refundOptions.amount = Math.round(amount * 100); // Convert to paise
      }

      if (notes) {
        refundOptions.notes = notes;
      }

      console.log('Creating refund', {
        payment_id,
        amount: refundOptions.amount,
        speed: refundOptions.speed,
      });

      const refund = await this.razorpayInstance.payments.refund(payment_id, refundOptions);

      console.log(`Refund created successfully: ${refund.id} for payment: ${payment_id}`);

      return refund as any;
    } catch (error: any) {
      console.error('Error creating refund', error);
      throw new InvalidInputError(error.message || 'Failed to create refund');
    }
  }

  /**
   * Fetch Refund Details
   */
  async fetchRefundDetails(refundId: string): Promise<RefundResponse> {
    try {
      if (!refundId) {
        throw new InvalidInputError('Refund ID is required');
      }

      console.log(`Fetching refund details: ${refundId}`);

      const refund = await this.razorpayInstance.refunds.fetch(refundId);

      console.log(`Refund details fetched successfully: ${refundId}`);

      return refund as any;
    } catch (error: any) {
      console.error('Error fetching refund details', error);
      throw new InvalidInputError(error.message || 'Failed to fetch refund details');
    }
  }

  /**
   * Fetch All Refunds for a Payment
   */
  async fetchAllRefunds(paymentId: string): Promise<any> {
    try {
      if (!paymentId) {
        throw new InvalidInputError('Payment ID is required');
      }

      console.log(`Fetching all refunds for payment: ${paymentId}`);

      const refunds = await this.razorpayInstance.payments.fetchMultipleRefund(paymentId);

      console.log(`Fetched refunds for payment: ${paymentId}`);

      return refunds;
    } catch (error: any) {
      console.error('Error fetching refunds', error);
      throw new InvalidInputError(error.message || 'Failed to fetch refunds');
    }
  }

  /**
   * Verify Webhook Signature
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    try {
      if (!signature) {
        console.warn('No webhook signature provided');
        return false;
      }

      if (!this.webhookSecret) {
        console.error('Webhook secret not configured');
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(body)
        .digest('hex');

      const isValid = expectedSignature === signature;

      if (!isValid) {
        console.warn('Invalid webhook signature');
      }

      return isValid;
    } catch (error: any) {
      console.error('Error verifying webhook signature', error);
      return false;
    }
  }

  /**
   * Handle Webhook Events
   */
  async handleWebhookEvent(event: WebhookEvent): Promise<void> {
    try {
      console.log(`Processing webhook event: ${event.event}`, {
        account_id: event.account_id,
        created_at: event.created_at,
      });

      switch (event.event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(event);
          break;

        case 'payment.failed':
          await this.handlePaymentFailed(event);
          break;

        case 'payment.authorized':
          await this.handlePaymentAuthorized(event);
          break;

        case 'order.paid':
          await this.handleOrderPaid(event);
          break;

        case 'refund.created':
          await this.handleRefundCreated(event);
          break;

        case 'refund.processed':
          await this.handleRefundProcessed(event);
          break;

        case 'refund.failed':
          await this.handleRefundFailed(event);
          break;

        default:
          console.log(`Unhandled webhook event: ${event.event}`);
      }
    } catch (error: any) {
      console.error('Error handling webhook event', error);
      throw error;
    }
  }

  // ==================== Private Webhook Handlers ====================

  private async handlePaymentCaptured(event: WebhookEvent): Promise<void> {
    const payment = event.payload.payment?.entity;

    if (!payment) {
      console.warn('Payment entity not found in webhook event');
      return;
    }

    console.log('Webhook: Payment captured', {
      payment_id: payment.id,
      amount: payment.amount / 100,
      method: payment.method,
      order_id: payment.order_id,
    });
    await this.db.client.order.updateMany({
      where: {
        razorpayOrderId: payment.order_id,
      },
      data: {
        paymentId: payment.id,
      },
    });
  }

  private async handlePaymentFailed(event: WebhookEvent): Promise<void> {
    const payment = event.payload.payment?.entity;

    if (!payment) {
      console.warn('Payment entity not found in webhook event');
      return;
    }

    console.warn('Webhook: Payment failed', {
      payment_id: payment.id,
      error_code: payment.error_code,
      error_description: payment.error_description,
      order_id: payment.order_id,
    });

    await this.db.client.order.updateMany({
      where: {
        razorpayOrderId: payment.order_id,
      },
      data: {
        paymentId: payment.id,
        paymentStatus: 'FAILED',
      },
    });
  }

  private async handlePaymentAuthorized(event: WebhookEvent): Promise<void> {
    const payment = event.payload.payment?.entity;

    if (!payment) {
      console.warn('Payment entity not found in webhook event');
      return;
    }

    console.log('Webhook: Payment authorized', {
      payment_id: payment.id,
      amount: payment.amount / 100,
      order_id: payment.order_id,
    });
  }

  private async handleOrderPaid(event: WebhookEvent): Promise<void> {
    const order = event.payload.order?.entity;

    if (!order) {
      console.warn('Order entity not found in webhook event');
      return;
    }

    console.log('Webhook: Order paid', {
      razorpay_order_id: order.id,
      amount: order.amount / 100,
      status: order.status,
    });
    //    UNPAID;
    // PAID;
    // FAILED;
    // REFUNDED;
    await this.db.client.order.updateMany({
      where: {
        razorpayOrderId: order.id,
      },
      data: {
        status: order.status == 'paid' ? 'CONFIRMED' : 'PENDING',
        paymentStatus: order.status == 'paid' ? 'PAID' : null,
      },
    });
  }

  private async handleRefundCreated(event: WebhookEvent): Promise<void> {
    const payment = event.payload.payment?.entity;
    const refund = event.payload.refund?.entity;

    if (!payment || !refund) {
      console.warn('Payment or refund entity not found in webhook event');
      return;
    }

    console.log('Webhook: Refund created', {
      refund_id: refund.id,
      payment_id: payment.id,
      amount: refund.amount / 100,
      status: refund.status,
    });
  }

  private async handleRefundProcessed(event: WebhookEvent): Promise<void> {
    const payment = event.payload.payment?.entity;
    const refund = event.payload.refund?.entity;

    if (!payment || !refund) {
      console.warn('Payment or refund entity not found in webhook event');
      return;
    }

    console.log('Webhook: Refund processed', {
      refund_id: refund.id,
      payment_id: payment.id,
      amount: refund.amount / 100,
      status: refund.status,
    });
  }

  private async handleRefundFailed(event: WebhookEvent): Promise<void> {
    const payment = event.payload.payment?.entity;
    const refund = event.payload.refund?.entity;

    if (!payment || !refund) {
      console.warn('Payment or refund entity not found in webhook event');
      return;
    }

    console.warn('Webhook: Refund failed', {
      refund_id: refund.id,
      payment_id: payment.id,
      amount: refund.amount / 100,
    });
  }
}
