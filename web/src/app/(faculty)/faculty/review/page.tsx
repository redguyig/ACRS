'use client';

export default function PreviousAssignmentsPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: 0,
        }}>
          Previous Assignments
        </h1>
        <p style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
          marginTop: 4,
        }}>
          Review past assignment submissions and provide feedback
        </p>
      </div>

      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-lg)',
        padding: 48,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
        <h2 style={{
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: '0 0 8px',
        }}>
          No reviewed assignments yet
        </h2>
        <p style={{
          fontSize: 14,
          color: 'var(--text-tertiary)',
          margin: 0,
        }}>
          Previously reviewed assignments will appear here
        </p>
      </div>
    </div>
  );
}
