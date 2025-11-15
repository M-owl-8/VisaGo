# VisaBuddy API Documentation

Complete API reference for the VisaBuddy backend service.

**Base URL:** `http://localhost:3000/api` (development)  
**Version:** 1.0.0  
**Authentication:** JWT Bearer Token (for protected routes)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Applications](#applications)
4. [Documents](#documents)
5. [Chat](#chat)
6. [Payments](#payments)
7. [Countries](#countries)
8. [Forms](#forms)
9. [Notifications](#notifications)
10. [Health & Monitoring](#health--monitoring)
11. [Admin](#admin)
12. [Error Handling](#error-handling)

---

## Authentication

### POST /api/auth/register

Register a new user account.

**Access:** Public

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

**Errors:**
- `400` - Validation error (invalid email, weak password)
- `409` - Email already exists

---

### POST /api/auth/login

Login with email and password.

**Access:** Public

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

**Errors:**
- `401` - Invalid credentials
- `400` - Validation error

---

### POST /api/auth/google

Authenticate with Google OAuth.

**Access:** Public

**Request Body:**
```json
{
  "googleId": "123456789",
  "email": "user@gmail.com",
  "firstName": "John",
  "lastName": "Doe",
  "avatar": "https://..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-id",
      "email": "user@gmail.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

**Errors:**
- `400` - Invalid Google ID or email
- `403` - Email already associated with different Google account
- `503` - Google OAuth not configured

---

### POST /api/auth/refresh

Refresh authentication token.

**Access:** Protected

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "message": "Token refreshed successfully"
  }
}
```

**Errors:**
- `401` - Invalid or expired token

---

### POST /api/auth/logout

Logout current user (invalidates token on client side).

**Access:** Protected

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### GET /api/auth/status

Get authentication configuration status.

**Access:** Public

**Response (200):**
```json
{
  "success": true,
  "data": {
    "emailPassword": {
      "enabled": true,
      "configured": true
    },
    "googleOAuth": {
      "enabled": true,
      "configured": true,
      "clientId": "1234567890..."
    },
    "jwt": {
      "configured": true,
      "secretLength": 32
    }
  }
}
```

---

## Users

### GET /api/users/me

Get current authenticated user profile.

**Access:** Protected

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "avatar": "https://...",
    "language": "en",
    "timezone": "UTC",
    "currency": "USD",
    "emailVerified": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "preferences": {
      "notificationsEnabled": true,
      "emailNotifications": true,
      "pushNotifications": true,
      "twoFactorEnabled": false
    }
  }
}
```

---

### PATCH /api/users/:userId

Update user profile.

**Access:** Protected (own profile only)

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1234567890",
  "avatar": "https://...",
  "language": "ru",
  "timezone": "Europe/Moscow",
  "currency": "RUB"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    ...
  },
  "message": "Profile updated successfully"
}
```

**Errors:**
- `403` - Cannot update other user's profile
- `422` - Invalid language (must be: en, ru, uz)

---

### GET /api/users/:userId/applications

Get all visa applications for a user.

**Access:** Protected (own applications only)

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "app-id",
      "country": {
        "id": "country-id",
        "name": "Spain",
        "code": "ES",
        "flagEmoji": "🇪🇸"
      },
      "visaType": {
        "id": "visa-type-id",
        "name": "Tourist Visa",
        "fee": 100,
        "processingDays": 15,
        "validity": 90
      },
      "status": "pending",
      "payment": {
        "id": "payment-id",
        "amount": 100,
        "status": "completed",
        "paymentMethod": "payme"
      },
      "documents": [...],
      "checkpoints": [...]
    }
  ],
  "count": 1
}
```

---

### GET /api/users/:userId/payments

Get payment history for a user.

**Access:** Protected (own payments only)

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "payment-id",
      "amount": 100,
      "status": "completed",
      "paymentMethod": "payme",
      "transactionId": "txn-123",
      "paidAt": "2024-01-01T00:00:00Z",
      "application": {
        "id": "app-id",
        "country": {
          "name": "Spain",
          "flagEmoji": "🇪🇸"
        },
        "visaType": {
          "name": "Tourist Visa"
        }
      }
    }
  ],
  "count": 1
}
```

---

### PATCH /api/users/:userId/preferences

Update user preferences.

**Access:** Protected (own preferences only)

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "notificationsEnabled": true,
  "emailNotifications": true,
  "pushNotifications": false,
  "twoFactorEnabled": true,
  "language": "ru"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "notificationsEnabled": true,
    "emailNotifications": true,
    "pushNotifications": false,
    "twoFactorEnabled": true
  },
  "message": "Preferences updated successfully"
}
```

---

## Applications

### GET /api/applications

Get all applications for logged-in user.

**Access:** Protected

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "app-id",
      "countryId": "country-id",
      "visaTypeId": "visa-type-id",
      "status": "pending",
      "notes": "Application notes",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

---

### GET /api/applications/:id

Get single application by ID.

**Access:** Protected (own application only)

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "app-id",
    "countryId": "country-id",
    "visaTypeId": "visa-type-id",
    "status": "pending",
    "notes": "Application notes",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Errors:**
- `404` - Application not found or access denied

---

### POST /api/applications

Create new visa application.

**Access:** Protected

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "countryId": "country-id",
  "visaTypeId": "visa-type-id",
  "notes": "Optional application notes"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "app-id",
    "countryId": "country-id",
    "visaTypeId": "visa-type-id",
    "status": "pending",
    "notes": "Optional application notes",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### PUT /api/applications/:id/status

Update application status.

**Access:** Protected (own application only)

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "in_progress"
}
```

**Valid Statuses:** `pending`, `in_progress`, `submitted`, `approved`, `rejected`, `cancelled`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "app-id",
    "status": "in_progress",
    ...
  }
}
```

---

### PUT /api/applications/:id/checkpoints/:checkpointId

Update checkpoint status.

**Access:** Protected (own application only)

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "completed"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "checkpoint-id",
    "title": "Submit Documents",
    "isCompleted": true,
    "dueDate": "2024-01-15T00:00:00Z"
  }
}
```

---

## Documents

### POST /api/documents/upload

Upload a document for a visa application.

**Access:** Protected

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file` (File) - Document file (PDF, JPG, PNG, DOC, DOCX, max 20MB)
- `applicationId` (string) - Application ID
- `documentType` (string) - Document type (passport, photo, etc.)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "doc-id",
    "documentName": "passport.pdf",
    "documentType": "passport",
    "status": "pending",
    "url": "https://...",
    "uploadedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Errors:**
- `400` - Missing required fields or invalid file type
- `404` - Application not found or access denied

---

### GET /api/documents

Get all documents for logged-in user.

**Access:** Protected

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `applicationId` (optional) - Filter by application ID

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "doc-id",
      "documentName": "passport.pdf",
      "documentType": "passport",
      "status": "approved",
      "url": "https://...",
      "applicationId": "app-id",
      "uploadedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

---

### GET /api/documents/:id

Get single document by ID.

**Access:** Protected (own document only)

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "doc-id",
    "documentName": "passport.pdf",
    "documentType": "passport",
    "status": "approved",
    "url": "https://...",
    "applicationId": "app-id",
    "uploadedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### DELETE /api/documents/:id

Delete a document.

**Access:** Protected (own document only)

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

---

## Chat

### POST /api/chat

Send a message to the AI assistant.

**Access:** Protected

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "query": "What documents do I need for a Spain tourist visa?",
  "applicationId": "app-id",
  "conversationHistory": []
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "sessionId": "session-id",
    "messageId": "message-id",
    "response": "For a Spain tourist visa, you need...",
    "timestamp": "2024-01-01T00:00:00Z"
  },
  "quota": {
    "messagesUsed": 5,
    "messagesRemaining": 45,
    "limit": 50,
    "resetTime": "2024-01-02T00:00:00Z"
  }
}
```

**Rate Limit:** 50 messages per day per user

**Errors:**
- `400` - Message content is required
- `429` - Rate limit exceeded
- `503` - AI service unavailable

---

### GET /api/chat/sessions

Get all chat sessions for logged-in user.

**Access:** Protected

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `applicationId` (optional) - Filter by application ID

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "session-id",
      "applicationId": "app-id",
      "messageCount": 5,
      "lastMessageAt": "2024-01-01T00:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

---

### GET /api/chat/sessions/:sessionId/messages

Get messages for a chat session.

**Access:** Protected (own session only)

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "message-id",
      "role": "user",
      "content": "What documents do I need?",
      "timestamp": "2024-01-01T00:00:00Z"
    },
    {
      "id": "response-id",
      "role": "assistant",
      "content": "For a Spain tourist visa...",
      "timestamp": "2024-01-01T00:00:01Z"
    }
  ],
  "count": 2
}
```

---

## Payments

### GET /api/payments/methods

Get available payment methods.

**Access:** Public

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "payme",
      "name": "Payme",
      "enabled": true,
      "icon": "https://..."
    },
    {
      "id": "click",
      "name": "Click",
      "enabled": true,
      "icon": "https://..."
    }
  ]
}
```

---

### POST /api/payments/initiate

Initiate a payment for a visa application.

**Access:** Protected

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "applicationId": "app-id",
  "returnUrl": "https://app.example.com/payment/callback",
  "paymentMethod": "payme"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "paymentId": "payment-id",
    "amount": 100,
    "paymentUrl": "https://checkout.payme.uz/...",
    "transactionId": "txn-123"
  }
}
```

---

### GET /api/payments/:paymentId/status

Get payment status.

**Access:** Protected (own payment only)

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "payment-id",
    "status": "completed",
    "amount": 100,
    "paymentMethod": "payme",
    "transactionId": "txn-123",
    "paidAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### POST /api/payments/webhook/:gateway

Webhook endpoint for payment gateway callbacks.

**Access:** Public (validated by gateway signature)

**Note:** This endpoint is called by payment gateways, not by clients.

---

## Countries

### GET /api/countries

Get all countries.

**Access:** Public

**Query Parameters:**
- `search` (optional) - Search by country name

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "country-id",
      "name": "Spain",
      "code": "ES",
      "flagEmoji": "🇪🇸"
    }
  ],
  "count": 1
}
```

---

### GET /api/countries/popular

Get popular countries (top 10).

**Access:** Public

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "country-id",
      "name": "Spain",
      "code": "ES",
      "flagEmoji": "🇪🇸",
      "applicationCount": 150
    }
  ]
}
```

---

### GET /api/countries/:id

Get country by ID.

**Access:** Public

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "country-id",
    "name": "Spain",
    "code": "ES",
    "flagEmoji": "🇪🇸"
  }
}
```

---

### GET /api/countries/code/:code

Get country by ISO code.

**Access:** Public

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "country-id",
    "name": "Spain",
    "code": "ES",
    "flagEmoji": "🇪🇸"
  }
}
```

---

### GET /api/countries/:countryId/visa-types

Get all visa types for a country.

**Access:** Public

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "visa-type-id",
      "name": "Tourist Visa",
      "fee": 100,
      "processingDays": 15,
      "validity": 90,
      "description": "For tourism purposes"
    }
  ]
}
```

---

## Forms

### GET /api/forms/template/:countryId/:visaTypeId

Get form template for a visa type.

**Access:** Protected

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "fields": [
      {
        "name": "firstName",
        "type": "text",
        "label": "First Name",
        "required": true
      },
      {
        "name": "lastName",
        "type": "text",
        "label": "Last Name",
        "required": true
      }
    ]
  }
}
```

---

### POST /api/forms/prefill

Pre-fill form with user data using AI.

**Access:** Protected

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "countryId": "country-id",
  "visaTypeId": "visa-type-id"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "user@example.com",
    ...
  }
}
```

---

### POST /api/forms/validate

Validate form data.

**Access:** Protected

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "countryId": "country-id",
  "visaTypeId": "visa-type-id",
  "formData": {
    "firstName": "John",
    "lastName": "Doe",
    ...
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": []
  }
}
```

---

### POST /api/forms/:applicationId/save

Save form data to application.

**Access:** Protected (own application only)

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "formData": {
    "firstName": "John",
    "lastName": "Doe",
    ...
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Form data saved successfully"
}
```

---

### POST /api/forms/:applicationId/submit

Submit application form.

**Access:** Protected (own application only)

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "submissionMethod": "download"
}
```

**Valid Methods:** `download`, `email`, `api`

**Response (201):**
```json
{
  "success": true,
  "data": {
    "submissionId": "submission-id",
    "method": "download",
    "url": "https://...",
    "submittedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### GET /api/forms/:applicationId/download

Download form as PDF.

**Access:** Protected (own application only)

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="visa-application.pdf"
[PDF binary data]
```

---

## Notifications

### POST /api/notifications/register-device

Register device token for push notifications.

**Access:** Protected

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "deviceToken": "fcm-device-token"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Device token registered"
}
```

---

### GET /api/notifications/preferences

Get notification preferences.

**Access:** Protected

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "emailNotifications": true,
  "pushNotifications": true,
  "paymentConfirmations": true,
  "documentUpdates": true,
  "visaStatusUpdates": true,
  "dailyReminders": true,
  "newsUpdates": false
}
```

---

### PATCH /api/notifications/preferences

Update notification preferences.

**Access:** Protected

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "emailNotifications": false,
  "pushNotifications": true,
  "dailyReminders": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Notification preferences updated"
}
```

---

### GET /api/notifications/history

Get notification history.

**Access:** Protected

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional, default: 20) - Number of notifications to return
- `offset` (optional, default: 0) - Pagination offset

**Response (200):**
```json
{
  "notifications": [
    {
      "id": "notif-id",
      "type": "payment_confirmed",
      "title": "💳 Payment Confirmed",
      "message": "Your payment for Spain Visa has been processed",
      "timestamp": "2024-01-01T00:00:00Z",
      "read": false
    }
  ],
  "total": 1
}
```

---

## Health & Monitoring

### GET /api/health

Basic health check.

**Access:** Public

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "uptime": 3600,
    "version": "1.0.0",
    "environment": "development",
    "database": {
      "status": "up",
      "responseTime": 5
    }
  }
}
```

---

### GET /api/health/detailed

Detailed health check with all services.

**Access:** Public

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "uptime": 3600,
    "version": "1.0.0",
    "environment": "development",
    "services": {
      "database": {
        "status": "up",
        "responseTime": 5
      },
      "cache": {
        "status": "up",
        "redis": true
      },
      "storage": {
        "status": "up",
        "type": "local"
      },
      "ai": {
        "status": "up",
        "responseTime": 200
      }
    }
  }
}
```

---

### GET /api/monitoring/status

Get system monitoring status.

**Access:** Public

**Response (200):**
```json
{
  "success": true,
  "timestamp": "2024-01-01T00:00:00Z",
  "environment": "development",
  "status": "healthy",
  "services": {
    "cache": {
      "status": "healthy",
      "redis": "connected",
      "hitRate": "85.50%"
    },
    "database": {
      "status": "healthy",
      "pool": {
        "connections": 10,
        "idle": 5,
        "queries": 1000
      },
      "prisma": {
        "state": "connected",
        "healthy": true,
        "latency": "5ms"
      }
    }
  },
  "performance": {
    "avgQueryTime": "10ms",
    "cacheHits": 850,
    "cacheMisses": 150
  }
}
```

---

### GET /api/monitoring/rate-limit/status

Get rate limiting status.

**Access:** Public

**Response (200):**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-01T00:00:00Z",
    "rateLimiting": {
      "redisEnabled": true,
      "redisConnected": true,
      "store": "Redis",
      "status": "Redis (Distributed)",
      "recommendation": "Using Redis - optimal for production"
    },
    "limits": {
      "general": {
        "windowMs": 900000,
        "maxRequests": 100
      },
      "auth": {
        "windowMs": 900000,
        "maxRequests": 5
      }
    }
  }
}
```

---

## Admin

### GET /api/admin/dashboard

Get admin dashboard metrics.

**Access:** Protected (Admin only)

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "totalUsers": 1000,
  "totalApplications": 5000,
  "totalRevenue": 50000,
  "pendingApplications": 100,
  "recentActivity": [...]
}
```

---

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "status": 400,
    "message": "User-friendly error message",
    "code": "VALIDATION_ERROR",
    "suggestion": "Please check your input and try again",
    "field": "email"
  }
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `422` - Unprocessable Entity
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `503` - Service Unavailable

### Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource conflict (e.g., duplicate email)
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Internal server error
- `SERVICE_UNAVAILABLE` - External service unavailable

### Development vs Production

In **development**, error responses include:
- Stack traces
- Request details
- Original error messages

In **production**, error responses are sanitized:
- No stack traces
- Generic messages for 500 errors
- User-friendly messages only

---

## Rate Limiting

### General API Routes
- **Limit:** 100 requests per 15 minutes per IP
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Authentication Routes
- **Limit:** 5 requests per 15 minutes per IP
- Stricter limits to prevent brute force attacks

### Chat Routes
- **Limit:** 50 messages per day per user
- Tracked per authenticated user

### Webhook Routes
- **Limit:** 10 requests per minute per IP
- Stricter limits for webhook endpoints

---

## Authentication

### JWT Token Format

Tokens are issued with the following claims:
- `userId` - User ID
- `email` - User email
- `role` - User role (user, admin)
- `iat` - Issued at timestamp
- `exp` - Expiration timestamp (default: 7 days)

### Using Tokens

Include the token in the `Authorization` header:

```
Authorization: Bearer <your-token>
```

### Token Refresh

Tokens expire after 7 days. Use `/api/auth/refresh` to get a new token before expiration.

---

## Pagination

Some endpoints support pagination:

**Query Parameters:**
- `limit` - Number of items per page (default: 20, max: 100)
- `offset` - Number of items to skip (default: 0)

**Response Format:**
```json
{
  "success": true,
  "data": [...],
  "count": 50,
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 50,
    "hasMore": true
  }
}
```

---

## File Uploads

### Supported File Types
- PDF (`.pdf`)
- Images (`.jpg`, `.jpeg`, `.png`)
- Documents (`.doc`, `.docx`)

### File Size Limits
- Maximum file size: 20 MB

### Upload Format
Use `multipart/form-data` with the file field named `file`.

---

**Last Updated:** 2024  
**API Version:** 1.0.0








