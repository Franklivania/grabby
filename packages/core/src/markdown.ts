import type { ExtractedNode } from './types';

const normalizeWhitespace = (input: string): string => input.replace(/\s+/g, ' ').trim();

export const toMarkdown = (nodes: ExtractedNode[]): string => {
  const parts: string[] = [];

  for (const node of nodes) {
    if (node.type === 'text') {
      const text = normalizeWhitespace(node.value);
      if (text) parts.push(text);
      continue;
    }

    const text = normalizeWhitespace(node.text) || node.href;
    parts.push(`[${text}](${node.href})`);
  }

  return `${parts.join('\n\n')}\n`;
};
