import type { ReactNode } from 'react';
import Image from 'next/image';
import { LanguageSwitcher } from '@/components/landing/LanguageSwitcher';

type AuthLayoutProps = {
  children: ReactNode;
  formTitle: string;
  formSubtitle?: string;
};

export function AuthLayout({ children, formTitle, formSubtitle }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030814] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(62,166,255,0.15),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(7,12,30,0.7),transparent_35%),linear-gradient(180deg,#030814,#060b1c,#0d162a)]" />
        <div className="absolute -left-32 top-20 h-80 w-80 rounded-full border border-white/10 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full border border-white/5 blur-[180px]" />
      </div>

      {/* Language Switcher - Top Right */}
      <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4 md:right-6 md:top-6">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-8 md:py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[26px] border border-white/10 bg-white/5 p-2 shadow-[0_20px_40px_rgba(0,0,0,0.45)] sm:mb-6 sm:h-20 sm:w-20">
            <Image
              src="/images/ketdik-icon.jpg"
              alt="Ketdik icon"
              width={60}
              height={60}
              priority
              className="h-12 w-12 rounded-2xl object-cover sm:h-14 sm:w-14"
            />
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:mt-3 sm:text-3xl md:text-4xl">Ketdik</h1>
          <p className="mt-1.5 text-xs text-white/50 sm:mt-2 sm:text-sm">
            {formSubtitle ||
              'Your trusted digital visa companion. Stay in sync across mobile and web.'}
          </p>
        </div>

        <div className="mt-6 w-full rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_40px_90px_rgba(0,0,0,0.45)] backdrop-blur-[22px] sm:mt-8 sm:rounded-[32px] sm:p-6 md:p-8 lg:p-10">
          <div className="mb-6 sm:mb-8">
            <p className="text-[10px] uppercase tracking-[0.5em] text-white/40 sm:text-xs">Workspace Access</p>
            <h2 className="mt-2 text-xl font-semibold text-white sm:mt-3 sm:text-2xl md:text-3xl">{formTitle}</h2>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
