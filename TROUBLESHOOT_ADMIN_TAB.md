# Troubleshooting: Admin Tab Not Appearing

## Step 1: Check Debug Logs

After logging in, check your Metro bundler console or device logs for:

```
DEBUG_USER_ROLE yeger9889@gmail.com <role>
```

**What to look for:**

- If you see `DEBUG_USER_ROLE yeger9889@gmail.com undefined` → Role is not being returned from backend
- If you see `DEBUG_USER_ROLE yeger9889@gmail.com user` → User role needs to be updated in database
- If you see `DEBUG_USER_ROLE yeger9889@gmail.com super_admin` → Role is correct, check next steps

## Step 2: Set User to super_admin in Database

**IMPORTANT:** You must run this script on the backend to set the role:

```bash
cd apps/backend
npm run make-super-admin
```

This will:

- Find user with email `yeger9889@gmail.com`
- Update their role to `super_admin`
- Confirm the change

## Step 3: Verify Backend is Returning Role

After setting the role, you need to:

1. **Log out** from the app (if already logged in)
2. **Log back in** with `yeger9889@gmail.com`
3. Check the debug log again

The role is returned in the login response, so you need to log out and log back in to get the updated role.

## Step 4: Check Backend API Response

You can verify the backend is returning the role by checking:

- Login response: `POST /api/auth/login` should include `{ user: { ..., role: "super_admin" } }`
- Profile response: `GET /api/users/me` should include `{ ..., role: "super_admin" }`

## Step 5: Verify Frontend is Reading Role

The frontend should:

1. Read role from login response
2. Normalize it using `normalizeRole()` function
3. Store it in auth store
4. `useIsAdmin()` should return `true` if role is `'admin'` or `'super_admin'`

## Quick Checklist

- [ ] Run `npm run make-super-admin` in `apps/backend`
- [ ] Verify script output shows role updated to `super_admin`
- [ ] Log out from the app
- [ ] Log back in with `yeger9889@gmail.com`
- [ ] Check debug log: `DEBUG_USER_ROLE yeger9889@gmail.com super_admin`
- [ ] Admin tab should appear in bottom navigation

## If Still Not Working

1. **Check Metro logs** for the debug output
2. **Check backend logs** to see if role is being returned
3. **Verify backend is running** and connected to the same database
4. **Clear app data** and log in again (to clear cached user data)
