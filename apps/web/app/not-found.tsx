export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#040816', padding: '1rem' }}>
      <div style={{ maxWidth: '28rem', margin: '0 auto', textAlign: 'center', padding: '1.5rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '1rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>404</h1>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.5rem' }}>Page not found</h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1rem' }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <a
            href="/"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '1rem', border: '1px solid rgba(255, 255, 255, 0.2)', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

