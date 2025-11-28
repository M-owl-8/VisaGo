import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-primary-500/10 p-4">
            <FileQuestion className="h-12 w-12 text-primary-500" />
          </div>
        </div>

        <h1 className="mb-4 text-4xl font-bold text-white">404</h1>

        <h2 className="mb-4 text-xl font-semibold text-white">
          {t('errors.pageNotFound', 'Page not found')}
        </h2>

        <p className="mb-8 text-neutral-400">
          {t(
            'errors.pageNotFoundDescription',
            "The page you're looking for doesn't exist or has been moved."
          )}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/applications"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition-all hover:bg-primary-500 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <Home size={18} />
            {t('errors.goHome', 'Go home')}
          </Link>

          <Button
            variant="secondary"
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            {t('errors.goBack', 'Go back')}
          </Button>
        </div>
      </div>
    </div>
  );
}

