import type { ReactNode } from 'react';
import Image from 'next/image';

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

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-12">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/10 bg-white/5 p-2 shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
            <Image
              src="/images/ketdik-icon.jpg"
              alt="Ketdik icon"
              width={60}
              height={60}
              priority
              className="h-14 w-14 rounded-2xl object-cover"
            />
          </div>
          <p className="text-xs uppercase tracking-[0.5em] text-white/60">Visa Workspace</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">Ketdik</h1>
          <p className="mt-2 text-sm text-white/50">
            {formSubtitle ||
              'Your trusted digital visa companion. Stay in sync across mobile and web.'}
          </p>
        </div>

        <div className="mt-10 w-full rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_40px_90px_rgba(0,0,0,0.45)] backdrop-blur-[22px] sm:p-10">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.5em] text-white/40">Workspace Access</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">{formTitle}</h2>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
