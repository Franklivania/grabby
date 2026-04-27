export type ExtractedNode =
  | { type: 'text'; value: string }
  | { type: 'link'; text: string; href: string };

export type ExtractionResult = {
  nodes: ExtractedNode[];
  markdown: string;
};
