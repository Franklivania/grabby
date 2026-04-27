import Fastify from 'fastify';
import { chromium, type Browser, type LaunchOptions } from 'playwright';
import { extractFromSnapshot, type DomSnapshotNode } from '@grabby/core';
import cors from '@fastify/cors';

const app = Fastify({ logger: true });
const PORT = Number(process.env.PORT ?? 3001);
const DOM_SILENCE_MS = 2000;
const REQUEST_TIMEOUT_MS = 45000;
const BROWSER_LAUNCH_TIMEOUT_MS = 30000;

const buildLaunchOptions = (overrides?: LaunchOptions): LaunchOptions => ({
  headless: true,
  timeout: BROWSER_LAUNCH_TIMEOUT_MS,
  args: ['--disable-gpu', '--disable-software-rasterizer'],
  ...overrides,
});

const launchBrowserWithFallback = async (logger: typeof app.log): Promise<Browser> => {
  const launchAttempts: Array<{ label: string; options: LaunchOptions }> = [
    { label: 'playwright-chromium', options: buildLaunchOptions() },
    { label: 'system-chrome', options: buildLaunchOptions({ channel: 'chrome' }) },
  ];

  let lastError: unknown;
  for (const attempt of launchAttempts) {
    try {
      logger.info(`Trying browser launch strategy: ${attempt.label}`);
      return await chromium.launch(attempt.options);
    } catch (error) {
      lastError = error;
      logger.warn({ err: error }, `Browser launch strategy failed: ${attempt.label}`);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to launch browser.');
};

const validateUrl = (input: string): URL => {
  try {
    const parsed = new URL(input);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Only http and https URLs are supported.');
    }
    return parsed;
  } catch {
    throw new Error('Invalid URL provided.');
  }
};

await app.register(cors, {
  origin: process.env.WEB_ORIGIN ?? '*',
});

app.post<{ Body: { url?: string } }>('/scrape', async (request, reply) => {
  const bodyUrl = request.body?.url;
  if (!bodyUrl) {
    return reply.status(400).send({ error: 'A url field is required.' });
  }

  let target: URL;
  try {
    target = validateUrl(bodyUrl);
  } catch (error) {
    return reply.status(400).send({ error: (error as Error).message });
  }

  let browser: Browser | null = null;

  try {
    browser = await launchBrowserWithFallback(request.log);
    const page = await browser.newPage();

    await page.goto(target.toString(), { waitUntil: 'networkidle', timeout: REQUEST_TIMEOUT_MS });
    await page.evaluate(
      (silenceMs: number) =>
        new Promise<void>((resolve) => {
          let timer = window.setTimeout(done, silenceMs);
          const observer = new MutationObserver(() => {
            window.clearTimeout(timer);
            timer = window.setTimeout(done, silenceMs);
          });

          function done() {
            observer.disconnect();
            resolve();
          }

          observer.observe(document.body, { childList: true, subtree: true, attributes: true });
        }),
      DOM_SILENCE_MS,
    );

    const snapshot = await page.evaluate<DomSnapshotNode[]>(() => {
      const isVisible = (element: Element): boolean => {
        const style = window.getComputedStyle(element);
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          element.getBoundingClientRect().height > 0 &&
          element.getBoundingClientRect().width > 0
        );
      };

      const result: DomSnapshotNode[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ALL);
      let current: Node | null = walker.currentNode;

      while (current) {
        if (current.nodeType === Node.TEXT_NODE && current.textContent?.trim()) {
          const parent = current.parentElement;
          if (parent && isVisible(parent)) {
            result.push({
              type: 'text',
              value: current.textContent,
              parentTag: parent.tagName,
            });
          }
        }

        if (current.nodeType === Node.ELEMENT_NODE) {
          const element = current as HTMLElement;
          if (element.tagName === 'A' && isVisible(element)) {
            result.push({
              type: 'link',
              text: element.textContent ?? '',
              href: element.getAttribute('href') ?? '',
              parentTag: element.parentElement?.tagName ?? element.tagName,
            });
          }
        }

        current = walker.nextNode();
      }

      return result;
    });

    const { markdown } = extractFromSnapshot(snapshot);
    reply
      .header('Content-Type', 'text/markdown; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="grabby-output.md"')
      .send(markdown);

    await page.close();
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({
      error:
        'Unable to scrape this URL right now. Browser launch failed or timed out on this machine.',
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.get('/health', async () => ({ ok: true }));

app.listen({ port: PORT, host: '0.0.0.0' }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
