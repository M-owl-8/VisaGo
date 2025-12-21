'use client';

export const dynamic = 'force-dynamic';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#040816', color: '#ffffff', padding: '2rem' }}>
      <div style={{ maxWidth: '28rem', width: '100%', padding: '1.5rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '1rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Something went wrong</h1>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1rem' }}>
          Please try again. If it keeps happening, return to home.
        </p>

        {typeof window !== 'undefined' && process.env.NODE_ENV !== 'production' && (
          <pre style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', padding: '0.75rem', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '0.5rem', marginBottom: '1rem', overflow: 'auto' }}>
            {String(error?.message || error)}
          </pre>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.2)', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', cursor: 'pointer' }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.2)', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', textDecoration: 'none', display: 'inline-block' }}
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

