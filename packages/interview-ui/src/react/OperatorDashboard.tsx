import React, { useState, useEffect } from 'react';

type DLQInfo = { queue?: Record<string, unknown>; dlq?: Record<string, unknown> };
type AuditEntries = { tenant?: string; count?: number; entries?: unknown[] };

export const OperatorDashboard: React.FC = () => {
  const [dlq, setDlq] = useState<DLQInfo>({});
  const [audit, setAudit] = useState<AuditEntries>({});
  const [tenant, setTenant] = useState<string>('unknown');
  const [loading, setLoading] = useState(false);

  const fetchDLQ = async () => {
    setLoading(true);
    try {
      const res = await fetch('/operator/dlq');
      const data = await res.json();
      setDlq(data);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch DLQ', e);
    }
    setLoading(false);
  };

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/operator/audit/${tenant}?limit=200`);
      const data = await res.json();
      setAudit(data);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch audit', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDLQ();
  }, []);

  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', padding: 24 }}>
      <h1>Operator Dashboard</h1>

      <section style={{ marginBottom: 24 }}>
        <h2>Dead Letter Queue</h2>
        <button onClick={fetchDLQ} disabled={loading}>
          Refresh
        </button>
        <pre>{JSON.stringify(dlq, null, 2)}</pre>
      </section>

      <section>
        <h2>Audit Logs</h2>
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Tenant ID"
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
          />
          <button onClick={fetchAudit} disabled={loading}>
            Load
          </button>
        </div>
        <pre>{JSON.stringify(audit, null, 2)}</pre>
      </section>
    </div>
  );
};

export default OperatorDashboard;
