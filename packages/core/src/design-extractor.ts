import type { Page } from 'playwright';

export type FontSource = {
  family: string;
  sourceUrl: string | null;
  sourceType: 'link' | 'import' | 'font-face' | 'css-variable' | 'computed';
};

export type ColorSample = {
  selector: string;
  property: 'color' | 'backgroundColor' | 'borderColor';
  value: string;
};

export type TypographySample = {
  selector: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
};

export type MotionSample = {
  source: 'gsap-defaults' | 'inline-script';
  duration?: string;
  ease?: string;
  type?: string;
};

export type ComponentSample = {
  kind: 'primary-button' | 'secondary-button' | 'card' | 'input' | 'badge' | 'nav';
  selector: string;
  backgroundColor: string;
  color: string;
  fontSize: string;
  fontWeight: string;
  borderRadius: string;
  padding: string;
  border: string;
  boxShadow: string;
};

export type StylingMechanism = 'css-variables' | 'scss' | 'tailwind' | 'inline';

export interface RawDesignData {
  url: string;
  title: string;
  fonts: FontSource[];
  cssVariables: Record<string, string>;
  computedColors: ColorSample[];
  computedTypography: TypographySample[];
  computedSpacing: string[];
  computedRadii: string[];
  computedShadows: string[];
  tailwindConfig: string | null;
  animationLibraries: string[];
  motionTokens: MotionSample[];
  componentSamples: ComponentSample[];
  stylingMechanism: StylingMechanism[];
}

export async function extractDesignTokens(page: Page): Promise<RawDesignData> {
  return page.evaluate<RawDesignData>(() => {
    const toHex = (value: string): string => {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return normalized;
      if (normalized.startsWith('#')) return normalized;

      const match = normalized.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return normalized;
      const [, r, g, b] = match;
      const toTwo = (input: string): string => Number(input).toString(16).padStart(2, '0');
      return `#${toTwo(r ?? '0')}${toTwo(g ?? '0')}${toTwo(b ?? '0')}`;
    };

    const normalize = (value: string): string => value.trim().replace(/\s+/g, ' ');

    const parseNumeric = (value: string): number => {
      const match = value.match(/-?\d+(\.\d+)?/);
      return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
    };

    const sortNumeric = (values: string[]): string[] =>
      [...values].sort((a, b) => {
        const diff = parseNumeric(a) - parseNumeric(b);
        if (Number.isFinite(diff) && diff !== 0) return diff;
        return a.localeCompare(b);
      });

    const fontMap = new Map<string, FontSource>();
    const addFont = (
      familyCandidate: string,
      sourceType: FontSource['sourceType'],
      sourceUrl: string | null,
    ) => {
      const family = familyCandidate.replace(/['"]/g, '').trim();
      if (!family) return;
      if (!fontMap.has(family.toLowerCase())) {
        fontMap.set(family.toLowerCase(), { family, sourceType, sourceUrl });
      }
    };

    for (const link of Array.from(document.querySelectorAll<HTMLLinkElement>('link[href]'))) {
      const href = link.href;
      if (
        /(fonts\.(googleapis|gstatic)\.com|fonts\.bunny\.net|fontshare|typekit|adobe)/i.test(href)
      ) {
        addFont(link.getAttribute('data-family') ?? href.split('family=')[1] ?? href, 'link', href);
      }
    }

    for (const style of Array.from(document.querySelectorAll<HTMLStyleElement>('style'))) {
      const content = style.textContent ?? '';
      const importMatches = content.matchAll(/@import\s+(?:url\()?['"]?([^'")\s]+)['"]?\)?/gi);
      for (const match of importMatches) {
        const importUrl = match[1];
        if (importUrl) {
          addFont(importUrl, 'import', importUrl);
        }
      }
    }

    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }

      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSFontFaceRule) {
          const family = rule.style.getPropertyValue('font-family');
          const src = rule.style.getPropertyValue('src') || null;
          addFont(family, 'font-face', src);
        }
      }
    }

    const cssVariables: Record<string, string> = {};
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }

      for (const rule of Array.from(rules)) {
        if (!(rule instanceof CSSStyleRule)) continue;
        const selector = rule.selectorText.trim().toLowerCase();
        if (selector !== ':root' && selector !== 'html') continue;
        for (const propertyName of Array.from(rule.style)) {
          if (!propertyName.startsWith('--')) continue;
          const propertyValue = normalize(rule.style.getPropertyValue(propertyName));
          if (!propertyValue) continue;
          cssVariables[propertyName] = propertyValue;
          if (/--font[-\w]*/i.test(propertyName) || /var\(--font[-\w]+\)/i.test(propertyValue)) {
            addFont(propertyValue, 'css-variable', null);
          }
        }
      }
    }

    const computedFontSelectors = ['body', 'h1', 'h2', 'button', 'input', 'code', 'pre'];
    for (const selector of computedFontSelectors) {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) continue;
      const fontFamily = getComputedStyle(element).fontFamily;
      for (const family of fontFamily.split(',')) {
        addFont(family, 'computed', null);
      }
    }

    const colorSelectors: Array<{
      selector: string;
      properties: Array<'color' | 'backgroundColor' | 'borderColor'>;
    }> = [
      { selector: 'button', properties: ['backgroundColor', 'color', 'borderColor'] },
      { selector: '[class*="btn"]', properties: ['backgroundColor', 'color', 'borderColor'] },
      { selector: '[class*="button"]', properties: ['backgroundColor', 'color', 'borderColor'] },
      { selector: 'a', properties: ['color'] },
      { selector: 'nav a', properties: ['color'] },
      { selector: 'h1', properties: ['color'] },
      { selector: 'h2', properties: ['color'] },
      { selector: 'h3', properties: ['color'] },
      { selector: 'body', properties: ['backgroundColor', 'color'] },
      { selector: 'main', properties: ['backgroundColor', 'color'] },
      { selector: '[class*="card"]', properties: ['backgroundColor', 'color', 'borderColor'] },
      { selector: '[class*="container"]', properties: ['backgroundColor', 'color'] },
      { selector: 'input', properties: ['backgroundColor', 'color', 'borderColor'] },
      { selector: 'textarea', properties: ['backgroundColor', 'color', 'borderColor'] },
      { selector: 'footer', properties: ['backgroundColor', 'color', 'borderColor'] },
    ];

    const colorSet = new Set<string>();
    const computedColors: ColorSample[] = [];
    for (const target of colorSelectors) {
      const element = document.querySelector<HTMLElement>(target.selector);
      if (!element) continue;
      const styles = getComputedStyle(element);
      for (const property of target.properties) {
        const hexValue = toHex(styles[property]);
        if (!hexValue || hexValue === 'transparent') continue;
        const key = `${property}-${hexValue}`;
        if (colorSet.has(key)) continue;
        colorSet.add(key);
        computedColors.push({
          selector: target.selector,
          property,
          value: hexValue,
        });
      }
    }

    const typographySelectors = [
      'h1',
      'h2',
      'h3',
      'h4',
      'p',
      'button',
      'a',
      'label',
      'small',
      'code',
      'pre',
    ];
    const computedTypography: TypographySample[] = [];
    for (const selector of typographySelectors) {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) continue;
      const styles = getComputedStyle(element);
      computedTypography.push({
        selector,
        fontFamily: normalize(styles.fontFamily),
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        lineHeight: styles.lineHeight,
        letterSpacing: styles.letterSpacing,
      });
    }

    const spacingValues = new Set<string>();
    for (const selector of [
      'body',
      'main',
      'section',
      'article',
      '[class*="card"]',
      '[class*="container"]',
    ]) {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) continue;
      const styles = getComputedStyle(element);
      const candidates = [
        styles.margin,
        styles.marginTop,
        styles.marginRight,
        styles.marginBottom,
        styles.marginLeft,
        styles.padding,
        styles.paddingTop,
        styles.paddingRight,
        styles.paddingBottom,
        styles.paddingLeft,
      ].map((value) => normalize(value));
      for (const value of candidates) {
        if (value && value !== '0px') spacingValues.add(value);
      }
    }

    const radiusValues = new Set<string>();
    for (const selector of [
      'button',
      'input',
      '[class*="card"]',
      '[class*="badge"]',
      '[class*="tag"]',
      'img',
    ]) {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) continue;
      const radius = normalize(getComputedStyle(element).borderRadius);
      if (radius && radius !== '0px') radiusValues.add(radius);
    }

    const shadowValues = new Set<string>();
    for (const selector of [
      '[class*="card"]',
      '[class*="modal"]',
      '[class*="dropdown"]',
      'button',
    ]) {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) continue;
      const shadow = normalize(getComputedStyle(element).boxShadow);
      if (shadow && shadow !== 'none') shadowValues.add(shadow);
    }

    const windowWithTailwind = window as Window & {
      __tailwind_config?: unknown;
      tailwind?: { config?: unknown };
      gsap?: { defaults?: () => { duration?: number; ease?: string } };
      ScrollTrigger?: unknown;
      FramerMotion?: unknown;
      __framer_importmap?: unknown;
    };

    let tailwindConfig: string | null = null;
    const detectedTailwindConfig =
      windowWithTailwind.__tailwind_config ?? windowWithTailwind.tailwind?.config;
    if (detectedTailwindConfig !== undefined) {
      try {
        tailwindConfig = JSON.stringify(detectedTailwindConfig);
      } catch {
        tailwindConfig = null;
      }
    }
    if (!tailwindConfig) {
      const hasTailwindScript = Array.from(
        document.querySelectorAll<HTMLScriptElement>('script[src]'),
      ).some((script) => /tailwind/i.test(script.src));
      if (hasTailwindScript) {
        tailwindConfig = '{}';
      }
    }

    const animationLibraries = new Set<string>();
    if (typeof windowWithTailwind.gsap !== 'undefined') animationLibraries.add('gsap');
    if (typeof windowWithTailwind.ScrollTrigger !== 'undefined')
      animationLibraries.add('gsap-scrolltrigger');
    if (
      typeof windowWithTailwind.FramerMotion !== 'undefined' ||
      typeof windowWithTailwind.__framer_importmap !== 'undefined'
    ) {
      animationLibraries.add('framer-motion');
    }
    for (const script of Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]'))) {
      const src = script.src.toLowerCase();
      if (src.includes('framer-motion')) animationLibraries.add('framer-motion');
      if (src.includes('gsap') || src.includes('@gsap')) animationLibraries.add('gsap');
    }

    const motionTokens: MotionSample[] = [];
    if (windowWithTailwind.gsap?.defaults) {
      try {
        const defaults = windowWithTailwind.gsap.defaults();
        motionTokens.push({
          source: 'gsap-defaults',
          duration: defaults.duration?.toString(),
          ease: defaults.ease,
        });
      } catch {
        // best effort only
      }
    }

    for (const script of Array.from(
      document.querySelectorAll<HTMLScriptElement>('script:not([src])'),
    )) {
      const content = script.textContent ?? '';
      const durationMatches = content.match(/duration\s*:\s*([0-9]*\.?[0-9]+)/gi) ?? [];
      const easeMatches = content.match(/ease\s*:\s*['"]([^'"]+)['"]/gi) ?? [];
      const springMatches = content.match(/type\s*:\s*['"](spring|tween|inertia)['"]/gi) ?? [];

      for (const match of durationMatches) {
        const value = match.split(':')[1]?.trim();
        if (!value) continue;
        motionTokens.push({ source: 'inline-script', duration: value });
      }
      for (const match of easeMatches) {
        const value = match.split(':')[1]?.replace(/['"]/g, '').trim();
        if (!value) continue;
        motionTokens.push({ source: 'inline-script', ease: value });
      }
      for (const match of springMatches) {
        const value = match.split(':')[1]?.replace(/['"]/g, '').trim();
        if (!value) continue;
        motionTokens.push({ source: 'inline-script', type: value });
      }
    }

    const sampleFirst = (selector: string): HTMLElement | null =>
      document.querySelector<HTMLElement>(selector);
    const componentTargets: Array<{ kind: ComponentSample['kind']; selectors: string[] }> = [
      { kind: 'primary-button', selectors: ['button.primary', 'button[type="submit"]', 'button'] },
      {
        kind: 'secondary-button',
        selectors: ['button.secondary', '[class*="secondary"] button', '[class*="btn-secondary"]'],
      },
      { kind: 'card', selectors: ['[class*="card"]', 'article', 'section'] },
      { kind: 'input', selectors: ['input', 'textarea', 'select'] },
      { kind: 'badge', selectors: ['[class*="badge"]', '[class*="tag"]'] },
      { kind: 'nav', selectors: ['nav', '[role="navigation"]'] },
    ];

    const componentSamples: ComponentSample[] = [];
    for (const target of componentTargets) {
      let element: HTMLElement | null = null;
      let usedSelector = '';
      for (const selector of target.selectors) {
        const hit = sampleFirst(selector);
        if (hit) {
          element = hit;
          usedSelector = selector;
          break;
        }
      }
      if (!element) continue;
      const styles = getComputedStyle(element);
      componentSamples.push({
        kind: target.kind,
        selector: usedSelector,
        backgroundColor: toHex(styles.backgroundColor),
        color: toHex(styles.color),
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        borderRadius: styles.borderRadius,
        padding: styles.padding,
        border: styles.border,
        boxShadow: styles.boxShadow,
      });
    }

    const sampledElements = Array.from(document.querySelectorAll<HTMLElement>('body *')).slice(
      0,
      200,
    );
    const inlineStyledCount = sampledElements.filter((element) =>
      element.getAttribute('style')?.trim(),
    ).length;
    const inlineRatio = sampledElements.length > 0 ? inlineStyledCount / sampledElements.length : 0;

    const utilityClassPattern =
      /(^|:)(m[trblxy]?|p[trblxy]?|text|bg|rounded|shadow|flex|grid|w|h)-/;
    const utilityClassCount = sampledElements.reduce((count, element) => {
      const classNames = element.className || '';
      return utilityClassPattern.test(classNames) ? count + 1 : count;
    }, 0);
    const utilityClassRatio =
      sampledElements.length > 0 ? utilityClassCount / sampledElements.length : 0;

    const stylingMechanism = new Set<StylingMechanism>();
    if (Object.keys(cssVariables).length > 0) stylingMechanism.add('css-variables');
    if (tailwindConfig !== null || utilityClassRatio > 0.3) stylingMechanism.add('tailwind');
    if (inlineRatio > 0.2) stylingMechanism.add('inline');
    stylingMechanism.add('scss');
    if (stylingMechanism.size === 0) stylingMechanism.add('css-variables');

    return {
      url: window.location.href,
      title: document.title,
      fonts: Array.from(fontMap.values()),
      cssVariables,
      computedColors,
      computedTypography,
      computedSpacing: sortNumeric(Array.from(spacingValues)),
      computedRadii: sortNumeric(Array.from(radiusValues)),
      computedShadows: Array.from(shadowValues.values()),
      tailwindConfig,
      animationLibraries: Array.from(animationLibraries.values()),
      motionTokens,
      componentSamples,
      stylingMechanism: Array.from(stylingMechanism.values()),
    };
  });
}
