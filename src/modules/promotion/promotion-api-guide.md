# Comprehensive Promotion System API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [API Endpoints](#api-endpoints)
4. [Complete API Reference](#complete-api-reference)
5. [Implementation Guide](#implementation-guide)
6. [Workflow Examples](#workflow-examples)
7. [Error Handling](#error-handling)

---

## Overview

The Promotion System is a comprehensive e-commerce promotion management module that supports multiple promotion types:

- **BUY_X_GET_Y_FREE**: Buy X items, get Y items free
- **QUANTITY_DISCOUNT**: Buy X+ items, get percentage discount
- **BUNDLE_DEAL**: Buy specific products together, get discount
- **TIERED_DISCOUNT**: Spend X amount, get percentage discount

### Key Features

✅ Admin dashboard for promotion creation and management  
✅ Real-time cart validation against active promotions  
✅ Automatic free product selection and eligibility checking  
✅ Accurate discount calculation based on product variant prices  
✅ Promotion redemption tracking and analytics  
✅ Per-user and global usage limits  
✅ Category-based and product-specific eligibility  

---

## Architecture

### Database Schema

```
Promotion
├── promotion_id (PK)
├── name
├── description
├── type (enum: BUY_X_GET_Y_FREE | QUANTITY_DISCOUNT | BUNDLE_DEAL | TIERED_DISCOUNT)
├── status (enum: ACTIVE | INACTIVE | SCHEDULED | EXPIRED)
├── buyQuantity
├── getQuantity
├── priority (for display ordering)
├── validFrom
├── validTo
├── usageLimit (global limit)
├── usedCount
├── perUserLimit (per user limit)
├── minPurchaseAmount
├── createdAt
├── updatedAt

PromotionEligibleProduct
├── promotion_eligible_prod_id (PK)
├── promotion_id (FK)
├── product_id (FK)
├── category_id (FK)
├── createdAt

PromotionFreeProduct
├── promotion_free_prod_id (PK)
├── promotion_id (FK)
├── product_id (FK)
├── size_variant_id (FK)
├── maxQuantity
├── displayOrder
├── createdAt

PromotionRedemption
├── promotion_redemption_id (PK)
├── promotion_id (FK)
├── order_id (FK)
├── user_id (FK)
├── purchasedQuantity
├── freeQuantity
├── appliedAt
├── createdAt

PromotionFreeItem
├── promotion_free_item_id (PK)
├── redemption_id (FK)
├── product_id (FK)
├── size_variant_id (FK)
├── quantity
```

---

## API Endpoints

### Summary Table

| # | Method | Endpoint | Purpose | Auth |
|---|--------|----------|---------|------|
| **ADMIN - CRUD** |
| 1 | POST | `/api/promotions/admin` | Create promotion | Admin |
| 2 | GET | `/api/promotions/admin` | List all promotions | Admin |
| 3 | GET | `/api/promotions/admin/:id` | Get promotion by ID | Admin |
| 4 | PUT | `/api/promotions/admin/:id` | Update promotion | Admin |
| 5 | PATCH | `/api/promotions/admin/:id/status` | Update status | Admin |
| 6 | DELETE | `/api/promotions/admin/:id` | Delete promotion | Admin |
| **ADMIN - ELIGIBLE PRODUCTS** |
| 7 | POST | `/api/promotions/admin/:id/eligible-products` | Add eligible products | Admin |
| 8 | GET | `/api/promotions/admin/:id/eligible-products` | List eligible products | Admin |
| 9 | DELETE | `/api/promotions/admin/:id/eligible-products/:productId` | Remove eligible product | Admin |
| **ADMIN - FREE PRODUCTS** |
| 10 | POST | `/api/promotions/admin/:id/free-products` | Add free products | Admin |
| 11 | GET | `/api/promotions/admin/:id/free-products` | List free products | Admin |
| 12 | DELETE | `/api/promotions/admin/:id/free-products/:freeProductId` | Remove free product | Admin |
| **ADMIN - ANALYTICS** |
| 13 | GET | `/api/promotions/admin/:id/stats` | Get promotion statistics | Admin |
| 14 | GET | `/api/promotions/admin/report` | Get analytics report | Admin |
| **CUSTOMER - DISCOVERY** |
| 15 | GET | `/api/promotions/active` | Get active promotions | Public |
| 16 | GET | `/api/promotions/product/:productId` | Get promotions by product | Public |
| **CUSTOMER - CART** |
| 17 | POST | `/api/promotions/validate-cart` | Validate cart for promotions | Public |
| 18 | POST | `/api/promotions/:id/available-free-products` | Get available free products | Public |
| 19 | POST | `/api/promotions/:id/calculate-discount` | Calculate discount | Public |
| **CUSTOMER - USER** |
| 20 | POST | `/api/promotions/:id/check-eligibility` | Check user eligibility | Public |
| 21 | GET | `/api/promotions/user/history` | Get user promotion history | User |
| 22 | GET | `/api/promotions/user/:userId/history` | Get specific user history | Admin |

---

## Complete API Reference

### 1. POST /api/promotions/admin - Create Promotion

**Purpose**: Create a new promotion with defined rules and eligibility criteria.

**Authentication**: Admin required

**Request Body**:

```json
{
  "name": "Summer Sale - Buy 2 Get 1 Free",
  "description": "Purchase 2 T-shirts and receive 1 free item from our collection",
  "type": "BUY_X_GET_Y_FREE",
  "buyQuantity": 2,
  "getQuantity": 1,
  "priority": 10,
  "validFrom": "2025-06-01T00:00:00Z",
  "validTo": "2025-08-31T23:59:59Z",
  "usageLimit": 1000,
  "perUserLimit": 5,
  "minPurchaseAmount": 0
}
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Promotion name |
| description | string | No | Detailed promotion description |
| type | enum | Yes | BUY_X_GET_Y_FREE, QUANTITY_DISCOUNT, BUNDLE_DEAL, TIERED_DISCOUNT |
| buyQuantity | int | Yes | Quantity to buy (for BUY_X_GET_Y_FREE) |
| getQuantity | int | Yes | Quantity to get free (for BUY_X_GET_Y_FREE) |
| priority | int | No | Display priority (0-100, higher = more important) |
| validFrom | datetime | Yes | Start date/time of promotion |
| validTo | datetime | Yes | End date/time of promotion |
| usageLimit | int | No | Maximum global usage count |
| perUserLimit | int | No | Maximum usage per user |
| minPurchaseAmount | float | No | Minimum purchase amount required |

**Response** (201 Created):

```json
{
  "promotion_id": 1,
  "name": "Summer Sale - Buy 2 Get 1 Free",
  "description": "Purchase 2 T-shirts and receive 1 free item from our collection",
  "type": "BUY_X_GET_Y_FREE",
  "status": "ACTIVE",
  "buyQuantity": 2,
  "getQuantity": 1,
  "priority": 10,
  "validFrom": "2025-06-01T00:00:00Z",
  "validTo": "2025-08-31T23:59:59Z",
  "usageLimit": 1000,
  "usedCount": 0,
  "perUserLimit": 5,
  "minPurchaseAmount": 0,
  "createdAt": "2025-06-01T12:30:00Z",
  "updatedAt": "2025-06-01T12:30:00Z"
}
```

---

### 2. GET /api/promotions/admin - List All Promotions

**Purpose**: Retrieve all promotions with advanced filtering and pagination.

**Authentication**: Admin required

**Query Parameters**:

```
GET /api/promotions/admin?filter[status][type]=equal&filter[status][value]=ACTIVE&filter[type][type]=equal&filter[type][value]=BUY_X_GET_Y_FREE&page=1&limit=20&search=summer
```

| Parameter | Type | Description |
|-----------|------|-------------|
| filter[field][type] | string | Filter type: equal, contains, gte, lte, range, in |
| filter[field][value] | any | Filter value |
| page | int | Page number (default: 1) |
| limit | int | Results per page (default: 10) |
| search | string | Global search in name and description |

**Filterable Fields**:

- promotion_id (int)
- name (string)
- description (string)
- type (enum)
- status (enum)
- buyQuantity (int)
- getQuantity (int)
- priority (int)
- validFrom (datetime)
- validTo (datetime)
- usageLimit (int)
- usedCount (int)
- perUserLimit (int)
- minPurchaseAmount (float)
- createdAt (datetime)
- updatedAt (datetime)

**Response** (200 OK):

```json
{
  "data": [
    {
      "promotion_id": 1,
      "name": "Summer Sale - Buy 2 Get 1 Free",
      "type": "BUY_X_GET_Y_FREE",
      "status": "ACTIVE",
      "priority": 10,
      "validFrom": "2025-06-01T00:00:00Z",
      "validTo": "2025-08-31T23:59:59Z",
      "usedCount": 150,
      "usageLimit": 1000,
      "perUserLimit": 5,
      "minPurchaseAmount": 0,
      "eligibleProducts": [...],
      "freeProducts": [...],
      "_count": {
        "redemptions": 150
      }
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 3. GET /api/promotions/admin/:id - Get Promotion by ID

**Purpose**: Retrieve detailed information about a specific promotion.

**Authentication**: Admin required

**Request**:

```
GET /api/promotions/admin/1
```

**Response** (200 OK):

```json
{
  "promotion_id": 1,
  "name": "Summer Sale - Buy 2 Get 1 Free",
  "description": "Purchase 2 T-shirts and receive 1 free item",
  "type": "BUY_X_GET_Y_FREE",
  "status": "ACTIVE",
  "buyQuantity": 2,
  "getQuantity": 1,
  "priority": 10,
  "validFrom": "2025-06-01T00:00:00Z",
  "validTo": "2025-08-31T23:59:59Z",
  "usageLimit": 1000,
  "usedCount": 150,
  "perUserLimit": 5,
  "minPurchaseAmount": 0,
  "createdAt": "2025-06-01T12:30:00Z",
  "updatedAt": "2025-06-01T12:30:00Z",
  "eligibleProducts": [
    {
      "promotion_eligible_prod_id": 1,
      "product_id": 101,
      "category_id": null,
      "product": {
        "product_id": 101,
        "name": "Red T-Shirt",
        "slug": "red-t-shirt",
        "basePrice": 999
      }
    },
    {
      "promotion_eligible_prod_id": 2,
      "category_id": 5,
      "product_id": null,
      "category": {
        "category_id": 5,
        "name": "T-Shirts",
        "slug": "t-shirts"
      }
    }
  ],
  "freeProducts": [
    {
      "promotion_free_prod_id": 1,
      "product_id": 103,
      "size_variant_id": 1003,
      "maxQuantity": 1,
      "displayOrder": 1,
      "product": {
        "product_id": 103,
        "name": "Black T-Shirt",
        "basePrice": 899
      },
      "sizeVariant": {
        "product_size_var_id": 1003,
        "size": "M",
        "price": 899,
        "stock": 50
      }
    }
  ],
  "_count": {
    "redemptions": 150
  }
}
```

---

### 4. PUT /api/promotions/admin/:id - Update Promotion

**Purpose**: Update promotion details (all fields optional).

**Authentication**: Admin required

**Request Body**:

```json
{
  "name": "Updated Summer Sale",
  "priority": 15,
  "usageLimit": 2000,
  "validTo": "2025-09-30T23:59:59Z"
}
```

**Response** (200 OK):

```json
{
  "promotion_id": 1,
  "name": "Updated Summer Sale",
  "priority": 15,
  "usageLimit": 2000,
  "validTo": "2025-09-30T23:59:59Z",
  "updatedAt": "2025-06-15T14:20:00Z",
  ...
}
```

---

### 5. PATCH /api/promotions/admin/:id/status - Update Promotion Status

**Purpose**: Change promotion status without modifying other details.

**Authentication**: Admin required

**Request Body**:

```json
{
  "status": "INACTIVE"
}
```

**Valid Status Values**:
- `ACTIVE` - Promotion is active and applicable
- `INACTIVE` - Promotion is disabled
- `SCHEDULED` - Promotion scheduled but not yet active
- `EXPIRED` - Promotion has expired

**Response** (200 OK):

```json
{
  "promotion_id": 1,
  "name": "Summer Sale - Buy 2 Get 1 Free",
  "status": "INACTIVE",
  "updatedAt": "2025-06-15T14:25:00Z"
}
```

---

### 6. DELETE /api/promotions/admin/:id - Delete Promotion

**Purpose**: Delete a promotion (soft or hard delete based on usage).

**Authentication**: Admin required

**Request**:

```
DELETE /api/promotions/admin/1
```

**Behavior**:
- If promotion has redemptions: Sets status to INACTIVE (soft delete)
- If promotion has no redemptions: Completely removes record (hard delete)

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Promotion deleted successfully"
}
```

---

### 7. POST /api/promotions/admin/:id/eligible-products - Add Eligible Products

**Purpose**: Define which products or categories are eligible for the promotion.

**Authentication**: Admin required

**Request Body**:

```json
{
  "products": [
    {
      "product_id": 101
    },
    {
      "product_id": 102
    },
    {
      "category_id": 5
    },
    {
      "category_id": 8
    }
  ]
}
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| products | array | Yes | Array of eligible products/categories |
| products[].product_id | int | No* | Product ID (either product_id or category_id required) |
| products[].category_id | int | No* | Category ID (either product_id or category_id required) |

**Note**: When adding a category_id, ALL current and future products in that category become eligible.

**Response** (201 Created):

```json
[
  {
    "promotion_eligible_prod_id": 1,
    "promotion_id": 1,
    "product_id": 101,
    "category_id": null,
    "product": {
      "product_id": 101,
      "name": "Red T-Shirt",
      "slug": "red-t-shirt",
      "basePrice": 999
    }
  },
  {
    "promotion_eligible_prod_id": 2,
    "promotion_id": 1,
    "category_id": 5,
    "product_id": null,
    "category": {
      "category_id": 5,
      "name": "T-Shirts",
      "slug": "t-shirts"
    }
  }
]
```

---

### 8. GET /api/promotions/admin/:id/eligible-products - List Eligible Products

**Purpose**: View all products/categories eligible for a promotion.

**Authentication**: Admin required

**Query Parameters**:

```
GET /api/promotions/admin/1/eligible-products?filter[product.name][type]=contains&filter[product.name][value]=shirt&page=1&limit=10
```

**Filterable Fields**:

- promotion_eligible_prod_id (int)
- product_id (int)
- category_id (int)
- product.name (string)
- product.slug (string)
- product.basePrice (float)
- product.isVisible (boolean)
- category.name (string)
- category.slug (string)
- createdAt (datetime)

**Response** (200 OK):

```json
{
  "data": [
    {
      "promotion_eligible_prod_id": 1,
      "product_id": 101,
      "product": {
        "product_id": 101,
        "name": "Red T-Shirt",
        "slug": "red-t-shirt",
        "basePrice": 999,
        "isVisible": true
      }
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 9. DELETE /api/promotions/admin/:id/eligible-products/:productId - Remove Eligible Product

**Purpose**: Remove a product from promotion eligibility.

**Authentication**: Admin required

**Request**:

```
DELETE /api/promotions/admin/1/eligible-products/101
```

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Eligible product removed successfully"
}
```

---

### 10. POST /api/promotions/admin/:id/free-products - Add Free Products

**Purpose**: Define products that users can select as free items when promotion qualifies.

**Authentication**: Admin required

**Request Body**:

```json
{
  "products": [
    {
      "product_id": 103,
      "maxQuantity": 1,
      "displayOrder": 1
    },
    {
      "size_variant_id": 1003,
      "maxQuantity": 2,
      "displayOrder": 2
    },
    {
      "product_id": 104,
      "maxQuantity": 1,
      "displayOrder": 3
    }
  ]
}
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| products | array | Yes | Array of free products |
| products[].product_id | int | No* | Product ID |
| products[].size_variant_id | int | No* | Size variant ID (specific SKU) |
| products[].maxQuantity | int | No | Max quantity user can select (default: no limit) |
| products[].displayOrder | int | No | Display order (lower numbers show first) |

**Note**: Either product_id or size_variant_id is required. If product_id is specified, user can choose any variant. If size_variant_id is specified, only that variant is available.

**Response** (201 Created):

```json
[
  {
    "promotion_free_prod_id": 1,
    "promotion_id": 1,
    "product_id": 103,
    "size_variant_id": null,
    "maxQuantity": 1,
    "displayOrder": 1,
    "product": {
      "product_id": 103,
      "name": "Black T-Shirt",
      "basePrice": 899
    }
  },
  {
    "promotion_free_prod_id": 2,
    "promotion_id": 1,
    "product_id": null,
    "size_variant_id": 1003,
    "maxQuantity": 2,
    "displayOrder": 2,
    "sizeVariant": {
      "product_size_var_id": 1003,
      "size": "M",
      "price": 899,
      "stock": 50
    }
  }
]
```

---

### 11. GET /api/promotions/admin/:id/free-products - List Free Products

**Purpose**: View all available free products for a promotion.

**Authentication**: Admin required

**Query Parameters**:

```
GET /api/promotions/admin/1/free-products?filter[displayOrder][sort]=asc&page=1&limit=10
```

**Filterable Fields**:

- promotion_free_prod_id (int)
- product_id (int)
- size_variant_id (int)
- maxQuantity (int)
- displayOrder (int)
- product.name (string)
- product.basePrice (float)
- sizeVariant.size (string)
- sizeVariant.price (float)
- sizeVariant.stock (int)
- sizeVariant.isAvailable (boolean)
- createdAt (datetime)

**Response** (200 OK):

```json
{
  "data": [
    {
      "promotion_free_prod_id": 1,
      "product_id": 103,
      "size_variant_id": null,
      "maxQuantity": 1,
      "displayOrder": 1,
      "product": {
        "product_id": 103,
        "name": "Black T-Shirt",
        "basePrice": 899
      }
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 12. DELETE /api/promotions/admin/:id/free-products/:freeProductId - Remove Free Product

**Purpose**: Remove a product from free product list.

**Authentication**: Admin required

**Request**:

```
DELETE /api/promotions/admin/1/free-products/501
```

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Free product removed successfully"
}
```

---

### 13. GET /api/promotions/admin/:id/stats - Get Promotion Statistics

**Purpose**: Retrieve detailed statistics about promotion performance.

**Authentication**: Admin required

**Request**:

```
GET /api/promotions/admin/1/stats
```

**Response** (200 OK):

```json
{
  "promotion_id": 1,
  "promotionName": "Summer Sale - Buy 2 Get 1 Free",
  "totalRedemptions": 150,
  "totalRevenue": 45000,
  "uniqueUsers": 120,
  "averageOrderValue": 300,
  "conversionRate": 15.5,
  "period": {
    "validFrom": "2025-06-01T00:00:00Z",
    "validTo": "2025-08-31T23:59:59Z"
  }
}
```

**Metrics Explained**:

| Metric | Description |
|--------|-------------|
| totalRedemptions | Number of times promotion was used |
| totalRevenue | Total order value from redemptions |
| uniqueUsers | Number of unique users who used promotion |
| averageOrderValue | Average order value per redemption |
| conversionRate | Percentage of orders using this promotion |

---

### 14. GET /api/promotions/admin/report - Get Analytics Report

**Purpose**: Generate comprehensive promotion analytics across all promotions.

**Authentication**: Admin required

**Query Parameters**:

```
GET /api/promotions/admin/report?filter[status][type]=equal&filter[status][value]=ACTIVE&filter[type][type]=equal&filter[type][value]=BUY_X_GET_Y_FREE&page=1&limit=20
```

**Response** (200 OK):

```json
{
  "totalPromotions": 5,
  "totalRedemptions": 500,
  "totalRevenue": 150000,
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "promotions": [
    {
      "promotion_id": 1,
      "name": "Summer Sale - Buy 2 Get 1 Free",
      "type": "BUY_X_GET_Y_FREE",
      "status": "ACTIVE",
      "totalRedemptions": 150,
      "totalRevenue": 45000,
      "uniqueUsers": 120,
      "usageRate": 15.0,
      "validFrom": "2025-06-01T00:00:00Z",
      "validTo": "2025-08-31T23:59:59Z"
    },
    {
      "promotion_id": 2,
      "name": "Buy 3+ Get 15% Off",
      "type": "QUANTITY_DISCOUNT",
      "status": "ACTIVE",
      "totalRedemptions": 200,
      "totalRevenue": 60000,
      "uniqueUsers": 150,
      "usageRate": 20.0,
      "validFrom": "2025-06-01T00:00:00Z",
      "validTo": "2025-08-31T23:59:59Z"
    }
  ]
}
```

---

### 15. GET /api/promotions/active - Get Active Promotions

**Purpose**: Retrieve all currently active promotions for customer display.

**Authentication**: Public (no auth required)

**Request**:

```
GET /api/promotions/active
```

**Response** (200 OK):

```json
[
  {
    "promotion_id": 1,
    "name": "Summer Sale - Buy 2 Get 1 Free",
    "description": "Purchase 2 T-shirts and receive 1 free item",
    "type": "BUY_X_GET_Y_FREE",
    "status": "ACTIVE",
    "buyQuantity": 2,
    "getQuantity": 1,
    "priority": 10,
    "validFrom": "2025-06-01T00:00:00Z",
    "validTo": "2025-08-31T23:59:59Z",
    "eligibleProducts": [
      {
        "product_id": 101,
        "name": "Red T-Shirt",
        "basePrice": 999
      }
    ]
  }
]
```

---

### 16. GET /api/promotions/product/:productId - Get Promotions by Product

**Purpose**: Fetch all promotions applicable to a specific product.

**Authentication**: Public

**Request**:

```
GET /api/promotions/product/101
```

**Response** (200 OK):

```json
[
  {
    "promotion_id": 1,
    "name": "Summer Sale - Buy 2 Get 1 Free",
    "type": "BUY_X_GET_Y_FREE",
    "status": "ACTIVE",
    "buyQuantity": 2,
    "getQuantity": 1,
    "priority": 10,
    "validFrom": "2025-06-01T00:00:00Z",
    "validTo": "2025-08-31T23:59:59Z",
    "eligibleProducts": [
      {
        "product_id": 101,
        "name": "Red T-Shirt"
      }
    ]
  }
]
```

---

### 17. POST /api/promotions/validate-cart - Validate Cart for Promotions

**Purpose**: Check if cart qualifies for any active promotions and return applicable promotions.

**Authentication**: Public

**Request Body**:

```json
{
  "items": [
    {
      "product_id": 101,
      "product_size_var_id": 1001,
      "quantity": 2,
      "price": 999
    },
    {
      "product_id": 102,
      "product_size_var_id": 1002,
      "quantity": 1,
      "price": 1499
    }
  ],
  "user_id": 123
}
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| items | array | Yes | Cart items |
| items[].product_id | int | Yes | Product ID |
| items[].product_size_var_id | int | Yes | Size variant ID |
| items[].quantity | int | Yes | Quantity in cart |
| items[].price | float | Yes | Product price |
| user_id | int | No | User ID (recommended for checking per-user limits) |

**Response** (200 OK):

```json
[
  {
    "isEligible": true,
    "promotion_id": 1,
    "promotionName": "Summer Sale - Buy 2 Get 1 Free",
    "type": "BUY_X_GET_Y_FREE",
    "freeItemsEarned": 1,
    "message": "Buy 2, Get 1 Free! You've earned 1 free item(s).",
    "details": {
      "purchasedQuantity": 3,
      "qualifyingSets": 1,
      "buyQuantity": 2,
      "getQuantity": 1
    }
  },
  {
    "isEligible": true,
    "promotion_id": 2,
    "promotionName": "Buy 3+ Get 15% Off",
    "type": "QUANTITY_DISCOUNT",
    "discountAmount": 749.70,
    "message": "Buy 3+ items, get 15% off!",
    "details": {
      "eligibleQuantity": 3,
      "discountPercentage": 15,
      "eligibleTotal": 4998,
      "requiredQuantity": 3
    }
  }
]
```

---

### 18. POST /api/promotions/:id/available-free-products - Get Available Free Products

**Purpose**: Retrieve list of products user can choose from as free items after promotion validation.

**Authentication**: Public

**Request Body**:

```json
{
  "cartItems": [
    {
      "product_id": 101,
      "product_size_var_id": 1001,
      "quantity": 2,
      "price": 999
    },
    {
      "product_id": 102,
      "product_size_var_id": 1002,
      "quantity": 1,
      "price": 1499
    }
  ]
}
```

**Response** (200 OK):

```json
[
  {
    "promotion_free_prod_id": 501,
    "product_id": 103,
    "size_variant_id": 1003,
    "productName": "Black T-Shirt",
    "colorName": "Black",
    "size": "M",
    "price": 899,
    "stock": 50,
    "maxSelectableQuantity": 1,
    "images": [
      "https://example.com/black-tshirt-1.jpg",
      "https://example.com/black-tshirt-2.jpg"
    ],
    "displayOrder": 1
  },
  {
    "promotion_free_prod_id": 502,
    "product_id": 104,
    "size_variant_id": 1004,
    "productName": "White Shirt",
    "colorName": "White",
    "size": "L",
    "price": 1299,
    "stock": 30,
    "maxSelectableQuantity": 1,
    "images": [
      "https://example.com/white-shirt-1.jpg"
    ],
    "displayOrder": 2
  }
]
```

---

### 19. POST /api/promotions/:id/calculate-discount - Calculate Discount

**Purpose**: Calculate exact discount amount and final cart total based on promotion.

**Authentication**: Public

**Request Body**:

```json
{
  "cartItems": [
    {
      "product_id": 101,
      "product_size_var_id": 1001,
      "quantity": 2,
      "price": 999
    },
    {
      "product_id": 102,
      "product_size_var_id": 1002,
      "quantity": 1,
      "price": 1499
    }
  ]
}
```

**Important**: This API automatically fetches current prices from `productSizeVariant` table to ensure accuracy.

**Response** (200 OK):

```json
{
  "promotion_id": 1,
  "promotionName": "Summer Sale - Buy 2 Get 1 Free",
  "type": "BUY_X_GET_Y_FREE",
  "cartTotal": 3497,
  "discountAmount": 999,
  "finalAmount": 2498,
  "savings": 999,
  "details": {
    "discountAmount": 999,
    "freeItemsCount": 1
  }
}
```

**Note**: The discount is calculated on lowest-priced eligible items first, ensuring fairness.

---

### 20. POST /api/promotions/:id/check-eligibility - Check User Eligibility

**Purpose**: Check if specific user is eligible for a promotion considering all limits and rules.

**Authentication**: Public

**Request Body**:

```json
{
  "user_id": 123
}
```

**Response** (200 OK):

```json
{
  "isEligible": true
}
```

**Checks Performed**:
- Promotion is ACTIVE
- Promotion is within valid date range
- Global usage limit not exceeded
- Per-user usage limit not exceeded

---

### 21. GET /api/promotions/user/history - Get User Promotion History

**Purpose**: Retrieve promotion redemption history for the authenticated user.

**Authentication**: User required (gets user_id from token)

**Query Parameters**:

```
GET /api/promotions/user/history?filter[appliedAt][type]=range&filter[appliedAt][from]=2025-01-01&filter[appliedAt][to]=2025-12-31&page=1&limit=10
```

**Filterable Fields**:

- promotion_redemption_id (int)
- promotion.name (string)
- promotion.type (enum)
- order.order_id (int)
- order.grandTotal (float)
- order.placedAt (datetime)
- order.status (enum)
- purchasedQuantity (int)
- freeQuantity (int)
- appliedAt (datetime)
- createdAt (datetime)

**Response** (200 OK):

```json
{
  "data": [
    {
      "redemption_id": 1,
      "promotion": {
        "id": 1,
        "name": "Summer Sale - Buy 2 Get 1 Free",
        "type": "BUY_X_GET_Y_FREE"
      },
      "order": {
        "id": 101,
        "total": 2498,
        "placedAt": "2025-07-15T10:30:00Z"
      },
      "purchasedQuantity": 3,
      "freeQuantity": 1,
      "freeItems": [
        {
          "product_id": 103,
          "size_variant_id": 1003,
          "quantity": 1,
          "productName": "Black T-Shirt",
          "price": 999
        }
      ],
      "savingsAmount": 999,
      "appliedAt": "2025-07-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 22. GET /api/promotions/user/:userId/history - Get Specific User History

**Purpose**: Admin endpoint to view promotion history of a specific user.

**Authentication**: Admin required

**Request**:

```
GET /api/promotions/user/123/history?page=1&limit=10
```

**Response** (200 OK): Same format as endpoint 21

---

## Implementation Guide

### Step-by-Step Customer Journey

#### **Step 1: Product Browsing**

```javascript
// Frontend - Product Page
const getProductPromotions = async (productId) => {
  const response = await fetch(`/api/promotions/product/${productId}`);
  const promotions = await response.json();
  
  // Display promotion badges on product page
  promotions.forEach(promo => {
    displayPromoBadge(`Qualify for: ${promo.promotionName}`);
  });
};
```

#### **Step 2: Cart Addition**

```javascript
// Frontend - Add to Cart
const addToCart = (product) => {
  const cartItems = JSON.parse(localStorage.getItem('cart')) || [];
  cartItems.push({
    product_id: product.id,
    product_size_var_id: product.variantId,
    quantity: 1,
    price: product.price
  });
  localStorage.setItem('cart', JSON.stringify(cartItems));
};
```

#### **Step 3: Cart Validation**

```javascript
// Frontend - Cart Page Load
useEffect(() => {
  const cart = JSON.parse(localStorage.getItem('cart'));
  
  fetch('/api/promotions/validate-cart', {
    method: 'POST',
    body: JSON.stringify({
      items: cart,
      user_id: currentUser?.id
    })
  })
  .then(res => res.json())
  .then(promotions => {
    setApplicablePromotions(promotions);
    
    // Show promotion banners
    promotions.forEach(promo => {
      if (promo.freeItemsEarned) {
        showBanner(`${promo.message} Choose your free product!`);
      }
    });
  });
}, [cart]);
```

#### **Step 4: Free Product Selection**

```javascript
// Frontend - Free Product Modal
const selectFreeProduct = async (promotionId) => {
  const cart = JSON.parse(localStorage.getItem('cart'));
  
  const response = await fetch(
    `/api/promotions/${promotionId}/available-free-products`,
    {
      method: 'POST',
      body: JSON.stringify({ cartItems: cart })
    }
  );
  
  const freeProducts = await response.json();
  
  // Display product selection modal
  showFreeProductModal(freeProducts, (selected) => {
    const appliedPromotion = {
      promotion_id: promotionId,
      selectedFreeItems: [selected]
    };
    localStorage.setItem('appliedPromotion', JSON.stringify(appliedPromotion));
  });
};
```

#### **Step 5: Discount Calculation**

```javascript
// Frontend - Checkout Summary
useEffect(() => {
  const cart = JSON.parse(localStorage.getItem('cart'));
  const promo = JSON.parse(localStorage.getItem('appliedPromotion'));
  
  if (promo) {
    fetch(`/api/promotions/${promo.promotion_id}/calculate-discount`, {
      method: 'POST',
      body: JSON.stringify({ cartItems: cart })
    })
    .then(res => res.json())
    .then(calculation => {
      setDiscountSummary({
        cartTotal: calculation.cartTotal,
        discount: calculation.discountAmount,
        final: calculation.finalAmount
      });
    });
  }
}, []);
```

#### **Step 6: Order Placement**

```javascript
// Frontend - Checkout
const placeOrder = async () => {
  const cart = JSON.parse(localStorage.getItem('cart'));
  const appliedPromo = JSON.parse(localStorage.getItem('appliedPromotion'));
  
  const orderPayload = {
    user_id: currentUser.id,
    address_id: selectedAddress.id,
    items: cart,
    discount: discountAmount,
    appliedPromotion: appliedPromo,
    shippingCost: 50,
    tax: 100
  };
  
  const response = await fetch('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderPayload)
  });
  
  const order = await response.json();
  console.log('Order placed successfully:', order.order_id);
  
  // Clear cart and promotions
  localStorage.removeItem('cart');
  localStorage.removeItem('appliedPromotion');
};
```

---

## Workflow Examples

### Example 1: Buy 2 Get 1 Free

**Scenario**: Customer buys 2 T-shirts, gets 1 free

**Admin Setup**:

```json
POST /api/promotions/admin
{
  "name": "Buy 2 T-Shirts Get 1 Free",
  "type": "BUY_X_GET_Y_FREE",
  "buyQuantity": 2,
  "getQuantity": 1,
  "validFrom": "2025-06-01T00:00:00Z",
  "validTo": "2025-08-31T23:59:59Z"
}
```

**Add Eligible Products** (T-Shirts category):

```json
POST /api/promotions/1/eligible-products
{
  "products": [
    { "category_id": 5 }
  ]
}
```

**Add Free Products** (T-Shirt options):

```json
POST /api/promotions/1/free-products
{
  "products": [
    { "product_id": 103, "displayOrder": 1 },
    { "product_id": 104, "displayOrder": 2 },
    { "product_id": 105, "displayOrder": 3 }
  ]
}
```

**Customer Flow**:

1. Adds 2 T-shirts to cart (Total: ₹1998)
2. Calls `/validate-cart` → Returns: "Earn 1 free T-shirt!"
3. Calls `/available-free-products` → Returns: 3 T-shirt options
4. Selects Black T-shirt (₹999) as free
5. Calls `/calculate-discount` → Returns: Final: ₹999 (saves ₹999)
6. Places order with `appliedPromotion` data
7. Promotion redemption record created, stock updated

**Final Order**:
- Paid: 2 T-shirts (₹1998)
- Free: 1 Black T-shirt (₹999)
- Total Savings: ₹999

---

### Example 2: Quantity Discount

**Scenario**: Buy 3+ items, get 15% off

**Admin Setup**:

```json
POST /api/promotions/admin
{
  "name": "Buy 3+ Get 15% Off",
  "type": "QUANTITY_DISCOUNT",
  "buyQuantity": 3,
  "getQuantity": 0,
  "validFrom": "2025-06-01T00:00:00Z",
  "validTo": "2025-12-31T23:59:59Z"
}
```

**Customer Flow**:

1. Adds 4 items to cart (Total: ₹5000)
2. Calls `/validate-cart` → Returns: "Get 15% off!"
3. Calls `/calculate-discount` → Discount: ₹750, Final: ₹4250

---

### Example 3: Category-Based Promotion

**Scenario**: All T-shirts in category get Buy 2 Get 1 Free

**Admin Setup**:

```json
POST /api/promotions/admin
{
  "name": "T-Shirt Sale",
  "type": "BUY_X_GET_Y_FREE",
  "buyQuantity": 2,
  "getQuantity": 1
}

POST /api/promotions/1/eligible-products
{
  "products": [
    { "category_id": 5 }  // T-Shirts category
  ]
}
```

**Benefit**: Any product added to T-Shirts category is automatically eligible!

---

## Error Handling

### Common Errors and Solutions

#### 1. Promotion Not Found

**Response** (404):

```json
{
  "status": 404,
  "message": "Promotion not found",
  "code": "NOT_FOUND"
}
```

**Solution**: Check promotion ID and ensure it exists

#### 2. Invalid Promotion Status

**Response** (400):

```json
{
  "status": 400,
  "message": "Promotion is not active",
  "code": "INVALID_STATUS"
}
```

**Solutions**:
- Check if promotion status is ACTIVE
- Verify current date is within validFrom and validTo
- Check if usage limit hasn't been exceeded

#### 3. Cart Not Eligible

**Response** (200):

```json
[]  // Empty array
```

**Solution**: Show message like "Add 1 more item to qualify!"

#### 4. Stock Unavailable for Free Product

**Response** (400):

```json
{
  "status": 400,
  "message": "Selected free product is out of stock",
  "code": "OUT_OF_STOCK"
}
```

**Solution**: Show alternative free products from the list

#### 5. User Limit Exceeded

**Response** (400):

```json
{
  "status": 400,
  "message": "You have already used this promotion maximum times",
  "code": "LIMIT_EXCEEDED"
}
```

**Solution**: Show different promotions or encourage user to wait for new promotions

---

## Best Practices

### For Admins

1. **Set Appropriate Limits**
   - Don't set unlimited usage for high-value promotions
   - Set per-user limits to prevent abuse

2. **Category-Based Eligibility**
   - Use categories for bulk product inclusion
   - New products added to category automatically get promotion

3. **Display Order**
   - Set lower displayOrder (1, 2, 3) for high-value free products
   - Users see best options first

4. **Priority**
   - Higher priority (70-100) for flagship promotions
   - Lower priority (1-30) for clearance promotions

5. **Monitor Performance**
   - Check `/stats` endpoint regularly
   - Adjust limits if promotion underperforms

### For Developers

1. **Always Validate Dates**
   - Check both system time and promotion dates
   - Handle timezone differences

2. **Recalculate Prices**
   - Always fetch from `productSizeVariant` for accurate pricing
   - Don't trust client-side prices

3. **Reserve Stock Immediately**
   - Reserve stock when adding to cart if possible
   - Update when order is placed

4. **Create Audit Logs**
   - Log all promotion redemptions
   - Track inventory changes

5. **Handle Edge Cases**
   - Multiple promotions on same product
   - Out-of-stock free items
   - Expired promotions
   - User already maxed out limit

---

## API Response Format

### Success Response (200)

```json
{
  "status": 200,
  "message": "Operation successful",
  "data": {...}
}
```

### Error Response

```json
{
  "status": 400,
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": "Additional details if available"
}
```

---

## Rate Limiting

- **Public Endpoints**: 100 requests/minute per IP
- **Authenticated Endpoints**: 500 requests/minute per user
- **Admin Endpoints**: 1000 requests/minute per admin

---

## Summary

This comprehensive promotion system provides:

✅ Complete promotion lifecycle management  
✅ Real-time validation and eligibility checking  
✅ Flexible promotion types and rules  
✅ Accurate discount calculation  
✅ Promotion redemption tracking  
✅ Detailed analytics and reporting  
✅ User history and preferences  

For any questions or additional features, refer to the implementation guide or contact the development team.

---

**Document Version**: 1.0  
**Last Updated**: October 23, 2025  
**Maintained By**: Development Team