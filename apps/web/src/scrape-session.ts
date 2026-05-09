export type ScrapeFilename = {
  hostname: string;
  filename: string;
};

const normalizeBaseUrl = (value: string): string => value.trim().replace(/\/+$/, '');
const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = typeof rawApiBaseUrl === 'string' ? normalizeBaseUrl(rawApiBaseUrl) : '';

export const sanitizeHostname = (hostname: string): string =>
  hostname.toLowerCase().replace(/[^a-z0-9.-]/g, '-');

export const getFilenameFromUrl = (url: string): ScrapeFilename => {
  const parsed = new URL(url);
  const hostname = sanitizeHostname(parsed.hostname);
  return { hostname, filename: `${hostname}-content.md` };
};

export const getApiBaseUrl = (): string => API_BASE_URL;

export const scrapeDesign = async (url: string): Promise<string> => {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not configured. Please set it in the web environment.');
  }

  const response = await fetch(`${API_BASE_URL}/design`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(errorText || `Design generation failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return '';
  }

  const decoder = new TextDecoder();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode();
  return result;
};
