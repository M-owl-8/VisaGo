'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const services = [
  'AI-powered document checklist',
  'AI document verification',
  'Visa approval chance (percentage)',
  'Personalized feedback on your case',
  'AI support chat',
  '24/7 customer support',
];

export default function PaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    try {
      setLoading(true);
      setError(null);
      const returnUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/dashboard?payment=success`
          : undefined;
      const resp = await apiClient.createSubscriptionCheckout(returnUrl);
      if (!resp.success || !resp.data?.url) {
        throw new Error(resp.error?.message || 'Failed to start checkout');
      }
      window.location.href = resp.data.url;
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold text-white">Subscribe to Ketdik</h1>
      <p className="text-white/70">Access all features with a $49/month subscription (≈ 599,000 UZS).</p>

      <Card className="bg-white/5 border-white/10 p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-lg text-white font-semibold">$49/month</p>
            <p className="text-sm text-white/60">International cards (Visa/Mastercard) via Stripe Checkout</p>
            <p className="text-sm text-white/40">Uzcard/Humo/Payme coming soon</p>
          </div>
          <Button
            onClick={handlePay}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2"
          >
            {loading ? 'Redirecting…' : 'Pay with international card'}
          </Button>
        </div>

        {error && (
          <div className="rounded border border-red-500/40 bg-red-500/10 text-red-200 px-4 py-3">
            {error}
          </div>
        )}
      </Card>

      <Card className="bg-white/5 border-white/10 p-6">
        <h2 className="text-xl font-semibold text-white mb-3">What you get</h2>
        <ul className="list-disc list-inside space-y-2 text-white/80">
          {services.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

