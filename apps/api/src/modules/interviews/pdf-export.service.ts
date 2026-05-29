


export class PdfExportService {
  async renderHtmlToPdfBuffer(html: string): Promise<Uint8Array> {
    const puppeteerModule = await this.loadPuppeteer();
    if (!puppeteerModule) {
      throw new Error('Puppeteer is not installed. Add puppeteer to @codeforge/api dependencies.');
    }

    const browser = await puppeteerModule.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      return await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '16mm',
          right: '12mm',
          bottom: '16mm',
          left: '12mm',
        },
      });
    } finally {
      await browser.close();
    }
  }

  private async loadPuppeteer() {
    try {
      return await import('puppeteer');
    } catch {
      return null;
    }
  }
}

