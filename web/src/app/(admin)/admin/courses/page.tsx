'use client';

export default function AdminCoursesPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Courses
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Manage courses and departments
        </p>
      </div>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-lg)', padding: 48, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎓</div>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          Course Management
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>
          Course management features coming soon
        </p>
      </div>
    </div>
  );
}
