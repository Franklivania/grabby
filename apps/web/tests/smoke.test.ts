import { describe, expect, it } from 'bun:test';
import { getFilenameFromUrl } from '../src/scrape-session';

describe('web package smoke test', () => {
  it('runs tests successfully', () => {
    expect(true).toBe(true);
  });

  it('creates hostname based content filename', () => {
    const result = getFilenameFromUrl('https://printoor.xyz/path?q=1');
    expect(result.hostname).toBe('printoor.xyz');
    expect(result.filename).toBe('printoor.xyz-content.md');
  });
});
