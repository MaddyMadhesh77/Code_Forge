import { readFile } from "node:fs/promises";
import type { ChildProcess } from "node:child_process";

import { logger } from "../common/logging/logger.js";

const log = logger.child("ResourceCaps");

export type CapViolation = {
  metric: "cpu" | "memory" | "wall" | "processes";
  value: number;
  cap: number;
};

export type CapOptions = {
  cpuTimeMs?: number;
  memoryMb?: number;
  diskMb?: number;
  processesMax?: number;
  fileDescriptorsMax?: number;
  /** Hard wall-clock ceiling, independent of CPU time. */
  wallClockMs?: number;
};

export class ResourceCaps {
  readonly cpuTimeMs: number;
  readonly memoryMb: number;
  readonly diskMb: number;
  readonly processesMax: number;
  readonly fileDescriptorsMax: number;
  readonly wallClockMs: number;

  constructor(options: CapOptions = {}) {
    this.cpuTimeMs = options.cpuTimeMs ?? 5_000;
    this.memoryMb = options.memoryMb ?? 128;
    this.diskMb = options.diskMb ?? 50;
    this.processesMax = options.processesMax ?? 10;
    this.fileDescriptorsMax = options.fileDescriptorsMax ?? 256;
    // Wall clock must allow for scheduling delay on top of the CPU budget.
    this.wallClockMs = options.wallClockMs ?? this.cpuTimeMs * 2;
  }

  checkCPU(elapsedMs: number): boolean {
    return elapsedMs > this.cpuTimeMs;
  }

  checkMemory(usedMb: number): boolean {
    return usedMb > this.memoryMb;
  }

  /** cgroups v2 controller values, for the sandbox's cgroup directory. */
  toCGroupsV2Format(): Record<string, string> {
    return {
      "cpu.max": `${Math.round(this.cpuTimeMs * 1000)} 1000000`,
      "memory.max": String(this.memoryMb * 1024 * 1024),
      // Denying swap is what makes memory.max a real ceiling.
      "memory.swap.max": "0",
      "pids.max": String(this.processesMax),
    };
  }

  /** Equivalent `docker run` flags, for container-per-execution setups. */
  toDockerFlags(): string[] {
    return [
      `--cpus=${(this.cpuTimeMs / 1000).toFixed(2)}`,
      `--memory=${this.memoryMb}m`,
      `--memory-swap=${this.memoryMb}m`,
      `--pids-limit=${this.processesMax}`,
      `--ulimit=nofile=${this.fileDescriptorsMax}:${this.fileDescriptorsMax}`,
      "--network=none",
      "--read-only",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
    ];
  }

  /**
   * `ulimit` prelude for a shell-wrapped execution. Applies the limits the
   * kernel can enforce directly on the process, before the user code runs.
   */
  toUlimitPrelude(): string {
    return [
      `ulimit -t ${Math.max(1, Math.ceil(this.cpuTimeMs / 1000))}`, // CPU seconds
      `ulimit -v ${this.memoryMb * 1024}`, // virtual memory, KB
      `ulimit -u ${this.processesMax}`, // processes
      `ulimit -n ${this.fileDescriptorsMax}`, // file descriptors
      `ulimit -f ${this.diskMb * 1024}`, // file size, KB
      "ulimit -c 0", // no core dumps
    ].join(" && ");
  }
}

export type EnforcementResult = {
  killed: boolean;
  violation?: CapViolation;
};

/**
 * Monitors a running child process and terminates it when it exceeds its caps.
 *
 * The previous implementation logged the configured limits and returned an
 * interval whose callback body was empty — nothing was ever measured and
 * nothing was ever killed. This one samples `/proc/<pid>` on Linux, and always
 * enforces the wall-clock ceiling regardless of platform.
 */
export class ResourceEnforcer {
  constructor(
    readonly caps: ResourceCaps = new ResourceCaps(),
    private readonly sampleIntervalMs = 250,
  ) {}

  /**
   * Watches `child` until it exits or breaches a cap.
   *
   * On breach the process is sent SIGKILL — SIGTERM is catchable, and
   * untrusted submission code must not be able to ignore its own termination.
   */
  async enforce(
    child: ChildProcess,
    onViolation?: (violation: CapViolation) => void,
  ): Promise<EnforcementResult> {
    const pid = child.pid;

    if (!pid) {
      return { killed: false };
    }

    const startedAt = Date.now();

    return new Promise<EnforcementResult>((resolve) => {
      let settled = false;

      const finish = (result: EnforcementResult) => {
        if (settled) return;
        settled = true;
        clearInterval(timer);
        resolve(result);
      };

      const breach = (violation: CapViolation) => {
        log.warn("Resource cap exceeded; killing process", { pid, ...violation });
        onViolation?.(violation);
        this.kill(child);
        finish({ killed: true, violation });
      };

      const timer = setInterval(() => {
        void (async () => {
          const wallMs = Date.now() - startedAt;

          if (wallMs > this.caps.wallClockMs) {
            breach({ metric: "wall", value: wallMs, cap: this.caps.wallClockMs });
            return;
          }

          const usage = await readProcessUsage(pid);

          if (!usage) {
            return;
          }

          if (usage.cpuMs > this.caps.cpuTimeMs) {
            breach({ metric: "cpu", value: usage.cpuMs, cap: this.caps.cpuTimeMs });
            return;
          }

          if (usage.memoryMb > this.caps.memoryMb) {
            breach({ metric: "memory", value: usage.memoryMb, cap: this.caps.memoryMb });
            return;
          }

          if (usage.threads > this.caps.processesMax) {
            breach({ metric: "processes", value: usage.threads, cap: this.caps.processesMax });
          }
        })();
      }, this.sampleIntervalMs);

      timer.unref?.();

      child.once("exit", () => finish({ killed: false }));
      child.once("error", () => finish({ killed: false }));
    });
  }

  /**
   * SIGKILL the process group so spawned children die with the parent —
   * killing only the direct child leaves fork-bombed grandchildren running.
   */
  private kill(child: ChildProcess): void {
    if (!child.pid) {
      return;
    }

    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      // No process group (child not detached) — fall back to the pid itself.
      try {
        child.kill("SIGKILL");
      } catch (err) {
        log.error("Failed to kill process", { pid: child.pid, err });
      }
    }
  }
}

export type ProcessUsage = {
  cpuMs: number;
  memoryMb: number;
  threads: number;
};

const CLOCK_TICKS_PER_SECOND = 100;

/**
 * Reads CPU, RSS and thread count for a pid from `/proc`.
 *
 * Returns null on non-Linux platforms or when the process has already exited,
 * in which case only the wall-clock ceiling applies.
 */
export async function readProcessUsage(pid: number): Promise<ProcessUsage | null> {
  if (process.platform !== "linux") {
    return null;
  }

  try {
    const stat = await readFile(`/proc/${pid}/stat`, "utf8");

    // The comm field can contain spaces and parentheses, so parse after the
    // final ')' rather than splitting the whole line.
    const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");

    // Offsets are relative to field 3 (state); see proc(5).
    const utime = Number(fields[11]);
    const stime = Number(fields[12]);
    const threads = Number(fields[17]);
    const rssPages = Number(fields[21]);

    if ([utime, stime, threads, rssPages].some((value) => !Number.isFinite(value))) {
      return null;
    }

    return {
      cpuMs: ((utime + stime) / CLOCK_TICKS_PER_SECOND) * 1000,
      memoryMb: (rssPages * 4096) / (1024 * 1024),
      threads,
    };
  } catch {
    // Process exited between the check and the read.
    return null;
  }
}
