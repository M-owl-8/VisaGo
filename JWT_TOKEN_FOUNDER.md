# JWT Token for Founder (admin@ketdik.com)

**Generated:** 2025-12-04  
**User ID:** founder  
**Email:** admin@ketdik.com  
**Role:** super_admin  
**Expires:** 30 days

---

## JWT Token

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZvdW5kZXIiLCJlbWFpbCI6ImFkbWluQGtldGRpay5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3NjQ4ODcwMDYsImV4cCI6MTc2NzQ3OTAwNiwiYXVkIjoidmlzYWJ1ZGR5LWFwcCIsImlzcyI6InZpc2FidWRkeS1hcGkifQ.jguS5wE5v5UJICB7bZDTwvs-L6CAj5pTbcbCzCNSIc8
```

---

## Usage

### Thunder Client / Postman

**Header:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZvdW5kZXIiLCJlbWFpbCI6ImFkbWluQGtldGRpay5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3NjQ4ODcwMDYsImV4cCI6MTc2NzQ3OTAwNiwiYXVkIjoidmlzYWJ1ZGR5LWFwcCIsImlzcyI6InZpc2FidWRkeS1hcGkifQ.jguS5wE5v5UJICB7bZDTwvs-L6CAj5pTbcbCzCNSIc8
```

### cURL Example

```bash
curl -X POST https://visago-production.up.railway.app/api/admin/embassy-sync/trigger \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZvdW5kZXIiLCJlbWFpbCI6ImFkbWluQGtldGRpay5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3NjQ4ODcwMDYsImV4cCI6MTc2NzQ3OTAwNiwiYXVkIjoidmlzYWJ1ZGR5LWFwcCIsImlzcyI6InZpc2FidWRkeS1hcGkifQ.jguS5wE5v5UJICB7bZDTwvs-L6CAj5pTbcbCzCNSIc8" \
  -H "Content-Type: application/json"
```

---

## Token Details

- **Issued At (iat):** 1764887006 (2025-12-04)
- **Expires At (exp):** 1767479006 (2026-01-03) - **30 days from issue**
- **Issuer:** visabuddy-api
- **Audience:** visabuddy-app
- **Algorithm:** HS256
- **User ID:** founder
- **Email:** admin@ketdik.com
- **Role:** super_admin

---

## Regenerate Token

To regenerate this token, run:

```bash
cd apps/backend
node scripts/generate-token-simple.js
```

Or use Node REPL:

```javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    id: 'founder',
    email: 'admin@ketdik.com',
    role: 'super_admin',
  },
  '1c2642aed2d6ac554796e23c22d175c14cc2f1eb1bd7045391edc26bfa394184',
  { expiresIn: '30d' }
);

console.log(token);
```

---

## Security Note

⚠️ **Keep this token secure!** Do not share it publicly or commit it to version control.

The token expires in 30 days. Regenerate a new token when needed.
