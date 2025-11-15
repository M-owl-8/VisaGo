# 💳 Payment Gateway Setup Guide

**Service**: Payment Processing (Stripe, Payme, Click, Uzum)  
**Required For**: Processing visa application payments  
**Difficulty**: Medium-Hard  
**Time**: 1-7 days (includes approval wait times)

---

## 📋 Overview

VisaBuddy supports multiple payment gateways:
- **Stripe**: International payments
- **Payme**: Uzbekistan payments
- **Click**: Uzbekistan payments
- **Uzum**: Uzbekistan payments

This guide covers setup for all gateways.

---

## 🌍 Stripe Setup (International)

### Step 1: Create Stripe Account

1. Go to [Stripe](https://stripe.com/)
2. Click **"Sign up"**
3. Complete account creation:
   - Business information
   - Bank account details
   - Identity verification

### Step 2: Get API Keys

1. Go to **"Developers"** > **"API keys"**
2. Copy **"Publishable key"** (starts with `pk_`)
3. Copy **"Secret key"** (starts with `sk_`)
   - **Test keys** for development (start with `pk_test_` and `sk_test_`)
   - **Live keys** for production (start with `pk_live_` and `sk_live_`)

### Step 3: Configure Webhooks

1. Go to **"Developers"** > **"Webhooks"**
2. Click **"Add endpoint"**
3. Enter endpoint URL:
   ```
   https://your-backend-url.com/api/payments/webhook/stripe
   ```
4. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
   - `charge.failed`
5. Copy the **"Signing secret"** (starts with `whsec_`)

### Step 4: Configure Environment Variables

Add to `apps/backend/.env`:

```env
STRIPE_SECRET_KEY=sk_test_your-secret-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret-here
```

**For Production**:
```env
STRIPE_SECRET_KEY=sk_live_your-live-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-live-webhook-secret
```

---

## 🇺🇿 Payme Setup (Uzbekistan)

### Step 1: Register Business Account

1. Contact Payme at [payme.uz](https://payme.uz)
2. Complete business registration:
   - Business documents
   - Bank account information
   - Merchant agreement

**Note**: This process can take 3-7 business days.

### Step 2: Get API Credentials

1. After approval, log in to Payme merchant dashboard
2. Go to **"Settings"** > **"API"**
3. Copy:
   - **Merchant ID**
   - **API Key**

### Step 3: Configure Environment Variables

Add to `apps/backend/.env`:

```env
PAYME_MERCHANT_ID=your-merchant-id
PAYME_API_KEY=your-api-key
```

---

## 🇺🇿 Click Setup (Uzbekistan)

### Step 1: Register Business Account

1. Contact Click at [click.uz](https://click.uz)
2. Complete business registration:
   - Business documents
   - Bank account information
   - Merchant agreement

**Note**: This process can take 3-7 business days.

### Step 2: Get API Credentials

1. After approval, log in to Click merchant dashboard
2. Go to **"API Settings"**
3. Copy:
   - **Merchant ID**
   - **API Key**

### Step 3: Configure Environment Variables

Add to `apps/backend/.env`:

```env
CLICK_MERCHANT_ID=your-merchant-id
CLICK_API_KEY=your-api-key
```

---

## 🇺🇿 Uzum Setup (Uzbekistan)

### Step 1: Register Business Account

1. Contact Uzum at [uzum.uz](https://uzum.uz)
2. Complete business registration:
   - Business documents
   - Bank account information
   - Merchant agreement

**Note**: This process can take 3-7 business days.

### Step 2: Get API Credentials

1. After approval, log in to Uzum merchant dashboard
2. Go to **"Developer"** > **"API"**
3. Copy:
   - **Merchant ID**
   - **API Key**

### Step 3: Configure Environment Variables

Add to `apps/backend/.env`:

```env
UZUM_MERCHANT_ID=your-merchant-id
UZUM_API_KEY=your-api-key
```

---

## ✅ Verification

### Test Payment Flow:

1. **Start Backend**:
   ```bash
   cd apps/backend
   npm run dev
   ```

2. **Test with Stripe Test Mode**:
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any CVC
   - Test payment should succeed

3. **Check Webhooks**:
   - Go to Stripe Dashboard > Webhooks
   - Check for successful webhook deliveries
   - Verify payment status updates in your app

---

## 🔧 Troubleshooting

### Error: "Invalid API key"

**Problem**: API key is incorrect or for wrong environment.

**Solution**:
- Verify key format (starts with correct prefix)
- Check if using test key in production or vice versa
- Regenerate key if needed

### Error: "Webhook signature verification failed"

**Problem**: Webhook secret is incorrect.

**Solution**:
- Verify webhook secret matches Stripe dashboard
- Check webhook endpoint URL is correct
- Ensure webhook is receiving requests

### Error: "Merchant not found" (Payme/Click/Uzum)

**Problem**: Merchant account not approved or credentials incorrect.

**Solution**:
- Verify merchant account is approved
- Check merchant ID and API key are correct
- Contact payment provider support

---

## 🚀 Production Setup

### Additional Steps for Production:

1. **Switch to Live Keys**:
   - Use production API keys (not test keys)
   - Update webhook endpoints to production URLs
   - Test thoroughly before going live

2. **Security**:
   - Never expose API keys
   - Use HTTPS for all payment endpoints
   - Verify webhook signatures
   - Implement idempotency (already done)

3. **Monitoring**:
   - Set up payment failure alerts
   - Monitor webhook delivery
   - Track payment success rates
   - Review reconciliation reports daily

4. **Compliance**:
   - Ensure PCI DSS compliance
   - Follow payment provider guidelines
   - Keep merchant agreements updated

---

## 💰 Fee Structure

**Stripe**:
- 2.9% + $0.30 per transaction (US)
- Varies by country

**Payme/Click/Uzum**:
- Contact provider for current rates
- Typically 1-3% per transaction

---

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Payme Documentation](https://developer.payme.uz)
- [Click Documentation](https://docs.click.uz)

---

## ✅ Checklist

### Stripe:
- [ ] Stripe account created
- [ ] Test API keys obtained
- [ ] Webhook endpoint configured
- [ ] Webhook secret copied
- [ ] Test payment successful
- [ ] Live keys obtained (for production)
- [ ] Production webhook configured

### Payme/Click/Uzum:
- [ ] Business account registered
- [ ] Merchant account approved (3-7 days)
- [ ] API credentials obtained
- [ ] Test payment successful
- [ ] Production credentials configured

---

## 🎯 Testing Strategy

1. **Development**:
   - Use test API keys
   - Test with test cards
   - Verify webhook handling

2. **Staging**:
   - Use test keys with production-like setup
   - Test all payment scenarios
   - Verify error handling

3. **Production**:
   - Start with small transactions
   - Monitor closely
   - Gradually increase volume

---

**Last Updated**: January 2025  
**Status**: ⚠️ Requires external approvals (3-7 days for Uzbekistan gateways)








