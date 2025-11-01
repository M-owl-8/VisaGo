# VisaBuddy Payment Integration Guide - Phase 2

## Overview

This guide explains the Payme payment gateway integration for VisaBuddy. The system is built to handle visa application fees through a secure, modern payment processing platform.

**Current Status**: ✅ Phase 2 - Payment Integration (Payme) Implemented
**Design**: 🎨 Black and White Minimalist Theme

---

## Architecture

### Backend Components

#### 1. **Payme Service** (`src/services/payme.service.ts`)
- Handles all Payme API interactions
- Manages payment lifecycle
- Processes webhooks
- Verifies payments

**Key Methods:**
- `createPayment()` - Initiates a new payment
- `checkTransaction()` - Checks payment status with Payme API
- `processWebhook()` - Handles webhook notifications
- `verifyPayment()` - Polling-based verification fallback
- `getPayment()` - Retrieves payment details
- `getUserPayments()` - Lists user's payment history
- `cancelPayment()` - Cancels pending payment

#### 2. **Payment Routes** (`src/routes/payments.ts`)

**Endpoints:**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/payments/initiate` | Start payment process | ✅ Required |
| POST | `/api/payments/webhook` | Payme webhook handler | ❌ Public |
| GET | `/api/payments/:transactionId` | Get payment details | ✅ Required |
| GET | `/api/payments` | List user payments | ✅ Required |
| POST | `/api/payments/:transactionId/verify` | Verify payment status | ✅ Required |
| DELETE | `/api/payments/:transactionId/cancel` | Cancel pending payment | ✅ Required |

### Frontend Components

#### 1. **Payment Store** (`src/store/payments.ts`)
Zustand store managing payment state with persistent storage.

**State:**
- `payments` - Array of user payments
- `currentPayment` - Active payment
- `isLoading` - Loading state
- `error` - Error message

**Actions:**
- `loadUserPayments()` - Fetch user payments
- `initiatePayment()` - Start new payment
- `verifyPayment()` - Check payment status
- `getPaymentDetails()` - Get payment info
- `cancelPayment()` - Cancel payment

#### 2. **Payment Screen** (`src/screens/payment/PaymentScreen.tsx`)
Main payment UI component with:
- Payment method selection (Payme, Click, Uzum)
- Application details display
- Payment verification polling
- Success confirmation screen
- Security information
- Error handling

#### 3. **Color Theme** (`src/theme/colors.ts`)
Professional black and white color system:
- Primary: Black (#000000)
- Background: White (#FFFFFF)
- Grays: 50-900 scale for hierarchy
- Status colors: Success, Error, Warning, Info (all in grayscale)

---

## Setup Instructions

### 1. Backend Configuration

#### Install Dependencies (if needed)
```bash
cd apps/backend
npm install
# crypto is built-in to Node.js
```

#### Environment Variables
Create `.env` file in `apps/backend`:

```env
# Payme Configuration
PAYME_MERCHANT_ID=your_merchant_id
PAYME_API_KEY=your_api_key
PAYME_API_URL=https://checkout.test.payme.uz

# For Production (switch when ready)
# PAYME_API_URL=https://checkout.payme.uz

# Feature Flag
ENABLE_PAYMENTS=true
```

#### Get Payme Credentials
1. Sign up at [Payme Business](https://business.payme.uz)
2. Create a merchant account
3. Generate API credentials
4. Configure webhook URL: `https://yourdomain.com/api/payments/webhook`

#### Database Setup
The Payment schema is already defined in `prisma/schema.prisma`:

```prisma
model Payment {
  id                String    @id @default(cuid())
  userId            String
  applicationId     String    @unique
  amount            Float
  currency          String    @default("USD")
  status            String    @default("pending")
  paymentMethod     String    // "payme", "click", "uzum"
  transactionId     String?   @unique
  orderId           String?
  paymentGatewayData String?
  paidAt            DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  application       VisaApplication @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status])
}
```

Run migrations:
```bash
npm run db:migrate
```

### 2. Frontend Configuration

#### Install Dependencies
```bash
cd apps/frontend
npm install zustand
```

#### Environment Setup
Create `.env` or `.env.local`:

```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_PAYMENT_RETURN_URL=visabuddy://payment/return
```

#### Register Payment Route
Update `src/navigation/AppNavigator.tsx`:

```tsx
import PaymentScreen from "../screens/payment/PaymentScreen";

// In your stack navigator:
<Stack.Screen 
  name="Payment" 
  component={PaymentScreen}
  options={{ headerShown: false }}
/>
```

#### Use Payment in Your Screen
```tsx
import { usePaymentStore } from "../store/payments";

export default function VisaDetailScreen({ navigation, route }) {
  const { application } = route.params;
  
  const handlePayment = () => {
    navigation.navigate("Payment", {
      applicationId: application.id,
      visaFee: application.visaType.fee,
      countryName: application.country.name,
      visaTypeName: application.visaType.name,
    });
  };
  
  return (
    <TouchableOpacity onPress={handlePayment}>
      <Text>Pay Visa Fee: ${application.visaType.fee}</Text>
    </TouchableOpacity>
  );
}
```

---

## Payment Flow

### 1. **Initiation**
```
User → Frontend (Select Payment Method) 
  → Backend (POST /api/payments/initiate)
  → Payme (Generate Payment Link)
  → Frontend (Open Payme Checkout)
```

### 2. **Processing**
```
User → Payme Checkout (Enter Card Details)
  → Payme (Process Payment)
  → Payme Webhook (POST /api/payments/webhook)
  → Backend (Update Payment Status)
  → Database (Payment Completed)
```

### 3. **Verification**
```
Frontend (Poll /api/payments/:id/verify every 2 seconds)
  → Backend (Check Payment Status)
  → Database (Fetch Payment Details)
  → Frontend (Show Confirmation)
```

---

## Testing

### Test Environment Setup

1. **Use Payme Test API**
   - Endpoint: `https://checkout.test.payme.uz`
   - Merchant ID: Get from Payme test account
   - Test cards: Payme provides test card numbers

2. **Test Payment Flow**

```bash
# 1. Start backend
cd apps/backend
npm run dev

# 2. Start frontend
cd apps/frontend
npm start

# 3. Navigate to visa application
# 4. Click "Pay Fee" button
# 5. Select payment method
# 6. Use test card: 9860123456789012
# 7. Verify webhook reception
```

### Test Scenarios

#### Success Flow
```
Card: 9860123456789012
Expiry: Any future date (MM/YY)
CVV: Any 3 digits
Result: Payment successful → Application status updated
```

#### Failed Payment
```
Card: 9860100000000001
Result: Payment failed → Error shown to user
```

#### Webhook Testing
```bash
# Using curl to test webhook locally:
curl -X POST http://localhost:3000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "params": "BASE64_ENCODED_PARAMS",
    "sign": "EXPECTED_SIGNATURE",
    "event": "PaymentSuccess"
  }'
```

---

## Webhook Configuration

### Setting Up Webhooks in Payme

1. Go to Payme Business Dashboard
2. Settings → Webhooks
3. Add webhook URL: `https://yourdomain.com/api/payments/webhook`
4. Select events:
   - `PaymentSuccess`
   - `PaymentFailed`
   - `PaymentCancelled`

### Webhook Payload Structure

```json
{
  "params": "BASE64_STRING",
  "sign": "MD5_SIGNATURE",
  "event": "PaymentSuccess"
}
```

### Decoded Params Example
```json
{
  "account": {
    "application_id": "app_123456"
  },
  "amount": 10000,
  "currency": "UZS",
  "order_id": "merchant_trans_id_123",
  "merchant_trans_id": "merchant_trans_id_123",
  "transaction_id": "payme_transaction_id",
  "state": 2
}
```

---

## Database Schema

### Payment Statuses
- `pending` - Payment initiated, awaiting completion
- `completed` - Payment successful
- `failed` - Payment declined or errored
- `refunded` - Payment refunded to user

### Payment Methods
- `payme` - Payme payment gateway
- `click` - Click gateway (future)
- `uzum` - Uzum gateway (future)
- `stripe` - Stripe gateway (future)

### Related Models

**VisaApplication Status Changes:**
```
draft → submitted (after successful payment)
```

**User Payment Access:**
```
GET /api/payments → [{ id, applicationId, amount, status, ... }]
```

---

## Security Considerations

### 1. **Signature Verification**
All Payme communications are verified with MD5 signatures:
```typescript
// The service automatically verifies:
const key = `${params};${apiKey}`;
const signature = crypto.createHash("md5").update(key).digest("hex");
```

### 2. **Amount Validation**
```typescript
// Always validate amounts server-side
if (payment.amount !== visaType.fee) {
  reject("Amount mismatch");
}
```

### 3. **User Authorization**
```typescript
// All payment endpoints require authentication
// Verify user owns the payment/application
if (payment.userId !== req.userId) {
  return 403; // Forbidden
}
```

### 4. **HTTPS Only**
- Production API uses HTTPS
- All sensitive data is encrypted
- Never store full card details

### 5. **Error Handling**
```typescript
// Sensitive errors are logged but not exposed to client
try {
  // process payment
} catch (error) {
  console.error("Detailed error:", error); // Server log
  res.json({ error: "Payment processing failed" }); // Client response
}
```

---

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid signature" | Webhook signature mismatch | Check API key configuration |
| "Application not found" | Invalid applicationId | Verify application exists |
| "Payment already completed" | Duplicate payment attempt | Show user existing payment |
| "Cannot open payment link" | Linking not available | Update deep linking config |
| "Unauthorized" | User not authenticated | Ensure token is valid |

### Retry Logic
- Payment verification: Max 60 attempts (2 minutes)
- Failed payments: Show error and allow retry
- Network errors: Use exponential backoff

---

## Database Queries

### Get User Payments
```typescript
const payments = await prisma.payment.findMany({
  where: { userId: "user_id" },
  include: { application: true },
  orderBy: { createdAt: "desc" },
});
```

### Get Payment with Application
```typescript
const payment = await prisma.payment.findUnique({
  where: { id: "payment_id" },
  include: {
    user: true,
    application: {
      include: {
        country: true,
        visaType: true,
      },
    },
  },
});
```

### Update Payment Status
```typescript
await prisma.payment.update({
  where: { id: "payment_id" },
  data: {
    status: "completed",
    transactionId: "payme_tx_id",
    paidAt: new Date(),
  },
});
```

---

## Deployment Checklist

### Before Production

- [ ] Switch PAYME_API_URL to production endpoint
- [ ] Update webhook URL in Payme dashboard
- [ ] Enable HTTPS for API
- [ ] Set up proper logging and monitoring
- [ ] Configure rate limiting per user
- [ ] Test payment flow end-to-end
- [ ] Set up payment failure alerts
- [ ] Document payment procedures for support team
- [ ] Create refund process documentation
- [ ] Set up automated backups

### Environment Variables (Production)
```env
NODE_ENV=production
PAYME_MERCHANT_ID=prod_merchant_id
PAYME_API_KEY=prod_api_key
PAYME_API_URL=https://checkout.payme.uz
ENABLE_PAYMENTS=true
```

---

## Monitoring and Troubleshooting

### Payment Status Tracking
```typescript
// Check payment status anytime
const payment = await paymeService.getPayment(transactionId);
console.log(payment.status); // pending | completed | failed | refunded
```

### Webhook Logs
```
[2024-01-15] Webhook received: PaymentSuccess for order_123
[2024-01-15] Payment updated to completed
[2024-01-15] Application status updated to submitted
```

### Debug Mode
```typescript
// Enable detailed logging:
process.env.DEBUG = "payme:*";
```

---

## Next Steps (Phase 3+)

- [ ] Implement Click payment gateway
- [ ] Implement Uzum payment gateway
- [ ] Implement Stripe for international payments
- [ ] Add refund management system
- [ ] Create payment analytics dashboard
- [ ] Implement payment retry automation
- [ ] Add invoice generation
- [ ] Implement payment installments
- [ ] Add payment history export (PDF/CSV)
- [ ] Create admin payment management panel

---

## Support & Resources

### Documentation
- [Payme API Documentation](https://docs.payme.uz)
- [Payme Test Environment](https://checkout.test.payme.uz)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

### Contact
- Support: support@visabuddy.com
- Payme Support: support@payme.uz

---

## Version History

### v1.0.0 (Current)
- ✅ Payme payment integration
- ✅ Payment webhook handling
- ✅ Payment verification (polling + webhook)
- ✅ Black and white UI theme
- ✅ Payment history tracking
- ✅ Error handling and security

---

**Last Updated**: January 2024
**Phase**: 2 (Payment & AI)
**Status**: ✅ Complete for Payme, Ready for Additional Gateways