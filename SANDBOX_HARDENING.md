# Sandbox Hardening & Resource Enforcement Guide

## Overview

Code Forge executes untrusted code in a sandboxed environment. This guide describes the defense-in-depth strategy for preventing escape, resource exhaustion, and system compromise.

---

## 1. Seccomp Profile Enforcement

**Location:** `infra/sandbox/seccomp.json`

Seccomp (secure computing) restricts which syscalls a process can invoke. Our profile whitelists only essential syscalls for code execution:

### Whitelisted Syscall Categories

| Category | Syscalls | Purpose |
|----------|----------|---------|
| **Memory** | mmap, mprotect, brk, mremap, mlock | Heap/stack management |
| **File I/O** | open, read, write, close, stat, lseek | Code execution, file reads |
| **Process** | clone, fork, exec, exit, wait | Spawn workers, multi-threading |
| **Signals** | sigaction, sigprocmask, rt_sigaction | Signal handling |
| **IPC** | pipe, dup, fcntl, poll, select, epoll | Inter-process communication |
| **Time** | clock_gettime, gettimeofday, time | Timing |
| **System Info** | getpid, getuid, uname, gettid | Process introspection |

### Blocked Syscalls (Examples)

- ❌ `ptrace` - debug/escape other processes
- ❌ `mount`, `umount` - filesystem manipulation
- ❌ `syslog` - kernel log access
- ❌ `sethostname` - network namespace escape
- ❌ `socket` - network access (if not needed)
- ❌ `ioctl` (most) - device manipulation

### Docker Integration

```bash
# Run container with seccomp profile
docker run --security-opt seccomp=infra/sandbox/seccomp.json codeforge-executor:latest

# Or in docker-compose.yml
services:
  executor:
    image: codeforge-executor:latest
    security_opt:
      - seccomp:infra/sandbox/seccomp.json
```

---

## 2. Resource Caps & Limits

**Location:** `apps/api/src/services/resource-caps.service.ts`

### CPU Time Limit

```typescript
const caps = new ResourceCaps(
  cpuTimeMs = 5000,      // Max 5 seconds of CPU time
  memoryMb = 128,        // Max 128 MB RAM
  diskMb = 50,           // Max 50 MB/s I/O
  processesMax = 10,     // Max 10 child processes
  fileDescriptorsMax = 256,  // Max 256 open files
);
```

### Enforcement Methods

#### 1. **Docker Flags** (Recommended)
```bash
docker run \
  --cpus=5 \                    # 5 CPU cores max
  --memory=128m \               # 128 MB RAM
  --memory-swap=256m \          # 256 MB total (RAM + swap)
  --pids-limit=10 \             # Max 10 processes
  --ulimit nofile=256:256 \     # Max 256 file descriptors
  --read-only \                 # Read-only root filesystem
  --tmpfs /tmp:size=10m \       # Temporary storage (10 MB)
  codeforge-executor
```

#### 2. **Cgroups v2** (Kubernetes)
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: code-executor
spec:
  containers:
  - name: executor
    image: codeforge-executor:latest
    resources:
      requests:
        memory: "128Mi"
        cpu: "500m"
      limits:
        memory: "256Mi"        # Soft limit
        cpu: "1000m"           # 1 CPU core max
    securityContext:
      runAsNonRoot: true
      runAsUser: 1000
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
      capabilities:
        drop:
          - ALL
      seccompProfile:
        type: Localhost
        localhostProfile: sandbox-seccomp.json
```

#### 3. **Process-Level Limits** (Node.js only)
```typescript
import os from 'os';
const resourceCaps = new ResourceCaps();
// Note: os.setrlimit not available; use docker/cgroups for enforcement
```

### Monitoring & Enforcement

```bash
# Check live resource usage
docker stats codeforge-executor

# Kill if memory exceeded
docker update --memory=128m codeforge-executor

# Inspect cgroups (Linux)
cat /sys/fs/cgroup/memory/docker/<container-id>/memory.limit_in_bytes
cat /sys/fs/cgroup/cpuacct/docker/<container-id>/cpuacct.usage
```

---

## 3. Image Pinning & Immutability

**Goal:** Prevent supply-chain attacks via base image tampering.

### Strategy

1. **Pin base images by digest (not tag)**
   ```dockerfile
   # ❌ BAD: tags can be rewritten
   FROM python:3.11
   
   # ✅ GOOD: digest is immutable
   FROM python:3.11@sha256:abc123def456...
   ```

2. **Sign images with cosign/notary**
   ```bash
   # Sign image after build
   cosign sign --key cosign.key codeforge-executor:v1
   
   # Verify before execution
   cosign verify --key cosign.pub codeforge-executor:v1
   ```

3. **OCI Attestation** (optional)
   ```bash
   # Generate build provenance (SBOM, build log, test results)
   cosign attest codeforge-executor:v1 --attestation sbom.json
   
   # Verify attestation
   cosign verify-attestation codeforge-executor:v1
   ```

### Dockerfile Best Practices

```dockerfile
# Multi-stage build
FROM python:3.11@sha256:abc123... AS builder
RUN apt-get update && apt-get install -y --no-install-recommends python3-dev

FROM python:3.11@sha256:abc123...
COPY --from=builder /usr/local/bin/python /usr/local/bin/

# Non-root user
RUN useradd -u 1000 executor
USER executor

# Read-only filesystem
RUN mkdir -p /tmp && chmod 777 /tmp

# No shell
ENTRYPOINT ["/bin/python"]
```

---

## 4. Network Isolation

### Option 1: Disable Network (Preferred)
```bash
docker run --network=none codeforge-executor
# Code cannot reach external services; reduces attack surface
```

### Option 2: Restricted Network Policy
```yaml
# Kubernetes NetworkPolicy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: executor-deny-egress
spec:
  podSelector:
    matchLabels:
      app: executor
  policyTypes:
    - Egress
  egress:
    # Allow DNS only
    - to:
      - podSelector:
          matchLabels:
            app: dns
      ports:
        - port: 53
          protocol: UDP
```

---

## 5. Execution Timeout

Code must complete within the CPU time limit, enforced at two levels:

1. **Docker/Cgroups** - Hard kill at CPU limit
2. **Application** - Graceful timeout before hard limit
   ```typescript
   const timeoutMs = 5000;
   const abortController = new AbortController();
   const timer = setTimeout(() => abortController.abort(), timeoutMs);
   try {
     await executeCode(codeString, { signal: abortController.signal });
   } finally {
     clearTimeout(timer);
   }
   ```

---

## 6. File System Isolation

### Read-Only Root + Tmpfs

```bash
docker run \
  --read-only \                    # Root FS is read-only
  --tmpfs /tmp:size=10m \          # 10 MB temporary storage
  --tmpfs /run:size=100m \         # 100 MB for process state
  codeforge-executor
```

### Whitelist Directories

```bash
# Only allow code.py in /code; everything else denied
docker run \
  -v /code/submission.py:/code/submission.py:ro \
  --read-only \
  codeforge-executor
```

---

## 7. User & Capability Restrictions

### Drop ALL Capabilities

```dockerfile
USER nobody:nogroup
# OR
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  capabilities:
    drop:
      - ALL
  allowPrivilegeEscalation: false
```

### Why?
- ❌ `CAP_SYS_ADMIN` - mount filesystems, manipulate cgroups
- ❌ `CAP_NET_ADMIN` - network interface manipulation
- ❌ `CAP_SYSLOG` - kernel log access
- ❌ `CAP_SYS_PTRACE` - debug/escape other processes

---

## 8. Output Sanitization

Code output must be sanitized before returning to user:

```typescript
// ❌ Unsafe: Raw output could contain escape codes
const output = result.stdout;

// ✅ Safe: Strip ANSI codes, limit size, escape HTML
import stripAnsi from 'strip-ansi';
const sanitized = stripAnsi(output)
  .slice(0, 10000)  // Limit to 10 KB
  .replace(/[<>&"']/g, (c) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
```

---

## 9. Runtime Monitoring

### Metrics to Track

```typescript
interface ExecutionMetrics {
  cpuTimeMs: number;
  memoryPeakMb: number;
  wallTimeMs: number;
  exitCode: number;
  timedOut: boolean;
  oomKilled: boolean;
}
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Code Execution Safety",
    "panels": [
      {
        "title": "CPU Time Distribution",
        "targets": [
          { "expr": "histogram_quantile(0.95, execution_cpu_time_ms)" }
        ]
      },
      {
        "title": "Memory Peak Distribution",
        "targets": [
          { "expr": "histogram_quantile(0.95, execution_memory_peak_mb)" }
        ]
      },
      {
        "title": "OOM Kill Rate",
        "targets": [
          { "expr": "increase(execution_oom_killed_total[5m])" }
        ]
      },
      {
        "title": "Timeout Rate",
        "targets": [
          { "expr": "increase(execution_timeout_total[5m])" }
        ]
      }
    ]
  }
}
```

---

## 10. Incident Response Playbook

### Scenario: Code Escape Detected

1. **Immediate**: Kill all executor pods
   ```bash
   kubectl delete pod -l app=executor
   ```

2. **Investigate**: Check audit logs
   ```bash
   curl http://localhost:4000/operator/audit/tenant
   ```

3. **Contain**: Isolate affected tenant
   ```bash
   kubectl cordon node-with-executor
   ```

4. **Fix**: Patch seccomp/cgroups config, rebuild image
   ```bash
   docker build -f Dockerfile.hardened -t codeforge-executor:v2 .
   cosign sign --key cosign.key codeforge-executor:v2
   ```

5. **Redeploy**: Roll out new image
   ```bash
   kubectl set image deployment/executor executor=codeforge-executor:v2
   ```

---

## Checklist: Deploy Safe Execution

- [x] Seccomp profile applied (no ptrace, mount, socket)
- [x] Memory limit enforced (Docker/K8s)
- [x] CPU time limit enforced (Docker/K8s)
- [x] Process limit enforced (pids-limit)
- [x] Base images pinned by digest
- [x] Images signed (cosign)
- [x] Root filesystem read-only
- [x] Non-root user (uid != 0)
- [x] Network disabled (--network=none)
- [x] Capabilities dropped
- [x] Output sanitized
- [x] Metrics tracked (Prometheus)
- [x] Runbook documented

---

## References

- [Seccomp Documentation](https://man7.org/linux/man-pages/man2/seccomp.2.html)
- [Docker Security](https://docs.docker.com/engine/security/)
- [Kubernetes Pod Security](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [OWASP Code Execution Prevention](https://owasp.org/www-community/attacks/Code_Injection)
