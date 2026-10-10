'use client';

export default function AdminReportsPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Reports
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Analytics and system reports
        </p>
      </div>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-lg)', padding: 48, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          Reports & Analytics
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>
          System-wide reports and analytics coming soon
        </p>
      </div>
    </div>
  );
}
