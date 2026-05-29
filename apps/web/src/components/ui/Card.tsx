import type { ReactNode, CSSProperties } from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: ReactNode;
  interactive?: boolean;
  glass?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

export function Card({ children, interactive, glass, className = '', style, onClick }: CardProps) {
  return (
    <div
      className={`${styles.card} ${interactive ? styles.interactive : ''} ${glass ? styles.glass : ''} ${className}`}
      style={style}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

interface MetricCardProps {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  iconBg: string;
  iconColor: string;
}

export function MetricCard({ icon, value, label, iconBg, iconColor }: MetricCardProps) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricIcon} style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div className={styles.metricValue}>{value}</div>
      <div className={styles.metricLabel}>{label}</div>
    </div>
  );
}
