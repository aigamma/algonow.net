// Chrome DevTools Protocol driver for the QA sweeps: one headless Chrome, one
// target per page, no Playwright or Puppeteer. Needs Node 22 (global fetch and
// WebSocket) and a Chrome binary: the CHROME environment variable, or the
// usual install paths below.
//
// Why CDP rather than plain `chrome --headless --dump-dom`: the site forbids
// framing and a figure's #visual anchor does not scroll on a fresh load, so a
// plain screenshot shows the page top; this driver waits for the app to mount,
// scrolls an element into view, clips the capture, and records every console
// error and uncaught exception while it does.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

export const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const CANDIDATES = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe` : '',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

export function chromePath() {
  const found = CANDIDATES.find((candidate) => existsSync(candidate));
  if (!found) throw new Error('No Chrome binary found; set CHROME to the path of one');
  return found;
}

// The app has mounted (an h1) and the preserved narration player has finished
// its lazy load (the disclosure is no longer disabled).
export const APP_READY = 'Boolean(document.querySelector("h1")) && !document.querySelector(".narration-disclosure[disabled]")';

async function waitForDevtools(port) {
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }
  throw new Error(`devtools endpoint on port ${port} never answered`);
}

class Session {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = []; }
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    const session = new Session(ws);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && session.pending.has(message.id)) {
        const { resolve, reject } = session.pending.get(message.id);
        session.pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error))); else resolve(message.result);
      } else if (message.method) {
        for (const listener of session.listeners) listener(message);
      }
    };
    return session;
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  on(listener) { this.listeners.push(listener); }
  close() { this.ws.close(); }
}

export class Page {
  constructor(session, target, port) { this.session = session; this.target = target; this.port = port; this.errors = []; }

  send(method, params) { return this.session.send(method, params); }

  // Navigate, emulate the viewport, wait for `ready` (a JS expression) and
  // then settle. Every console error or warning, uncaught exception, and
  // error-level log entry from this point on lands in this.errors.
  async load(url, { width = 1200, height = 900, mobile = width < 700, reducedMotion = false, ready = APP_READY, settle = 900, readyPolls = 40 } = {}) {
    const { errors } = this;
    this.session.on((message) => {
      if (message.method === 'Runtime.exceptionThrown') {
        const details = message.params.exceptionDetails;
        errors.push(`exception: ${details.exception?.description || details.text}`.slice(0, 300));
      }
      if (message.method === 'Runtime.consoleAPICalled' && (message.params.type === 'error' || message.params.type === 'warning')) {
        errors.push(`console.${message.params.type}: ${message.params.args.map((a) => a.value || a.description || '').join(' ')}`.slice(0, 300));
      }
      if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(`log: ${message.params.entry.text}`.slice(0, 300));
    });
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('Log.enable');
    await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    if (reducedMotion) await this.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    const loaded = new Promise((resolve) => this.session.on((message) => { if (message.method === 'Page.loadEventFired') resolve(); }));
    await this.send('Page.navigate', { url });
    await Promise.race([loaded, sleep(15000)]);
    for (let i = 0; i < readyPolls; i += 1) {
      if (await this.evaluate(ready)) break;
      await sleep(250);
    }
    if (settle) await sleep(settle);
    return errors;
  }

  async evaluate(expression, { awaitPromise = false } = {}) {
    const { result, exceptionDetails } = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
    if (exceptionDetails) throw new Error(`evaluate failed: ${exceptionDetails.exception?.description || exceptionDetails.text}`);
    return result.value;
  }

  async screenshot(options = {}) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png', ...options });
    return Buffer.from(data, 'base64');
  }

  async viewport(width, height, mobile = width < 700) {
    await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  }

  async close() {
    this.session.close();
    await fetch(`http://127.0.0.1:${this.port}/json/close/${this.target.id}`);
  }
}

// Launch one headless Chrome, hand `fn` an api with newPage(), and kill Chrome
// afterwards whatever happened. The profile lives in the OS temp directory,
// never in the tree: a fresh profile still receives policy-installed
// extensions, whose code is not an authored surface for the style scans.
export async function withChrome(fn, { port = Number(process.env.CDP_PORT || 9333), profile, windowSize = '1200,900' } = {}) {
  const chrome = chromePath();
  const userDataDir = profile || path.join(os.tmpdir(), 'algonow-qa', `profile-cdp-${port}`);
  mkdirSync(userDataDir, { recursive: true });
  const child = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    `--remote-debugging-port=${port}`, `--user-data-dir=${userDataDir}`, `--window-size=${windowSize}`, 'about:blank',
  ], { stdio: 'ignore' });
  try {
    await waitForDevtools(port);
    const api = {
      port,
      async newPage() {
        const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
        const target = await response.json();
        const session = await Session.open(target.webSocketDebuggerUrl);
        return new Page(session, target, port);
      },
    };
    return await fn(api);
  } finally {
    child.kill();
  }
}
