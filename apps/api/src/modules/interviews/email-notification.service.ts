

export interface InterviewEmailPayload {
  to: string;
  candidateName: string;
  interviewerName: string;
  sessionTitle: string;
  interviewLink: string;
  scheduledAt?: string;
}


export class EmailNotificationService {
  private readonly logger = new Logger('EmailNotificationService');

  async sendInterviewInvite(payload: InterviewEmailPayload): Promise<{ queued: boolean; message: string }> {
    const transporter = await this.createTransporter();

    if (!transporter) {
      this.logger.warn('SMTP not configured. Invite email not sent.');
      return {
        queued: false,
        message: 'SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.',
      };
    }

    const subject = `Interview Invite: ${payload.sessionTitle}`;
    const text = [
      `Hi ${payload.candidateName},`,
      '',
      `${payload.interviewerName} invited you to an interview session: ${payload.sessionTitle}.`,
      payload.scheduledAt ? `Scheduled at: ${payload.scheduledAt}` : '',
      `Join link: ${payload.interviewLink}`,
      '',
      'Best regards,',
      'CodeForge',
    ]
      .filter(Boolean)
      .join('\n');

    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? 'no-reply@codeforge.local',
      to: payload.to,
      subject,
      text,
    });

    return { queued: true, message: 'Invite email sent.' };
  }

  async sendInterviewReportEmail(to: string, sessionTitle: string, reportUrl: string) {
    const transporter = await this.createTransporter();

    if (!transporter) {
      this.logger.warn('SMTP not configured. Report email not sent.');
      return {
        queued: false,
        message: 'SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.',
      };
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? 'no-reply@codeforge.local',
      to,
      subject: `Interview Report: ${sessionTitle}`,
      text: `The interview report is ready.\n\nSession: ${sessionTitle}\nReport: ${reportUrl}`,
    });

    return { queued: true, message: 'Report email sent.' };
  }

  private async createTransporter() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      return null;
    }

    const nodemailer = await import('nodemailer');
    return (nodemailer as any).default.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
}

