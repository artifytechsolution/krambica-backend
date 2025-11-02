# 📦 Orders API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [Error Handling](#error-handling)
5. [API Endpoints](#api-endpoints)
   - [CRUD Operations](#crud-operations)
   - [Status Management](#status-management)
   - [User Operations](#user-operations)
   - [Analytics](#analytics)
6. [Data Models](#data-models)
7. [Implementation Guide](#implementation-guide)

---

## Overview

The Orders API provides comprehensive functionality for managing e-commerce orders including creation, status tracking, stock management, and analytics. It implements a reserved stock system to prevent overselling and provides real-time order tracking capabilities.

### Key Features
- ✅ Complete order lifecycle management (PENDING → CONFIRMED → SHIPPED → DELIVERED)
- ✅ Reserved stock system with automatic deduction and restoration
- ✅ Advanced filtering and global search
- ✅ Real-time order tracking with estimated delivery
- ✅ Comprehensive analytics and revenue reporting
- ✅ Pagination and sorting support
- ✅ Transaction-safe operations

### Stock Management Flow
```
Order Created (PENDING)
    ↓
Reserve Stock (available_quantity ↓, reserved_stock ↑)
    ↓
Order Confirmed (Payment Verified)
    ↓
Deduct Reserved Stock (stock ↓, reserved_stock ↓)
    ↓
Order Shipped
    ↓
Order Delivered
    ↓
Cancellation (if needed)
    → Release Reserved or Restore Sold Stock
```

---

## Authentication

All endpoints require authentication tokens in the request header.

```bash
Authorization: Bearer <access_token>
```

### Role-Based Access
- **User**: Can create orders, view own orders, track orders
- **Admin**: Can confirm, ship, deliver, and cancel orders; view all orders and analytics

---

## Base URL

```
http://localhost:3000/api/orders
```

---

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "message": "Error message",
  "error": "Error details"
}
```

### Common Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Invalid Input | Missing required fields or invalid data types |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions for the action |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Order status prevents the requested action |
| 500 | Server Error | Internal server error |

---

## API Endpoints

### CRUD Operations

---

### **1. Get All Orders** 📋

#### Endpoint
```http
GET /api/orders
```

#### Purpose
Retrieve paginated list of all orders with advanced filtering, searching, and sorting capabilities. Supports complex queries with multiple filters combined with AND/OR logic.

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `page` | integer | ❌ No | Page number (default: 1) | `page=1` |
| `limit` | integer | ❌ No | Items per page (max: 100, default: 10) | `limit=20` |
| `search` | string | ❌ No | Global search across name, email, city | `search=john mumbai` |
| `filter[field][type]` | enum | ❌ No | Filter operator | `filter[status][type]=equal` |
| `filter[field][value]` | string | ❌ No | Filter value | `filter[status][value]=PENDING` |
| `filter[field][from]` | string | ❌ No | Range filter start (for range type) | `filter[grandTotal][from]=1000` |
| `filter[field][to]` | string | ❌ No | Range filter end (for range type) | `filter[grandTotal][to]=5000` |
| `filter[field][sort]` | integer | ❌ No | Sort order (0=asc, 1=desc) | `filter[placedAt][sort]=1` |

#### Supported Fields for Filtering
- `order_id` (int)
- `user_id` (int)
- `status` (enum: PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED)
- `paymentStatus` (enum: UNPAID, PAID, FAILED, REFUNDED)
- `paymentMethod` (enum: CARD, UPI, NETBANKING, COD, WALLET)
- `shippingMethod` (enum: STANDARD, EXPRESS, OVERNIGHT)
- `totalAmount`, `grandTotal`, `discount`, `tax`, `shippingCost` (float)
- `placedAt`, `deliveredAt`, `cancelledAt`, `createdAt`, `updatedAt` (datetime)
- `user.name`, `user.email`, `user.phone` (string)
- `shippingAddress.fullName`, `shippingAddress.city`, `shippingAddress.state`, `shippingAddress.zipCode` (string)

#### Filter Types
| Type | Description | Example |
|------|-------------|---------|
| `equal` | Exact match | `filter[status][type]=equal&filter[status][value]=PENDING` |
| `contains` | String contains (case-insensitive) | `filter[user.name][type]=contains&filter[user.name][value]=john` |
| `startsWith` | String starts with | `filter[coupon.code][type]=startsWith&filter[coupon.code][value]=SAVE` |
| `gte` | Greater than or equal | `filter[grandTotal][type]=gte&filter[grandTotal][value]=1000` |
| `lte` | Less than or equal | `filter[grandTotal][type]=lte&filter[grandTotal][value]=5000` |
| `range` | Between two values | `filter[grandTotal][type]=range&filter[grandTotal][from]=1000&filter[grandTotal][to]=5000` |

#### Example Requests

**Simple Query:**
```bash
curl -X GET "http://localhost:3000/api/orders?page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

**With Filters:**
```bash
curl -X GET "http://localhost:3000/api/orders?filter[status][type]=equal&filter[status][value]=PENDING&filter[grandTotal][type]=gte&filter[grandTotal][value]=1000&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

**With Date Range:**
```bash
curl -X GET "http://localhost:3000/api/orders?filter[placedAt][type]=range&filter[placedAt][from]=2025-10-01&filter[placedAt][to]=2025-10-21&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

**With Global Search:**
```bash
curl -X GET "http://localhost:3000/api/orders?search=john+mumbai&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Orders retrieved",
  "data": {
    "data": [
      {
        "order_id": 123,
        "user_id": 1,
        "address_id": 5,
        "totalAmount": 1500.00,
        "discount": 150.00,
        "tax": 243.00,
        "shippingCost": 50.00,
        "grandTotal": 1643.00,
        "status": "PENDING",
        "paymentStatus": "UNPAID",
        "paymentMethod": "CARD",
        "shippingMethod": "STANDARD",
        "placedAt": "2025-10-21T10:00:00.000Z",
        "createdAt": "2025-10-21T10:00:00.000Z",
        "updatedAt": "2025-10-21T10:00:00.000Z",
        "user": {
          "user_id": 1,
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "9876543210"
        },
        "shippingAddress": {
          "fullName": "John Doe",
          "city": "Mumbai",
          "state": "Maharashtra",
          "zipCode": "400001"
        },
        "items": [
          {
            "order_item_id": 1,
            "product_id": 10,
            "variant_id": 20,
            "quantity": 2,
            "price": 500.00,
            "total": 1000.00
          }
        ]
      }
    ],
    "meta": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "totalPages": 8,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "filters": {
      "applied": [],
      "search": "john mumbai"
    }
  }
}
```

#### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Invalid filter",
  "error": "Invalid field: invalid_field"
}
```

---

### **2. Get Order By ID** 📄

#### Endpoint
```http
GET /api/orders/:id
```

#### Purpose
Retrieve complete details of a specific order including user information, shipping address, and all order items with product and variant details.

#### URL Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `id` | string/int | ✅ Yes | Order ID or UUID | `123` or `clm3k5j7h0000qz8x` |

#### Example Request
```bash
curl -X GET "http://localhost:3000/api/orders/123" \
  -H "Authorization: Bearer <token>"
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Order retrieved",
  "data": {
    "order_id": 123,
    "id": "clm3k5j7h0000qz8x",
    "user_id": 1,
    "address_id": 5,
    "totalAmount": 1500.00,
    "discount": 150.00,
    "tax": 243.00,
    "shippingCost": 50.00,
    "grandTotal": 1643.00,
    "status": "PENDING",
    "paymentStatus": "UNPAID",
    "paymentMethod": "CARD",
    "shippingMethod": "STANDARD",
    "placedAt": "2025-10-21T10:00:00.000Z",
    "createdAt": "2025-10-21T10:00:00.000Z",
    "updatedAt": "2025-10-21T10:00:00.000Z",
    "user": {
      "user_id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "avatar": "https://example.com/avatar.jpg"
    },
    "shippingAddress": {
      "address_id": 5,
      "fullName": "John Doe",
      "addressLine1": "123 Main Street",
      "addressLine2": "Apt 4B",
      "city": "Mumbai",
      "state": "Maharashtra",
      "zipCode": "400001",
      "country": "India",
      "phone": "9876543210"
    },
    "items": [
      {
        "order_item_id": 1,
        "product_id": 10,
        "variant_id": 20,
        "quantity": 2,
        "price": 500.00,
        "total": 1000.00,
        "product": {
          "product_id": 10,
          "name": "Premium T-Shirt",
          "slug": "premium-t-shirt",
          "description": "High-quality cotton t-shirt"
        },
        "variant": {
          "variant_id": 20,
          "size": "L",
          "color": "Blue",
          "weight": "200g",
          "price": 500.00,
          "stock": 50,
          "sku": "TS-L-BLUE"
        }
      }
    ]
  }
}
```

#### Error Response (404 Not Found)
```json
{
  "success": false,
  "message": "Order not found",
  "error": "Order 123 not found"
}
```

---

### **3. Create Order** ✨

#### Endpoint
```http
POST /api/orders
```

#### Purpose
Create a new order with items, automatically reserve stock, calculate totals with tax and shipping, and store in PENDING status awaiting payment.

#### Request Body

```json
{
  "user_id": 1,
  "address_id": 5,
  "discount": 150.00,
  "items": [
    {
      "product_id": "clm3k5j7h0000qz8x",
      "variant_id": "clm3k5j7h0001qz8x",
      "quantity": 2
    },
    {
      "product_id": "clm3k5j7h0002qz8x",
      "variant_id": "clm3k5j7h0003qz8x",
      "quantity": 1
    }
  ],
  "shippingMethod": "STANDARD",
  "paymentMethod": "CARD"
}
```

#### Field Details

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `user_id` | integer | ✅ Yes | Must exist | ID of user placing order |
| `address_id` | integer | ✅ Yes | Must exist & belong to user | Shipping address ID |
| `discount` | number | ❌ No | ≥ 0 | Discount amount (calculated by coupon API) |
| `items` | array | ✅ Yes | Min 1 item | Array of order items |
| `items[].product_id` | string (UUID) | ✅ Yes | Must exist | Product UUID |
| `items[].variant_id` | string (UUID) | ✅ Yes | Must exist | Product variant UUID |
| `items[].quantity` | integer | ✅ Yes | > 0 | Item quantity |
| `shippingMethod` | enum | ❌ No | STANDARD, EXPRESS, OVERNIGHT | Shipping method (default: STANDARD) |
| `paymentMethod` | enum | ❌ No | CARD, UPI, NETBANKING, COD, WALLET | Payment method |

#### Stock Management on Create
- **Reserved Stock**: Stock is reserved (not deducted) to prevent overselling
- **available_quantity**: Decremented by order quantity
- **reserved_stock**: Incremented by order quantity
- **Low Stock Alert**: Socket event emitted if stock < 100 units

#### Price Calculation
```
Total Amount = Sum of (product price × quantity) for all items
Tax = Total Amount × 18% (GST)
Shipping Cost = Total Amount ≥ ₹500 ? ₹0 : ₹50 (FREE SHIPPING THRESHOLD)
Grand Total = Total Amount - Discount + Tax + Shipping Cost
```

#### Example Request
```bash
curl -X POST "http://localhost:3000/api/orders" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "address_id": 5,
    "discount": 150.00,
    "items": [
      {
        "product_id": "clm3k5j7h0000qz8x",
        "variant_id": "clm3k5j7h0001qz8x",
        "quantity": 2
      }
    ],
    "shippingMethod": "STANDARD",
    "paymentMethod": "CARD"
  }'
```

#### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Order created",
  "data": {
    "order_id": 124,
    "id": "clm3k5j7h0010qz8x",
    "user_id": 1,
    "address_id": 5,
    "totalAmount": 1500.00,
    "discount": 150.00,
    "tax": 243.00,
    "shippingCost": 50.00,
    "grandTotal": 1643.00,
    "status": "PENDING",
    "paymentStatus": "UNPAID",
    "paymentMethod": "CARD",
    "shippingMethod": "STANDARD",
    "placedAt": "2025-11-01T12:45:00.000Z",
    "createdAt": "2025-11-01T12:45:00.000Z",
    "updatedAt": "2025-11-01T12:45:00.000Z",
    "items": [...]
  }
}
```

#### Validation Errors

**Missing Required Field (400 Bad Request):**
```json
{
  "success": false,
  "message": "Order must contain at least one item",
  "error": "Order must contain at least one item"
}
```

**Insufficient Stock (400 Bad Request):**
```json
{
  "success": false,
  "message": "Insufficient stock for variant clm3k5j7h0001qz8x",
  "error": "Insufficient stock for variant clm3k5j7h0001qz8x. Available: 5, Requested: 10"
}
```

**User Not Found (400 Bad Request):**
```json
{
  "success": false,
  "message": "User 999 not found",
  "error": "User 999 not found"
}
```

**Address Doesn't Belong to User (400 Bad Request):**
```json
{
  "success": false,
  "message": "Address does not belong to user",
  "error": "Address does not belong to user"
}
```

---

### **4. Update Order** 🔄

#### Endpoint
```http
PUT /api/orders/:id
```

#### Purpose
Update order details like shipping address, shipping method, status, and payment status. Only PENDING orders can be modified to prevent issues with confirmed or shipped orders.

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | ✅ Yes | Order ID |

#### Request Body

```json
{
  "address_id": 6,
  "shippingMethod": "EXPRESS",
  "status": "PENDING",
  "paymentStatus": "PAID"
}
```

#### Field Details

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `address_id` | integer | ❌ No | Must exist & belong to user | New shipping address |
| `shippingMethod` | enum | ❌ No | STANDARD, EXPRESS, OVERNIGHT | New shipping method |
| `status` | enum | ❌ No | PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED | Order status |
| `paymentStatus` | enum | ❌ No | UNPAID, PAID, FAILED, REFUNDED | Payment status |

#### Restrictions
- Only PENDING orders can be updated
- Confirmed, shipped, or delivered orders are immutable
- At least one field must be provided in the request body

#### Example Request
```bash
curl -X PUT "http://localhost:3000/api/orders/123" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "address_id": 6,
    "shippingMethod": "EXPRESS",
    "paymentStatus": "PAID"
  }'
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Order updated",
  "data": {
    "order_id": 123,
    "address_id": 6,
    "shippingMethod": "EXPRESS",
    "status": "PENDING",
    "paymentStatus": "PAID"
  }
}
```

#### Error Response (409 Conflict)
```json
{
  "success": false,
  "message": "Only pending orders can be updated",
  "error": "Only pending orders can be updated"
}
```

---

### **5. Delete Order** 🗑️

#### Endpoint
```http
DELETE /api/orders/:id
```

#### Purpose
Delete/Cancel an order and restore reserved stock. Cannot delete already delivered or cancelled orders to maintain data integrity.

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | ✅ Yes | Order ID |

#### Request Body
None

#### Stock Restoration on Delete
- If order is PENDING: Release reserved stock
- If order is CONFIRMED/SHIPPED: Restore sold stock
- Prevents overselling and maintains accurate inventory

#### Example Request
```bash
curl -X DELETE "http://localhost:3000/api/orders/123" \
  -H "Authorization: Bearer <token>"
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Order deleted",
  "data": null
}
```

#### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Cannot delete delivered/cancelled orders",
  "error": "Cannot delete delivered/cancelled orders"
}
```

---

### Status Management

---

### **6. Confirm Order** ✅

#### Endpoint
```http
PATCH /api/orders/:id/confirm
```

#### Purpose
Confirm order after payment verification. Deducts reserved stock and moves order from PENDING to CONFIRMED status. This is the critical step where inventory is actually reduced.

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | ✅ Yes | Order ID |

#### Request Body
None

#### Prerequisites
- Order status must be PENDING
- Payment status must be PAID

#### Stock Deduction on Confirm
- Moves stock from `reserved_stock` to actual `stock` deduction
- `reserved_stock`: Decremented by quantity
- `stock`: Decremented by quantity
- Ensures accurate inventory tracking

#### Example Request
```bash
curl -X PATCH "http://localhost:3000/api/orders/123/confirm" \
  -H "Authorization: Bearer <token>"
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Order confirmed",
  "data": {
    "order_id": 123,
    "status": "CONFIRMED",
    "paymentStatus": "PAID"
  }
}
```

#### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Only pending orders can be confirmed",
  "error": "Only pending orders can be confirmed"
}
```

#### Error Response (400 Bad Request - Payment Not Completed)
```json
{
  "success": false,
  "message": "Payment must be completed",
  "error": "Payment must be completed"
}
```

---

### **7. Ship Order** 🚚

#### Endpoint
```http
PATCH /api/orders/:id/ship
```

#### Purpose
Update order status to SHIPPED. Optionally store tracking information for the shipment. Order now in transit to customer.

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | ✅ Yes | Order ID |

#### Request Body

```json
{
  "trackingNumber": "TRACK123456789",
  "carrier": "DHL"
}
```

#### Field Details

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `trackingNumber` | string | ❌ No | Max 50 chars | Shipment tracking number |
| `carrier` | string | ❌ No | Max 50 chars | Carrier name (DHL, FedEx, BlueDart, etc.) |

#### Prerequisites
- Order status must be CONFIRMED

#### Estimated Delivery Calculation
- Estimated delivery = Current date + 5 days
- Displayed in order tracking

#### Example Request
```bash
curl -X PATCH "http://localhost:3000/api/orders/123/ship" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "trackingNumber": "TRACK123456789",
    "carrier": "DHL"
  }'
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Order shipped",
  "data": {
    "order_id": 123,
    "status": "SHIPPED",
    "trackingNumber": "TRACK123456789",
    "carrier": "DHL"
  }
}
```

#### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Only confirmed orders can be shipped",
  "error": "Only confirmed orders can be shipped"
}
```

---

### **8. Deliver Order** 📦

#### Endpoint
```http
PATCH /api/orders/:id/deliver
```

#### Purpose
Mark order as delivered. Sets delivery timestamp and completes the order lifecycle. Customer can now leave reviews and ratings.

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | ✅ Yes | Order ID |

#### Request Body
None

#### Prerequisites
- Order status must be SHIPPED

#### Delivery Timestamp
- `deliveredAt` is automatically set to current UTC time
- Used for analytics and revenue calculations

#### Example Request
```bash
curl -X PATCH "http://localhost:3000/api/orders/123/deliver" \
  -H "Authorization: Bearer <token>"
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Order delivered",
  "data": {
    "order_id": 123,
    "status": "DELIVERED",
    "deliveredAt": "2025-11-01T15:30:00.000Z"
  }
}
```

#### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Only shipped orders can be delivered",
  "error": "Only shipped orders can be delivered"
}
```

---

### **9. Cancel Order** ❌

#### Endpoint
```http
PATCH /api/orders/:id/cancel
```

#### Purpose
Cancel an order and restore inventory based on order status. PENDING orders release reserved stock, while CONFIRMED/SHIPPED orders restore sold stock.

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | ✅ Yes | Order ID |

#### Request Body

```json
{
  "reason": "Customer requested cancellation"
}
```

#### Field Details

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `reason` | string | ❌ No | Max 500 chars | Cancellation reason for records |

#### Prerequisites
- Order status must NOT be DELIVERED or CANCELLED

#### Stock Restoration Logic

**For PENDING Orders:**
- Release reserved stock
- `reserved_stock`: Decremented
- `available_quantity`: Incremented

**For CONFIRMED/SHIPPED Orders:**
- Restore sold stock
- `stock`: Incremented
- `available_quantity`: Incremented
- Refund available to customer

#### Cancellation Timestamp
- `cancelledAt` is automatically set to current UTC time
- Used for refund processing and analytics

#### Example Request
```bash
curl -X PATCH "http://localhost:3000/api/orders/123/cancel" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Customer requested cancellation due to duplicate order"
  }'
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Order cancelled",
  "data": null
}
```

#### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Cannot cancel delivered/cancelled orders",
  "error": "Cannot cancel delivered/cancelled orders"
}
```

---

### User Operations

---

### **10. Get User Orders** 👤

#### Endpoint
```http
GET /api/orders/users/:userId/orders
```

#### Purpose
Retrieve all orders for a specific user with pagination and filtering. Users can only view their own orders.

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | integer | ✅ Yes | User ID |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | ❌ No | Page number (default: 1) |
| `limit` | integer | ❌ No | Items per page (max: 100, default: 10) |
| `filter[status][type]` | enum | ❌ No | Filter operator |
| `filter[status][value]` | string | ❌ No | Filter value |

#### Example Request
```bash
curl -X GET "http://localhost:3000/api/orders/users/1/orders?page=1&limit=10&filter[status][type]=equal&filter[status][value]=DELIVERED" \
  -H "Authorization: Bearer <token>"
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "User orders retrieved",
  "data": {
    "data": [
      {
        "order_id": 120,
        "status": "DELIVERED",
        "grandTotal": 1643.00,
        "placedAt": "2025-10-15T08:30:00.000Z"
      },
      {
        "order_id": 119,
        "status": "DELIVERED",
        "grandTotal": 2500.00,
        "placedAt": "2025-10-10T14:20:00.000Z"
      }
    ],
    "meta": {
      "total": 25,
      "page": 1,
      "limit": 10,
      "totalPages": 3
    }
  }
}
```

---

### **11. Get Active Orders** 🔄

#### Endpoint
```http
GET /api/orders/users/:userId/active
```

#### Purpose
Retrieve active orders (PENDING, CONFIRMED, SHIPPED) for a user that require attention or tracking.

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | integer | ✅ Yes | User ID |

#### Request Body
None

#### Active Statuses
- PENDING: Awaiting payment confirmation
- CONFIRMED: Payment verified, awaiting shipment
- SHIPPED: In transit to customer

#### Example Request
```bash
curl -X GET "http://localhost:3000/api/orders/users/1/active" \
  -H "Authorization: Bearer <token>"
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Active orders retrieved",
  "data": [
    {
      "order_id": 125,
      "status": "PENDING",
      "grandTotal": 1643.00,
      "placedAt": "2025-11-01T10:00:00.000Z"
    },
    {
      "order_id": 124,
      "status": "SHIPPED",
      "grandTotal": 2500.00,
      "placedAt": "2025-10-28T12:30:00.000Z"
    }
  ]
}
```

---

### **12. Track Order** 📍

#### Endpoint
```http
GET /api/orders/users/:userId/orders/:orderId/track
```

#### Purpose
Get real-time order tracking information including timeline, current status, and estimated delivery date.

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | integer | ✅ Yes | User ID |
| `orderId` | integer | ✅ Yes | Order ID |

#### Request Body
None

#### Tracking Timeline Stages

| Stage | Status | Description |
|-------|--------|-------------|
| 1 | PENDING | 🛒 Order placed |
| 2 | CONFIRMED | ✅ Order confirmed & payment verified |
| 3 | SHIPPED | 🚚 Order shipped and on the way |
| 4 | DELIVERED | 📦 Order delivered successfully |

#### Estimated Delivery
- Calculated as: Shipped Date + 5 days
- Only shown when order is in SHIPPED status
- Subject to change based on carrier updates

#### Example Request
```bash
curl -X GET "http://localhost:3000/api/orders/users/1/orders/123/track" \
  -H "Authorization: Bearer <token>"
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Order tracking retrieved",
  "data": {
    "order": {
      "order_id": 123,
      "status": "SHIPPED",
      "grandTotal": 1643.00,
      "user": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "shippingAddress": {
        "fullName": "John Doe",
        "addressLine1": "123 Main Street",
        "city": "Mumbai",
        "state": "Maharashtra"
      }
    },
    "timeline": [
      {
        "status": "PENDING",
        "date": "2025-10-21T10:00:00.000Z",
        "completed": true,
        "description": "🛒 Order placed"
      },
      {
        "status": "CONFIRMED",
        "date": "2025-10-21T11:00:00.000Z",
        "completed": true,
        "description": "✅ Order confirmed"
      },
      {
        "status": "SHIPPED",
        "date": "2025-10-22T09:00:00.000Z",
        "completed": true,
        "description": "🚚 Order shipped"
      },
      {
        "status": "DELIVERED",
        "date": null,
        "completed": false,
        "description": "📦 Order delivered"
      }
    ],
    "currentStatus": "SHIPPED",
    "estimatedDelivery": "2025-10-27T09:00:00.000Z"
  }
}
```

---

### Analytics

---

### **13. Get Order Statistics** 📊

#### Endpoint
```http
GET /api/orders/stats/overview
```

#### Purpose
Get comprehensive order statistics including counts by status, total revenue, and average order value for a date range.

#### Query Parameters

| Parameter | Type | Required | Description | Format |
|-----------|------|----------|-------------|--------|
| `dateFrom` | date | ❌ No | Start date | YYYY-MM-DD |
| `dateTo` | date | ❌ No | End date | YYYY-MM-DD |

#### Calculated Metrics

| Metric | Description | Formula |
|--------|-------------|---------|
| `totalOrders` | Total number of orders | Count of all orders |
| `pendingOrders` | Orders awaiting confirmation | Count of PENDING status |
| `confirmedOrders` | Orders confirmed | Count of CONFIRMED status |
| `shippedOrders` | Orders in transit | Count of SHIPPED status |
| `deliveredOrders` | Orders completed | Count of DELIVERED status |
| `cancelledOrders` | Orders cancelled | Count of CANCELLED status |
| `totalRevenue` | Total revenue | Sum of grandTotal for DELIVERED orders |
| `averageOrderValue` | Average order value | Total Revenue / Delivered Orders |

#### Example Request
```bash
curl -X GET "http://localhost:3000/api/orders/stats/overview?dateFrom=2025-10-01&dateTo=2025-10-21" \
  -H "Authorization: Bearer <token>"
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Order statistics retrieved",
  "data": {
    "totalOrders": 150,
    "pendingOrders": 20,
    "confirmedOrders": 30,
    "shippedOrders": 40,
    "deliveredOrders": 50,
    "cancelledOrders": 10,
    "totalRevenue": 75000.50,
    "averageOrderValue": 1500.01
  }
}
```

---

### **14. Get Revenue Statistics** 💰

#### Endpoint
```http
GET /api/orders/stats/revenue
```

#### Purpose
Get revenue data grouped by time period (day, month, year) for trend analysis and business reporting.

#### Query Parameters

| Parameter | Type | Required | Description | Default | Values |
|-----------|------|----------|-------------|---------|--------|
| `dateFrom` | date | ❌ No | Start date | Today | YYYY-MM-DD |
| `dateTo` | date | ❌ No | End date | Today | YYYY-MM-DD |
| `groupBy` | enum | ❌ No | Grouping period | day | day, month, year |

#### Grouping Options

| Option | Description | Example |
|--------|-------------|---------|
| `day` | Daily revenue | 2025-10-01, 2025-10-02, ... |
| `month` | Monthly revenue | 2025-10, 2025-11, ... |
| `year` | Yearly revenue | 2025, 2026, ... |

#### Example Requests

**Daily Revenue:**
```bash
curl -X GET "http://localhost:3000/api/orders/stats/revenue?dateFrom=2025-10-01&dateTo=2025-10-21&groupBy=day" \
  -H "Authorization: Bearer <token>"
```

**Monthly Revenue:**
```bash
curl -X GET "http://localhost:3000/api/orders/stats/revenue?groupBy=month" \
  -H "Authorization: Bearer <token>"
```

**Yearly Revenue:**
```bash
curl -X GET "http://localhost:3000/api/orders/stats/revenue?groupBy=year" \
  -H "Authorization: Bearer <token>"
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Revenue statistics retrieved",
  "data": [
    {
      "date": "2025-10-01",
      "revenue": 15000.00
    },
    {
      "date": "2025-10-02",
      "revenue": 18000.50
    },
    {
      "date": "2025-10-03",
      "revenue": 12500.00
    },
    {
      "date": "2025-10-04",
      "revenue": 21000.75
    }
  ]
}
```

---

## Data Models

### Order Status Enum
```typescript
enum OrderStatus {
  PENDING = "PENDING"           // Order created, awaiting payment
  CONFIRMED = "CONFIRMED"       // Payment verified
  SHIPPED = "SHIPPED"           // In transit to customer
  DELIVERED = "DELIVERED"       // Successfully delivered
  CANCELLED = "CANCELLED"       // Order cancelled
}
```

### Payment Status Enum
```typescript
enum PaymentStatus {
  UNPAID = "UNPAID"             // No payment received
  PAID = "PAID"                 // Payment successful
  FAILED = "FAILED"             // Payment failed
  REFUNDED = "REFUNDED"         // Payment refunded
}
```

### Order Entity
```typescript
interface Order {
  order_id: number              // Unique order number
  id: string                    // UUID
  user_id: number               // Reference to user
  address_id?: number           // Shipping address
  totalAmount: number           // Before tax/shipping
  discount: number              // Applied discount
  tax: number                   // Tax amount (18% GST)
  shippingCost: number          // Shipping fee
  grandTotal: number            // Final total
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod?: string
  shippingMethod?: string
  placedAt: Date                // Order creation time
  deliveredAt?: Date            // Delivery confirmation time
  cancelledAt?: Date            // Cancellation time
  createdAt: Date
  updatedAt: Date
  user?: User                   // Nested user details
  shippingAddress?: Address     // Nested address
  items?: OrderItem[]           // Order items
}
```

### OrderItem Entity
```typescript
interface OrderItem {
  order_item_id: number
  order_id: number
  product_id: number
  variant_id: number
  quantity: number
  price: number                 // Unit price
  total: number                 // price × quantity
  product?: Product
  variant?: ProductVariant
}
```

---

## Implementation Guide

### Step 1: Initialize Orders Module

```typescript
import { OrdersModule } from './modules/orders/orders.module';

// Register in your main app
const ordersModule = new OrdersModule();
await ordersModule.initialize();

app.use('/api/orders', ordersModule.getRouter());
```

### Step 2: Create an Order (Frontend)

```typescript
// 1. First apply coupon to get discount
const couponResponse = await fetch('/api/coupons/validate', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ code: 'SAVE20' })
});
const { discount } = await couponResponse.json();

// 2. Create order with discount
const orderResponse = await fetch('/api/orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    user_id: 1,
    address_id: 5,
    discount: discount,
    items: [
      {
        product_id: "prod-uuid-1",
        variant_id: "var-uuid-1",
        quantity: 2
      }
    ],
    shippingMethod: 'STANDARD',
    paymentMethod: 'CARD'
  })
});

const order = await orderResponse.json();
console.log('Order created:', order.data.order_id);
```

### Step 3: Process Payment

After payment is confirmed by payment gateway (Razorpay, Stripe, etc.):

```typescript
// Update order payment status to PAID
await fetch(`/api/orders/${orderId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    paymentStatus: 'PAID'
  })
});

// Confirm order (deducts stock)
await fetch(`/api/orders/${orderId}/confirm`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Step 4: Manage Order Lifecycle

```typescript
// Ship order
await fetch(`/api/orders/${orderId}/ship`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    trackingNumber: 'TRACK123456',
    carrier: 'DHL'
  })
});

// Deliver order
await fetch(`/api/orders/${orderId}/deliver`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
```

### Step 5: Track Order (Customer)

```typescript
// Get real-time tracking
const response = await fetch(`/api/orders/users/${userId}/orders/${orderId}/track`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { data } = await response.json();
console.log('Current Status:', data.currentStatus);
console.log('Estimated Delivery:', data.estimatedDelivery);
console.log('Timeline:', data.timeline);
```

### Step 6: View Analytics (Admin)

```typescript
// Get order statistics
const statsResponse = await fetch('/api/orders/stats/overview?dateFrom=2025-10-01&dateTo=2025-10-21', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
const stats = await statsResponse.json();
console.log('Total Orders:', stats.data.totalOrders);
console.log('Total Revenue:', stats.data.totalRevenue);

// Get revenue trends
const revenueResponse = await fetch('/api/orders/stats/revenue?groupBy=day', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
const revenue = await revenueResponse.json();
console.log('Daily Revenue:', revenue.data);
```

---

## Testing Checklist

- ✅ Create order with multiple items
- ✅ Verify stock reservation on creation
- ✅ Update order address before payment
- ✅ Confirm order and verify stock deduction
- ✅ Ship order with tracking number
- ✅ Deliver order
- ✅ Cancel pending order and verify stock release
- ✅ Cancel confirmed order and verify stock restoration
- ✅ Track order and verify timeline
- ✅ View order statistics with date range
- ✅ View revenue trends by day/month/year
- ✅ Filter orders by multiple criteria
- ✅ Search orders globally
- ✅ Paginate through large order lists
- ✅ Verify permissions (user vs admin)

---

## Support & Troubleshooting

### Common Issues

**Stock Reservation Failed:**
- Ensure variant exists and is available
- Check available_quantity before creating order
- Verify product is not disabled

**Order Confirmation Failed:**
- Payment status must be PAID before confirmation
- Order must be in PENDING status
- Check reserved stock hasn't expired

**Delivery Calculation Off:**
- Estimated delivery calculated from shipped date
- Add 5 business days to shipped date
- Check server timezone settings

### Contact Support
For issues or questions, contact: support@example.com

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-01 | Initial release |

---

## License

MIT License - All rights reserved

---

**Last Updated:** November 1, 2025
**Created By:** Development Team
**Documentation Version:** 1.0