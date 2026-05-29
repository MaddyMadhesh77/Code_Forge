import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Anvil,
  Braces,
  Zap,
  BarChart3,
  ArrowRight,
  Terminal,
  Users,
  Shield,
  Cpu,
  GitBranch,
  Layers,
} from 'lucide-react';
import { FloatingParticles } from '../components/shared/FloatingParticles';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import styles from './Landing.module.css';

/* ── Animation presets ── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 1, scale: 1 },
};

/* ── Stat counter ── */
function Stat({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const animated = useAnimatedCounter(value, 1600, 600);
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>
        {animated}
        {suffix}
      </span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

/* ── Feature card data ── */
const features = [
  {
    icon: <Braces size={24} />,
    title: 'Live Collaboration',
    description:
      'Code together in real-time with WebSocket-powered pair programming sessions. See cursors, selections, and edits instantly.',
    accent: 'var(--accent-primary)',
  },
  {
    icon: <Zap size={24} />,
    title: 'Smart Execution',
    description:
      'Run code in sandboxed environments with instant feedback on correctness, runtime, and memory performance.',
    accent: 'var(--accent-cyan)',
  },
  {
    icon: <BarChart3 size={24} />,
    title: 'Deep Analytics',
    description:
      'Track submissions, acceptance rates, and candidate performance with rich, real-time dashboards.',
    accent: 'var(--accent-amber)',
  },
  {
    icon: <Shield size={24} />,
    title: 'Enterprise Auth',
    description:
      'OIDC SSO, SCIM user provisioning, and role-based access control built from day one.',
    accent: 'var(--accent-purple)',
  },
  {
    icon: <Cpu size={24} />,
    title: 'Multi-Language',
    description:
      'Python, JavaScript, C++, and Java — with isolated execution environments and starter code templates.',
    accent: 'var(--accent-rose)',
  },
  {
    icon: <GitBranch size={24} />,
    title: 'Session Management',
    description:
      'Schedule, run, and review interviews with full audit trails and YJS-backed collaborative state.',
    accent: 'var(--accent-cyan)',
  },
];

/* ── Code preview content ── */
const codeLines = [
  { indent: 0, text: 'async function runInterview() {', color: 'var(--accent-purple)' },
  { indent: 1, text: 'const session = await createSession({', color: 'var(--text-secondary)' },
  { indent: 2, text: "title: 'Senior Engineer — Round 1',", color: 'var(--accent-amber)' },
  { indent: 2, text: "problems: ['two-sum', 'merge-k-sorted'],", color: 'var(--accent-cyan)' },
  { indent: 2, text: 'participants: [interviewer, candidate],', color: 'var(--accent-cyan)' },
  { indent: 1, text: '});', color: 'var(--text-secondary)' },
  { indent: 0, text: '', color: '' },
  { indent: 1, text: 'await session.start();', color: 'var(--accent-primary)' },
  { indent: 1, text: 'const result = await session.evaluate();', color: 'var(--accent-primary)' },
  { indent: 1, text: "// ✓ ACCEPTED — 42ms, 14.2KB", color: 'var(--status-success)' },
  { indent: 0, text: '}', color: 'var(--accent-purple)' },
];

export function Landing() {
  return (
    <div className={styles.page}>
      <FloatingParticles count={40} />

      {/* ── Glow orbs ── */}
      <div className={`${styles.orb} ${styles.orb1}`} />
      <div className={`${styles.orb} ${styles.orb2}`} />
      <div className={`${styles.orb} ${styles.orb3}`} />

      {/* ── Nav ── */}
      <motion.nav
        className={styles.nav}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.navLeft}>
          <div className={styles.logoIcon}>
            <Anvil size={18} />
          </div>
          <span className={styles.logoText}>CodeForge</span>
        </div>
        <div className={styles.navRight}>
          <Link to="/login" className={styles.navLink}>
            Sign In
          </Link>
          <Link to="/register" className={styles.navCta}>
            Get Started <ArrowRight size={14} />
          </Link>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <motion.div
          className={styles.heroContent}
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.div
            className={styles.heroBadge}
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            <Terminal size={14} />
            <span>Built for Engineering Teams</span>
          </motion.div>

          <motion.h1
            className={styles.heroTitle}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
          >
            Where Code Meets
            <br />
            <span className={styles.heroGradient}>Excellence</span>
          </motion.h1>

          <motion.p
            className={styles.heroSubtitle}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
          >
            The ultimate platform for technical interviews. Real-time collaboration,
            intelligent code execution, and beautiful analytics — all forged in one place.
          </motion.p>

          <motion.div
            className={styles.heroCtas}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
          >
            <Link to="/" className={styles.primaryBtn}>
              <Layers size={16} />
              Open Dashboard
            </Link>
            <Link to="/login" className={styles.secondaryBtn}>
              Sign In
              <ArrowRight size={14} />
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            className={styles.statsRow}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
          >
            <Stat value={156} label="Problems" suffix="+" />
            <div className={styles.statDivider} />
            <Stat value={342} label="Submissions Today" />
            <div className={styles.statDivider} />
            <Stat value={67} label="Acceptance Rate" suffix="%" />
          </motion.div>
        </motion.div>

        {/* Code preview panel */}
        <motion.div
          className={styles.codePreview}
          variants={scaleIn}
          initial="hidden"
          animate="show"
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          <div className={styles.codeHeader}>
            <div className={styles.codeDots}>
              <span className={styles.dot} style={{ background: '#EF4444' }} />
              <span className={styles.dot} style={{ background: '#F59E0B' }} />
              <span className={styles.dot} style={{ background: '#34D399' }} />
            </div>
            <span className={styles.codeFilename}>interview.ts</span>
          </div>
          <div className={styles.codeBody}>
            {codeLines.map((line, i) => (
              <motion.div
                key={i}
                className={styles.codeLine}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.8 + i * 0.08 }}
              >
                <span className={styles.lineNumber}>{i + 1}</span>
                <span
                  style={{
                    paddingLeft: `${line.indent * 20}px`,
                    color: line.color || 'var(--text-muted)',
                  }}
                >
                  {line.text}
                </span>
              </motion.div>
            ))}
            {/* Blinking cursor */}
            <motion.span
              className={styles.cursor}
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
            />
          </div>
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section className={styles.features}>
        <motion.div
          className={styles.featuresHeader}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          <h2 className={styles.sectionTitle}>Everything You Need</h2>
          <p className={styles.sectionSubtitle}>
            A complete toolkit for running world-class technical interviews.
          </p>
        </motion.div>

        <motion.div
          className={styles.featuresGrid}
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
        >
          {features.map((f, i) => (
            <motion.div
              key={i}
              className={styles.featureCard}
              variants={fadeUp}
              transition={{ duration: 0.45 }}
            >
              <div className={styles.featureIcon} style={{ color: f.accent, background: `color-mix(in srgb, ${f.accent} 12%, transparent)` }}>
                {f.icon}
              </div>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Bottom CTA ── */}
      <motion.section
        className={styles.bottomCta}
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
      >
        <div className={styles.ctaGlow} />
        <Users size={28} className={styles.ctaIcon} />
        <h2 className={styles.ctaTitle}>Ready to forge better interviews?</h2>
        <p className={styles.ctaSubtitle}>
          Get started in seconds. No credit card required.
        </p>
        <Link to="/register" className={styles.primaryBtn}>
          Create Free Account
          <ArrowRight size={16} />
        </Link>
      </motion.section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Anvil size={16} />
            <span>CodeForge</span>
          </div>
          <span className={styles.footerCopy}>
            © {new Date().getFullYear()} CodeForge. Built with passion for engineering.
          </span>
        </div>
      </footer>
    </div>
  );
}
