import { Router } from 'express';
import { PaymentController } from './payment.controller';

export const paymentRoutes = (controller: PaymentController): Router => {
  const router = Router();

  // Verify payment signature
  router.post('/verify', controller.verifyPayment.bind(controller));

  // Get Razorpay key
  router.get('/key', controller.getRazorpayKey.bind(controller));

  // Get payment details
  router.get('/details/:paymentId', controller.getPaymentDetails.bind(controller));

  // Get all payments (admin)
  router.get('/all', controller.getAllPayments.bind(controller));

  // Capture payment
  router.post('/capture', controller.capturePayment.bind(controller));

  // Create refund
  router.post('/refund', controller.createRefund.bind(controller));

  // Get refund details
  router.get('/refund/:refundId', controller.getRefundDetails.bind(controller));

  // Get all refunds
  router.get('/:paymentId/refunds', controller.getAllRefunds.bind(controller));

  // Webhook handler
  router.post('/webhook', controller.handleWebhook.bind(controller));

  return router;
};
