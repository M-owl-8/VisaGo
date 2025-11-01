# 📚 API Endpoints Reference

**Backend URL**: http://localhost:3000  
**API Prefix**: /api

---

## 🔐 Authentication Endpoints

### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}

Response:
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "refresh-token-here"
  }
}
```

### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response:
{
  "success": true,
  "data": {
    "token": "jwt-token-here",
    "refreshToken": "refresh-token",
    "user": {...}
  }
}
```

---

## 📍 Countries & Visa Types

### Get All Countries
```
GET /api/countries
Authorization: Bearer {JWT_TOKEN}

Response:
{
  "success": true,
  "data": [
    {
      "id": "us",
      "name": "United States",
      "visaTypes": [
        {
          "id": "tourist",
          "name": "Tourist Visa (B1/B2)",
          "description": "..."
        }
      ]
    }
  ]
}
```

### Get Single Country
```
GET /api/countries/us
Authorization: Bearer {JWT_TOKEN}

Response:
{
  "success": true,
  "data": {
    "id": "us",
    "name": "United States",
    "visaTypes": [...]
  }
}
```

---

## 📄 Document Upload

### Upload Document
```
POST /api/documents/{applicationId}/upload
Authorization: Bearer {JWT_TOKEN}
Content-Type: multipart/form-data

Body:
- file: <binary file data>
- documentType: passport
- documentName: "My Passport"

Response:
{
  "success": true,
  "data": {
    "fileUrl": "http://localhost:3000/uploads/files/user-id/passport/uuid-name.pdf",
    "fileSize": 1024000,
    "uploadedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Get Documents
```
GET /api/documents/{applicationId}
Authorization: Bearer {JWT_TOKEN}

Response:
{
  "success": true,
  "data": [
    {
      "id": "doc-1",
      "documentType": "passport",
      "documentName": "My Passport",
      "fileUrl": "http://localhost:3000/uploads/files/...",
      "fileSize": 1024000
    }
  ]
}
```

---

## 💬 Chat & AI

### Send Chat Message
```
POST /api/chat/send
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "content": "What are the requirements for a US visa?",
  "applicationId": "app-123",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Previous message"
    },
    {
      "role": "assistant",
      "content": "Previous response"
    }
  ]
}

Response:
{
  "success": true,
  "data": {
    "message": "For a US tourist visa (B1/B2), you need...",
    "sources": [
      {
        "documentId": "doc-1",
        "title": "US Visa Requirements",
        "relevanceScore": 0.95
      }
    ],
    "tokensUsed": 256,
    "cost": 0.0045,
    "model": "gpt-4",
    "responseTime": 2340
  }
}
```

### Get Chat History
```
GET /api/chat/history
Authorization: Bearer {JWT_TOKEN}

Response:
{
  "success": true,
  "data": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "What is a visa?",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "id": "msg-2",
      "role": "assistant",
      "content": "A visa is...",
      "sources": [...],
      "timestamp": "2024-01-15T10:30:05Z"
    }
  ]
}
```

---

## 📊 Monitoring & Health

### Health Check
```
GET /health

Response:
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development"
}
```

### API Status
```
GET /api/status

Response:
{
  "message": "VisaBuddy API is running",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Cache Statistics
```
GET /api/cache/stats
Authorization: Bearer {JWT_TOKEN} (optional)

Response:
{
  "keys": 15,
  "ksize": 2048,
  "vsize": 1024000,
  "vsize_other": 512
}

Explanation:
- keys: Number of items in cache
- ksize: Size of keys in bytes
- vsize: Size of values in bytes
- vsize_other: Other memory used
```

---

## 📋 Visa Applications

### Create Application
```
POST /api/applications
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "countryId": "us",
  "visaTypeId": "tourist",
  "applicationStatus": "draft"
}

Response:
{
  "success": true,
  "data": {
    "id": "app-123",
    "userId": "user-id",
    "countryId": "us",
    "visaTypeId": "tourist",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Get Applications
```
GET /api/applications
Authorization: Bearer {JWT_TOKEN}

Response:
{
  "success": true,
  "data": [
    {
      "id": "app-123",
      "country": "United States",
      "visaType": "Tourist (B1/B2)",
      "status": "draft",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Update Application
```
PUT /api/applications/{applicationId}
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "applicationStatus": "submitted",
  "additionalInfo": "..."
}

Response:
{
  "success": true,
  "data": {...updated application...}
}
```

---

## 💳 Payments

### Create Payment
```
POST /api/payments
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "applicationId": "app-123",
  "amount": 150,
  "currency": "USD",
  "paymentMethod": "stripe"
}

Response:
{
  "success": true,
  "data": {
    "transactionId": "txn-123",
    "amount": 150,
    "status": "pending",
    "paymentUrl": "https://..."
  }
}
```

### Get Payment Status
```
GET /api/payments/{transactionId}
Authorization: Bearer {JWT_TOKEN}

Response:
{
  "success": true,
  "data": {
    "transactionId": "txn-123",
    "status": "completed",
    "amount": 150,
    "currency": "USD",
    "completedAt": "2024-01-15T10:35:00Z"
  }
}
```

---

## 🔍 Error Responses

### Common Error Codes

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "status": 400
  }
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (no permission)
- `404` - Not Found
- `422` - Validation Error
- `429` - Too Many Requests (rate limited)
- `500` - Server Error

---

## 🔑 Authentication

### Headers Required
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Getting a Token

1. Register or login to get a token
2. Add to all API requests:
   ```
   Authorization: Bearer {token_from_login}
   ```
3. Token expires in 7 days (JWT_EXPIRY)
4. Use refreshToken to get new token

---

## 🚀 Example Flow

### 1. Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'

# Get token from response
TOKEN="eyJhbGciOi..." 
```

### 3. Create Application
```bash
curl -X POST http://localhost:3000/api/applications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "countryId": "us",
    "visaTypeId": "tourist"
  }'

# Get app ID from response
APP_ID="app-123"
```

### 4. Upload Document
```bash
curl -X POST http://localhost:3000/api/documents/$APP_ID/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/passport.pdf" \
  -F "documentType=passport"
```

### 5. Chat
```bash
curl -X POST http://localhost:3000/api/chat/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "What do I need for a US visa?",
    "applicationId": "'$APP_ID'"
  }'
```

---

## 📱 Mobile App Integration

### In Your React Native App

```typescript
const API_URL = "http://localhost:3000";

// 1. Login
const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password })
});
const { data } = await loginResponse.json();
const token = data.token;

// 2. Upload Document
const formData = new FormData();
formData.append("file", file);
formData.append("documentType", "passport");

const uploadResponse = await fetch(
  `${API_URL}/api/documents/${applicationId}/upload`,
  {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` },
    body: formData
  }
);

// 3. Chat
const chatResponse = await fetch(`${API_URL}/api/chat/send`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ content: "message" })
});
```

---

## 🎯 Rate Limiting

**Current Limits:**
- 100 requests per 15 minutes per IP
- Adjust in `src/index.ts` if needed

**Rate Limited Endpoints:**
- `/api/*` - All API routes (100/15min)

**Response when rate limited:**
```json
{
  "success": false,
  "error": "Too many requests, please try again later."
}
```

---

## 📞 Support

- **Backend running?**: `curl http://localhost:3000/health`
- **API working?**: `curl http://localhost:3000/api/status`
- **Cache ok?**: `curl http://localhost:3000/api/cache/stats`
- **Issues?**: Check server logs in terminal

---

## 🔄 Pagination & Filtering

Not yet implemented, but planned:

```
// Future: Get paginated results
GET /api/applications?page=1&limit=10
GET /api/documents?skip=0&take=20

// Future: Filter by date
GET /api/documents?createdAfter=2024-01-01

// Future: Search
GET /api/applications?search=visa
```

---

**All endpoints ready!** 🚀