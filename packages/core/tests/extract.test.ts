import { describe, expect, it } from 'bun:test';
import { extractFromSnapshot } from '../src/extract';

describe('extractFromSnapshot', () => {
  it('converts text and links to markdown', () => {
    const result = extractFromSnapshot([
      { type: 'text', value: 'Hello world', parentTag: 'MAIN' },
      { type: 'link', text: 'Example', href: 'https://example.com', parentTag: 'MAIN' },
    ]);

    expect(result.markdown).toContain('Hello world');
    expect(result.markdown).toContain('[Example](https://example.com)');
  });

  it('filters blocked and hidden nodes', () => {
    const result = extractFromSnapshot([
      { type: 'text', value: 'Skip me', parentTag: 'NAV' },
      { type: 'text', value: 'Also skip', hidden: true, parentTag: 'DIV' },
      { type: 'text', value: 'Keep me', parentTag: 'ARTICLE' },
    ]);

    expect(result.markdown).toBe('Keep me\n');
  });
});
