import { App, Editor, MarkdownView, Modal, Notice, Plugin, TFile } from 'obsidian';
import * as cheerio from 'cheerio';

export default class LinkExtractorPlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: 'extract-links',
      name: 'Extract Links',
      editorCallback: (editor: Editor, view: MarkdownView) => this.extractLinks(editor, view.file),
    });
  }

  async extractLinks(editor: Editor, file: TFile) {
    const content = editor.getValue();
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      const [, linkText, url] = match;
      await this.processLink(url, linkText);
    }

    new Notice('Link extraction completed');
  }

  async processLink(url: string, linkText: string) {
    try {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove scripts, styles, and other non-content elements
      $('script, style, nav, header, footer, aside').remove();

      // Extract main content (adjust selectors based on common website structures)
      const mainContent = $('main, article, .content, #content').text() || $('body').text();

      // Clean and format the extracted text
      const cleanedContent = this.cleanContent(mainContent);

      // Create a new file with the extracted content
      const fileName = this.sanitizeFileName(`${linkText}.md`);
      await this.app.vault.create(fileName, `# ${linkText}\n\nSource: ${url}\n\n${cleanedContent}`);

    } catch (error) {
      console.error(`Error processing link ${url}:`, error);
      new Notice(`Failed to process link: ${url}`);
    }
  }

  cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ')
      .trim()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n\n');
  }

  sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }
}