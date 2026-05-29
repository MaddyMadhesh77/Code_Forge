import { motion } from 'framer-motion';
import { useMemo } from 'react';
import styles from './FloatingParticles.module.css';

const CODE_SYMBOLS = [
  '{', '}', '<', '>', '/', '(', ')', ';', '=', ':',
  'fn', '=>', '[]', '&&', '||', '++', '--', '**',
  'if', 'for', 'let', 'async', 'await', 'return',
  '0x', 'null', 'true', '01', '42',
];

interface Particle {
  id: number;
  symbol: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    symbol: CODE_SYMBOLS[i % CODE_SYMBOLS.length],
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 10 + Math.random() * 14,
    duration: 18 + Math.random() * 24,
    delay: Math.random() * -30,
    drift: -30 + Math.random() * 60,
  }));
}

export function FloatingParticles({ count = 35 }: { count?: number }) {
  const particles = useMemo(() => generateParticles(count), [count]);

  return (
    <div className={styles.container} aria-hidden="true">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className={styles.particle}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: `${p.size}px`,
          }}
          animate={{
            y: [0, -80, 0],
            x: [0, p.drift, 0],
            opacity: [0, 0.35, 0.2, 0],
            rotate: [0, p.drift > 0 ? 15 : -15, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {p.symbol}
        </motion.span>
      ))}
    </div>
  );
}
