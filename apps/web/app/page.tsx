'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';
import { HeroSection } from '@/components/landing/HeroSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { CountriesSection } from '@/components/landing/CountriesSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHeader } from '@/components/landing/LandingHeader';

export default function LandingPage() {
  const router = useRouter();
  const { isSignedIn, isLoading } = useAuthStore();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && isSignedIn) {
      router.push('/applications');
    }
  }, [isSignedIn, isLoading, router]);

  // Show loading state briefly if checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center text-white">
          <div className="mb-4 text-2xl font-bold">Ketdik</div>
          <div className="text-white/60">Loading...</div>
        </div>
      </div>
    );
  }

  // Don't show landing page if user is signed in (will redirect)
  if (isSignedIn) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-white">
      {/* Background Effects */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(62,166,255,0.15),transparent_60%),radial-gradient(circle_at_80%_0%,rgba(13,25,56,0.7),transparent_40%)]" />
        <div className="blur-[180px] opacity-40 absolute right-[-10%] top-[-5%] h-72 w-72 rounded-full bg-primary animate-blob" />
        <div className="blur-[200px] opacity-30 absolute left-[-5%] bottom-[-10%] h-72 w-72 rounded-full bg-primary-dark animate-blob" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <LandingHeader />
        <main>
          <HeroSection />
          <HowItWorksSection />
          <FeaturesSection />
          <CountriesSection />
          <FAQSection />
        </main>
        <LandingFooter />
      </div>
    </div>
  );
}
