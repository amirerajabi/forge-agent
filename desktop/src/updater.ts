import { app, BrowserWindow } from 'electron';

export type UpdateState = 'disabled' | 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'ready' | 'error';
export interface UpdateStatus {
  state: UpdateState;
  currentVersion: string;
  version?: string;
  percent?: number;
  message?: string;
  releaseUrl?: string;
}

const RELEASES_URL = 'https://github.com/amirerajabi/forge-agent/releases';
const FIRST_CHECK_MS = 10_000;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

function releaseUrl(version?: string): string {
  return version ? `${RELEASES_URL}/tag/v${version}` : RELEASES_URL;
}

function broadcast(status: UpdateStatus): void {
  for (const window of BrowserWindow.getAllWindows()) if (!window.isDestroyed()) window.webContents.send('update:status', status);
}

function shortError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).split('\n')[0].slice(0, 300);
}

export interface UpdaterController {
  readonly status: UpdateStatus;
  configure(options: { autoCheck: boolean }): void;
  check(options?: { manual?: boolean }): Promise<UpdateStatus>;
  install(): boolean;
  dispose(): void;
}

class DisabledUpdater implements UpdaterController {
  readonly status: UpdateStatus;
  constructor(reason: string) { this.status = { state: 'disabled', currentVersion: app.getVersion(), message: reason }; }
  configure(): void {}
  check(): Promise<UpdateStatus> { return Promise.resolve(this.status); }
  install(): boolean { return false; }
  dispose(): void {}
}

export async function createUpdater(log: (message: string) => void): Promise<UpdaterController> {
  if (!app.isPackaged) return new DisabledUpdater('Updates are checked only in installed builds.');
  if (process.env.FORGE_DISABLE_UPDATES === '1') return new DisabledUpdater('Updates are disabled by FORGE_DISABLE_UPDATES.');
  if (process.platform !== 'win32') return new DisabledUpdater('Automatic installation is currently available on Windows.');
  try {
    const { autoUpdater } = await import('electron-updater');
    let current: UpdateStatus = { state: 'idle', currentVersion: app.getVersion() };
    let firstTimer: NodeJS.Timeout | null = null;
    let intervalTimer: NodeJS.Timeout | null = null;
    let checking: Promise<UpdateStatus> | null = null;

    const set = (next: Omit<UpdateStatus, 'currentVersion'>) => {
      current = { ...next, currentVersion: app.getVersion() };
      broadcast(current);
    };
    const fail = (error: unknown) => {
      const message = shortError(error);
      log(`error: ${message}`);
      if (current.state !== 'ready') set({ state: 'error', message });
    };
    const clearTimers = () => {
      if (firstTimer) clearTimeout(firstTimer);
      if (intervalTimer) clearInterval(intervalTimer);
      firstTimer = null;
      intervalTimer = null;
    };

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;
    autoUpdater.logger = {
      info: (...args: unknown[]) => log(`[info] ${args.map(String).join(' ')}`),
      warn: (...args: unknown[]) => log(`[warn] ${args.map(String).join(' ')}`),
      error: (...args: unknown[]) => log(`[error] ${args.map(String).join(' ')}`),
      debug: () => undefined,
    };
    autoUpdater.on('checking-for-update', () => set({ state: 'checking' }));
    autoUpdater.on('update-available', (info) => {
      log(`update available: ${info.version}`);
      set({ state: 'available', version: info.version, percent: 0, releaseUrl: releaseUrl(info.version) });
    });
    autoUpdater.on('update-not-available', () => set({ state: 'up-to-date' }));
    autoUpdater.on('download-progress', (progress) => set({ state: 'downloading', version: current.version, percent: Math.max(0, Math.min(100, Math.round(progress.percent ?? 0))), releaseUrl: current.releaseUrl }));
    autoUpdater.on('update-downloaded', (info) => {
      log(`update downloaded: ${info.version}`);
      set({ state: 'ready', version: info.version, percent: 100, releaseUrl: releaseUrl(info.version) });
    });
    autoUpdater.on('error', fail);

    const controller: UpdaterController = {
      get status() { return current; },
      configure(options) {
        clearTimers();
        if (!options.autoCheck) return;
        firstTimer = setTimeout(() => void controller.check(), FIRST_CHECK_MS);
        intervalTimer = setInterval(() => void controller.check(), CHECK_INTERVAL_MS);
        firstTimer.unref?.();
        intervalTimer.unref?.();
      },
      check() {
        if (current.state === 'ready' || current.state === 'downloading') return Promise.resolve(current);
        if (checking) return checking;
        checking = (async () => {
          try {
            set({ state: 'checking' });
            const result = await autoUpdater.checkForUpdates();
            if (current.state === 'checking' && !result?.isUpdateAvailable) set({ state: 'up-to-date' });
          } catch (error) { fail(error); }
          finally { checking = null; }
          return current;
        })();
        return checking;
      },
      install() {
        if (current.state !== 'ready') return false;
        clearTimers();
        autoUpdater.quitAndInstall(true, true);
        return true;
      },
      dispose: clearTimers,
    };
    return controller;
  } catch (error) {
    log(`disabled: ${shortError(error)}`);
    return new DisabledUpdater('The updater could not be started.');
  }
}

