# VisaBuddy Payment Integration - Quick Start Guide

## 🚀 5-Minute Setup

### Backend Setup

**1. Configure Environment Variables**
```bash
cd apps/backend
cp .env.example .env
```

Edit `.env` and add:
```env
PAYME_MERCHANT_ID=your_test_merchant_id
PAYME_API_KEY=your_test_api_key
PAYME_API_URL=https://checkout.test.payme.uz
ENABLE_PAYMENTS=true
```

**2. Start Backend**
```bash
npm run dev
```

**Verify:**
```
GET http://localhost:3000/api/payments
# Should return: { "error": "Unauthorized" } (expected)
```

---

### Frontend Setup

**1. Update Navigation** (`src/navigation/AppNavigator.tsx`)
```tsx
import PaymentScreen from "../screens/payment/PaymentScreen";

// In your Stack.Navigator:
<Stack.Screen 
  name="Payment" 
  component={PaymentScreen}
  options={{ headerShown: false }}
/>
```

**2. Add Payment Button** (example)
```tsx
import { usePaymentStore } from "../store/payments";

export default function YourScreen({ navigation }) {
  const handlePayment = () => {
    navigation.navigate("Payment", {
      applicationId: "app_123",
      visaFee: 150,
      countryName: "United States",
      visaTypeName: "Tourist Visa",
    });
  };

  return (
    <TouchableOpacity onPress={handlePayment}>
      <Text>Pay Now</Text>
    </TouchableOpacity>
  );
}
```

**3. Start Frontend**
```bash
cd apps/frontend
npm start
```

---

## 🧪 Testing

### Test Payment with Payme

1. **Navigate to Payment Screen**
   - Click your payment button
   - Select "Payme"

2. **Use Test Card**
   - Card: `9860123456789012`
   - Expiry: Any future date
   - CVV: Any 3 digits

3. **Verify Payment**
   - Check backend logs: "Payment completed: ..."
   - Frontend shows: "Payment Successful"
   - Application status: "submitted"

---

## 📡 API Reference

### Initiate Payment
```bash
POST /api/payments/initiate
Authorization: Bearer TOKEN

{
  "applicationId": "app_123",
  "returnUrl": "visabuddy://payment/return"
}

Response:
{
  "success": true,
  "data": {
    "paymentUrl": "https://checkout.test.payme.uz/...",
    "transactionId": "tx_123",
    "merchantTransId": "1234567890-abc123"
  }
}
```

### Get Payment Status
```bash
GET /api/payments/:transactionId
Authorization: Bearer TOKEN

Response:
{
  "success": true,
  "data": {
    "id": "pay_123",
    "status": "completed",
    "amount": 150,
    "applicationId": "app_123",
    "paidAt": "2024-01-15T10:30:00Z"
  }
}
```

### Verify Payment (Polling)
```bash
POST /api/payments/:transactionId/verify
Authorization: Bearer TOKEN

Response:
{
  "success": true,
  "data": {
    "verified": true,
    "status": "completed"
  }
}
```

---

## 🎨 UI Components

### Available in Theme
```typescript
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from "../theme/colors";

// Colors
COLORS.BLACK        // #000000
COLORS.WHITE        // #FFFFFF
COLORS.GRAY_500     // #666666
COLORS.BG_PRIMARY   // #FFFFFF
COLORS.BG_SECONDARY // #F5F5F5

// Spacing
SPACING.SM          // 8px
SPACING.MD          // 12px
SPACING.LG          // 16px

// Typography
TYPOGRAPHY.SIZES.MD // 16px
TYPOGRAPHY.WEIGHTS.BOLD // "700"

// Borders
RADIUS.MD           // 8px
```

---

## 🔧 Common Tasks

### Add Another Payment Method

**1. Update `PaymentScreen.tsx`:**
```tsx
const paymentMethods: PaymentMethod[] = [
  { id: "payme", name: "Payme", ... },
  { id: "click", name: "Click", ... },  // Add new
];

const handleInitiatePayment = async (method) => {
  if (method.id === "click") {
    // Handle Click payment
  }
};
```

**2. Create Click Service** (`src/services/click.service.ts`)
```typescript
export class ClickService {
  async createPayment(params: CreatePaymentParams) { }
  async verifyPayment(transactionId: string) { }
  async processWebhook(data: any, signature: string) { }
}
```

### Track Payment Status

**In Your Component:**
```tsx
const { payments, loadUserPayments } = usePaymentStore();

useEffect(() => {
  loadUserPayments();
}, []);

// Display payments
{payments.map(payment => (
  <View key={payment.id}>
    <Text>{payment.status}</Text>
    <Text>${payment.amount}</Text>
  </View>
))}
```

### Handle Payment Errors

**In Store:**
```typescript
// Automatically handled by usePaymentStore
const { error, clearError } = usePaymentStore();

if (error) {
  <Alert title="Error" message={error} />
}
```

---

## 📊 Payment Statuses

| Status | Meaning | Next Step |
|--------|---------|-----------|
| `pending` | Awaiting payment completion | Show payment form |
| `completed` | Successfully paid | Update application status |
| `failed` | Payment declined | Show error, allow retry |
| `refunded` | Refund processed | Revert to draft state |

---

## 🔐 Security Checklist

- [ ] Never expose API keys in frontend code
- [ ] Always verify signatures on webhook
- [ ] Validate amounts server-side
- [ ] Check user authorization before payment
- [ ] Use HTTPS in production
- [ ] Implement rate limiting
- [ ] Log all payment events
- [ ] Monitor failed payments

---

## 🚨 Troubleshooting

### "Cannot open payment link"
```
→ Check PAYME_API_URL is correct
→ Verify Linking permission in app.json
→ Test with deep linking config
```

### "Invalid signature"
```
→ Verify PAYME_API_KEY matches Payme account
→ Check webhook is from Payme (verify IP)
→ Ensure base64 encoding is correct
```

### "Payment not found"
```
→ Check transactionId is correct
→ Verify payment was created successfully
→ Check database has payment record
```

### "Unauthorized"
```
→ Verify JWT token is valid
→ Check token is in Authorization header
→ Ensure token hasn't expired
```

---

## 📚 Resources

- **Payme Test Account**: https://business.test.payme.uz
- **API Documentation**: https://docs.payme.uz
- **Test Cards**: See Payme dashboard
- **Support**: support@visabuddy.com

---

## ✅ Deployment Checklist

### Before Going Live

```
Backend:
- [ ] Set PAYME_API_URL=https://checkout.payme.uz
- [ ] Update PAYME_MERCHANT_ID with production ID
- [ ] Update PAYME_API_KEY with production key
- [ ] Configure webhook URL in Payme dashboard
- [ ] Enable HTTPS
- [ ] Set NODE_ENV=production
- [ ] Set up error monitoring (Sentry/LogRocket)

Frontend:
- [ ] Test payment flow end-to-end
- [ ] Test error scenarios
- [ ] Test on both iOS and Android
- [ ] Verify deep linking works
- [ ] Test on slow networks

Database:
- [ ] Run migrations: npm run db:migrate
- [ ] Verify Payment table exists
- [ ] Set up backup schedule
- [ ] Monitor payment records
```

---

**Ready to go! 🚀**

For detailed information, see `PAYMENT_INTEGRATION_GUIDE.md`