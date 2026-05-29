import type { Difficulty, SessionStatus, Verdict } from '../../types';
import styles from './Badge.module.css';

type BadgeVariant = 'easy' | 'medium' | 'hard' | 'scheduled' | 'active' | 'completed' | 'cancelled' | 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'runtime_error' | 'compilation_error' | 'internal_error' | 'pending' | 'lang';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {children}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const variant = difficulty.toLowerCase() as BadgeVariant;
  return <Badge variant={variant}>{difficulty}</Badge>;
}

export function StatusBadge({ status }: { status: SessionStatus }) {
  const variant = status.toLowerCase() as BadgeVariant;
  return <Badge variant={variant}>{status}</Badge>;
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const variant = verdict.toLowerCase() as BadgeVariant;
  const label = verdict.replace(/_/g, ' ');
  return <Badge variant={variant}>{label}</Badge>;
}

export function LangBadge({ lang }: { lang: string }) {
  return <Badge variant="lang">{lang}</Badge>;
}
