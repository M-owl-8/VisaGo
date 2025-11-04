# Phase 4: Future Setup - After Company Registration

**Status**: ⏸️ **DEFERRED** - Requires official company registration and subscriptions

This phase includes all external services that require:
- Official company registration
- Business verification
- Paid subscriptions or merchant accounts
- Compliance documentation

---

## 📋 Phase 4 Tasks (To Be Done Later)

### 1. Firebase Cloud Storage & FCM (Requires Paid Subscription)

**What it does:**
- Cloud Storage: File uploads for documents, avatars
- FCM: Push notifications to users

**Status**: Firebase project created (pcpt-203e6), but Cloud Storage & FCM require paid tier

**Setup Steps** (when ready):
```
1. Go to Firebase Console > Storage
   - Click "Get Started"
   - Start in Production mode
   - Choose region: asia-southeast1
   - Create storage bucket

2. Go to Firebase Console > Cloud Messaging
   - Enable FCM for the project
   - Get Server API Key from Cloud Messaging settings
   - Add to backend .env as FIREBASE_MESSAGING_SERVER_API_KEY

3. Update backend .env with:
   FIREBASE_STORAGE_BUCKET=pctt-203e6.appspot.com
   FIREBASE_MESSAGING_SERVER_API_KEY=<your-api-key>
```

**Environment Variables to Add Later**:
```
# Firebase Storage (Phase 4)
FIREBASE_STORAGE_BUCKET=pctt-203e6.appspot.com

# Firebase Messaging (Phase 4)
FIREBASE_MESSAGING_SENDER_ID=<from-service-account>
FIREBASE_MESSAGING_SERVER_API_KEY=<get-from-cloud-messaging>
```

---

### 2. Payment Gateway Configuration

**What it does:**
- Payme, Click, Uzum: Local Uzbekistan payments
- Stripe: International payments

**Status**: 🔴 NOT CONFIGURED - Requires merchant account setup

**Setup Steps** (when ready):

#### A. Payme Setup
```
1. Go to https://payme.uz/
2. Register business merchant account
3. Complete KYC (Know Your Customer) verification
4. Get credentials:
   - Merchant ID
   - API Key
   - Service ID
5. Configure webhook URL: https://api.visabuddy.com/api/payments/payme/webhook

Environment variables:
PAYME_MERCHANT_ID=<your-merchant-id>
PAYME_API_KEY=<your-api-key>
PAYME_SERVICE_ID=<your-service-id>
PAYME_API_URL=https://checkout.payme.uz
```

#### B. Click Setup
```
1. Go to https://click.uz/
2. Register merchant account
3. Complete business verification
4. Get credentials:
   - Merchant ID
   - Service ID
   - API Key
   - API Secret
5. Configure webhook URL: https://api.visabuddy.com/api/payments/click/webhook

Environment variables:
CLICK_MERCHANT_ID=<your-merchant-id>
CLICK_SERVICE_ID=<your-service-id>
CLICK_API_KEY=<your-api-key>
CLICK_API_SECRET=<your-api-secret>
CLICK_API_URL=https://api.click.uz
```

#### C. Uzum Setup
```
1. Go to https://checkout.uzum.uz/
2. Register merchant account
3. Complete verification process
4. Get credentials:
   - Merchant ID
   - API Key
5. Configure webhook URL: https://api.visabuddy.com/api/payments/uzum/webhook

Environment variables:
UZUM_MERCHANT_ID=<your-merchant-id>
UZUM_API_KEY=<your-api-key>
UZUM_API_URL=https://api.uzum.uz
```

#### D. Stripe Setup (International Fallback)
```
1. Go to https://dashboard.stripe.com/register
2. Sign up and complete account setup
3. Get credentials from Developers > API Keys:
   - Secret Key (sk_live_...)
   - Publishable Key (pk_live_...)
4. Configure webhook URL: https://api.visabuddy.com/api/webhooks/stripe

Environment variables:
STRIPE_API_KEY=<your-secret-key>
STRIPE_PUBLISHABLE_KEY=<your-publishable-key>
STRIPE_WEBHOOK_SECRET=<webhook-secret-from-webhook-settings>
```

---

## 🔧 All Phase 4 Environment Variables

Add these to backend `.env` when ready:

```env
# ===== FIREBASE (Phase 4) =====
FIREBASE_STORAGE_BUCKET=pctt-203e6.appspot.com
FIREBASE_MESSAGING_SENDER_ID=<get-from-service-account>
FIREBASE_MESSAGING_SERVER_API_KEY=<get-from-cloud-messaging>

# ===== PAYME (Phase 4) =====
PAYME_MERCHANT_ID=your-payme-merchant-id
PAYME_API_KEY=your-payme-api-key
PAYME_SERVICE_ID=your-payme-service-id
PAYME_API_URL=https://checkout.payme.uz

# ===== CLICK (Phase 4) =====
CLICK_MERCHANT_ID=your-click-merchant-id
CLICK_SERVICE_ID=your-click-service-id
CLICK_API_KEY=your-click-api-key
CLICK_API_SECRET=your-click-api-secret
CLICK_API_URL=https://api.click.uz

# ===== UZUM (Phase 4) =====
UZUM_MERCHANT_ID=your-uzum-merchant-id
UZUM_API_KEY=your-uzum-api-key
UZUM_API_URL=https://api.uzum.uz

# ===== STRIPE (Phase 4) =====
STRIPE_API_KEY=sk_live_your-stripe-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-public-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
```

---

## ✅ When to Execute Phase 4

- [ ] Company officially registered with tax ID
- [ ] Business bank account opened
- [ ] Company address verified
- [ ] Ready to accept real payments
- [ ] Legal review completed

---

## 📝 Checklist for Phase 4 Execution

When you're ready to execute Phase 4:

1. **Pre-requisites**:
   - [ ] Business registration documents ready
   - [ ] Tax ID obtained
   - [ ] Bank account details
   - [ ] Domain verified
   - [ ] SSL certificate active on production domain

2. **Firebase Setup**:
   - [ ] Enable Cloud Storage
   - [ ] Configure storage rules
   - [ ] Enable FCM
   - [ ] Test file upload
   - [ ] Test push notifications

3. **Payment Gateway Setup** (pick which to enable):
   - [ ] Payme merchant verification complete
   - [ ] Click merchant verification complete
   - [ ] Uzum merchant verification complete
   - [ ] Stripe account fully verified
   - [ ] All webhooks configured and tested

4. **Backend Configuration**:
   - [ ] All .env variables populated
   - [ ] Payment routes tested with sandbox credentials
   - [ ] Payment webhook handlers verified
   - [ ] Error handling for payment failures

5. **Frontend Configuration**:
   - [ ] Payment UI updated with real payment methods
   - [ ] File upload UI enabled and tested
   - [ ] Push notification permissions requested
   - [ ] Testing with real transactions

---

## 🚀 Next Steps (After Phase 4)

Once Phase 4 is complete:
- Deploy to production
- Set up monitoring and alerts
- Configure backup strategies
- Prepare for launch

---

## 📞 Support URLs

- **Payme Documentation**: https://payme.uz/docs
- **Click Documentation**: https://click.uz/docs
- **Uzum Documentation**: https://checkout.uzum.uz/docs
- **Stripe Documentation**: https://stripe.com/docs
- **Firebase Documentation**: https://firebase.google.com/docs