# Payment Freeze Configuration Guide

## Overview

VisaBuddy includes a payment freeze feature that allows you to offer a free trial period (e.g., first 3 months) where users can use the service without payment. This is useful for launch periods, promotional campaigns, or testing phases.

## How It Works

When payment freeze is enabled:
- Users can proceed with visa applications without payment
- Payment gateways are not called
- Applications proceed normally through the workflow
- Users see a clear message indicating the free period
- The system tracks when the freeze period ends

## Configuration

### Environment Variables

Add these to your `.env` file in `apps/backend/`:

```bash
# Enable payment freeze (default: true)
PAYMENT_FREEZE_ENABLED=true

# Start date for freeze period (format: YYYY-MM-DD)
# If not set, defaults to current date when server starts
PAYMENT_FREEZE_START_DATE=2025-01-15

# Duration of freeze period in months (default: 3)
PAYMENT_FREEZE_DURATION_MONTHS=3
```

### Default Behavior

- **Default**: Payment freeze is **enabled** by default
- **Start Date**: If not specified, uses the current date when the server starts
- **Duration**: Defaults to 3 months if not specified

### Disabling Payment Freeze

To disable payment freeze and enable payments:

```bash
PAYMENT_FREEZE_ENABLED=false
```

## API Endpoints

### Get Freeze Status

```http
GET /api/payments/freeze-status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isFrozen": true,
    "message": "Payments are currently free! This free period ends on 4/15/2025 (90 days remaining).",
    "freezeStartDate": "2025-01-15T00:00:00.000Z",
    "freezeEndDate": "2025-04-15T00:00:00.000Z",
    "daysRemaining": 90
  }
}
```

### Get Payment Methods

When freeze is active, this endpoint returns an empty methods array:

```http
GET /api/payments/methods
```

**Response (when frozen):**
```json
{
  "success": true,
  "data": [],
  "frozen": true,
  "message": "Payments are currently free!",
  "freezeEndDate": "2025-04-15T00:00:00.000Z",
  "daysRemaining": 90
}
```

### Initiate Payment

When freeze is active, payment initiation returns a success response indicating no payment is needed:

```http
POST /api/payments/initiate
```

**Response (when frozen):**
```json
{
  "success": true,
  "data": {
    "frozen": true,
    "message": "Payments are currently free!",
    "freezeEndDate": "2025-04-15T00:00:00.000Z",
    "daysRemaining": 90
  },
  "paymentRequired": false
}
```

## Frontend Integration

The frontend automatically handles payment freeze status:

1. **Payment Screen**: Shows a banner when payments are frozen
2. **Payment Methods**: Hides payment methods and shows "No Payment Required" message
3. **Application Flow**: Users can proceed without payment during freeze period

## Automatic Expiration

The payment freeze automatically expires after the specified duration. Once expired:
- Payments become active
- Users will see payment methods
- Payment gateways will be called normally

## Monitoring

Check freeze status via:
- API endpoint: `/api/payments/freeze-status`
- Backend logs: Look for "Payment freeze" messages
- Frontend: Payment screen shows freeze status banner

## Best Practices

1. **Set Start Date**: Always set `PAYMENT_FREEZE_START_DATE` for predictable behavior
2. **Monitor Expiration**: Set calendar reminders for when freeze period ends
3. **User Communication**: Inform users about the free period in app notifications
4. **Testing**: Test payment flow before disabling freeze in production

## Example Scenarios

### Launch Period (3 months free)
```bash
PAYMENT_FREEZE_ENABLED=true
PAYMENT_FREEZE_START_DATE=2025-01-15
PAYMENT_FREEZE_DURATION_MONTHS=3
```

### Extended Trial (6 months)
```bash
PAYMENT_FREEZE_ENABLED=true
PAYMENT_FREEZE_START_DATE=2025-01-15
PAYMENT_FREEZE_DURATION_MONTHS=6
```

### Disable Freeze (Enable Payments)
```bash
PAYMENT_FREEZE_ENABLED=false
```

## Troubleshooting

### Payments Still Showing
- Check `PAYMENT_FREEZE_ENABLED` is set to `true`
- Verify server has been restarted after env changes
- Check freeze end date hasn't passed

### Freeze Not Working
- Ensure environment variables are in `apps/backend/.env`
- Check server logs for freeze status
- Verify date format: `YYYY-MM-DD`

### Need to Extend Freeze
- Update `PAYMENT_FREEZE_DURATION_MONTHS` to a higher value
- Restart server
- Freeze will automatically extend based on start date + duration

## Code Locations

- **Backend Utility**: `apps/backend/src/utils/payment-freeze.ts`
- **Payment Routes**: `apps/backend/src/routes/payments-complete.ts`
- **Frontend Store**: `apps/frontend/src/store/payments.ts`
- **Frontend Screen**: `apps/frontend/src/screens/payment/PaymentScreen.tsx`








