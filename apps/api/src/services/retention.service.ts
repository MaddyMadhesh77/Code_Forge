import fs from 'fs';
import path from 'path';

export class RetentionService {
  baseDir: string;
  retentionDays: number;

  constructor(retentionDays = 90, baseDir?: string) {
    this.retentionDays = retentionDays;
    this.baseDir = baseDir || path.join(process.cwd(), 'data', 'audit');
  }

  // Delete audit files with mtime older than retentionDays
  async enforce() {
    try {
      const files = await fs.promises.readdir(this.baseDir);
      const now = Date.now();
      const cutoff = now - this.retentionDays * 24 * 60 * 60 * 1000;

      await Promise.all(
        files.map(async (f) => {
          const p = path.join(this.baseDir, f);
          const stat = await fs.promises.stat(p);
          if (stat.mtime.getTime() < cutoff) {
            await fs.promises.unlink(p);
          }
        }),
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Retention enforcement failed', e);
    }
  }
}
