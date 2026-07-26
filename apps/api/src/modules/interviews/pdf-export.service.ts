import type { Browser, Page } from "puppeteer";

import { getConfig } from "../../config/env.js";
import { ServiceUnavailableError } from "../../common/errors/app-error.js";
import { logger } from "../../common/logging/logger.js";

const log = logger.child("PdfExport");

const PAGE_RENDER_TIMEOUT_MS = 20_000;

/** Recycle a browser after this many pages to bound memory growth. */
const MAX_PAGES_PER_BROWSER = 100;

const LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--no-zygote",
];

/**
 * Renders report HTML to PDF using a pooled headless browser.
 *
 * Launching Chrome per request cost roughly a second of startup and ~100MB of
 * RSS each time, and a burst of concurrent exports could exhaust memory. The
 * browser is now launched once, shared across requests, and concurrency is
 * bounded by a permit semaphore so N simultaneous exports open at most N tabs.
 */
export class PdfExportService {
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;
  private pagesRendered = 0;

  /** Outstanding permits; resolvers queue here when the pool is saturated. */
  private available: number;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly maxConcurrency = getConfig().puppeteerPoolSize) {
    this.available = Math.max(1, maxConcurrency);
  }

  async renderHtmlToPdfBuffer(html: string): Promise<Uint8Array> {
    await this.acquire();

    let page: Page | undefined;

    try {
      const browser = await this.getBrowser();
      page = await browser.newPage();

      // Untrusted report content must not be able to call out to the network.
      await page.setJavaScriptEnabled(false);
      await page.setContent(html, {
        waitUntil: "domcontentloaded",
        timeout: PAGE_RENDER_TIMEOUT_MS,
      });

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        timeout: PAGE_RENDER_TIMEOUT_MS,
        margin: { top: "16mm", right: "12mm", bottom: "16mm", left: "12mm" },
      });

      this.pagesRendered += 1;
      return pdf;
    } finally {
      // Close the tab before releasing the permit, or the next waiter can open
      // one while this is still resident.
      if (page) {
        await page.close().catch((err) => log.warn("Failed to close page", { err }));
      }

      await this.recycleIfNeeded();
      this.release();
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser?.connected) {
      return this.browser;
    }

    // Collapse concurrent launches into one.
    this.launching ??= this.launch();

    try {
      this.browser = await this.launching;
      return this.browser;
    } finally {
      this.launching = null;
    }
  }

  private async launch(): Promise<Browser> {
    const puppeteer = await this.loadPuppeteer();

    if (!puppeteer) {
      throw new ServiceUnavailableError(
        "PDF export is unavailable: puppeteer is not installed.",
        "PDF_EXPORT_UNAVAILABLE",
      );
    }

    log.info("Launching headless browser for PDF export");
    const browser = await puppeteer.launch({ headless: true, args: LAUNCH_ARGS });

    // A crashed browser must not leave a stale handle behind.
    browser.once("disconnected", () => {
      log.warn("Headless browser disconnected");
      this.browser = null;
      this.pagesRendered = 0;
    });

    return browser;
  }

  private async recycleIfNeeded(): Promise<void> {
    if (this.pagesRendered < MAX_PAGES_PER_BROWSER || !this.browser) {
      return;
    }

    // Only recycle when no other render is in flight.
    if (this.available !== Math.max(1, this.maxConcurrency) - 1) {
      return;
    }

    log.info("Recycling headless browser", { pagesRendered: this.pagesRendered });
    const browser = this.browser;
    this.browser = null;
    this.pagesRendered = 0;
    await browser.close().catch((err) => log.warn("Failed to close browser", { err }));
  }

  private async acquire(): Promise<void> {
    if (this.available > 0) {
      this.available -= 1;
      return;
    }

    await new Promise<void>((resolve) => this.waiters.push(resolve));
  }

  private release(): void {
    const next = this.waiters.shift();

    // Hand the permit straight to the next waiter rather than incrementing,
    // which would let a newcomer barge ahead of the queue.
    if (next) {
      next();
      return;
    }

    this.available += 1;
  }

  /** Closes the pooled browser. Call during graceful shutdown. */
  async close(): Promise<void> {
    const browser = this.browser;
    this.browser = null;

    if (browser) {
      await browser.close().catch((err) => log.warn("Failed to close browser", { err }));
    }
  }

  private async loadPuppeteer() {
    try {
      const mod = await import("puppeteer");
      return (mod as unknown as { default?: typeof import("puppeteer") }).default ?? mod;
    } catch (err) {
      log.error("Puppeteer could not be loaded", { err });
      return null;
    }
  }
}
