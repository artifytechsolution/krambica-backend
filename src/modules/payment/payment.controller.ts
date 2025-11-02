import { NextFunction, Request, Response } from 'express';
import { ResponseUtil } from '../../utils/responce.utils';
import { DIContainer } from '../../services/di-container';
import { IPaymentService } from '../../interfaces/payment-service.interface';
import { ILoggerService } from '../../services/logger.service';
import { AppError, InvalidInputError } from '../../utils/error.utils';

export class PaymentController {
  private paymentService: IPaymentService;
  private logger: ILoggerService;

  constructor() {
    this.paymentService = DIContainer.resolve<IPaymentService>('PaymentService');
    this.logger = DIContainer.resolve<ILoggerService>('LoggerService');
  }

  /**
   * POST /api/payment/verify
   * Verify payment signature
   */
  async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.paymentService.verifyPaymentSignature(req.body);

      if (result.verified) {
        res.json(
          ResponseUtil.success(
            {
              verified: true,
              payment_id: result.payment_id,
              order_id: result.order_id,
              payment_method: result.payment_method,
            },
            'Payment verified successfully',
          ),
        );
      } else {
        res.status(400).json(
          ResponseUtil.error('Payment verification failed', {
            verified: false,
            payment_id: result.payment_id,
            order_id: result.order_id,
          }),
        );
      }
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  /**
   * GET /api/payment/details/:paymentId
   * Fetch payment details
   */
  async getPaymentDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payment = await this.paymentService.fetchPaymentDetails(req.params.paymentId);
      res.json(ResponseUtil.success(payment, 'Payment details fetched successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  /**
   * GET /api/payment/all
   * Fetch all payments
   */
  async getAllPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const options = {
        from: req.query.from ? Number(req.query.from) : undefined,
        to: req.query.to ? Number(req.query.to) : undefined,
        count: req.query.count ? Number(req.query.count) : 10,
        skip: req.query.skip ? Number(req.query.skip) : 0,
      };

      const payments = await this.paymentService.fetchAllPayments(options);
      res.json(ResponseUtil.success(payments, 'Payments fetched successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  /**
   * POST /api/payment/capture
   * Capture payment
   */
  async capturePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.paymentService.capturePayment(req.body);
      res.json(ResponseUtil.success(result, 'Payment captured successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  /**
   * POST /api/payment/refund
   * Create refund
   */
  async createRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refund = await this.paymentService.createRefund(req.body);
      res.status(201).json(ResponseUtil.success(refund, 'Refund created successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  /**
   * GET /api/payment/refund/:refundId
   * Fetch refund details
   */
  async getRefundDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refund = await this.paymentService.fetchRefundDetails(req.params.refundId);
      res.json(ResponseUtil.success(refund, 'Refund details fetched successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  /**
   * GET /api/payment/:paymentId/refunds
   * Fetch all refunds
   */
  async getAllRefunds(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refunds = await this.paymentService.fetchAllRefunds(req.params.paymentId);
      res.json(ResponseUtil.success(refunds, 'Refunds fetched successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  /**
   * GET /api/payment/key
   * Get Razorpay key
   */
  async getRazorpayKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const keyId = this.paymentService.getRazorpayKeyId();
      res.json(ResponseUtil.success({ key_id: keyId }, 'Razorpay key fetched successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  /**
   * POST /api/payment/webhook
   * Handle webhooks
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;

      if (!signature) {
        throw new InvalidInputError('Missing webhook signature');
      }

      const body = JSON.stringify(req.body);

      // Verify webhook signature
      const isValid = this.paymentService.verifyWebhookSignature(body, signature);

      if (!isValid) {
        console.warn('Invalid webhook signature received');
        throw new InvalidInputError('Invalid webhook signature');
      }

      // Process webhook event asynchronously
      this.processWebhookAsync(req.body);

      // Return 200 immediately
      res.status(200).json(ResponseUtil.success(null, 'Webhook received successfully'));
    } catch (error) {
      if (error instanceof AppError) {
        next(
          error instanceof AppError ? error : new InvalidInputError('An unexpected error occurred'),
        );
      }
    }
  }

  /**
   * Process webhook asynchronously
   */
  private async processWebhookAsync(event: any): Promise<void> {
    try {
      await this.paymentService.handleWebhookEvent(event);
    } catch (error: any) {
      console.error('Error processing webhook asynchronously', error);
    }
  }
}
