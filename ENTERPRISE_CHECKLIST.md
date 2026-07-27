# Enterprise Checklist: Code Forge

## Pre-Sales Requirements

### ✅ Product & Platform
- [x] Multi-tenant isolation with audit logs
- [x] GDPR-ready data deletion (retention policies)
- [x] Full observability (Prometheus, Grafana, alerts)
- [x] Job queue with DLQ for reliability
- [x] Public API + webhooks for ATS sync
- [x] WebSocket for real-time collaboration
- [x] Role-based access control (interviewer, candidate, observer)

### 🔐 Security & Compliance
- [ ] **SOC 2 Type II audit** (in progress)
- [ ] **ISO 27001 certification** (recommended within 6 months)
- [ ] **HIPAA readiness** (if handling healthcare data)
- [x] Sandbox hardening: seccomp profiles, resource limits
- [x] Image pinning & SRI verification
- [x] Append-only audit logs
- [ ] Data encryption at rest (recommended: KMS integration)
- [ ] Data encryption in transit (HTTPS/TLS 1.3)

### 🔑 Authentication & Provisioning
- [x] **OIDC/SSO support**: Okta, Azure AD, Google Workspace compatible
- [x] **SCIM 2.0 provider**: Group provisioning + automated user sync
- [ ] **Multi-factor authentication (MFA)** 
- [ ] **Passwordless auth** (FIDO2 / WebAuthn)
- [ ] **Domain verification** for SSO

### 📊 Observability & Operations
- [x] Real-time metrics dashboard (Grafana)
- [x] Alert rules for SLA violations
- [x] Operator dashboard for DLQ inspection
- [x] Audit log export (JSON, CSV)
- [ ] **Advanced analytics**: Usage trends, cost allocation per tenant
- [ ] **Health monitoring**: API uptime, queue latency, retention compliance

### 💾 Data & Retention
- [x] Configurable retention policies (default: 90 days)
- [x] Automated deletion enforcement (daily job)
- [ ] **On-premises data residency** (separate deployment)
- [ ] **Custom data classification** (public, internal, confidential, restricted)
- [ ] **Data export on request** (GDPR right to portability)

### 🚀 Deployment & SLA
- [x] Docker/Kubernetes ready
- [x] Health probes (`/health`, `/ready`)
- [ ] **Multi-region failover** (RTO: < 5 minutes, RPO: < 1 minute)
- [ ] **99.9% uptime SLA** (with monitoring)
- [ ] **Disaster recovery plan** (documented)
- [ ] **Incident response playbook** (runbook)

---

## Sales Pitch Template

### The Problem
Engineering teams spend **40+ hours per month** on hiring interviews:
- Manual scheduling and rescheduling
- Inconsistent evaluation across interviewers
- No standardized rubrics or benchmarks
- Difficult ATS/integration workflows
- Privacy concerns with code execution

### The Solution: Code Forge
1. **Live, collaborative interviews** - Real-time code editor, execution, WebSocket sync
2. **Fair evaluation** - Standardized rubrics, scorecard system, anti-cheat controls
3. **Enterprise trust** - Multi-tenant isolation, audit logs, SSO, SCIM provisioning
4. **ATS integration** - Public API + webhooks for seamless candidate workflow
5. **Operator control** - Full observability, retention policies, DLQ inspection

### Key Differentiators
- ✨ **Only platform with real-time collaboration + anti-cheat in one interface**
- 🔒 **Enterprise-grade audit trail** (every keystroke logged, exportable)
- ⚡ **Lightning-fast execution** (code runs in < 100ms)
- 📈 **Fair benchmarking** (compare candidates across roles & regions)
- 🌍 **Multi-region deployment** (data residency compliance)

### Pricing Tiers

#### Tier 1: Startup ($1,999/month)
- Up to 5 interviewers
- Up to 50 interviews/month
- Public API (read-only)
- Email support

#### Tier 2: Growth ($4,999/month)
- Up to 25 interviewers
- Up to 500 interviews/month
- Full Public API + webhooks
- ATS integrations (Greenhouse, Lever, Workday)
- Priority support

#### Tier 3: Enterprise (Custom)
- Unlimited interviewers & interviews
- SSO + SCIM provisioning
- Custom data residency
- Dedicated Slack support
- Quarterly business reviews

---

## Trial Flow (< 5 minutes to first interview)

1. **Sign up** (email or SSO) - 30 seconds
2. **Invite teammate** (no setup needed) - 30 seconds
3. **Create interview** (select template, problem, language) - 1 minute
4. **Run live session** (start coding immediately) - 2 minutes

---

## Enterprise Proof of Concept (POC)

### Phase 1: Setup (1 week)
- [ ] Provision dedicated tenant
- [ ] Configure SSO (OIDC)
- [ ] Set up SCIM sync
- [ ] Enable audit log export to customer's data warehouse

### Phase 2: Data Residency (1 week)
- [ ] Deploy Code Forge to customer's preferred region (us-west, eu-central, ap-southeast)
- [ ] Enable encryption at rest (customer-managed KMS keys)
- [ ] Configure retention policies per compliance requirements

### Phase 3: Integration (2 weeks)
- [ ] ATS webhook registration
- [ ] Candidate scorecard → ATS sync
- [ ] Hiring manager dashboard
- [ ] Calibration session template

### Phase 4: Training & Handoff (1 week)
- [ ] Operator training (dashboard, alerts, DLQ inspection)
- [ ] End-user training (interviewers, candidates)
- [ ] Documentation & runbooks
- [ ] Escalation process

---

## Legal & Compliance Docs Needed

- [ ] **Data Processing Agreement (DPA)** - for GDPR
- [ ] **Privacy Policy** - per jurisdiction
- [ ] **Terms of Service** - with SLA clause
- [ ] **Security Questionnaire** - for customer procurement
- [ ] **Incident Response SLA** - e.g., "Critical: < 1 hour response"

---

## Competitive Positioning

| Feature | Code Forge | Codility | HackerRank | Pramp |
|---------|-----------|----------|-----------|-------|
| Real-time collaboration | ✅ | ❌ | ❌ | ✅ |
| Anti-cheat controls | ✅ | ⚠️ | ✅ | ❌ |
| Audit logs (exportable) | ✅ | ❌ | ⚠️ | ❌ |
| SSO + SCIM | ✅ | ❌ | ✅ | ❌ |
| ATS webhooks | ✅ | ⚠️ | ✅ | ❌ |
| Data residency | ✅ | ⚠️ | ⚠️ | ❌ |
| Multi-language support | ✅ | ✅ | ✅ | ✅ |
| On-premises option | 🔜 | ⚠️ | ❌ | ❌ |

---

## Sales Objection Handlers

### "Why not just use [competitor]?"
**Our edge:** Only platform with real-time **collaboration** + **audit compliance** + **fair anti-cheat** in one interface. Other platforms require separate tools for screen recording, Slack notifications, and external scoring.

### "We already use [ATS]. Will it integrate?"
**Answer:** We support webhooks + custom integrations for any ATS (Greenhouse, Lever, Workday, etc.). If your ATS isn't in our list, we'll build the integration as part of the POC.

### "How is our data secured?"
**Answer:** Multi-tenant isolation, append-only audit logs, encryption in transit (TLS 1.3), optional encryption at rest (KMS), GDPR-compliant data deletion, SOC 2 Type II audit available.

### "Can we deploy on-premises?"
**Answer:** We offer cloud + dedicated tenancy today. On-premises deployment is on our roadmap for late 2026. For now, we can deploy to your preferred AWS region with VPC isolation.

### "What if your system goes down during an interview?"
**Answer:** 99.9% uptime SLA. Code execution runs on redundant workers with automatic failover. If the platform goes down, interviewers can continue in "offline mode" and sync results when service restores.

---

## Success Metrics for Customer

- **Time-to-hire**: Target 30% reduction
- **Interview consistency**: Rubric adherence > 95%
- **Candidate feedback score**: > 4.5/5 average
- **Operator efficiency**: < 2 hours/week for platform management
- **Integration uptime**: > 99.9%

---

## Next Steps After Close

1. Schedule kick-off call with customer's IT, Security, and Hiring teams
2. Provision POC tenant with custom branding
3. Configure SSO (customer provides OIDC endpoint)
4. Whitelist customer's IP range (if required)
5. Begin Phase 1 setup
