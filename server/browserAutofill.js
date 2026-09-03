import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const browserCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

function findBrowserExecutable() {
  return browserCandidates.find((candidate) => existsSync(candidate));
}

function buildSelectors(step) {
  const field = step.field || '';
  const normalizedField = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const candidates = [
    `input[name*="${step.id || ''}" i]`,
    `textarea[name*="${step.id || ''}" i]`,
    `select[name*="${step.id || ''}" i]`,
    `input[placeholder*="${field}" i]`,
    `textarea[placeholder*="${field}" i]`,
    `input[aria-label*="${field}" i]`,
    `textarea[aria-label*="${field}" i]`,
    `select[aria-label*="${field}" i]`,
  ].filter((selector) => !selector.includes('""'));

  return { candidates, labelRegex: new RegExp(normalizedField, 'i') };
}

async function fillBySelector(page, step) {
  const { candidates } = buildSelectors(step);

  for (const selector of candidates) {
    const locator = page.locator(selector);
    if ((await locator.count()) === 0) continue;
    const target = locator.first();
    if (step.type === 'select') {
      await selectBestOption(target, step.value);
    } else {
      await target.fill(step.value || '');
    }
    return selector;
  }

  return null;
}

async function fillByLabel(page, step) {
  try {
    const { labelRegex } = buildSelectors(step);
    const locator = page.getByLabel(labelRegex);
    if ((await locator.count()) === 0) return null;
    const target = locator.first();
    if (step.type === 'select') {
      await selectBestOption(target, step.value);
    } else {
      await target.fill(step.value || '');
    }
    return `label:${step.field}`;
  } catch {
    return null;
  }
}

async function selectBestOption(locator, value = '') {
  const options = await locator.locator('option').evaluateAll((nodes) =>
    nodes.map((node) => ({ label: node.textContent?.trim() || '', value: node.value || '' }))
  );
  const normalizedValue = value.toLowerCase();
  const best =
    options.find((option) => option.label.toLowerCase().includes(normalizedValue)) ||
    options.find((option) => normalizedValue.includes(option.label.toLowerCase())) ||
    options.find((option) => option.value);

  if (best?.value) {
    await locator.selectOption(best.value);
  }
}

export async function runBrowserAutofill({ url, steps = [] }) {
  if (!url) {
    throw new Error('url is required');
  }

  const executablePath = findBrowserExecutable();
  if (!executablePath) {
    throw new Error('No Chrome or Edge executable found. Set CHROME_PATH to enable browser autofill.');
  }

  const browser = await chromium.launch({
    executablePath,
    headless: false,
    args: ['--start-maximized', '--disable-features=BlockInsecurePrivateNetworkRequests'],
  });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  } catch (error) {
    const message = error.message || '';
    if (message.includes('ERR_NETWORK_ACCESS_DENIED')) {
      return {
        ok: false,
        url,
        browser: executablePath,
        results: [],
        code: 'NETWORK_ACCESS_DENIED',
        message:
          '浏览器已启动，但目标站点被当前自动化浏览器的网络策略拦截。请先用“打开链接”在正常浏览器里访问；后续需要改成 Chrome 扩展或连接用户已有浏览器标签页来填充。',
      };
    }
    throw error;
  }

  const results = [];
  for (const step of steps) {
    if (!step.value || step.value === '待补充') {
      results.push({ ...step, status: 'skipped', reason: 'empty value' });
      continue;
    }

    if (step.type === 'file') {
      results.push({ ...step, status: 'manual', reason: 'file upload requires user confirmation' });
      continue;
    }

    try {
      const selector = (await fillByLabel(page, step)) || (await fillBySelector(page, step));
      results.push(selector ? { ...step, status: 'filled', selector } : { ...step, status: 'not_found' });
    } catch (error) {
      results.push({ ...step, status: 'error', reason: error.message });
    }
  }

  return {
    ok: true,
    url: page.url(),
    browser: executablePath,
    results,
    message: 'Browser remains open. Review the page manually before submitting.',
  };
}
