import '../styles/main.scss';

const form = document.querySelector<HTMLFormElement>('#scrape-form');
const input = document.querySelector<HTMLInputElement>('#url-input');
const status = document.querySelector<HTMLElement>('#status');
const button = document.querySelector<HTMLButtonElement>('#submit-btn');

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

const setStatus = (message: string): void => {
  if (!status) return;
  status.textContent = message;
};

const downloadMarkdown = (content: string): void => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = 'grabby-output.md';
  anchor.click();
  URL.revokeObjectURL(objectUrl);
};

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const url = input?.value.trim();

  if (!url) {
    setStatus('Please enter a valid URL.');
    return;
  }

  try {
    if (button) button.disabled = true;
    setStatus('Rendering page and extracting content...');

    const response = await fetch(`${API_BASE_URL}/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? 'Failed to generate markdown.');
    }

    const markdown = await response.text();
    downloadMarkdown(markdown);
    setStatus('Markdown file downloaded successfully.');
  } catch (error) {
    setStatus((error as Error).message);
  } finally {
    if (button) button.disabled = false;
  }
});
