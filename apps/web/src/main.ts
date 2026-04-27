import '../styles/main.scss';
import loadingMessages from './loading-messages.json';
import { getFilenameFromUrl } from './scrape-session';

const form = document.querySelector<HTMLFormElement>('#scrape-form');
const input = document.querySelector<HTMLInputElement>('#url-input');
const status = document.querySelector<HTMLElement>('#status');
const button = document.querySelector<HTMLButtonElement>('#submit-btn');
const workspace = document.querySelector<HTMLElement>('#workspace');
const pillRail = document.querySelector<HTMLElement>('#pill-rail');
const previewPane = document.querySelector<HTMLElement>('#preview-pane');
const splitPanel = document.querySelector<HTMLElement>('#split-panel');
const markdownPreview = document.querySelector<HTMLElement>('#markdown-preview');
const resultMessage = document.querySelector<HTMLElement>('#result-message');
const activeFileName = document.querySelector<HTMLElement>('#active-file-name');
const copyButton = document.querySelector<HTMLButtonElement>('#copy-btn');
const copyTooltip = document.querySelector<HTMLElement>('#copy-tooltip');
const closePreviewButton = document.querySelector<HTMLButtonElement>('#close-preview-btn');

const normalizeBaseUrl = (value: string): string => value.trim().replace(/\/+$/, '');
const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = typeof rawApiBaseUrl === 'string' ? normalizeBaseUrl(rawApiBaseUrl) : '';
const LOADING_TICK_MS = 1400;
const SESSION_STORAGE_KEY = 'grabby-session-history';
const WEBGL_UNSUPPORTED_MESSAGE =
  'Seems like WebGL2 is not supported by your browser 😰 Please update it to access the experience.';

type ScrapeUnsupportedResponse = {
  status: 'unsupported';
  reason: 'webgl-heavy-unsupported';
  message: string;
};

type ScrapeErrorResponse = {
  error?: string;
};

type ScrapeItem = {
  id: string;
  sourceUrl: string;
  hostname: string;
  filename: string;
  markdown: string;
  createdAt: number;
};

type StoredSessionState = {
  scrapeHistory: ScrapeItem[];
  activeScrapeId: string | null;
  isPreviewOpen: boolean;
};

let scrapeHistory: ScrapeItem[] = [];
let activeScrapeId: string | null = null;
let isPreviewOpen = false;
let loadingTimer: number | null = null;
let copyTooltipTimer: number | null = null;
let loadingIndex = 0;

const setStatus = (message: string): void => {
  if (!status) return;
  status.hidden = false;
  status.textContent = message;
};

const getNavigationType = (): string | undefined => {
  const entries = performance.getEntriesByType('navigation');
  const firstEntry = entries[0];
  if (firstEntry && 'type' in firstEntry) {
    return String((firstEntry as PerformanceNavigationTiming).type);
  }
  return undefined;
};

const persistSessionState = (): void => {
  const payload: StoredSessionState = {
    scrapeHistory,
    activeScrapeId,
    isPreviewOpen,
  };
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
};

const restoreSessionState = (): void => {
  const navigationType = getNavigationType();
  if (navigationType === 'reload') {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as StoredSessionState;
    if (Array.isArray(parsed.scrapeHistory)) {
      scrapeHistory = parsed.scrapeHistory;
      activeScrapeId = parsed.activeScrapeId;
      isPreviewOpen = Boolean(parsed.isPreviewOpen);
      const activeExists = scrapeHistory.some((item) => item.id === activeScrapeId);
      if (!activeExists) {
        activeScrapeId = null;
      }
      if (!activeScrapeId) {
        isPreviewOpen = false;
      }
    }
  } catch {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
};

const getActiveScrape = (): ScrapeItem | null =>
  scrapeHistory.find((item) => item.id === activeScrapeId) ?? null;

const downloadMarkdown = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
};

const setMarkdownPreview = (content: string): void => {
  if (!markdownPreview) return;
  markdownPreview.textContent = content;
};

const setResultMessage = (message: string): void => {
  if (!resultMessage) return;
  resultMessage.textContent = message;
};

const setResultControlsState = (hasActiveItem: boolean): void => {
  if (copyButton) copyButton.disabled = !hasActiveItem;
};

const stopLoadingMessages = (): void => {
  if (!status) return;

  if (loadingTimer) {
    window.clearInterval(loadingTimer);
    loadingTimer = null;
  }
  status.classList.remove('status--loading');
  const spinner = status.querySelector<HTMLElement>('.status__spinner');
  spinner?.remove();
};

const renderLoadingStatus = (message: string): void => {
  if (!status) return;
  status.innerHTML =
    '<span class="status__spinner" aria-hidden="true"><svg width="60" height="60" viewBox="0 0 50 50"><g transform="rotate(0 25 25)"><rect x="24" y="10" width="2" height="4" fill="#10B981"><animateTransform attributeName="transform" type="scale" values="1,1;1,2;1,1" dur="1s" begin="0s" repeatCount="indefinite"></animateTransform></rect></g><g transform="rotate(30 25 25)"><rect x="24" y="10" width="2" height="4" fill="#60A5FA"><animateTransform attributeName="transform" type="scale" values="1,1;1,2;1,1" dur="1s" begin="0.1s" repeatCount="indefinite"></animateTransform></rect></g><g transform="rotate(60 25 25)"><rect x="24" y="10" width="2" height="4" fill="#10B981"><animateTransform attributeName="transform" type="scale" values="1,1;1,2;1,1" dur="1s" begin="0.2s" repeatCount="indefinite"></animateTransform></rect></g><g transform="rotate(90 25 25)"><rect x="24" y="10" width="2" height="4" fill="#60A5FA"><animateTransform attributeName="transform" type="scale" values="1,1;1,2;1,1" dur="1s" begin="0.30000000000000004s" repeatCount="indefinite"></animateTransform></rect></g><g transform="rotate(120 25 25)"><rect x="24" y="10" width="2" height="4" fill="#10B981"><animateTransform attributeName="transform" type="scale" values="1,1;1,2;1,1" dur="1s" begin="0.4s" repeatCount="indefinite"></animateTransform></rect></g><g transform="rotate(150 25 25)"><rect x="24" y="10" width="2" height="4" fill="#60A5FA"><animateTransform attributeName="transform" type="scale" values="1,1;1,2;1,1" dur="1s" begin="0.5s" repeatCount="indefinite"></animateTransform></rect></g><g transform="rotate(180 25 25)"><rect x="24" y="10" width="2" height="4" fill="#10B981"><animateTransform attributeName="transform" type="scale" values="1,1;1,2;1,1" dur="1s" begin="0.6000000000000001s" repeatCount="indefinite"></animateTransform></rect></g><g transform="rotate(210 25 25)"><rect x="24" y="10" width="2" height="4" fill="#60A5FA"><animateTransform attributeName="transform" type="scale" values="1,1;1,2;1,1" dur="1s" begin="0.7000000000000001s" repeatCount="indefinite"></animateTransform></rect></g><g transform="rotate(240 25 25)"><rect x="24" y="10" width="2" height="4" fill="#10B981"><animateTransform attributeName="transform" type="scale" values="1,1;1,2;1,1" dur="1s" begin="0.8s" repeatCount="indefinite"></animateTransform></rect></g><g transform="rotate(270 25 25)"><rect x="24" y="10" width="2" height="4" fill="#60A5FA"><animateTransform attributeName="transform" type="scale" values="1,1;1,2;1,1" dur="1s" begin="0.9s" repeatCount="indefinite"></animateTransform></rect></g><g transform="rotate(300 25 25)"><rect x="24" y="10" width="2" height="4" fill="#10B981"><animateTransform attributeName="transform" type="scale" values="1,1;1,2;1,1" dur="1s" begin="1s" repeatCount="indefinite"></animateTransform></rect></g><g transform="rotate(330 25 25)"><rect x="24" y="10" width="2" height="4" fill="#60A5FA"><animateTransform attributeName="transform" type="scale" values="1,1;1,2;1,1" dur="1s" begin="1.1s" repeatCount="indefinite"></animateTransform></rect></g></svg></span><span class="status__text"></span>';
  const textElement = status.querySelector<HTMLElement>('.status__text');
  if (textElement) {
    textElement.textContent = message;
  }
};

const startLoadingMessages = (): void => {
  if (!status) return;
  stopLoadingMessages();
  loadingIndex = 0;
  status.classList.add('status--loading');
  renderLoadingStatus(loadingMessages[loadingIndex] ?? 'Loading...');

  loadingTimer = window.setInterval(() => {
    const nextIndex = Math.min(loadingIndex + 1, loadingMessages.length - 2);
    loadingIndex = nextIndex;
    const message = loadingMessages[nextIndex] ?? 'Loading...';
    const textElement = status.querySelector<HTMLElement>('.status__text');
    if (textElement) {
      textElement.textContent = message;
    }
  }, LOADING_TICK_MS);
};

const finishLoadingMessages = (): void => {
  stopLoadingMessages();
  setStatus(loadingMessages[loadingMessages.length - 1] ?? 'Done');
};

const syncScreenState = (): void => {
  const hasResults = scrapeHistory.length > 0;
  const hasActivePreview = isPreviewOpen && getActiveScrape() !== null;
  document.body.classList.toggle('ui--empty', !hasResults);
  document.body.classList.toggle('ui--results', hasResults);
  document.body.classList.toggle('ui--list-only', hasResults && !hasActivePreview);
  document.body.classList.toggle('ui--preview-open', hasResults && hasActivePreview);
  if (status) {
    status.hidden = !hasResults;
  }
  if (workspace) {
    workspace.hidden = !hasResults;
  }
  if (previewPane) {
    previewPane.hidden = !hasResults || !hasActivePreview;
  }
  if (splitPanel) {
    splitPanel.hidden = !hasResults || !hasActivePreview;
  }
};

const renderPills = (): void => {
  if (!pillRail) return;
  pillRail.replaceChildren();
  const sortedHistory = [...scrapeHistory].sort((a, b) => b.createdAt - a.createdAt);
  for (const item of sortedHistory) {
    const pill = document.createElement('article');
    pill.className = `pill-card ${item.id === activeScrapeId ? 'pill-card--active' : ''}`;

    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.className = 'pill-card__open';
    openButton.dataset.scrapeId = item.id;
    openButton.setAttribute('aria-pressed', String(item.id === activeScrapeId && isPreviewOpen));
    openButton.innerHTML = `<span class="pill-card__icon"><iconify-icon icon="solar:document-text-outline"></iconify-icon></span><span class="pill-card__meta"><strong>${item.filename}</strong><small>Document · MD</small></span>`;

    const downloadAction = document.createElement('button');
    downloadAction.type = 'button';
    downloadAction.className = 'pill-card__download';
    downloadAction.dataset.downloadId = item.id;
    downloadAction.setAttribute('aria-label', `Download ${item.filename}`);
    downloadAction.innerHTML = `<iconify-icon icon="solar:download-outline"></iconify-icon><span>Download</span>`;

    pill.append(openButton, downloadAction);
    pillRail.append(pill);
  }
};

const renderActivePreview = (): void => {
  const active = getActiveScrape();
  if (!splitPanel || !activeFileName) return;

  if (!active || !isPreviewOpen) {
    setResultControlsState(false);
    setMarkdownPreview('');
    setResultMessage('Select a file from the left pane to preview markdown.');
    activeFileName.textContent = '';
    activeFileName.hidden = true;
    splitPanel.classList.add('split-panel--empty');
    return;
  }

  splitPanel.classList.remove('split-panel--empty');
  activeFileName.hidden = false;
  activeFileName.textContent = active.filename;
  setMarkdownPreview(active.markdown);
  setResultMessage('Preview, copy, or download this markdown output.');
  setResultControlsState(true);
};

const renderWorkspace = (): void => {
  syncScreenState();
  renderPills();
  renderActivePreview();
};

const addScrapeItem = (sourceUrl: string, markdown: string): void => {
  const { hostname, filename } = getFilenameFromUrl(sourceUrl);
  const item: ScrapeItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sourceUrl,
    hostname,
    filename,
    markdown,
    createdAt: Date.now(),
  };
  scrapeHistory.push(item);
  activeScrapeId = null;
  isPreviewOpen = false;
  persistSessionState();
  renderWorkspace();
};

const showCopiedTooltip = (): void => {
  if (!copyTooltip) return;
  if (copyTooltipTimer) {
    window.clearTimeout(copyTooltipTimer);
  }
  copyTooltip.hidden = false;
  copyTooltipTimer = window.setTimeout(() => {
    if (copyTooltip) {
      copyTooltip.hidden = true;
    }
  }, 1200);
};

pillRail?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const downloadAction = target.closest<HTMLButtonElement>('button[data-download-id]');
  if (downloadAction) {
    const item = scrapeHistory.find((entry) => entry.id === downloadAction.dataset.downloadId);
    if (item) {
      downloadMarkdown(item.markdown, item.filename);
      setStatus(`${item.filename} downloaded.`);
    }
    return;
  }

  const openButton = target.closest<HTMLButtonElement>('button[data-scrape-id]');
  if (openButton) {
    activeScrapeId = openButton.dataset.scrapeId ?? null;
    isPreviewOpen = true;
    persistSessionState();
    renderWorkspace();
  }
});

copyButton?.addEventListener('click', async () => {
  const active = getActiveScrape();
  if (!active) return;
  await navigator.clipboard.writeText(active.markdown);
  showCopiedTooltip();
  setStatus('Copied to clipboard.');
});

closePreviewButton?.addEventListener('click', () => {
  isPreviewOpen = false;
  activeScrapeId = null;
  persistSessionState();
  renderWorkspace();
});

restoreSessionState();
renderWorkspace();

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const url = input?.value.trim();

  if (!url) {
    setStatus('Please enter a valid URL.');
    return;
  }

  try {
    if (!API_BASE_URL) {
      throw new Error('VITE_API_BASE_URL is not configured. Please set it in the web environment.');
    }
    setResultMessage('Working on your extraction...');
    if (button) button.disabled = true;
    startLoadingMessages();

    const response = await fetch(`${API_BASE_URL}/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ScrapeErrorResponse | null;
      throw new Error(payload?.error ?? 'Failed to generate markdown.');
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as ScrapeUnsupportedResponse;
      const message =
        payload.reason === 'webgl-heavy-unsupported' ? payload.message : WEBGL_UNSUPPORTED_MESSAGE;
      addScrapeItem(url, message);
      finishLoadingMessages();
      setStatus(`Ready. ${getFilenameFromUrl(url).filename} created. Click the pill to preview.`);
      return;
    }

    const markdown = await response.text();
    addScrapeItem(url, markdown);
    finishLoadingMessages();
    setStatus(`Ready. ${getFilenameFromUrl(url).filename} created. Click the pill to preview.`);
  } catch (error) {
    stopLoadingMessages();
    setStatus((error as Error).message);
  } finally {
    if (button) button.disabled = false;
  }
});
