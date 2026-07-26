import { getConfig, type AppConfig } from "../../config/env.js";
import { ServiceUnavailableError } from "../../common/errors/app-error.js";
import { logger } from "../../common/logging/logger.js";

const log = logger.child("EmailNotification");

export interface InterviewEmailPayload {
  to: string;
  candidateName: string;
  interviewerName: string;
  sessionTitle: string;
  interviewLink: string;
  scheduledAt?: string;
}

export type DeliveryResult = {
  delivered: boolean;
  messageId?: string;
  /** Present when delivery was skipped or failed. */
  reason?: string;
};

type Transporter = {
  sendMail(payload: Record<string, unknown>): Promise<{ messageId?: string }>;
};

/**
 * Transactional email for interview invites and reports.
 *
 * Two behaviours changed. Delivery failures used to be indistinguishable from
 * success at the call site; they now throw, so a caller that must know an
 * invite went out finds out. And an unconfigured SMTP setup returns an
 * explicit `delivered: false` with a reason rather than a silent no-op —
 * except in production, where missing SMTP is a misconfiguration, not a
 * default.
 */
export class EmailNotificationService {
  private transporter: Transporter | null = null;

  constructor(private readonly config: AppConfig = getConfig()) {}

  async sendInterviewInvite(payload: InterviewEmailPayload): Promise<DeliveryResult> {
    const text = [
      `Hi ${payload.candidateName},`,
      "",
      `${payload.interviewerName} invited you to an interview session: ${payload.sessionTitle}.`,
      payload.scheduledAt ? `Scheduled at: ${payload.scheduledAt}` : "",
      `Join link: ${payload.interviewLink}`,
      "",
      "Best regards,",
      "CodeForge",
    ]
      .filter(Boolean)
      .join("\n");

    return this.send({
      to: payload.to,
      subject: `Interview Invite: ${payload.sessionTitle}`,
      text,
    });
  }

  async sendInterviewReportEmail(
    to: string,
    sessionTitle: string,
    reportUrl: string,
  ): Promise<DeliveryResult> {
    return this.send({
      to,
      subject: `Interview Report: ${sessionTitle}`,
      text: `The interview report is ready.\n\nSession: ${sessionTitle}\nReport: ${reportUrl}`,
    });
  }

  private async send(message: {
    to: string;
    subject: string;
    text: string;
  }): Promise<DeliveryResult> {
    const transporter = await this.getTransporter();

    if (!transporter) {
      const reason =
        "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS to enable email.";

      // Outside production this is a normal local-dev state; in production it
      // means invites are silently not being sent, which must not be tolerated.
      if (this.config.isProduction) {
        throw new ServiceUnavailableError(reason, "SMTP_NOT_CONFIGURED");
      }

      log.warn("Email not sent", { to: message.to, subject: message.subject, reason });
      return { delivered: false, reason };
    }

    try {
      const result = await transporter.sendMail({
        from: this.config.smtp.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
      });

      log.info("Email sent", { to: message.to, subject: message.subject });
      return { delivered: true, messageId: result.messageId };
    } catch (err) {
      // Surface the failure instead of returning a shrug — the caller decides
      // whether a failed invite should fail the request.
      log.error("Email delivery failed", { to: message.to, subject: message.subject, err });
      throw new ServiceUnavailableError("Failed to deliver email", "EMAIL_DELIVERY_FAILED");
    }
  }

  private async getTransporter(): Promise<Transporter | null> {
    if (!this.config.smtp.enabled) {
      return null;
    }

    if (this.transporter) {
      return this.transporter;
    }

    const nodemailer = await import("nodemailer");
    const smtp = this.config.smtp;

    // The module is CJS, so the callable lives on `default` under ESM interop
    // but directly on the namespace under some bundlers; accept either.
    const factory = (nodemailer as unknown as {
      default?: { createTransport: (options: unknown) => Transporter };
      createTransport?: (options: unknown) => Transporter;
    });
    const createTransport = factory.default?.createTransport ?? factory.createTransport;

    if (!createTransport) {
      throw new Error("nodemailer.createTransport is unavailable");
    }

    this.transporter = createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });

    return this.transporter;
  }
}
