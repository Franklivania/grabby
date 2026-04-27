export type ScrapeFilename = {
  hostname: string;
  filename: string;
};

export const sanitizeHostname = (hostname: string): string =>
  hostname.toLowerCase().replace(/[^a-z0-9.-]/g, '-');

export const getFilenameFromUrl = (url: string): ScrapeFilename => {
  const parsed = new URL(url);
  const hostname = sanitizeHostname(parsed.hostname);
  return { hostname, filename: `${hostname}-content.md` };
};
