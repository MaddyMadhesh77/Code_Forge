import { useAuth } from '../../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[color:var(--bg-primary)] text-[color:var(--text-muted)]">
        <div className="rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-surface)] px-4 py-3 shadow-md">
          Loading workspace...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
