# JWT Token Fix - "User not found" Error

## Problem

When using the token with `id: "founder"`, you got a **404 "User not found"** error.

**Root Cause:** The `requireAdmin` middleware checks if the user exists in the database by looking up `req.userId`. The token had `id: "founder"`, but no user with that ID exists in the database.

## Solution

Use a token with a **real user ID** that exists in the database.

---

## ✅ Working Token (Real User ID)

**User:** yeger9889@gmail.com  
**User ID:** cmif22w2j00006zxehywqq9kd (exists in database)  
**Role:** super_admin

### JWT Token

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtaWYyMncyajAwMDA2enhlaHl3cXE5a2QiLCJlbWFpbCI6InllZ2VyOTg4OUBnbWFpbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3NjQ4ODcxODksImV4cCI6MTc2NzQ3OTE4OSwiYXVkIjoidmlzYWJ1ZGR5LWFwcCIsImlzcyI6InZpc2FidWRkeS1hcGkifQ.JJtq9wXXMv6nTXXArkmNTCpArDGG10R1SLT5cnqZkqk
```

### Usage in Thunder Client

**Header:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtaWYyMncyajAwMDA2enhlaHl3cXE5a2QiLCJlbWFpbCI6InllZ2VyOTg4OUBnbWFpbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3NjQ4ODcxODksImV4cCI6MTc2NzQ3OTE4OSwiYXVkIjoidmlzYWJ1ZGR5LWFwcCIsImlzcyI6InZpc2FidWRkeS1hcGkifQ.JJtq9wXXMv6nTXXArkmNTCpArDGG10R1SLT5cnqZkqk
```

---

## Why This Works

1. **Token is valid** - Signed with correct JWT_SECRET
2. **User exists** - User ID `cmif22w2j00006zxehywqq9kd` exists in database
3. **Role is correct** - User has `super_admin` role
4. **Middleware passes** - `requireAdmin` finds the user and allows access

---

## Test the Endpoint

**POST** `https://visago-production.up.railway.app/api/admin/embassy-sync/trigger`

**Headers:**

- `Authorization: Bearer <token above>`
- `Content-Type: application/json`

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "jobsEnqueued": 18
  },
  "message": "Sync jobs enqueued for 18 sources"
}
```

---

## If You Need admin@ketdik.com

If you specifically need a token for `admin@ketdik.com`, you have two options:

### Option 1: Create User in Database

Create a user in the database with:

- `id: "founder"` (or any ID)
- `email: "admin@ketdik.com"`
- `role: "super_admin"`

Then generate a token with that user ID.

### Option 2: Use Existing User

Use the existing `yeger9889@gmail.com` user (which already has `super_admin` role) - this is the working token above.

---

## Regenerate Token

```bash
cd apps/backend
node scripts/generate-token-for-existing-user.js
```

---

## Technical Details

The `requireAdmin` middleware in `apps/backend/src/middleware/admin.ts` does:

```typescript
const user = await prisma.user.findUnique({
  where: { id: req.userId },
  select: { role: true },
});

if (!user) {
  return res.status(404).json({ error: 'User not found' });
}
```

This is why the token must contain a user ID that exists in the database.
