# 🔔 Notification System - Complete API Reference

**Version:** 1.0.0  
**Base URL:** `http://localhost:3000/api/notifications`  
**Last Updated:** November 1, 2025  
**Protocol:** HTTP/HTTPS  
**Format:** JSON

---

## 📖 Table of Contents

1. [Response Format](#response-format)
2. [Error Codes](#error-codes)
3. [Template Management APIs](#template-management-apis)
4. [Send Notification APIs](#send-notification-apis)
5. [Fetch Notification APIs](#fetch-notification-apis)
6. [Update Notification APIs](#update-notification-apis)
7. [User Preference APIs](#user-preference-apis)
8. [Batch Operation APIs](#batch-operation-apis)
9. [WebSocket Events](#websocket-events)
10. [Data Types & Enums](#data-types--enums)

**Total:** 18 REST APIs + 6 WebSocket Events

---

## Response Format

### Success Response Structure

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "timestamp": "2025-11-01T06:37:00.000Z"
}
```

### Error Response Structure

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "timestamp": "2025-11-01T06:37:00.000Z"
}
```

---

## Error Codes

| HTTP Status | Error Type | Description |
|-------------|------------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters or missing required fields |
| 404 | Not Found | Requested resource does not exist |
| 500 | Internal Server Error | Server-side error occurred |

---

## Template Management APIs

### 1. Create Template

Create a reusable notification template with dynamic placeholders.

**Endpoint:** `POST /templates`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "ORDER_CREATED",
  "title": "Order Confirmed! 🎉",
  "message": "Hi {{user_name}}, your order #{{order_id}} worth ₹{{total_amount}} has been placed.",
  "icon": "🛍️",
  "priority": "HIGH",
  "expiryDays": 90,
  "isActive": true
}
```

**Parameters:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | string | Yes | - | Notification type enum (ORDER_CREATED, ORDER_SHIPPED, etc.) |
| `title` | string | Yes | - | Template title (supports {{placeholders}}) |
| `message` | string | Yes | - | Template message (supports {{placeholders}}) |
| `icon` | string | No | null | Emoji or icon identifier |
| `priority` | string | No | MEDIUM | LOW, MEDIUM, HIGH, URGENT |
| `expiryDays` | number | No | 90 | Days until notification expires |
| `isActive` | boolean | No | true | Enable/disable template |

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Template created",
  "data": {
    "template_id": 1,
    "type": "ORDER_CREATED",
    "title": "Order Confirmed! 🎉",
    "message": "Hi {{user_name}}...",
    "icon": "🛍️",
    "priority": "HIGH",
    "expiryDays": 90,
    "isActive": true,
    "createdAt": "2025-11-01T06:37:00.000Z",
    "updatedAt": "2025-11-01T06:37:00.000Z"
  },
  "timestamp": "2025-11-01T06:37:00.000Z"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/notifications/templates \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ORDER_CREATED",
    "title": "Order Confirmed! 🎉",
    "message": "Your order has been placed.",
    "icon": "🛍️",
    "priority": "HIGH"
  }'
```

**Use Case:** Create reusable templates for order confirmations, shipping updates, payment receipts, etc.

---

### 2. Get All Templates

Retrieve all notification templates, optionally filtered by type.

**Endpoint:** `GET /templates`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | No | Filter templates by notification type |

**Examples:**
```bash
# Get all templates
GET /api/notifications/templates

# Filter by specific type
GET /api/notifications/templates?type=ORDER_CREATED
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Templates fetched",
  "data": [
    {
      "template_id": 1,
      "type": "ORDER_CREATED",
      "title": "Order Confirmed! 🎉",
      "message": "Hi {{user_name}}...",
      "icon": "🛍️",
      "priority": "HIGH",
      "isActive": true,
      "createdAt": "2025-11-01T06:37:00.000Z"
    },
    {
      "template_id": 2,
      "type": "ORDER_SHIPPED",
      "title": "Order Shipped! 📦",
      "message": "Your order is on the way...",
      "icon": "📦",
      "priority": "MEDIUM",
      "isActive": true,
      "createdAt": "2025-11-01T06:40:00.000Z"
    }
  ],
  "timestamp": "2025-11-01T06:37:00.000Z"
}
```

---

### 3. Update Template

Update an existing template's properties.

**Endpoint:** `PUT /templates/:id`

**Path Parameters:**
- `id` (number) - Template ID to update

**Request Body:**
```json
{
  "title": "Order Confirmed Successfully! 🎉",
  "message": "Updated message content",
  "priority": "MEDIUM",
  "isActive": false
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Template updated",
  "data": {
    "template_id": 1,
    "type": "ORDER_CREATED",
    "title": "Order Confirmed Successfully! 🎉",
    "message": "Updated message content",
    "priority": "MEDIUM",
    "isActive": false,
    "updatedAt": "2025-11-01T06:45:00.000Z"
  },
  "timestamp": "2025-11-01T06:45:00.000Z"
}
```

---

### 4. Delete Template

Permanently delete a notification template.

**Endpoint:** `DELETE /templates/:id`

**Path Parameters:**
- `id` (number) - Template ID to delete

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Template deleted",
  "data": null,
  "timestamp": "2025-11-01T06:50:00.000Z"
}
```

---

## Send Notification APIs

### 5. Send to Single User

Send a notification to a specific user. If the user is online (WebSocket connected), they receive it immediately in real-time. Otherwise, it's stored in the database for later retrieval.

**Endpoint:** `POST /send`

**Request Body:**
```json
{
  "user_id": 101,
  "type": "ORDER_CREATED",
  "title": "Order Confirmed! 🎉",
  "message": "Your order #12345 worth ₹2,499 has been placed successfully.",
  "icon": "🛍️",
  "priority": "HIGH",
  "referenceType": "ORDER",
  "referenceId": "12345",
  "actionUrl": "/orders/12345",
  "actionLabel": "View Order",
  "metadata": {
    "order_id": 12345,
    "total_amount": 2499,
    "items_count": 3,
    "customer_name": "Rahul Kumar"
  }
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | number | **Yes** | Target user ID |
| `type` | string | **Yes** | Notification type enum |
| `title` | string | **Yes** | Notification title |
| `message` | string | **Yes** | Notification message |
| `icon` | string | No | Icon/emoji for notification |
| `priority` | string | No | LOW, MEDIUM, HIGH, URGENT (default: MEDIUM) |
| `referenceType` | string | No | ORDER, PRODUCT, PAYMENT, USER, SYSTEM |
| `referenceId` | string | No | Reference entity ID |
| `actionUrl` | string | No | URL for notification action button |
| `actionLabel` | string | No | Button label (e.g., "View Order") |
| `metadata` | object | No | Additional custom JSON data |

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Notification sent",
  "data": {
    "success": true,
    "notification": {
      "notification_id": 501,
      "type": "ORDER_CREATED",
      "priority": "HIGH",
      "status": "ACTIVE",
      "title": "Order Confirmed! 🎉",
      "message": "Your order #12345 worth ₹2,499 has been placed successfully.",
      "icon": "🛍️",
      "referenceType": "ORDER",
      "referenceId": "12345",
      "actionUrl": "/orders/12345",
      "actionLabel": "View Order",
      "metadata": {
        "order_id": 12345,
        "total_amount": 2499,
        "items_count": 3,
        "customer_name": "Rahul Kumar"
      },
      "createdAt": "2025-11-01T06:55:00.000Z",
      "expiresAt": "2026-01-30T06:55:00.000Z"
    }
  },
  "timestamp": "2025-11-01T06:55:00.000Z"
}
```

**Use Cases:**
- Order confirmations
- Payment receipts
- Account updates
- Transaction confirmations
- Personalized alerts

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 101,
    "type": "ORDER_CREATED",
    "title": "Order Confirmed!",
    "message": "Your order has been placed"
  }'
```

---

### 6. Send Bulk Notification

Send the same notification to multiple users simultaneously. Efficient for announcements, promotions, or group alerts.

**Endpoint:** `POST /send-bulk`

**Request Body:**
```json
{
  "user_ids": [101, 102, 103, 104, 105],
  "type": "SALE_ANNOUNCEMENT",
  "title": "Flash Sale Alert! 🔥",
  "message": "Get 50% OFF on all clothing items. Limited time offer! Shop now.",
  "icon": "🔥",
  "priority": "URGENT",
  "actionUrl": "/sale/diwali-2025",
  "actionLabel": "Shop Now",
  "metadata": {
    "sale_name": "Diwali Sale 2025",
    "discount_percentage": 50,
    "start_date": "2025-10-25",
    "end_date": "2025-10-30"
  }
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_ids` | number[] | **Yes** | Array of target user IDs |
| `type` | string | **Yes** | Notification type |
| `title` | string | **Yes** | Notification title |
| `message` | string | **Yes** | Notification message |
| Other fields | - | No | Same as single send API |

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Bulk notification sent",
  "data": {
    "success": true,
    "batch_id": 10
  },
  "timestamp": "2025-11-01T07:00:00.000Z"
}
```

**Use Cases:**
- Flash sales to VIP customers
- Event reminders to attendees
- Group announcements
- Promotional campaigns

---

### 7. Broadcast to All Users

Send notification to ALL active users in the system. Use carefully for important system-wide announcements.

**Endpoint:** `POST /send-all`

**Request Body:**
```json
{
  "type": "SYSTEM_ALERT",
  "title": "System Maintenance Notice ⚠️",
  "message": "Our system will be under maintenance on Oct 25 from 2 AM to 4 AM IST. Services will be temporarily unavailable.",
  "icon": "⚠️",
  "priority": "HIGH",
  "actionUrl": "/maintenance-info",
  "actionLabel": "Learn More",
  "metadata": {
    "maintenance_date": "2025-10-25",
    "start_time": "02:00",
    "end_time": "04:00",
    "timezone": "IST"
  }
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Broadcast sent",
  "data": {
    "success": true,
    "batch_id": 11
  },
  "timestamp": "2025-11-01T07:05:00.000Z"
}
```

**Use Cases:**
- System maintenance notices
- Emergency alerts
- New feature announcements
- Terms of service updates

---

## Fetch Notification APIs

### 8. Get User Notifications

Fetch paginated list of notifications for a specific user with filtering options.

**Endpoint:** `GET /user`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `user_id` | number | **Yes** | - | User ID |
| `limit` | number | No | 20 | Results per page (max: 100) |
| `offset` | number | No | 0 | Pagination offset |
| `isRead` | boolean | No | - | Filter by read status (true/false) |
| `type` | string | No | - | Filter by notification type |

**Examples:**
```bash
# Get all notifications
GET /api/notifications/user?user_id=101

# Get only unread
GET /api/notifications/user?user_id=101&isRead=false

# Get specific type
GET /api/notifications/user?user_id=101&type=ORDER_CREATED

# Pagination
GET /api/notifications/user?user_id=101&limit=10&offset=20

# Combined filters
GET /api/notifications/user?user_id=101&isRead=false&type=ORDER_CREATED&limit=20
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Notifications fetched successfully",
  "data": {
    "notifications": [
      {
        "notification_id": 501,
        "type": "ORDER_CREATED",
        "priority": "HIGH",
        "status": "ACTIVE",
        "title": "Order Confirmed! 🎉",
        "message": "Your order #12345 has been placed successfully.",
        "icon": "🛍️",
        "referenceType": "ORDER",
        "referenceId": "12345",
        "actionUrl": "/orders/12345",
        "actionLabel": "View Order",
        "metadata": {
          "order_id": 12345,
          "total_amount": 2499
        },
        "isRead": false,
        "readAt": null,
        "createdAt": "2025-11-01T06:55:00.000Z"
      },
      {
        "notification_id": 502,
        "type": "ORDER_SHIPPED",
        "priority": "MEDIUM",
        "status": "ACTIVE",
        "title": "Order Shipped! 📦",
        "message": "Your order is on the way.",
        "icon": "📦",
        "actionUrl": "/orders/12345/track",
        "isRead": true,
        "readAt": "2025-11-01T08:30:00.000Z",
        "createdAt": "2025-11-01T07:00:00.000Z"
      }
    ],
    "total": 150,
    "unreadCount": 5,
    "hasMore": true
  },
  "timestamp": "2025-11-01T09:00:00.000Z"
}
```

**Use Case:** Display notifications in a dropdown or notifications page with infinite scroll.

---

### 9. Get Unread Count

Quickly fetch the number of unread notifications for displaying a badge. Lightweight - only returns count, not full data.

**Endpoint:** `GET /user/unread-count`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | number | **Yes** | User ID |

**Example:**
```bash
GET /api/notifications/user/unread-count?user_id=101
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Unread count fetched successfully",
  "data": {
    "unreadCount": 5
  },
  "timestamp": "2025-11-01T09:05:00.000Z"
}
```

**Use Case:** Display notification badge count on bell icon without loading full notification list.

**Frontend Example:**
```javascript
async function updateBadge() {
  const res = await fetch('/api/notifications/user/unread-count?user_id=1');
  const data = await res.json();
  
  const badge = document.getElementById('badge');
  if (data.data.unreadCount > 0) {
    badge.textContent = data.data.unreadCount;
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
}
```

---

### 10. Get Notification Stats

Get comprehensive statistics about user's notifications including total count, last notification time, etc.

**Endpoint:** `GET /user/stats`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | number | **Yes** | User ID |

**Example:**
```bash
GET /api/notifications/user/stats?user_id=101
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Stats fetched successfully",
  "data": {
    "stats_id": 1,
    "user_id": 101,
    "unreadCount": 5,
    "totalCount": 243,
    "lastNotificationAt": "2025-11-01T06:55:00.000Z",
    "lastReadAt": "2025-10-31T15:30:00.000Z",
    "updatedAt": "2025-11-01T06:55:00.000Z"
  },
  "timestamp": "2025-11-01T09:10:00.000Z"
}
```

**Use Case:** Display notification statistics in user dashboard or analytics page.

---

## Update Notification APIs

### 11. Mark Single as Read

Mark a specific notification as read.

**Endpoint:** `PATCH /user/:id/read`

**Path Parameters:**
- `id` (number) - Notification ID to mark as read

**Request Body:**
```json
{
  "user_id": 101
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Marked as read",
  "data": {
    "success": true
  },
  "timestamp": "2025-11-01T09:15:00.000Z"
}
```

**Use Case:** User clicks on a notification in the list to view details.

**cURL Example:**
```bash
curl -X PATCH http://localhost:3000/api/notifications/user/501/read \
  -H "Content-Type: application/json" \
  -d '{"user_id": 101}'
```

---

### 12. Mark All as Read

Mark all unread notifications as read for a user.

**Endpoint:** `PATCH /user/read-all`

**Request Body:**
```json
{
  "user_id": 101
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "All marked as read",
  "data": {
    "success": true,
    "updatedCount": 5
  },
  "timestamp": "2025-11-01T09:20:00.000Z"
}
```

**Use Case:** "Mark all as read" button in notifications dropdown.

---

### 13. Delete Notification

Soft delete a notification (marks as deleted, doesn't remove from database).

**Endpoint:** `DELETE /user/:id`

**Path Parameters:**
- `id` (number) - Notification ID to delete

**Request Body:**
```json
{
  "user_id": 101
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Notification deleted",
  "data": {
    "success": true
  },
  "timestamp": "2025-11-01T09:25:00.000Z"
}
```

**Use Case:** User deletes individual notification from list.

---

### 14. Clear All Read Notifications

Bulk delete all read notifications for a user.

**Endpoint:** `DELETE /user/clear-read`

**Request Body:**
```json
{
  "user_id": 101
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Read notifications cleared",
  "data": {
    "success": true,
    "deletedCount": 120
  },
  "timestamp": "2025-11-01T09:30:00.000Z"
}
```

**Use Case:** "Clear all" button to remove old read notifications and clean up the list.

---

## User Preference APIs

### 15. Get User Preferences

Retrieve user's notification preferences including enabled types and quiet hours.

**Endpoint:** `GET /preferences`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | number | **Yes** | User ID |

**Example:**
```bash
GET /api/notifications/preferences?user_id=101
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Preferences fetched successfully",
  "data": {
    "preference_id": 1,
    "user_id": 101,
    "enabled": true,
    "typePreferences": {
      "ORDER_CREATED": true,
      "ORDER_SHIPPED": true,
      "ORDER_DELIVERED": true,
      "PAYMENT_SUCCESS": true,
      "PAYMENT_FAILED": true,
      "PROMOTIONAL": false,
      "SALE_ANNOUNCEMENT": false,
      "PRODUCT_BACK_IN_STOCK": true,
      "SYSTEM_ALERT": true
    },
    "maxPerDay": 20,
    "quietHoursEnabled": true,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "08:00",
    "timezone": "Asia/Kolkata",
    "createdAt": "2025-10-01T10:00:00.000Z",
    "updatedAt": "2025-11-01T06:00:00.000Z"
  },
  "timestamp": "2025-11-01T09:35:00.000Z"
}
```

**Use Case:** Display user's notification settings page.

---

### 16. Update User Preferences

Update user's notification preferences.

**Endpoint:** `PUT /preferences`

**Request Body:**
```json
{
  "user_id": 101,
  "enabled": true,
  "typePreferences": {
    "ORDER_CREATED": true,
    "ORDER_SHIPPED": true,
    "ORDER_DELIVERED": true,
    "PAYMENT_SUCCESS": true,
    "PAYMENT_FAILED": true,
    "PROMOTIONAL": false,
    "SALE_ANNOUNCEMENT": true,
    "PRODUCT_BACK_IN_STOCK": true,
    "SYSTEM_ALERT": true
  },
  "maxPerDay": 15,
  "quietHoursEnabled": true,
  "quietHoursStart": "23:00",
  "quietHoursEnd": "07:00",
  "timezone": "Asia/Kolkata"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | number | **Yes** | User ID |
| `enabled` | boolean | No | Enable/disable all notifications |
| `typePreferences` | object | No | Enable/disable specific notification types |
| `maxPerDay` | number | No | Maximum notifications per day |
| `quietHoursEnabled` | boolean | No | Enable/disable quiet hours |
| `quietHoursStart` | string | No | Quiet hours start time (HH:MM format) |
| `quietHoursEnd` | string | No | Quiet hours end time (HH:MM format) |
| `timezone` | string | No | User's timezone |

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Preferences updated",
  "data": {
    "preference_id": 1,
    "user_id": 101,
    "enabled": true,
    "typePreferences": {
      "ORDER_CREATED": true,
      "PROMOTIONAL": false,
      "SALE_ANNOUNCEMENT": true
    },
    "maxPerDay": 15,
    "quietHoursEnabled": true,
    "quietHoursStart": "23:00",
    "quietHoursEnd": "07:00",
    "timezone": "Asia/Kolkata",
    "updatedAt": "2025-11-01T09:40:00.000Z"
  },
  "timestamp": "2025-11-01T09:40:00.000Z"
}
```

**Use Case:** User updates notification settings from settings page.

---

### 17. Toggle Notification Type

Enable/disable a specific notification type for a user.

**Endpoint:** `PATCH /preferences/toggle`

**Request Body:**
```json
{
  "user_id": 101,
  "type": "PROMOTIONAL",
  "enabled": false
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | number | **Yes** | User ID |
| `type` | string | **Yes** | Notification type to toggle |
| `enabled` | boolean | **Yes** | Enable or disable the type |

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Type toggled",
  "data": {
    "preference_id": 1,
    "user_id": 101,
    "typePreferences": {
      "ORDER_CREATED": true,
      "PROMOTIONAL": false,
      "SALE_ANNOUNCEMENT": true
    },
    "updatedAt": "2025-11-01T09:45:00.000Z"
  },
  "timestamp": "2025-11-01T09:45:00.000Z"
}
```

**Use Case:** User wants to quickly mute/unmute promotional notifications.

---

## Batch Operation APIs

### 18. Get Batch Status

Check the status and progress of a bulk notification batch.

**Endpoint:** `GET /batches/:id`

**Path Parameters:**
- `id` (number) - Batch ID

**Example:**
```bash
GET /api/notifications/batches/10
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Batch status fetched",
  "data": {
    "batch_id": 10,
    "notification_id": 502,
    "targetType": "SPECIFIC_USERS",
    "totalUsers": 10000,
    "processedUsers": 7345,
    "successCount": 7300,
    "failedCount": 45,
    "status": "PROCESSING",
    "progress": "73.45",
    "createdAt": "2025-11-01T06:25:00.000Z",
    "startedAt": "2025-11-01T06:25:30.000Z",
    "completedAt": null,
    "notification": {
      "notification_id": 502,
      "type": "SALE_ANNOUNCEMENT",
      "title": "Flash Sale Alert! 🔥",
      "message": "Get 50% OFF on all clothing items...",
      "priority": "URGENT"
    }
  },
  "timestamp": "2025-11-01T09:50:00.000Z"
}
```

**Batch Status Values:**
- `PENDING` - Batch created, not yet started
- `PROCESSING` - Currently sending notifications
- `COMPLETED` - All notifications sent successfully
- `FAILED` - Batch processing failed

**Use Case:** Monitor progress of bulk notification sending in admin dashboard.

---

## WebSocket Events

### Connection Setup

**WebSocket URL:** `ws://localhost:3000/socket.io/`

**Connection Protocol:** Socket.IO (includes automatic reconnection, heartbeat, etc.)

### Client-Side Setup

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  path: '/socket.io',
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  
  // REQUIRED: Join with user_id
  socket.emit('join', 101);
});
```

### WebSocket Events Reference

| Event Name | Direction | Trigger | Data Format |
|------------|-----------|---------|-------------|
| `join` | Client → Server | User connects | `userId: number` |
| `notification:new` | Server → Client | New notification | `notification object` |
| `notification:count` | Server → Client | Unread count update | `{ unreadCount: number }` |
| `notification:read` | Client → Server | Mark as read | `notificationId: number` |
| `notification:read:success` | Server → Client | Read successful | `{ notificationId, unreadCount }` |
| `notification:read-all` | Client → Server | Mark all as read | - |
| `notification:read-all:success` | Server → Client | All read successful | `{ unreadCount }` |
| `notification:delete` | Client → Server | Delete notification | `notificationId: number` |
| `notification:delete:success` | Server → Client | Delete successful | `{ notificationId }` |
| `notification:error` | Server → Client | Error occurred | `{ message: string }` |
| `disconnect` | Both | Connection lost | - |

### Event Details

#### 1. Join Event

**Direction:** Client → Server  
**Purpose:** Register user for receiving notifications

**Client Emits:**
```javascript
socket.emit('join', 101); // user_id = 101
```

**Server Response:**
```javascript
// Sends initial unread count
socket.on('notification:count', ({ unreadCount }) => {
  console.log('Unread count:', unreadCount);
});

// Sends all missed notifications (if any)
socket.on('notification:new', (notification) => {
  console.log('Missed notification:', notification);
});
```

---

#### 2. New Notification Event

**Direction:** Server → Client  
**Purpose:** Receive new notification in real-time

**Client Listens:**
```javascript
socket.on('notification:new', (notification) => {
  console.log('New notification:', notification);
  
  // Show toast notification
  showToast(notification.title, notification.message);
  
  // Add to notification list
  addToNotificationList(notification);
  
  // Show browser notification
  if (Notification.permission === 'granted') {
    new Notification(notification.title, {
      body: notification.message,
      icon: notification.icon || '/logo.png',
      badge: '/badge.png'
    });
  }
});
```

**Notification Object:**
```javascript
{
  notification_id: 501,
  type: "ORDER_CREATED",
  priority: "HIGH",
  title: "Order Confirmed! 🎉",
  message: "Your order has been placed",
  icon: "🛍️",
  actionUrl: "/orders/12345",
  actionLabel: "View Order",
  isRead: false,
  createdAt: "2025-11-01T06:55:00.000Z"
}
```

---

#### 3. Unread Count Event

**Direction:** Server → Client  
**Purpose:** Update notification badge count

**Client Listens:**
```javascript
socket.on('notification:count', ({ unreadCount }) => {
  console.log('Unread count:', unreadCount);
  
  // Update badge
  const badge = document.getElementById('notification-badge');
  if (unreadCount > 0) {
    badge.textContent = unreadCount;
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
});
```

---

#### 4. Mark as Read Event

**Direction:** Client → Server  
**Purpose:** Mark specific notification as read

**Client Emits:**
```javascript
const notificationId = 501;
socket.emit('notification:read', notificationId);
```

**Client Listens for Success:**
```javascript
socket.on('notification:read:success', ({ notificationId, unreadCount }) => {
  console.log(`Notification ${notificationId} marked as read`);
  console.log(`New unread count: ${unreadCount}`);
  
  // Update UI
  updateNotificationStatus(notificationId, true);
  updateBadge(unreadCount);
});
```

---

#### 5. Mark All as Read Event

**Direction:** Client → Server  
**Purpose:** Mark all notifications as read

**Client Emits:**
```javascript
socket.emit('notification:read-all');
```

**Client Listens for Success:**
```javascript
socket.on('notification:read-all:success', ({ unreadCount }) => {
  console.log('All notifications marked as read');
  console.log(`Unread count: ${unreadCount}`);
  
  // Update UI - mark all as read
  markAllNotificationsRead();
  updateBadge(0);
});
```

---

#### 6. Delete Notification Event

**Direction:** Client → Server  
**Purpose:** Delete specific notification

**Client Emits:**
```javascript
const notificationId = 501;
socket.emit('notification:delete', notificationId);
```

**Client Listens for Success:**
```javascript
socket.on('notification:delete:success', ({ notificationId }) => {
  console.log(`Notification ${notificationId} deleted`);
  
  // Remove from UI
  removeNotificationFromList(notificationId);
});
```

---

#### 7. Error Event

**Direction:** Server → Client  
**Purpose:** Notify client of errors

**Client Listens:**
```javascript
socket.on('notification:error', ({ message }) => {
  console.error('Notification error:', message);
  
  // Show error message to user
  showErrorToast(message);
});
```

---

#### 8. Disconnect Event

**Direction:** Both  
**Purpose:** Handle connection loss

**Client Listens:**
```javascript
socket.on('disconnect', () => {
  console.log('Disconnected from notification server');
  
  // Show offline indicator
  showOfflineStatus();
});
```

---

### Complete Frontend Example

```javascript
import io from 'socket.io-client';

class NotificationService {
  constructor(userId) {
    this.userId = userId;
    this.socket = null;
    this.notifications = [];
    this.unreadCount = 0;
  }

  connect() {
    this.socket = io('http://localhost:3000', {
      path: '/socket.io',
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to notification server');
      this.socket.emit('join', this.userId);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from notification server');
    });

    this.socket.on('notification:new', (notification) => {
      this.handleNewNotification(notification);
    });

    this.socket.on('notification:count', ({ unreadCount }) => {
      this.unreadCount = unreadCount;
      this.updateBadge(unreadCount);
    });

    this.socket.on('notification:read:success', ({ notificationId, unreadCount }) => {
      this.markNotificationAsRead(notificationId);
      this.unreadCount = unreadCount;
      this.updateBadge(unreadCount);
    });

    this.socket.on('notification:read-all:success', ({ unreadCount }) => {
      this.markAllAsRead();
      this.unreadCount = unreadCount;
      this.updateBadge(unreadCount);
    });

    this.socket.on('notification:delete:success', ({ notificationId }) => {
      this.removeNotification(notificationId);
    });

    this.socket.on('notification:error', ({ message }) => {
      console.error('Error:', message);
      this.showError(message);
    });
  }

  handleNewNotification(notification) {
    console.log('🔔 New notification:', notification);
    
    // Add to list
    this.notifications.unshift(notification);
    
    // Show browser notification
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: notification.icon || '/logo.png'
      });
    }
    
    // Show toast
    this.showToast(notification);
    
    // Trigger callback
    if (this.onNewNotification) {
      this.onNewNotification(notification);
    }
  }

  markAsRead(notificationId) {
    this.socket.emit('notification:read', notificationId);
  }

  markAllAsRead() {
    this.socket.emit('notification:read-all');
  }

  deleteNotification(notificationId) {
    this.socket.emit('notification:delete', notificationId);
  }

  markNotificationAsRead(notificationId) {
    const notification = this.notifications.find(n => n.notification_id === notificationId);
    if (notification) {
      notification.isRead = true;
      notification.readAt = new Date().toISOString();
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => {
      n.isRead = true;
      n.readAt = new Date().toISOString();
    });
  }

  removeNotification(notificationId) {
    this.notifications = this.notifications.filter(n => n.notification_id !== notificationId);
  }

  updateBadge(count) {
    const badge = document.getElementById('notification-badge');
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }

  showToast(notification) {
    // Implement your toast notification here
    console.log('Toast:', notification.title);
  }

  showError(message) {
    // Implement error display
    console.error('Error:', message);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Usage
const notificationService = new NotificationService(101);
notificationService.connect();

// Set callback for new notifications
notificationService.onNewNotification = (notification) => {
  console.log('Received new notification:', notification);
  // Update your UI here
};
```

---

## Data Types & Enums

### Notification Types

```typescript
enum NotificationType {
  USER_REGISTER = "USER_REGISTER",
  ORDER_CREATED = "ORDER_CREATED",
  ORDER_SHIPPED = "ORDER_SHIPPED",
  ORDER_DELIVERED = "ORDER_DELIVERED",
  PAYMENT_SUCCESS = "PAYMENT_SUCCESS",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  PRODUCT_BACK_IN_STOCK = "PRODUCT_BACK_IN_STOCK",
  SALE_ANNOUNCEMENT = "SALE_ANNOUNCEMENT",
  SYSTEM_ALERT = "SYSTEM_ALERT"
}
```

### Priority Levels

```typescript
enum NotificationPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT"
}
```

### Status Types

```typescript
enum NotificationStatus {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
  EXPIRED = "EXPIRED"
}
```

### Reference Types

```typescript
enum ReferenceType {
  ORDER = "ORDER",
  PRODUCT = "PRODUCT",
  PAYMENT = "PAYMENT",
  USER = "USER",
  SYSTEM = "SYSTEM"
}
```

### Batch Status

```typescript
enum BatchStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED"
}
```

---

## Quick Reference

### API Endpoints Summary

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | POST | `/templates` | Create template |
| 2 | GET | `/templates` | Get all templates |
| 3 | PUT | `/templates/:id` | Update template |
| 4 | DELETE | `/templates/:id` | Delete template |
| 5 | POST | `/send` | Send to single user |
| 6 | POST | `/send-bulk` | Send to multiple users |
| 7 | POST | `/send-all` | Broadcast to all users |
| 8 | GET | `/user` | Get user notifications |
| 9 | GET | `/user/unread-count` | Get unread count |
| 10 | GET | `/user/stats` | Get notification stats |
| 11 | PATCH | `/user/:id/read` | Mark as read |
| 12 | PATCH | `/user/read-all` | Mark all as read |
| 13 | DELETE | `/user/:id` | Delete notification |
| 14 | DELETE | `/user/clear-read` | Clear all read |
| 15 | GET | `/preferences` | Get preferences |
| 16 | PUT | `/preferences` | Update preferences |
| 17 | PATCH | `/preferences/toggle` | Toggle notification type |
| 18 | GET | `/batches/:id` | Get batch status |

### WebSocket Events Summary

| Event | Direction | Purpose |
|-------|-----------|---------|
| `join` | Client → Server | Register user |
| `notification:new` | Server → Client | New notification |
| `notification:count` | Server → Client | Unread count update |
| `notification:read` | Client → Server | Mark as read |
| `notification:read-all` | Client → Server | Mark all as read |
| `notification:delete` | Client → Server | Delete notification |

---

## Testing Examples

### cURL Examples

```bash
# 1. Create template
curl -X POST http://localhost:3000/api/notifications/templates \
  -H "Content-Type: application/json" \
  -d '{"type":"ORDER_CREATED","title":"Order Confirmed","message":"Your order placed"}'

# 2. Send notification
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"type":"ORDER_CREATED","title":"Test","message":"Testing"}'

# 3. Get notifications
curl "http://localhost:3000/api/notifications/user?user_id=1"

# 4. Get unread count
curl "http://localhost:3000/api/notifications/user/unread-count?user_id=1"

# 5. Mark as read
curl -X PATCH http://localhost:3000/api/notifications/user/501/read \
  -H "Content-Type: application/json" \
  -d '{"user_id":1}'

# 6. Mark all as read
curl -X PATCH http://localhost:3000/api/notifications/user/read-all \
  -H "Content-Type: application/json" \
  -d '{"user_id":1}'

# 7. Update preferences
curl -X PUT http://localhost:3000/api/notifications/preferences \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"enabled":true,"typePreferences":{"PROMOTIONAL":false}}'

# 8. Get batch status
curl "http://localhost:3000/api/notifications/batches/10"
```

### JavaScript/Fetch Examples

```javascript
// Send notification
async function sendNotification() {
  const response = await fetch('http://localhost:3000/api/notifications/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: 101,
      type: 'ORDER_CREATED',
      title: 'Order Confirmed!',
      message: 'Your order has been placed'
    })
  });
  const data = await response.json();
  console.log(data);
}

// Get notifications
async function getNotifications(userId) {
  const response = await fetch(`http://localhost:3000/api/notifications/user?user_id=${userId}`);
  const data = await response.json();
  console.log(data.data.notifications);
}

// Get unread count
async function getUnreadCount(userId) {
  const response = await fetch(`http://localhost:3000/api/notifications/user/unread-count?user_id=${userId}`);
  const data = await response.json();
  console.log('Unread:', data.data.unreadCount);
}
```

---

## Production Recommendations

### Security

1. **Implement Authentication:**
   - Add JWT or OAuth 2.0
   - Validate user ownership of notifications
   - Rate limiting per user

2. **Input Validation:**
   - Validate all request parameters
   - Sanitize user inputs
   - Prevent SQL injection

3. **HTTPS:**
   - Use SSL/TLS certificates
   - Enforce HTTPS in production

### Performance

1. **Database Optimization:**
   - Add proper indexes
   - Use connection pooling
   - Implement query optimization

2. **Caching:**
   - Cache frequent queries
   - Use Redis for session storage
   - Implement CDN for assets

3. **Scalability:**
   - Use Redis cluster for Pub/Sub
   - Implement horizontal scaling
   - Load balancing for WebSocket connections

### Monitoring

1. **Logging:**
   - Centralized logging (Winston, Sentry)
   - Track API performance
   - Monitor error rates

2. **Analytics:**
   - Track notification delivery rates
   - Monitor user engagement
   - Analyze notification effectiveness

3. **Alerting:**
   - Set up alerts for failures
   - Monitor server health
   - Track Redis/Database performance

---

## Support & Contact

**Documentation:** https://docs.yourapp.com  
**GitHub:** https://github.com/yourusername/notification-system  
**Email:** support@yourapp.com  
**Issues:** https://github.com/yourusername/notification-system/issues

---

**Last Updated:** November 1, 2025  
**Version:** 1.0.0  
**License:** MIT

---

**Built with ❤️ for developers**