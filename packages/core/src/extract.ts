import { toMarkdown } from './markdown';
import type { ExtractedNode, ExtractionResult } from './types';

const BLOCKED_TAGS = new Set(['NAV', 'FOOTER', 'ASIDE', 'SCRIPT', 'STYLE']);

type DomSnapshotNode = {
  type: 'text' | 'link';
  value?: string;
  text?: string;
  href?: string;
  hidden?: boolean;
  parentTag?: string;
};

const isAllowed = (node: DomSnapshotNode): boolean => {
  if (node.hidden) return false;
  if (!node.parentTag) return true;
  return !BLOCKED_TAGS.has(node.parentTag.toUpperCase());
};

const normalizeNode = (node: DomSnapshotNode): ExtractedNode | null => {
  if (!isAllowed(node)) return null;

  if (node.type === 'text') {
    if (!node.value) return null;
    return { type: 'text', value: node.value };
  }

  if (!node.href) return null;
  return {
    type: 'link',
    text: node.text ?? '',
    href: node.href,
  };
};

export const extractFromSnapshot = (snapshot: DomSnapshotNode[]): ExtractionResult => {
  const nodes = snapshot.map(normalizeNode).filter((node): node is ExtractedNode => node !== null);
  return { nodes, markdown: toMarkdown(nodes) };
};

export type { DomSnapshotNode };
