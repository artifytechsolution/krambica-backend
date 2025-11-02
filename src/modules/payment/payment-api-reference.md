# Payment Module API Reference

## Overview
The Payment Module provides comprehensive Razorpay payment gateway integration for handling payments, refunds, and payment webhooks.

**Base URL:** `/api/payment`

---

## Table of Contents
1. [Get Razorpay Key](#1-get-razorpay-key)
2. [Verify Payment](#2-verify-payment)
3. [Get Payment Details](#3-get-payment-details)
4. [Get All Payments](#4-get-all-payments)
5. [Capture Payment](#5-capture-payment)
6. [Create Refund](#6-create-refund)
7. [Get Refund Details](#7-get-refund-details)
8. [Get All Refunds](#8-get-all-refunds)
9. [Webhook Handler](#9-webhook-handler)

---

## 1. Get Razorpay Key

**Endpoint:** `GET /api/payment/key`

**Description:** Retrieve the Razorpay public key ID for frontend integration. This key is required to initialize Razorpay checkout.

**Authentication:** Not required (Public endpoint)

**Request:**
```bash
curl -X GET http://localhost:3000/api/payment/key
```

**Response (200 - Success):**
```json
{
  "success": true,
  "message": "Razorpay key fetched successfully",
  "data": {
    "key_id": "rzp_test_1234567890abcd"
  }
}
```

**Response (500 - Error):**
```json
{
  "success": false,
  "message": "Razorpay credentials not configured",
  "error": "Internal Server Error"
}
```

**Use Case:**
- Call this API on page load to get the Razorpay key
- Use the returned `key_id` to initialize Razorpay Checkout on frontend
- Store in frontend state or pass to Razorpay checkout initialization

**Frontend Example:**
```javascript
// Fetch Razorpay key
const response = await fetch('http://localhost:3000/api/payment/key');
const { data } = await response.json();

// Initialize Razorpay checkout
const rzp = new Razorpay({
  key_id: data.key_id,
  // ... other options
});
```

---

## 2. Verify Payment

**Endpoint:** `POST /api/payment/verify`

**Description:** Verify payment signature after customer completes payment. This is the most critical step to ensure payment authenticity.

**Authentication:** Not required (Signature is verification)

**Request Body:**
```json
{
  "razorpay_order_id": "order_1A2b3C4d5E6f7G",
  "razorpay_payment_id": "pay_1A2b3C4d5E6f7G",
  "razorpay_signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d",
  "order_id": 789
}
```

**Request Parameters Explanation:**
- `razorpay_order_id` (string, required): Order ID returned from Razorpay
- `razorpay_payment_id` (string, required): Payment ID generated after transaction
- `razorpay_signature` (string, required): Digital signature from Razorpay (HMAC SHA256)
- `order_id` (number, required): Your database order ID for tracking

**Response (200 - Success):**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "verified": true,
    "payment_id": "pay_1A2b3C4d5E6f7G",
    "order_id": 789,
    "payment_method": "upi"
  }
}
```

**Response (400 - Verification Failed):**
```json
{
  "success": false,
  "message": "Payment verification failed",
  "data": {
    "verified": false,
    "payment_id": "pay_1A2b3C4d5E6f7G",
    "order_id": 789
  }
}
```

**Response (400 - Invalid Input):**
```json
{
  "success": false,
  "message": "Missing payment verification parameters"
}
```

**Security Note:**
- Always verify payment on backend to prevent fraud
- Signature is verified using HMAC SHA256 algorithm
- Never trust frontend payment confirmation without backend verification
- Comparison: `generatedSignature = HMAC_SHA256(order_id|payment_id, webhook_secret)`

**Frontend Implementation:**
```javascript
// After Razorpay checkout success
async function verifyPayment(response) {
  const result = await fetch('http://localhost:3000/api/payment/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature,
      order_id: yourOrderId
    })
  });
  
  const data = await result.json();
  if (data.data.verified) {
    // Payment successful
    console.log('Payment verified!');
  }
}
```

---

## 3. Get Payment Details

**Endpoint:** `GET /api/payment/details/:paymentId`

**Description:** Retrieve detailed information about a specific payment from Razorpay.

**Authentication:** Not required

**Path Parameters:**
- `paymentId` (string, required): Razorpay payment ID (e.g., `pay_1A2b3C4d5E6f7G`)

**Request:**
```bash
curl -X GET http://localhost:3000/api/payment/details/pay_1A2b3C4d5E6f7G
```

**Response (200 - Success):**
```json
{
  "success": true,
  "message": "Payment details fetched successfully",
  "data": {
    "id": "pay_1A2b3C4d5E6f7G",
    "entity": "payment",
    "amount": 150050,
    "currency": "INR",
    "status": "captured",
    "order_id": "order_1A2b3C4d5E6f7G",
    "method": "upi",
    "captured": true,
    "email": "customer@example.com",
    "contact": "+919876543210",
    "created_at": 1698056800,
    "description": null,
    "card_id": null,
    "bank": null,
    "wallet": null,
    "vpa": "customer@googleplay",
    "fee": 3541,
    "tax": 541,
    "amount_refunded": 0,
    "refund_status": null,
    "error_code": null,
    "error_description": null
  }
}
```

**Response (500 - Error):**
```json
{
  "success": false,
  "message": "Failed to fetch payment details"
}
```

**Response (400 - Invalid Input):**
```json
{
  "success": false,
  "message": "Payment ID is required"
}
```

**Data Fields Explanation:**
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique payment identifier |
| amount | number | Payment amount in paise (divide by 100 for rupees) |
| currency | string | Currency code (INR) |
| status | string | Payment status (captured, failed, refunded) |
| method | string | Payment method (upi, card, netbanking, wallet) |
| email | string | Customer email |
| contact | string | Customer phone number |
| fee | number | Transaction fee in paise |
| tax | number | Tax on transaction in paise |
| amount_refunded | number | Total refunded amount in paise |
| created_at | number | Unix timestamp of payment creation |

**Use Cases:**
- Reconciliation reports
- Payment history display
- Customer support inquiries
- Payment status tracking

---

## 4. Get All Payments

**Endpoint:** `GET /api/payment/all`

**Description:** Retrieve a list of all payments with optional filters and pagination.

**Authentication:** Admin only (recommended)

**Query Parameters:**
```bash
?from=1698000000&to=1698086400&count=10&skip=0
```

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| from | number | No | Unix timestamp (start date) | 1698000000 |
| to | number | No | Unix timestamp (end date) | 1698086400 |
| count | number | No | Records per page (default: 10) | 20 |
| skip | number | No | Records to skip (offset) | 0 |

**Request:**
```bash
curl -X GET "http://localhost:3000/api/payment/all?count=5&skip=0"
```

**Response (200 - Success):**
```json
{
  "success": true,
  "message": "Payments fetched successfully",
  "data": {
    "entity": "collection",
    "count": 5,
    "items": [
      {
        "id": "pay_1A2b3C4d5E6f7G",
        "entity": "payment",
        "amount": 150050,
        "currency": "INR",
        "status": "captured",
        "order_id": "order_1A2b3C4d5E6f7G",
        "method": "upi",
        "captured": true,
        "email": "customer@example.com",
        "contact": "+919876543210",
        "created_at": 1698056800
      },
      {
        "id": "pay_2B3c4D5e6F7g8H",
        "entity": "payment",
        "amount": 50000,
        "currency": "INR",
        "status": "failed",
        "order_id": "order_2B3c4D5e6F7g8H",
        "method": "card",
        "captured": false,
        "email": "another@example.com",
        "contact": "+919876543211",
        "created_at": 1698057000
      }
    ]
  }
}
```

**Response (500 - Error):**
```json
{
  "success": false,
  "message": "Failed to fetch payments"
}
```

**Use Cases:**
- Admin dashboard payment listing
- Payment reconciliation
- Revenue reports
- Payment analytics
- Export payment history

**Pagination Example:**
```javascript
// Get 10 payments per page
let skip = 0;
async function getPaymentPage(pageNumber) {
  skip = (pageNumber - 1) * 10;
  const response = await fetch(
    `http://localhost:3000/api/payment/all?count=10&skip=${skip}`
  );
  return await response.json();
}
```

---

## 5. Capture Payment

**Endpoint:** `POST /api/payment/capture`

**Description:** Manually capture an authorized payment. Use this when auto-capture is disabled in Razorpay settings.

**Authentication:** Not required

**Request Body:**
```json
{
  "payment_id": "pay_1A2b3C4d5E6f7G",
  "amount": 1500.50,
  "currency": "INR"
}
```

**Request Parameters:**
- `payment_id` (string, required): Razorpay payment ID to capture
- `amount` (number, required): Amount to capture in rupees (will be converted to paise)
- `currency` (string, optional): Currency code (default: INR)

**Response (200 - Success):**
```json
{
  "success": true,
  "message": "Payment captured successfully",
  "data": {
    "id": "pay_1A2b3C4d5E6f7G",
    "entity": "payment",
    "amount": 150050,
    "currency": "INR",
    "status": "captured",
    "order_id": "order_1A2b3C4d5E6f7G",
    "method": "card",
    "captured": true,
    "email": "customer@example.com",
    "contact": "+919876543210",
    "created_at": 1698056800
  }
}
```

**Response (500 - Error):**
```json
{
  "success": false,
  "message": "Failed to capture payment"
}
```

**Response (400 - Invalid Input):**
```json
{
  "success": false,
  "message": "Payment ID and amount are required"
}
```

**Payment Status Timeline:**
```
Authorized → Captured → Settled
  ↓
  Capture (manual)
  ↓
  Settled (within 24 hours)
```

**When to Use:**
- Manual capture enabled in Razorpay settings
- Conditional captures (after order verification)
- Post-authorization checks
- Inventory verification before capturing

**Example Use Case:**
```javascript
// Capture after inventory verification
async function capturePaymentAfterVerification(paymentId, orderAmount) {
  // Verify inventory
  const inventoryOk = await verifyInventory();
  
  if (inventoryOk) {
    // Capture payment
    const response = await fetch('http://localhost:3000/api/payment/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_id: paymentId,
        amount: orderAmount,
        currency: 'INR'
      })
    });
    return await response.json();
  }
}
```

---

## 6. Create Refund

**Endpoint:** `POST /api/payment/refund`

**Description:** Create a full or partial refund for a payment. Initiates the refund process on Razorpay.

**Authentication:** Not required

**Request Body (Full Refund):**
```json
{
  "payment_id": "pay_1A2b3C4d5E6f7G",
  "notes": {
    "reason": "Product damaged",
    "comment": "Customer requested full refund"
  },
  "speed": "normal"
}
```

**Request Body (Partial Refund):**
```json
{
  "payment_id": "pay_1A2b3C4d5E6f7G",
  "amount": 500.00,
  "notes": {
    "reason": "Partial return",
    "item_sku": "ITEM-123"
  },
  "speed": "optimum"
}
```

**Request Parameters:**
- `payment_id` (string, required): Razorpay payment ID to refund
- `amount` (number, optional): Amount to refund in rupees (omit for full refund)
- `notes` (object, optional): Additional refund notes/metadata
- `speed` (string, optional): Refund speed
  - `normal`: 5-7 business days (default)
  - `optimum`: Instant refund (if available)

**Response (201 - Success):**
```json
{
  "success": true,
  "message": "Refund created successfully",
  "data": {
    "id": "rfnd_1A2b3C4d5E6f7G",
    "entity": "refund",
    "amount": 150050,
    "currency": "INR",
    "payment_id": "pay_1A2b3C4d5E6f7G",
    "status": "processed",
    "speed": "normal",
    "created_at": 1698057000,
    "notes": {
      "reason": "Product damaged",
      "comment": "Customer requested full refund"
    }
  }
}
```

**Response (500 - Error):**
```json
{
  "success": false,
  "message": "Failed to create refund"
}
```

**Response (400 - Invalid Input):**
```json
{
  "success": false,
  "message": "Refund amount must be greater than 0"
}
```

**Refund Timeline:**
```
Refund Request
  ↓
Processing (1-2 hours)
  ↓
Processed
  ↓
Settlement (5-7 business days for normal, instant for optimum)
  ↓
Refunded
```

**Refund Scenarios:**

1. **Full Refund:**
```json
{
  "payment_id": "pay_1A2b3C4d5E6f7G",
  "notes": { "reason": "Order cancelled" },
  "speed": "normal"
}
```

2. **Partial Refund:**
```json
{
  "payment_id": "pay_1A2b3C4d5E6f7G",
  "amount": 500,
  "notes": { "reason": "Item returned", "item_id": "ITEM-123" },
  "speed": "normal"
}
```

3. **Instant Refund:**
```json
{
  "payment_id": "pay_1A2b3C4d5E6f7G",
  "notes": { "reason": "Emergency refund" },
  "speed": "optimum"
}
```

**Use Cases:**
- Order cancellation
- Return processing
- Partial refunds for returned items
- Customer complaints
- Overpayment corrections

---

## 7. Get Refund Details

**Endpoint:** `GET /api/payment/refund/:refundId`

**Description:** Retrieve detailed information about a specific refund.

**Authentication:** Not required

**Path Parameters:**
- `refundId` (string, required): Razorpay refund ID (e.g., `rfnd_1A2b3C4d5E6f7G`)

**Request:**
```bash
curl -X GET http://localhost:3000/api/payment/refund/rfnd_1A2b3C4d5E6f7G
```

**Response (200 - Success):**
```json
{
  "success": true,
  "message": "Refund details fetched successfully",
  "data": {
    "id": "rfnd_1A2b3C4d5E6f7G",
    "entity": "refund",
    "amount": 150050,
    "currency": "INR",
    "payment_id": "pay_1A2b3C4d5E6f7G",
    "status": "processed",
    "speed": "normal",
    "created_at": 1698057000,
    "notes": {
      "reason": "Product damaged",
      "comment": "Customer requested full refund"
    },
    "receipt": "REFUND-001",
    "acquirer_data": {
      "arn": "10000000000000"
    },
    "batch_id": null
  }
}
```

**Response (500 - Error):**
```json
{
  "success": false,
  "message": "Failed to fetch refund details"
}
```

**Data Fields:**
| Field | Description |
|-------|-------------|
| status | Refund status (processed, failed, pending) |
| speed | Refund speed (normal or optimum) |
| receipt | Refund receipt number |
| arn | Acquirer Reference Number (for settlement tracking) |
| batch_id | Batch ID if refund was part of bulk operation |

**Use Cases:**
- Refund status tracking
- Customer inquiry resolution
- Reconciliation
- Audit trails
- Refund history

---

## 8. Get All Refunds

**Endpoint:** `GET /api/payment/:paymentId/refunds`

**Description:** Retrieve all refunds associated with a specific payment.

**Authentication:** Not required

**Path Parameters:**
- `paymentId` (string, required): Razorpay payment ID

**Request:**
```bash
curl -X GET http://localhost:3000/api/payment/pay_1A2b3C4d5E6f7G/refunds
```

**Response (200 - Success):**
```json
{
  "success": true,
  "message": "Refunds fetched successfully",
  "data": {
    "entity": "collection",
    "count": 2,
    "items": [
      {
        "id": "rfnd_1A2b3C4d5E6f7G",
        "entity": "refund",
        "amount": 50000,
        "currency": "INR",
        "payment_id": "pay_1A2b3C4d5E6f7G",
        "status": "processed",
        "speed": "normal",
        "created_at": 1698057000
      },
      {
        "id": "rfnd_1B3c4D5e6F7g8H",
        "entity": "refund",
        "amount": 100050,
        "currency": "INR",
        "payment_id": "pay_1A2b3C4d5E6f7G",
        "status": "processed",
        "speed": "optimum",
        "created_at": 1698057100
      }
    ]
  }
}
```

**Response (500 - Error):**
```json
{
  "success": false,
  "message": "Failed to fetch refunds"
}
```

**Use Cases:**
- Multiple partial refunds tracking
- Complete refund history for payment
- Return process tracking
- Audit and compliance

---

## 9. Webhook Handler

**Endpoint:** `POST /api/payment/webhook`

**Description:** Receive and process real-time payment events from Razorpay. Must be configured in Razorpay dashboard.

**Authentication:** Signature verification (required)

**Headers:**
```
x-razorpay-signature: 9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d
Content-Type: application/json
```

**Webhook Configuration:**
1. Go to Razorpay Dashboard
2. Settings → Webhooks
3. Add URL: `https://yourdomain.com/api/payment/webhook`
4. Select events to subscribe
5. Copy webhook secret

**Event: payment.captured**
```json
{
  "entity": "event",
  "account_id": "acc_1A2b3C4d5E6f7G",
  "event": "payment.captured",
  "contains": ["payment"],
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_1A2b3C4d5E6f7G",
        "entity": "payment",
        "amount": 150050,
        "currency": "INR",
        "status": "captured",
        "order_id": "order_1A2b3C4d5E6f7G",
        "method": "upi",
        "captured": true,
        "email": "customer@example.com",
        "contact": "+919876543210",
        "created_at": 1698056800
      }
    }
  },
  "created_at": 1698056820
}
```

**Event: payment.failed**
```json
{
  "entity": "event",
  "account_id": "acc_1A2b3C4d5E6f7G",
  "event": "payment.failed",
  "contains": ["payment"],
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_1A2b3C4d5E6f7G",
        "entity": "payment",
        "amount": 150050,
        "currency": "INR",
        "status": "failed",
        "order_id": "order_1A2b3C4d5E6f7G",
        "method": "card",
        "captured": false,
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Card declined",
        "created_at": 1698056800
      }
    }
  },
  "created_at": 1698056820
}
```

**Event: refund.processed**
```json
{
  "entity": "event",
  "account_id": "acc_1A2b3C4d5E6f7G",
  "event": "refund.processed",
  "contains": ["payment", "refund"],
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_1A2b3C4d5E6f7G",
        "status": "refunded"
      }
    },
    "refund": {
      "entity": {
        "id": "rfnd_1A2b3C4d5E6f7G",
        "amount": 150050,
        "status": "processed",
        "payment_id": "pay_1A2b3C4d5E6f7G",
        "created_at": 1698057000
      }
    }
  },
  "created_at": 1698057020
}
```

**Response (200 - Success):**
```json
{
  "success": true,
  "message": "Webhook received successfully",
  "data": null
}
```

**Response (400 - Invalid Signature):**
```json
{
  "success": false,
  "message": "Invalid webhook signature"
}
```

**Supported Events:**
- `payment.captured`: Payment successfully captured
- `payment.failed`: Payment failed
- `payment.authorized`: Payment authorized (pending capture)
- `order.paid`: Order marked as paid
- `refund.created`: Refund initiated
- `refund.processed`: Refund completed
- `refund.failed`: Refund failed

**Webhook Implementation in Backend:**
```javascript
// In your webhook handler
async handleWebhook(event) {
  switch(event.event) {
    case 'payment.captured':
      // Update order status to confirmed
      await updateOrderStatus(event.payload.payment.entity.order_id, 'CONFIRMED');
      break;
      
    case 'payment.failed':
      // Update order status to failed
      await updateOrderStatus(event.payload.payment.entity.order_id, 'FAILED');
      break;
      
    case 'refund.processed':
      // Update return status
      await updateReturnStatus(event.payload.refund.entity.id, 'REFUNDED');
      break;
  }
}
```

**Security Notes:**
- Webhook signature is verified using HMAC SHA256
- Always verify signature before processing
- Webhook secret is in `.env` file
- Don't trust webhook data without signature verification
- Implement idempotency (handle duplicate events)
- Acknowledge webhook immediately with 200 OK

---

## Error Responses

### Common Error Codes

**400 - Bad Request:**
```json
{
  "success": false,
  "message": "Invalid input provided"
}
```

**401 - Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized access"
}
```

**404 - Not Found:**
```json
{
  "success": false,
  "message": "Resource not found"
}
```

**500 - Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Amount Format Guide

Always remember:
- **In API Requests:** Amounts in rupees (e.g., 1500.50)
- **In API Responses:** Amounts in paise (e.g., 150050)
- **Conversion:** Paise = Rupees × 100

```
Rupees → Paise:  1500.50 × 100 = 150050
Paise → Rupees:  150050 ÷ 100 = 1500.50
```

---

## Environment Variables

```env
RAZORPAY_KEY_ID=rzp_test_1234567890abcd
RAZORPAY_KEY_SECRET=your_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

---

## Rate Limiting

- **Per IP:** 100 requests per minute
- **Per User:** 1000 requests per hour
- **Burst:** 10 requests per second

---

## Testing Credentials

**Test Mode:**
- Key ID: `rzp_test_1Aa00000000001`
- Key Secret: Available in Razorpay Dashboard
- Test Cards: Available in Razorpay docs

**Test Card Numbers:**
- Visa Success: `4111 1111 1111 1111`
- Visa Failure: `4000 0000 0000 0002`
- UPI: `success@razorpay`

---

## Integration Steps

1. **Get Razorpay Key**
   ```
   GET /api/payment/key
   ```

2. **Create Order (from Order Module)**
   ```
   POST /api/orders/create
   (Returns razorpay_order_id)
   ```

3. **Initiate Payment on Frontend**
   ```javascript
   new Razorpay({
     key_id: rzpKey,
     order_id: razorpayOrderId
   }).open();
   ```

4. **Verify Payment**
   ```
   POST /api/payment/verify
   (With signature from Razorpay response)
   ```

5. **Handle Webhook**
   ```
   POST /api/payment/webhook
   (Automatic from Razorpay)
   ```

---

## Support & Documentation

- **Razorpay Docs:** https://razorpay.com/docs
- **Test Cards:** https://razorpay.com/docs/payments/test-mode/
- **Error Codes:** https://razorpay.com/docs/api/errors/

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-01 | Initial release |

---

**Last Updated:** 2025-11-01  
**Document Version:** 1.0  
**Status:** Production Ready ✅
