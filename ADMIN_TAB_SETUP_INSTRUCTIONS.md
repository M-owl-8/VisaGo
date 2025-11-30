# Admin Tab Setup Instructions

## Current Status

You logged in with `yeger9889@gmail.com`, but this user doesn't exist in the database yet.

## Step-by-Step Instructions

### Step 1: Register/Login with yeger9889@gmail.com

**If you haven't registered yet:**

1. Open the app
2. Go to Register screen
3. Register with email: `yeger9889@gmail.com`
4. Complete registration

**If you already registered:**

- Make sure you're logged in with `yeger9889@gmail.com`
- If you logged in with a different email, you'll need to either:
  - Register with `yeger9889@gmail.com`, OR
  - Use the existing email and update the script

### Step 2: Set User to super_admin

After registering/logging in, run this command:

```bash
cd apps/backend
npm run make-super-admin
```

This will:

- Find the user with email `yeger9889@gmail.com`
- Update their role to `super_admin`
- Confirm the change

### Step 3: Log Out and Log Back In

**IMPORTANT:** After setting the role, you MUST:

1. **Log out** from the app completely
2. **Log back in** with `yeger9889@gmail.com`

This is necessary because:

- The role is returned in the login response
- The app caches the user data from login
- Logging out and back in will fetch the updated role

### Step 4: Verify Admin Tab Appears

After logging back in:

1. Check the bottom navigation bar
2. You should see an **"Admin"** tab (usually with a settings icon)
3. The tab should appear between "Profile" and the other tabs

### Step 5: Check Debug Logs (Optional)

In your Metro bundler console or device logs, you should see:

```
DEBUG_USER_ROLE yeger9889@gmail.com super_admin
```

If you see `undefined` or `user`, the role wasn't updated correctly.

## Troubleshooting

### Admin Tab Still Not Showing?

1. **Check the debug log:**
   - Look for `DEBUG_USER_ROLE` in console
   - Should show: `DEBUG_USER_ROLE yeger9889@gmail.com super_admin`

2. **Verify database:**

   ```bash
   cd apps/backend
   npm run list-users
   ```

   - Check that `yeger9889@gmail.com` has `role: super_admin`

3. **Verify backend is running:**
   - Make sure backend server is running
   - Check that backend is connected to the same database

4. **Clear app cache:**
   - Uninstall and reinstall the app, OR
   - Clear app data from device settings
   - Log in again

5. **Check backend logs:**
   - Verify that login response includes `role: "super_admin"`
   - Check `/api/users/me` endpoint returns role

## Quick Checklist

- [ ] User `yeger9889@gmail.com` exists in database (register if needed)
- [ ] Run `npm run make-super-admin` successfully
- [ ] Script confirms role updated to `super_admin`
- [ ] Logged out from app
- [ ] Logged back in with `yeger9889@gmail.com`
- [ ] Debug log shows: `DEBUG_USER_ROLE yeger9889@gmail.com super_admin`
- [ ] Admin tab appears in bottom navigation

## Alternative: Use Existing User

If you want to use a different email that already exists:

1. List users: `npm run list-users`
2. Edit `apps/backend/scripts/make-super-admin.ts`
3. Change the email on line 17 to your existing email
4. Run `npm run make-super-admin` again




