import { useState, useEffect } from 'react';
import { AnimatedPage } from '../components/shared/AnimatedPage';
import { Card } from '../components/ui/Card';
import { getOperatorDLQ, getOperatorAuditLogs } from '../services/api';
import styles from './Operator.module.css';

export function Operator() {
  const [dlq, setDlq] = useState<unknown>(null);
  const [audit, setAudit] = useState<unknown>(null);
  const [tenant, setTenant] = useState('default');
  const [loading, setLoading] = useState(false);

  const fetchDLQ = async () => {
    setLoading(true);
    const data = await getOperatorDLQ();
    setDlq(data);
    setLoading(false);
  };

  const fetchAudit = async () => {
    setLoading(true);
    const data = await getOperatorAuditLogs(tenant);
    setAudit(data);
    setLoading(false);
  };

  useEffect(() => { fetchDLQ(); }, []);

  return (
    <AnimatedPage>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1>Operator Dashboard</h1>
          <p className={styles.subtitle}>Internal tools — DLQ inspection and tenant audit logs</p>
        </div>

        <Card>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Dead Letter Queue</h2>
              <button className={styles.refreshBtn} onClick={fetchDLQ} disabled={loading} type="button">
                Refresh
              </button>
            </div>
            <pre className={styles.pre}>{dlq ? JSON.stringify(dlq, null, 2) : 'No data — backend may be offline.'}</pre>
          </div>
        </Card>

        <Card>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Audit Logs</h2>
              <div className={styles.tenantRow}>
                <input
                  className={styles.tenantInput}
                  placeholder="Tenant ID"
                  value={tenant}
                  onChange={(e) => setTenant(e.target.value)}
                />
                <button className={styles.refreshBtn} onClick={fetchAudit} disabled={loading} type="button">
                  Load
                </button>
              </div>
            </div>
            <pre className={styles.pre}>{audit ? JSON.stringify(audit, null, 2) : 'Enter a tenant ID and click Load.'}</pre>
          </div>
        </Card>
      </div>
    </AnimatedPage>
  );
}
