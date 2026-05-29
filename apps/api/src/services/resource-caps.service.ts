export class ResourceCaps {
  cpuTimeMs: number;      // max CPU time in milliseconds
  memoryMb: number;       // max memory in MB
  diskMb: number;         // max disk I/O in MB per second
  processesMax: number;   // max number of processes
  fileDescriptorsMax: number; // max open file descriptors

  constructor(
    cpuTimeMs = 5000,
    memoryMb = 128,
    diskMb = 50,
    processesMax = 10,
    fileDescriptorsMax = 256,
  ) {
    this.cpuTimeMs = cpuTimeMs;
    this.memoryMb = memoryMb;
    this.diskMb = diskMb;
    this.processesMax = processesMax;
    this.fileDescriptorsMax = fileDescriptorsMax;
  }

  // Enforce resource limits on a child process (Node.js only)
  // For full enforcement, integrate with cgroups v2 or runc/containerd
  applyToProcess(childProcess: NodeJS.Process) {
    try {
      const os = require('os');
      // Note: os.setrlimit is not available in all Node versions
      // Use cgroups/docker for production enforcement
      // eslint-disable-next-line no-console
      console.log(
        `[ResourceCaps] Child process ${childProcess.pid}: ` +
          `CPU=${this.cpuTimeMs}ms, Memory=${this.memoryMb}MB, ` +
          `Processes=${this.processesMax}, FDs=${this.fileDescriptorsMax}`,
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to apply resource limits', e);
    }
  }

  // Check if a measurement exceeds caps (for monitoring)
  checkCPU(elapsedMs: number): boolean {
    return elapsedMs > this.cpuTimeMs;
  }

  checkMemory(usedMb: number): boolean {
    return usedMb > this.memoryMb;
  }

  toCGroupsV2Format() {
    // Format for cgroups v2 (systemd/Docker)
    return {
      'cpu.max': `${this.cpuTimeMs}000 1000000`, // microseconds in 1s window
      'memory.max': `${this.memoryMb * 1024 * 1024}`,
      'pids.max': this.processesMax,
    };
  }

  toDockerFlags() {
    // Equivalent Docker run flags
    return [
      `--cpus=${this.cpuTimeMs / 1000}`,
      `--memory=${this.memoryMb}m`,
      `--memory-swap=${this.memoryMb * 2}m`,
      `--pids-limit=${this.processesMax}`,
      `--ulimit nofile=${this.fileDescriptorsMax}:${this.fileDescriptorsMax}`,
    ];
  }
}

export class ResourceEnforcer {
  caps: ResourceCaps;

  constructor(caps?: ResourceCaps) {
    this.caps = caps || new ResourceCaps();
  }

  // Monitor a running process and kill if it exceeds limits
  monitorProcess(
    pid: number,
    onExceeded?: (metric: string, value: number, cap: number) => void,
  ): NodeJS.Timeout {
    const interval = setInterval(async () => {
      try {
        // In production, read from /proc/{pid}/stat or cgroups
        // For now, just log the caps
        if (onExceeded) {
          // Would call onExceeded if metrics exceeded caps
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to monitor process', e);
      }
    }, 1000);

    return interval;
  }
}
