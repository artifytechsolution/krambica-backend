# Product Management API Documentation

**Version:** 1.0.0  
**Last Updated:** November 2025  
**Base URL:** `/api/products`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Middleware](#authentication--middleware)
3. [Basic Product CRUD Operations](#basic-product-crud-operations)
4. [Product Color Management](#product-color-management)
5. [Product Color Images](#product-color-images)
6. [Product Size Variants](#product-size-variants)
7. [Product General Images](#product-general-images)
8. [Stock & Inventory Management](#stock--inventory-management)
9. [Wishlist Management](#wishlist-management)
10. [Error Handling](#error-handling)
11. [Implementation Guide](#implementation-guide)

---

## Overview

This API provides comprehensive endpoints for managing product catalog, including product creation, color variants, size variants, image management, inventory tracking, and user wishlists. The API follows RESTful principles and uses Express.js routing with middleware validation.

**Key Features:**
- Complete product CRUD operations
- Multi-variant support (colors, sizes)
- Advanced image management with cloud storage
- Real-time inventory tracking
- Stock alerts and audit logging
- User wishlist functionality
- File upload handling with Multer

---

## Authentication & Middleware

### Middleware Components

#### 1. **validateId Middleware**
- **Purpose:** Validates UUID format for route parameters
- **Applied To:** All endpoints with `:id` or `:productId` parameters
- **Returns:** 400 Bad Request if ID format is invalid

#### 2. **Upload Middleware (Multer)**
- **Purpose:** Handles file uploads with validation
- **Configuration:**
  - Maximum file size: 5MB (typical, configure as needed)
  - Allowed formats: JPEG, PNG, WebP, AVIF
  - Max files per request: 15 images
- **Folders:** Uploads stored in Cloudinary or local `/uploads` directory

#### 3. **handleUploadSuccess Middleware**
- **Purpose:** Post-processing for successful file uploads
- **Actions:** Validates upload metadata, generates CDN URLs, stores paths in database

#### 4. **Error Handler (Multer)**
- **Purpose:** Catches and formats Multer-specific errors
- **Errors Handled:**
  - File size exceeded
  - Invalid file type
  - Unexpected field name
  - Too many files

---

## Basic Product CRUD Operations

### 1. Get All Products

**Endpoint:** `GET /`

**Purpose:** Retrieve a paginated list of all products with basic information

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 20, max: 100) |
| `sort` | string | No | Sort field (e.g., 'createdAt', 'price', 'name') |
| `order` | string | No | Sort order ('ASC' or 'DESC', default: 'DESC') |
| `search` | string | No | Search products by name or SKU |
| `category` | string | No | Filter by category |
| `brand` | string | No | Filter by brand |
| `minPrice` | number | No | Minimum price filter |
| `maxPrice` | number | No | Maximum price filter |

**Request Body:** None

**Success Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Premium Cotton T-Shirt",
      "description": "High-quality cotton t-shirt",
      "price": 29.99,
      "category": "Apparel",
      "brand": "StyleCo",
      "sku": "TSH-001-BLK",
      "isActive": true,
      "createdAt": "2025-11-01T10:00:00Z",
      "updatedAt": "2025-11-01T10:00:00Z",
      "colors": [],
      "images": []
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 500 | SERVER_ERROR | Database connection or query error |
| 400 | INVALID_QUERY | Invalid query parameters |

**Implementation Notes:**
- Use pagination to handle large datasets efficiently
- Implement caching for frequently accessed products
- Consider denormalizing color and image counts for performance

---

### 2. Get Product by ID

**Endpoint:** `GET /:id`

**Purpose:** Retrieve detailed information for a single product including all variants and images

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `id` | string | Yes | UUID v4 |

**Request Body:** None

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Premium Cotton T-Shirt",
    "description": "High-quality cotton t-shirt with sustainable materials",
    "price": 29.99,
    "salePrice": null,
    "category": "Apparel",
    "brand": "StyleCo",
    "sku": "TSH-001-BLK",
    "rating": 4.5,
    "reviewCount": 234,
    "isActive": true,
    "metaDescription": "Premium cotton t-shirt for all seasons",
    "metaKeywords": ["t-shirt", "cotton", "casual"],
    "createdAt": "2025-11-01T10:00:00Z",
    "updatedAt": "2025-11-01T10:00:00Z",
    "colors": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Black",
        "hexCode": "#000000",
        "stock": 150,
        "images": [
          {
            "id": "770e8400-e29b-41d4-a716-446655440002",
            "url": "https://cdn.example.com/images/product-1-black.jpg",
            "altText": "Black Premium T-Shirt",
            "isPrimary": true,
            "displayOrder": 1
          }
        ]
      }
    ],
    "images": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "url": "https://cdn.example.com/images/product-1-main.jpg",
        "altText": "Premium T-Shirt Product Shot",
        "isPrimary": true
      }
    ]
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_ID | Invalid UUID format in path |
| 404 | NOT_FOUND | Product with given ID does not exist |
| 500 | SERVER_ERROR | Database query error |

**Implementation Notes:**
- Eagerly load all related data (colors, sizes, images)
- Implement caching with 1-hour TTL for frequently viewed products
- Order images by displayOrder for consistent presentation

---

### 3. Create Product

**Endpoint:** `POST /`

**Purpose:** Create a new product with basic information

**Request Body:**
```json
{
  "name": "Premium Cotton T-Shirt",
  "description": "High-quality cotton t-shirt with sustainable materials",
  "price": 29.99,
  "salePrice": 24.99,
  "category": "Apparel",
  "brand": "StyleCo",
  "sku": "TSH-001",
  "rating": 0,
  "reviewCount": 0,
  "isActive": true,
  "metaDescription": "Premium cotton t-shirt",
  "metaKeywords": ["t-shirt", "cotton", "casual"]
}
```

**Request Body Schema:**
| Field | Type | Required | Constraints |
|-------|------|----------|-----------|
| `name` | string | Yes | Min: 3, Max: 255 characters |
| `description` | string | Yes | Min: 10, Max: 5000 characters |
| `price` | number | Yes | Must be > 0 |
| `salePrice` | number | No | Must be < price if provided |
| `category` | string | Yes | Must exist in category table |
| `brand` | string | Yes | Min: 2, Max: 100 characters |
| `sku` | string | Yes | Unique, Min: 3, Max: 50 characters |
| `rating` | number | No | Default: 0, Range: 0-5 |
| `reviewCount` | number | No | Default: 0 |
| `isActive` | boolean | No | Default: true |
| `metaDescription` | string | No | Max: 160 characters (SEO) |
| `metaKeywords` | array | No | Max: 10 keywords |

**Success Response (201):**
```json
{
  "status": "success",
  "message": "Product created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Premium Cotton T-Shirt",
    "description": "High-quality cotton t-shirt with sustainable materials",
    "price": 29.99,
    "salePrice": 24.99,
    "category": "Apparel",
    "brand": "StyleCo",
    "sku": "TSH-001",
    "isActive": true,
    "createdAt": "2025-11-01T10:00:00Z",
    "updatedAt": "2025-11-01T10:00:00Z"
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | VALIDATION_ERROR | One or more fields failed validation |
| 409 | CONFLICT | SKU already exists in database |
| 500 | SERVER_ERROR | Database insert error |

**Validation Examples:**
- Name validation: Must not be empty, 3-255 characters
- SKU validation: Must be unique across all products
- Price validation: Must be positive number
- Category validation: Must reference existing category

**Implementation Notes:**
```javascript
// Prisma example
const product = await prisma.product.create({
  data: {
    name: req.body.name,
    description: req.body.description,
    price: req.body.price,
    salePrice: req.body.salePrice || null,
    category: req.body.category,
    brand: req.body.brand,
    sku: req.body.sku,
    isActive: req.body.isActive ?? true,
    metaDescription: req.body.metaDescription,
    metaKeywords: req.body.metaKeywords || []
  }
});
```

---

### 4. Update Product

**Endpoint:** `PATCH /:id`

**Purpose:** Partially update product information

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `id` | string | Yes | UUID v4 |

**Request Body:**
```json
{
  "name": "Premium Organic Cotton T-Shirt",
  "price": 34.99,
  "isActive": true
}
```

**Updatable Fields:** All fields from Create Product endpoint (partial update allowed)

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Product updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Premium Organic Cotton T-Shirt",
    "description": "High-quality cotton t-shirt with sustainable materials",
    "price": 34.99,
    "salePrice": 24.99,
    "category": "Apparel",
    "brand": "StyleCo",
    "sku": "TSH-001",
    "isActive": true,
    "updatedAt": "2025-11-01T11:30:00Z"
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_ID | Invalid UUID format |
| 400 | VALIDATION_ERROR | Field validation failed |
| 404 | NOT_FOUND | Product does not exist |
| 409 | CONFLICT | SKU conflicts with another product |
| 500 | SERVER_ERROR | Database update error |

**Implementation Notes:**
- Perform atomic updates to prevent race conditions
- Log all updates for audit trail
- Invalidate product cache after update
- Validate only fields that are provided

---

### 5. Delete Product

**Endpoint:** `DELETE /:id`

**Purpose:** Permanently delete a product and all associated data

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `id` | string | Yes | UUID v4 |

**Request Body:** None

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Product deleted successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Premium Cotton T-Shirt"
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_ID | Invalid UUID format |
| 404 | NOT_FOUND | Product does not exist |
| 409 | CONFLICT | Product has active orders (soft delete recommended) |
| 500 | SERVER_ERROR | Database deletion error |

**Implementation Notes:**
- Consider soft delete (isActive = false) instead of hard delete for data integrity
- Cascade delete related colors, sizes, images, and wishlist items
- Remove images from cloud storage when deleting
- Log deletion for audit purposes
- Clear all caches related to the product

```javascript
// Recommended: Soft delete approach
await prisma.product.update({
  where: { id: productId },
  data: { isActive: false, deletedAt: new Date() }
});
```

---

## Product Color Management

### 1. Get All Colors for Product

**Endpoint:** `GET /:productId/colors`

**Purpose:** Retrieve all color variants for a specific product

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `productId` | string | Yes | UUID v4 |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `includeImages` | boolean | No | Include color images in response (default: false) |
| `stock` | string | No | Filter by stock status ('inStock', 'lowStock', 'outOfStock') |

**Request Body:** None

**Success Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "productId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Black",
      "hexCode": "#000000",
      "stock": 150,
      "createdAt": "2025-11-01T10:00:00Z",
      "updatedAt": "2025-11-01T10:00:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440002",
      "productId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Navy Blue",
      "hexCode": "#001f3f",
      "stock": 89,
      "createdAt": "2025-11-01T10:05:00Z",
      "updatedAt": "2025-11-01T10:05:00Z"
    }
  ],
  "total": 2
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_PRODUCT_ID | Invalid UUID format |
| 404 | NOT_FOUND | Product does not exist |
| 500 | SERVER_ERROR | Database query error |

---

### 2. Create Color Variant

**Endpoint:** `POST /colors`

**Purpose:** Add a new color variant to a product

**Request Body:**
```json
{
  "productId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Crimson Red",
  "hexCode": "#DC143C",
  "stock": 200
}
```

**Request Body Schema:**
| Field | Type | Required | Constraints |
|-------|------|----------|-----------|
| `productId` | string | Yes | Must be valid UUID and existing product |
| `name` | string | Yes | Min: 2, Max: 50 characters |
| `hexCode` | string | Yes | Valid hex color code format (#RRGGBB) |
| `stock` | number | Yes | Must be >= 0 |

**Success Response (201):**
```json
{
  "status": "success",
  "message": "Color created successfully",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440003",
    "productId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Crimson Red",
    "hexCode": "#DC143C",
    "stock": 200,
    "createdAt": "2025-11-01T10:30:00Z",
    "updatedAt": "2025-11-01T10:30:00Z"
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_PRODUCT_ID | Invalid product ID format |
| 400 | INVALID_HEX_CODE | Invalid hex color code format |
| 400 | VALIDATION_ERROR | Field validation failed |
| 404 | PRODUCT_NOT_FOUND | Product does not exist |
| 409 | DUPLICATE_COLOR | Color already exists for this product |
| 500 | SERVER_ERROR | Database insert error |

**Implementation Notes:**
- Validate hex code format: must be 6 hex characters preceded by #
- Prevent duplicate color names for the same product
- Initialize stock tracking for the new color
- Create color audit log entry

---

### 3. Update Color Details

**Endpoint:** `PATCH /colors/:colorId`

**Purpose:** Update color variant information

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `colorId` | string | Yes | UUID v4 |

**Request Body:**
```json
{
  "name": "Deep Crimson",
  "hexCode": "#8B0000",
  "stock": 180
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Color updated successfully",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440003",
    "productId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Deep Crimson",
    "hexCode": "#8B0000",
    "stock": 180,
    "updatedAt": "2025-11-01T11:00:00Z"
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_COLOR_ID | Invalid UUID format |
| 400 | VALIDATION_ERROR | Field validation failed |
| 404 | NOT_FOUND | Color does not exist |
| 409 | DUPLICATE_COLOR | Color name already exists for product |
| 500 | SERVER_ERROR | Database update error |

---

### 4. Delete Color Variant

**Endpoint:** `DELETE /colors/:colorId`

**Purpose:** Remove a color variant and all associated images

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `colorId` | string | Yes | UUID v4 |

**Request Body:** None

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Color deleted successfully",
  "deletedImages": 5,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440003",
    "name": "Deep Crimson"
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_COLOR_ID | Invalid UUID format |
| 404 | NOT_FOUND | Color does not exist |
| 409 | IN_USE | Color has active size variants or cart items |
| 500 | SERVER_ERROR | Database deletion error |

**Implementation Notes:**
- Cascade delete all associated color images
- Remove images from cloud storage
- Prevent deletion if color has active orders or cart items
- Consider soft delete for historical data preservation

---

## Product Color Images

### 1. Get Color Images

**Endpoint:** `GET /colors/:colorId/images`

**Purpose:** Retrieve all images for a specific color variant

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `colorId` | string | Yes | UUID v4 |

**Request Body:** None

**Success Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440001",
      "colorId": "660e8400-e29b-41d4-a716-446655440001",
      "url": "https://cdn.example.com/colors/black-1.jpg",
      "altText": "Black T-Shirt Front View",
      "isPrimary": true,
      "displayOrder": 1,
      "fileSize": 245680,
      "createdAt": "2025-11-01T10:00:00Z"
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "colorId": "660e8400-e29b-41d4-a716-446655440001",
      "url": "https://cdn.example.com/colors/black-2.jpg",
      "altText": "Black T-Shirt Back View",
      "isPrimary": false,
      "displayOrder": 2,
      "fileSize": 238940,
      "createdAt": "2025-11-01T10:05:00Z"
    }
  ],
  "total": 2
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_COLOR_ID | Invalid UUID format |
| 404 | NOT_FOUND | Color does not exist |
| 500 | SERVER_ERROR | Database query error |

---

### 2. Upload Multiple Color Images

**Endpoint:** `POST /colors/images/upload/multiple`

**Purpose:** Upload up to 15 images for a color variant with Multer file processing

**Request Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Required | Constraints |
|-------|------|----------|-----------|
| `images` | file[] | Yes | Max 15 files, 5MB each, JPEG/PNG/WebP/AVIF |
| `colorId` | string | Yes | UUID v4 of the color variant |
| `altText` | string[] | No | Alt text for each image (optional, can be auto-generated) |

**Example HTML Form:**
```html
<form enctype="multipart/form-data">
  <input type="file" name="images" multiple accept="image/*" required />
  <input type="hidden" name="colorId" value="660e8400-e29b-41d4-a716-446655440001" />
  <input type="text" name="altText" placeholder="Optional alt text" />
  <button type="submit">Upload Images</button>
</form>
```

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api/products/colors/images/upload/multiple \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "colorId=660e8400-e29b-41d4-a716-446655440001"
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Images uploaded successfully",
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440003",
      "colorId": "660e8400-e29b-41d4-a716-446655440001",
      "url": "https://cdn.example.com/colors/black-3.jpg",
      "altText": "Black T-Shirt Color Detail",
      "isPrimary": false,
      "displayOrder": 3,
      "fileSize": 256120
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440004",
      "colorId": "660e8400-e29b-41d4-a716-446655440001",
      "url": "https://cdn.example.com/colors/black-4.jpg",
      "altText": "Black T-Shirt Size Guide",
      "isPrimary": false,
      "displayOrder": 4,
      "fileSize": 289450
    }
  ],
  "uploadedCount": 2
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | NO_FILES | No files provided in request |
| 400 | INVALID_COLOR_ID | Invalid or missing colorId |
| 400 | INVALID_FILE_TYPE | File format not supported |
| 413 | FILE_TOO_LARGE | Individual file exceeds 5MB |
| 429 | TOO_MANY_FILES | More than 15 files in request |
| 404 | COLOR_NOT_FOUND | Color does not exist |
| 500 | UPLOAD_ERROR | Cloud storage or processing error |

**Implementation Notes:**
- Use Multer middleware with file size and count limits
- Store files in Cloudinary or AWS S3 for scalability
- Auto-generate CDN URLs after upload
- Set first uploaded image as primary automatically
- Store original filename for reference
- Implement virus scanning for uploaded files

```javascript
// Multer configuration example
const upload = multer({
  dest: '/uploads',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 15
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

---

### 3. Update Color Image Metadata

**Endpoint:** `PATCH /colors/images/:imageId`

**Purpose:** Update image metadata like alt text and display order

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `imageId` | string | Yes | UUID v4 |

**Request Body:**
```json
{
  "altText": "Premium Black T-Shirt Front View",
  "displayOrder": 2,
  "isPrimary": false
}
```

**Request Body Schema:**
| Field | Type | Required | Constraints |
|-------|------|----------|-----------|
| `altText` | string | No | Max: 255 characters (SEO) |
| `displayOrder` | number | No | Must be positive integer |
| `isPrimary` | boolean | No | Sets image as primary for color |

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Image metadata updated successfully",
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440001",
    "colorId": "660e8400-e29b-41d4-a716-446655440001",
    "url": "https://cdn.example.com/colors/black-1.jpg",
    "altText": "Premium Black T-Shirt Front View",
    "isPrimary": false,
    "displayOrder": 2,
    "updatedAt": "2025-11-01T11:00:00Z"
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_IMAGE_ID | Invalid UUID format |
| 400 | VALIDATION_ERROR | Field validation failed |
| 404 | NOT_FOUND | Image does not exist |
| 500 | SERVER_ERROR | Database update error |

**Implementation Notes:**
- If isPrimary is set to true, unset primary flag from other color images
- Maintain displayOrder sequence integrity
- Update alt text for better SEO and accessibility

---

### 4. Delete Color Image

**Endpoint:** `DELETE /colors/images/:imageId`

**Purpose:** Remove a color image and clean up storage

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `imageId` | string | Yes | UUID v4 |

**Request Body:** None

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Image deleted successfully",
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440001",
    "colorId": "660e8400-e29b-41d4-a716-446655440001",
    "url": "https://cdn.example.com/colors/black-1.jpg"
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_IMAGE_ID | Invalid UUID format |
| 404 | NOT_FOUND | Image does not exist |
| 409 | PRIMARY_IMAGE | Cannot delete primary image without replacement |
| 500 | DELETION_ERROR | Cloud storage or database deletion error |

**Implementation Notes:**
- Delete image from cloud storage when record is removed
- If deleting primary image, set next image as primary
- Log deletion for audit trail
- Handle cloud storage deletion errors gracefully

---

## Product Size Variants

### 1. Get Size Variants for Color

**Endpoint:** `GET /colors/:colorId/sizes`

**Purpose:** Retrieve all size variants for a specific color

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `colorId` | string | Yes | UUID v4 |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `inStock` | boolean | No | Filter to only in-stock sizes (default: false) |

**Request Body:** None

**Success Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440001",
      "colorId": "660e8400-e29b-41d4-a716-446655440001",
      "size": "S",
      "sku": "TSH-001-BLK-S",
      "quantity": 50,
      "price": 29.99,
      "cost": 12.50,
      "createdAt": "2025-11-01T10:00:00Z"
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440002",
      "colorId": "660e8400-e29b-41d4-a716-446655440001",
      "size": "M",
      "sku": "TSH-001-BLK-M",
      "quantity": 75,
      "price": 29.99,
      "cost": 12.50,
      "createdAt": "2025-11-01T10:05:00Z"
    }
  ],
  "total": 2
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_COLOR_ID | Invalid UUID format |
| 404 | NOT_FOUND | Color does not exist |
| 500 | SERVER_ERROR | Database query error |

---

### 2. Create Size Variant

**Endpoint:** `POST /sizes`

**Purpose:** Create a new size variant for a color

**Request Body:**
```json
{
  "colorId": "660e8400-e29b-41d4-a716-446655440001",
  "size": "L",
  "sku": "TSH-001-BLK-L",
  "quantity": 100,
  "price": 29.99,
  "cost": 12.50
}
```

**Request Body Schema:**
| Field | Type | Required | Constraints |
|-------|------|----------|-----------|
| `colorId` | string | Yes | Must be valid UUID and existing color |
| `size` | string | Yes | Min: 1, Max: 10 characters (XS, S, M, L, XL, 32, etc.) |
| `sku` | string | Yes | Unique SKU combining product-color-size |
| `quantity` | number | Yes | Must be >= 0 |
| `price` | number | Yes | Must be > 0 |
| `cost` | number | No | Internal cost for profit calculation |

**Success Response (201):**
```json
{
  "status": "success",
  "message": "Size variant created successfully",
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "colorId": "660e8400-e29b-41d4-a716-446655440001",
    "size": "L",
    "sku": "TSH-001-BLK-L",
    "quantity": 100,
    "price": 29.99,
    "cost": 12.50,
    "createdAt": "2025-11-01T10:30:00Z"
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_COLOR_ID | Invalid color ID format |
| 400 | VALIDATION_ERROR | Field validation failed |
| 404 | COLOR_NOT_FOUND | Color does not exist |
| 409 | DUPLICATE_VARIANT | Size already exists for this color |
| 409 | DUPLICATE_SKU | SKU already exists globally |
| 500 | SERVER_ERROR | Database insert error |

**Implementation Notes:**
- Enforce unique SKU across entire product catalog
- Use consistent SKU format: PRODUCT-COLOR-SIZE
- Validate size values against predefined list (S, M, L, XL, etc.)
- Initialize inventory tracking for the variant
- Create stock tracking records

---

### 3. Update Size Variant

**Endpoint:** `PATCH /sizes/:variantId`

**Purpose:** Update size variant details

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `variantId` | string | Yes | UUID v4 |

**Request Body:**
```json
{
  "quantity": 95,
  "price": 31.99,
  "cost": 13.00
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Size variant updated successfully",
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "colorId": "660e8400-e29b-41d4-a716-446655440001",
    "size": "L",
    "sku": "TSH-001-BLK-L",
    "quantity": 95,
    "price": 31.99,
    "cost": 13.00,
    "updatedAt": "2025-11-01T11:00:00Z"
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_VARIANT_ID | Invalid UUID format |
| 400 | VALIDATION_ERROR | Field validation failed |
| 404 | NOT_FOUND | Size variant does not exist |
| 409 | DUPLICATE_SKU | New SKU conflicts with existing variant |
| 500 | SERVER_ERROR | Database update error |

---

### 4. Delete Size Variant

**Endpoint:** `DELETE /sizes/:variantId`

**Purpose:** Remove a size variant

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `variantId` | string | Yes | UUID v4 |

**Request Body:** None

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Size variant deleted successfully",
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "size": "L",
    "sku": "TSH-001-BLK-L"
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_VARIANT_ID | Invalid UUID format |
| 404 | NOT_FOUND | Size variant does not exist |
| 409 | IN_USE | Variant has active cart items or orders |
| 500 | SERVER_ERROR | Database deletion error |

**Implementation Notes:**
- Soft delete recommended for data integrity
- Prevent deletion if variant has active orders
- Clear cache for affected product/color

---

## Product General Images

### 1. Get Product Images

**Endpoint:** `GET /:productId/images`

**Purpose:** Retrieve all general product-level images (not color-specific)

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `productId` | string | Yes | UUID v4 |

**Request Body:** None

**Success Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440001",
      "productId": "550e8400-e29b-41d4-a716-446655440000",
      "url": "https://cdn.example.com/products/tshirt-main.jpg",
      "altText": "Premium Cotton T-Shirt Product Shot",
      "isPrimary": true,
      "createdAt": "2025-11-01T10:00:00Z"
    }
  ],
  "total": 1
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_PRODUCT_ID | Invalid UUID format |
| 404 | NOT_FOUND | Product does not exist |
| 500 | SERVER_ERROR | Database query error |

---

### 2. Upload Single Product Image

**Endpoint:** `POST /images/upload/single`

**Purpose:** Upload a single image for product-level representation

**Request Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Required | Constraints |
|-------|------|----------|-----------|
| `image` | file | Yes | Max 5MB, JPEG/PNG/WebP/AVIF |
| `productId` | string | Yes | UUID v4 of the product |
| `altText` | string | No | Alt text for SEO |

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Image uploaded successfully",
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440002",
    "productId": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://cdn.example.com/products/tshirt-detail.jpg",
    "altText": "Premium Cotton T-Shirt Detail",
    "isPrimary": false
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | NO_FILE | No file provided |
| 400 | INVALID_PRODUCT_ID | Invalid product ID |
| 400 | INVALID_FILE_TYPE | Unsupported file format |
| 413 | FILE_TOO_LARGE | File exceeds 5MB limit |
| 404 | PRODUCT_NOT_FOUND | Product does not exist |
| 500 | UPLOAD_ERROR | Cloud storage error |

---

### 3. Upload Multiple Product Images

**Endpoint:** `POST /images/upload/multiple`

**Purpose:** Upload up to 15 images for product-level gallery

**Request Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Required | Constraints |
|-------|------|----------|-----------|
| `images` | file[] | Yes | Max 15 files, 5MB each |
| `productId` | string | Yes | UUID v4 of the product |

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Images uploaded successfully",
  "data": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440003",
      "productId": "550e8400-e29b-41d4-a716-446655440000",
      "url": "https://cdn.example.com/products/tshirt-front.jpg",
      "altText": "T-Shirt Front View"
    }
  ],
  "uploadedCount": 1
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | NO_FILES | No files provided |
| 400 | INVALID_PRODUCT_ID | Invalid product ID |
| 413 | FILE_TOO_LARGE | File size exceeds limit |
| 429 | TOO_MANY_FILES | More than 15 files |
| 404 | PRODUCT_NOT_FOUND | Product does not exist |
| 500 | UPLOAD_ERROR | Cloud storage error |

---

### 4. Update Product Image

**Endpoint:** `PUT /images/:imageId`

**Purpose:** Replace/update an existing product image

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `imageId` | string | Yes | UUID v4 |

**Request Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Required | Constraints |
|-------|------|----------|-----------|
| `image` | file | Yes | Max 5MB, JPEG/PNG/WebP/AVIF |

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Image updated successfully",
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440002",
    "productId": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://cdn.example.com/products/tshirt-detail-new.jpg"
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_IMAGE_ID | Invalid UUID format |
| 400 | NO_FILE | No replacement file provided |
| 404 | NOT_FOUND | Image does not exist |
| 500 | UPDATE_ERROR | Cloud storage or database error |

---

### 5. Set Primary Product Image

**Endpoint:** `PATCH /images/:imageId/primary`

**Purpose:** Set an image as the primary/featured product image

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `imageId` | string | Yes | UUID v4 |

**Request Body:** None

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Primary image set successfully",
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440002",
    "productId": "550e8400-e29b-41d4-a716-446655440000",
    "isPrimary": true
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_IMAGE_ID | Invalid UUID format |
| 404 | NOT_FOUND | Image does not exist |
| 500 | UPDATE_ERROR | Database update error |

**Implementation Notes:**
- When setting image as primary, unset primary flag from other product images
- Update cache for product page
- Use primary image for product listings and search results

---

### 6. Delete Product Image

**Endpoint:** `DELETE /images/:imageId`

**Purpose:** Remove a product image

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `imageId` | string | Yes | UUID v4 |

**Request Body:** None

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Image deleted successfully",
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440002"
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_IMAGE_ID | Invalid UUID format |
| 404 | NOT_FOUND | Image does not exist |
| 409 | PRIMARY_IMAGE | Cannot delete primary image without replacement |
| 500 | DELETION_ERROR | Cloud storage or database error |

---

## Stock & Inventory Management

### 1. Get Stock for Size Variant

**Endpoint:** `GET /sizes/:variantId/stock`

**Purpose:** Retrieve current stock information for a size variant

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `variantId` | string | Yes | UUID v4 |

**Request Body:** None

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "variantId": "880e8400-e29b-41d4-a716-446655440001",
    "sku": "TSH-001-BLK-S",
    "currentStock": 50,
    "reserved": 5,
    "available": 45,
    "lowStockThreshold": 10,
    "isLowStock": false,
    "lastUpdated": "2025-11-01T12:00:00Z"
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_VARIANT_ID | Invalid UUID format |
| 404 | NOT_FOUND | Size variant does not exist |
| 500 | SERVER_ERROR | Database query error |

---

### 2. Update Stock for Size Variant

**Endpoint:** `PUT /sizes/:variantId/stock`

**Purpose:** Set new stock level for a size variant

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `variantId` | string | Yes | UUID v4 |

**Request Body:**
```json
{
  "quantity": 75,
  "reason": "Restock received from supplier"
}
```

**Request Body Schema:**
| Field | Type | Required | Constraints |
|-------|------|----------|-----------|
| `quantity` | number | Yes | Must be >= 0 |
| `reason` | string | No | Audit trail reason (restock, correction, etc.) |

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Stock updated successfully",
  "data": {
    "variantId": "880e8400-e29b-41d4-a716-446655440001",
    "previousStock": 50,
    "newStock": 75,
    "difference": 25,
    "reason": "Restock received from supplier",
    "updatedAt": "2025-11-01T12:30:00Z"
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_VARIANT_ID | Invalid UUID format |
| 400 | VALIDATION_ERROR | Invalid quantity value |
| 404 | NOT_FOUND | Size variant does not exist |
| 500 | UPDATE_ERROR | Database update error |

**Implementation Notes:**
- Log all stock changes for audit trail
- Trigger stock alert if quantity drops below threshold
- Update product availability status
- Trigger webhook notifications for low stock

---

### 3. Adjust Stock for Size Variant

**Endpoint:** `POST /sizes/:variantId/stock/adjust`

**Purpose:** Incrementally adjust stock (add or subtract)

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `variantId` | string | Yes | UUID v4 |

**Request Body:**
```json
{
  "adjustment": -5,
  "reason": "order_placed_123456",
  "reference": "ORD-2025-001"
}
```

**Request Body Schema:**
| Field | Type | Required | Constraints |
|-------|------|----------|-----------|
| `adjustment` | number | Yes | Negative to decrease, positive to increase |
| `reason` | string | Yes | Type of adjustment (order_placed, return, correction, etc.) |
| `reference` | string | No | Order ID or reference for tracking |

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Stock adjusted successfully",
  "data": {
    "variantId": "880e8400-e29b-41d4-a716-446655440001",
    "previousStock": 75,
    "adjustment": -5,
    "newStock": 70,
    "reason": "order_placed",
    "reference": "ORD-2025-001",
    "adjustedAt": "2025-11-01T12:45:00Z"
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_VARIANT_ID | Invalid UUID format |
| 400 | INSUFFICIENT_STOCK | Adjustment would result in negative stock |
| 400 | VALIDATION_ERROR | Invalid adjustment value |
| 404 | NOT_FOUND | Size variant does not exist |
| 409 | STOCK_LOCKED | Stock is locked for processing |
| 500 | ADJUSTMENT_ERROR | Database update error |

**Implementation Notes:**
- Implement stock locking during order processing to prevent overselling
- Create detailed audit log for each adjustment
- Validate that adjustment won't cause negative stock
- Emit events for stock level changes
- Update cache immediately

---

### 4. Get Inventory Logs

**Endpoint:** `GET /sizes/:variantId/inventory-logs`

**Purpose:** Retrieve inventory transaction history for a size variant

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `variantId` | string | Yes | UUID v4 |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 20) |
| `startDate` | string | No | ISO date format (YYYY-MM-DD) |
| `endDate` | string | No | ISO date format (YYYY-MM-DD) |
| `reason` | string | No | Filter by adjustment reason |

**Request Body:** None

**Success Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440001",
      "variantId": "880e8400-e29b-41d4-a716-446655440001",
      "type": "adjustment",
      "adjustment": -5,
      "previousStock": 75,
      "newStock": 70,
      "reason": "order_placed",
      "reference": "ORD-2025-001",
      "userId": "user-123",
      "createdAt": "2025-11-01T12:45:00Z"
    },
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440002",
      "variantId": "880e8400-e29b-41d4-a716-446655440001",
      "type": "update",
      "adjustment": 25,
      "previousStock": 50,
      "newStock": 75,
      "reason": "Restock received from supplier",
      "userId": "user-456",
      "createdAt": "2025-11-01T12:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "pages": 1
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_VARIANT_ID | Invalid UUID format |
| 400 | INVALID_DATE_RANGE | Invalid date parameters |
| 404 | NOT_FOUND | Size variant does not exist |
| 500 | QUERY_ERROR | Database query error |

**Implementation Notes:**
- Immutable log entries for compliance and auditing
- Include user information for accountability
- Support date range filtering for reports
- Consider pagination for large log datasets

---

### 5. Get Stock Alerts

**Endpoint:** `GET /sizes/:variantId/stock-alerts`

**Purpose:** Retrieve active stock alerts for a size variant

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `variantId` | string | Yes | UUID v4 |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by alert status (active, resolved) |

**Request Body:** None

**Success Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440001",
      "variantId": "880e8400-e29b-41d4-a716-446655440001",
      "alertType": "low_stock",
      "threshold": 10,
      "currentStock": 8,
      "severity": "high",
      "status": "active",
      "createdAt": "2025-11-01T13:00:00Z",
      "resolvedAt": null
    }
  ],
  "total": 1
}
```

**Alert Types:**
- `low_stock`: Stock below threshold
- `out_of_stock`: Stock = 0
- `overstock`: Stock exceeds maximum
- `stock_discrepancy`: Physical count mismatch

**Severity Levels:**
- `low`: Advisory notification
- `medium`: Warning, review needed
- `high`: Critical, immediate action required

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_VARIANT_ID | Invalid UUID format |
| 404 | NOT_FOUND | Size variant does not exist |
| 500 | QUERY_ERROR | Database query error |

---

### 6. Resolve Stock Alert

**Endpoint:** `PATCH /stock-alerts/:alertId/resolve`

**Purpose:** Mark a stock alert as resolved

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `alertId` | string | Yes | UUID v4 |

**Request Body:**
```json
{
  "resolution": "Restock completed",
  "actionTaken": "Purchased 500 units from supplier"
}
```

**Request Body Schema:**
| Field | Type | Required | Constraints |
|-------|------|----------|-----------|
| `resolution` | string | Yes | Brief resolution description |
| `actionTaken` | string | No | Detailed action taken |

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Alert resolved successfully",
  "data": {
    "id": "bb0e8400-e29b-41d4-a716-446655440001",
    "variantId": "880e8400-e29b-41d4-a716-446655440001",
    "status": "resolved",
    "resolution": "Restock completed",
    "actionTaken": "Purchased 500 units from supplier",
    "resolvedAt": "2025-11-01T14:00:00Z",
    "resolvedBy": "user-789"
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_ALERT_ID | Invalid UUID format |
| 404 | NOT_FOUND | Alert does not exist |
| 409 | ALREADY_RESOLVED | Alert is already resolved |
| 500 | UPDATE_ERROR | Database update error |

**Implementation Notes:**
- Record which user resolved the alert
- Archive resolved alerts for historical tracking
- Generate alert resolution reports
- Send notification when alert is resolved

---

## Wishlist Management

### 1. Add to Wishlist

**Endpoint:** `POST /wishlist/add`

**Purpose:** Add a product (or specific variant) to user's wishlist

**Request Body:**
```json
{
  "userId": "user-550e8400-e29b-41d4-a716-446655440000",
  "productId": "550e8400-e29b-41d4-a716-446655440000",
  "colorId": "660e8400-e29b-41d4-a716-446655440001",
  "variantId": "880e8400-e29b-41d4-a716-446655440001"
}
```

**Request Body Schema:**
| Field | Type | Required | Constraints |
|-------|------|----------|-----------|
| `userId` | string | Yes | UUID v4 of authenticated user |
| `productId` | string | Yes | UUID v4 of product |
| `colorId` | string | No | UUID v4 of specific color variant |
| `variantId` | string | No | UUID v4 of specific size variant |

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Product added to wishlist successfully",
  "data": {
    "wishlistId": "cc0e8400-e29b-41d4-a716-446655440001",
    "userId": "user-550e8400-e29b-41d4-a716-446655440000",
    "productId": "550e8400-e29b-41d4-a716-446655440000",
    "colorId": "660e8400-e29b-41d4-a716-446655440001",
    "variantId": "880e8400-e29b-41d4-a716-446655440001",
    "addedAt": "2025-11-01T14:30:00Z"
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_USER_ID | Invalid user ID format |
| 400 | INVALID_PRODUCT_ID | Invalid product ID format |
| 400 | VALIDATION_ERROR | Missing required fields |
| 404 | PRODUCT_NOT_FOUND | Product does not exist |
| 404 | VARIANT_NOT_FOUND | Specified variant does not exist |
| 409 | ALREADY_IN_WISHLIST | Product already in user's wishlist |
| 500 | ADD_ERROR | Database insert error |

**Implementation Notes:**
- Enforce unique constraint: one entry per (userId, productId, variant combo)
- Allow adding product without variant for general interest
- Support specific variant wishlist for exact item tracking
- Send notification when product goes on sale if in wishlist

---

### 2. Remove from Wishlist

**Endpoint:** `DELETE /wishlist/remove/:wishlist_id`

**Purpose:** Remove an item from user's wishlist

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `wishlist_id` | string | Yes | UUID v4 |

**Request Body:** None

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Product removed from wishlist successfully",
  "data": {
    "wishlistId": "cc0e8400-e29b-41d4-a716-446655440001",
    "productId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_WISHLIST_ID | Invalid UUID format |
| 404 | NOT_FOUND | Wishlist item does not exist |
| 500 | DELETE_ERROR | Database deletion error |

---

### 3. Clear Wishlist

**Endpoint:** `DELETE /wishlist/clear`

**Purpose:** Remove all items from user's wishlist

**Request Body:**
```json
{
  "userId": "user-550e8400-e29b-41d4-a716-446655440000"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Wishlist cleared successfully",
  "data": {
    "userId": "user-550e8400-e29b-41d4-a716-446655440000",
    "itemsRemoved": 15,
    "clearedAt": "2025-11-01T14:45:00Z"
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_USER_ID | Invalid user ID format |
| 404 | USER_NOT_FOUND | User does not exist |
| 500 | CLEAR_ERROR | Database deletion error |

---

### 4. Get Wishlist by User ID

**Endpoint:** `GET /wishlist/:userId`

**Purpose:** Retrieve all wishlist items for a user with product details

**Path Parameters:**
| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| `userId` | string | Yes | UUID v4 |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 20) |
| `sort` | string | No | Sort field (createdAt, price, name) |
| `order` | string | No | Sort order (ASC, DESC) |

**Request Body:** None

**Success Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "wishlistId": "cc0e8400-e29b-41d4-a716-446655440001",
      "product": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Premium Cotton T-Shirt",
        "price": 29.99,
        "salePrice": 24.99,
        "rating": 4.5,
        "image": "https://cdn.example.com/products/tshirt-main.jpg"
      },
      "color": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Black",
        "hexCode": "#000000"
      },
      "variant": {
        "id": "880e8400-e29b-41d4-a716-446655440001",
        "size": "M",
        "price": 29.99,
        "inStock": true
      },
      "addedAt": "2025-11-01T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "pages": 1
  }
}
```

**Error Responses:**
| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | INVALID_USER_ID | Invalid user ID format |
| 404 | USER_NOT_FOUND | User does not exist |
| 500 | QUERY_ERROR | Database query error |

**Implementation Notes:**
- Include product details for display in frontend
- Support sorting and pagination for large wishlists
- Include availability status and pricing
- Consider recommendations based on wishlist
- Email user if product in wishlist goes on sale

---

## Error Handling

### Standard Error Response Format

All error responses follow this structure:

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields failed validation",
    "details": {
      "field": "name",
      "issue": "Must be between 3 and 255 characters"
    }
  },
  "timestamp": "2025-11-01T15:00:00Z"
}
```

### Common HTTP Status Codes

| Status | Meaning | Common Causes |
|--------|---------|---------------|
| 200 | OK | Request successful |
| 201 | Created | Resource successfully created |
| 400 | Bad Request | Invalid parameters, validation failed |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate entries, business logic conflict |
| 413 | Payload Too Large | File or request body too large |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Database or external service down |

### Validation Error Handling

```javascript
// Example validation error response
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "fields": {
      "price": "Must be a positive number",
      "name": "Must be between 3 and 255 characters",
      "hexCode": "Invalid hex color format"
    }
  }
}
```

### Multer Error Handling

The route includes a Multer error handler middleware that catches:

```javascript
router.use(controller.handleMulterError.bind(controller));

// This middleware should handle:
// - LIMIT_PART_COUNT: Too many form fields
// - LIMIT_FILE_SIZE: File size exceeded
// - LIMIT_FILE_COUNT: Too many files
// - LIMIT_FIELD_NAME_SIZE: Field name too long
// - LIMIT_FIELD_SIZE: Field value too long
```

---

## Implementation Guide

### Setting Up the Routes

#### 1. Import and Initialize

```javascript
import { Router } from 'express';
import { ProductsController } from './products.controller';
import { validateId } from '../../middleware/validation.middleware';
import upload, { handleUploadSuccess } from '../../config/multer.config';

export const productsRoutes = (controller: ProductsController): Router => {
  const router = Router();
  // ... rest of routes
  return router;
};
```

#### 2. Dependency Injection

```javascript
// In your main app.ts
import { ProductsController } from './routes/products/products.controller';
import { productsRoutes } from './routes/products/products.routes';

const productsController = new ProductsController(productsService);
const productsRouter = productsRoutes(productsController);

app.use('/api/products', productsRouter);
```

#### 3. Middleware Setup

**validation.middleware.ts:**
```javascript
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4, validate as validateUUID } from 'uuid';

export const validateId = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  
  if (!validateUUID(id)) {
    return res.status(400).json({
      status: 'error',
      error: {
        code: 'INVALID_ID',
        message: 'Invalid UUID format'
      }
    });
  }
  
  next();
};
```

**multer.config.ts:**
```javascript
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 15
  }
});

export const handleUploadSuccess = (req, res, next) => {
  // Middleware to process uploaded files
  if (req.files || req.file) {
    // Files successfully uploaded and validated
    next();
  } else {
    next();
  }
};
```

#### 4. Controller Implementation Pattern

```javascript
export class ProductsController {
  constructor(private productService: ProductService) {}

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, sort = 'createdAt', order = 'DESC' } = req.query;
      
      const products = await this.productService.getAll({
        page: Number(page),
        limit: Number(limit),
        sort: String(sort),
        order: String(order)
      });
      
      res.status(200).json({
        status: 'success',
        data: products.data,
        pagination: products.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const product = await this.productService.getById(id);
      
      if (!product) {
        return res.status(404).json({
          status: 'error',
          error: {
            code: 'NOT_FOUND',
            message: 'Product not found'
          }
        });
      }
      
      res.status(200).json({
        status: 'success',
        data: product
      });
    } catch (error) {
      next(error);
    }
  }

  // ... more methods

  handleMulterError(err, req, res, next) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          status: 'error',
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds 5MB limit'
          }
        });
      }
      
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(429).json({
          status: 'error',
          error: {
            code: 'TOO_MANY_FILES',
            message: 'Maximum 15 files allowed'
          }
        });
      }
    }
    
    next(err);
  }
}
```

### Database Schema Example (Prisma)

```prisma
model Product {
  id        String   @id @default(uuid())
  name      String
  description String
  price     Float
  salePrice Float?
  category  String
  brand     String
  sku       String   @unique
  rating    Float    @default(0)
  reviewCount Int    @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  colors    ProductColor[]
  images    ProductImage[]
  wishlist  Wishlist[]
}

model ProductColor {
  id        String   @id @default(uuid())
  productId String
  name      String
  hexCode   String
  stock     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  images    ColorImage[]
  variants  SizeVariant[]

  @@unique([productId, name])
}

model SizeVariant {
  id        String   @id @default(uuid())
  colorId   String
  size      String
  sku       String   @unique
  quantity  Int
  price     Float
  cost      Float?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  color     ProductColor @relation(fields: [colorId], references: [id], onDelete: Cascade)
  inventoryLogs InventoryLog[]
}

model Wishlist {
  id        String   @id @default(uuid())
  userId    String
  productId String
  colorId   String?
  variantId String?
  addedAt   DateTime @default(now())

  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
}
```

### Testing the API

**Using Thunder Client or Postman:**

```
GET /api/products
Authorization: Bearer YOUR_TOKEN

GET /api/products/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer YOUR_TOKEN

POST /api/products
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "name": "Test Product",
  "description": "Test description",
  "price": 29.99,
  "category": "Apparel",
  "brand": "TestBrand",
  "sku": "TEST-001"
}
```

### Performance Optimization

1. **Database Indexing:**
   - Index on `sku` for quick lookups
   - Index on `productId` for color queries
   - Index on `userId` for wishlist queries

2. **Caching Strategy:**
   - Cache product details (1 hour TTL)
   - Cache color variants (30 minutes TTL)
   - Cache images (24 hours TTL)
   - Invalidate on updates

3. **Query Optimization:**
   - Use select to fetch only needed fields
   - Implement pagination for large datasets
   - Use joins for efficient data retrieval

4. **Image Optimization:**
   - Use CDN for image delivery
   - Implement image compression
   - Generate thumbnails for listings
   - Use WebP format for modern browsers

---

## Summary

This comprehensive API provides a complete solution for product management with support for colors, sizes, images, inventory tracking, and wishlist functionality. The implementation follows RESTful principles, includes proper error handling, and supports scalability through caching and pagination.

Key implementation considerations:
- Always validate UUID format for path parameters
- Implement proper error handling for file uploads
- Maintain inventory consistency through atomic operations
- Keep audit logs for compliance
- Use caching strategically for performance
- Implement webhook notifications for critical events
- Support soft deletes for data preservation
