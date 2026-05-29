import fs from 'fs';
import path from 'path';

export class AuditForwarder {
  baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(process.cwd(), 'data', 'audit');
    fs.mkdirSync(this.baseDir, { recursive: true });
  }

  async forward(entry: Record<string, unknown>) {
    try {
      const tenant = (entry['tenant'] as string) || 'unknown';
      const file = path.join(this.baseDir, `${tenant}.log`);
      const line = JSON.stringify(entry) + '\n';
      await fs.promises.appendFile(file, line, { encoding: 'utf8' });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('AuditForwarder failed', e);
    }
  }
}
