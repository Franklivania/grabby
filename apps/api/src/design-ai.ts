import Groq from 'groq-sdk';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawDesignData } from '@grabby/core';

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  throw new Error('GROQ_API_KEY is required for /design endpoint');
}

const groq = new Groq({ apiKey });

const moduleDir = dirname(fileURLToPath(import.meta.url));
const GUIDE = readFileSync(join(moduleDir, '../../docs/GUIDE-TO-DESIGN.md'), 'utf-8');

export async function generateDesignMd(
  data: RawDesignData,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const stream = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    temperature: 0.3,
    max_completion_tokens: 8192,
    top_p: 1,
    stream: true,
    stop: null,
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(GUIDE),
      },
      {
        role: 'user',
        content: buildUserMessage(data),
      },
    ],
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? '';
    if (text) {
      onChunk(text);
    }
  }
}

function buildSystemPrompt(guide: string): string {
  return `You are a design system analyst. Your sole task is to generate a DESIGN.md file
from raw design token data extracted from a live website's DOM.

You must follow the specification in the guide below exactly. Every rule in it is a contract.

OUTPUT REQUIREMENTS:
- Output ONLY the raw DESIGN.md content. No preamble. No explanation. No markdown code fences.
- Start directly with the YAML front matter opening: ---
- End with the ## Known Gaps section.
- Do not add any text before or after the DESIGN.md content.
- Do not wrap output in \`\`\`markdown or any other code fence.

GUIDE:
${guide}`;
}

function buildUserMessage(data: RawDesignData): string {
  return `Generate a DESIGN.md for the following website.

URL: ${data.url}
Page title: ${data.title}

## Extracted Font Sources
${JSON.stringify(data.fonts, null, 2)}

## CSS Custom Properties (:root)
${JSON.stringify(data.cssVariables, null, 2)}

## Computed Colors (sampled from key elements)
${JSON.stringify(data.computedColors, null, 2)}

## Computed Typography (sampled from key elements)
${JSON.stringify(data.computedTypography, null, 2)}

## Spacing Values (deduplicated from layout elements)
${JSON.stringify(data.computedSpacing, null, 2)}

## Border Radius Values
${JSON.stringify(data.computedRadii, null, 2)}

## Box Shadow Values
${JSON.stringify(data.computedShadows, null, 2)}

## Tailwind Config (null if not detected)
${data.tailwindConfig ?? 'null'}

## Detected Animation Libraries
${JSON.stringify(data.animationLibraries, null, 2)}

## Motion Tokens (best-effort from inline scripts)
${JSON.stringify(data.motionTokens, null, 2)}

## Component Style Samples
${JSON.stringify(data.componentSamples, null, 2)}

## Styling Mechanisms Detected
${JSON.stringify(data.stylingMechanism, null, 2)}

Using the GUIDE_TO_DESIGN_MD specification provided in your system prompt, generate the
complete DESIGN.md for this site. Follow the source priority order in the guide.
Declare all gaps honestly in ## Known Gaps. Do not fabricate values.`;
}
