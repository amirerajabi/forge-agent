import { app, BrowserWindow, dialog, ipcMain, Notification, shell } from 'electron';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { approveTool, startAgent, stopAgent, testProvider } from './agent';
import { hasSecret, setSecret } from './secrets';
import type { AgentRequest, ProviderConfig } from './types';
import { createUpdater, type UpdaterController } from './updater';
import { listDirectory, readTextFile, resolveWorkspacePath } from './workspace';

let mainWindow: BrowserWindow | null = null;
let updaterReady: Promise<UpdaterController>;

function createWindow(): void {
  const windows = process.platform === 'win32';
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 650,
    backgroundColor: '#111210',
    show: false,
    title: 'Forge',
    titleBarStyle: windows || process.platform === 'darwin' ? 'hidden' : 'default',
    titleBarOverlay: windows ? { color: '#111210', symbolColor: '#d8d9d4', height: 48 } : undefined,
    trafficLightPosition: process.platform === 'darwin' ? { x: 16, y: 16 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
      additionalArguments: [`--forge-version=${app.getVersion()}`],
    },
  });
  mainWindow.setMenu(null);
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const current = mainWindow?.webContents.getURL();
    if (current && url !== current) event.preventDefault();
  });
  const devUrl = process.env.FORGE_DEV_URL;
  if (devUrl) void mainWindow.loadURL(devUrl);
  else {
    const ui = app.isPackaged ? path.join(process.resourcesPath, 'ui', 'index.html') : path.join(__dirname, '..', '..', 'ui', 'dist', 'index.html');
    void mainWindow.loadFile(ui);
  }
}

function registerIpc(): void {
  ipcMain.handle('workspace:pick', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, { title: 'Open a workspace', properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle('workspace:list', async (_event, root: string, relativePath: string) => listDirectory(String(root), String(relativePath ?? '')));
  ipcMain.handle('workspace:read', async (_event, root: string, relativePath: string) => readTextFile(String(root), String(relativePath)));
  ipcMain.handle('workspace:reveal', async (_event, root: string, relativePath: string) => {
    const full = resolveWorkspacePath(String(root), String(relativePath));
    try { await fs.access(full); shell.showItemInFolder(full); } catch { /* already gone */ }
  });
  ipcMain.handle('secret:has', (_event, providerId: string) => hasSecret(`provider.${String(providerId)}`));
  ipcMain.handle('secret:set', (_event, providerId: string, value: string | null) => setSecret(`provider.${String(providerId)}`, value ? String(value) : null));
  ipcMain.handle('provider:test', (_event, provider: ProviderConfig) => testProvider(provider));
  ipcMain.handle('agent:start', (event, request: AgentRequest) => {
    void startAgent(request, event.sender);
  });
  ipcMain.on('agent:stop', (_event, runId: string) => stopAgent(String(runId)));
  ipcMain.on('agent:approve', (_event, callId: string, allow: boolean, always: boolean) => approveTool(String(callId), allow === true, always === true));
  ipcMain.on('shell:open', (_event, url: string) => { if (/^https:\/\//i.test(String(url))) void shell.openExternal(String(url)); });
  ipcMain.handle('update:status', async () => (await updaterReady).status);
  ipcMain.handle('update:check', async (_event, options?: { manual?: boolean }) => (await updaterReady).check({ manual: options?.manual === true }));
  ipcMain.handle('update:configure', async (_event, options?: { autoCheck?: boolean }) => (await updaterReady).configure({ autoCheck: options?.autoCheck === true }));
  ipcMain.handle('update:install', async () => (await updaterReady).install());
  ipcMain.handle('notify', (_event, value: { title?: string; body?: string }) => {
    if (mainWindow && !mainWindow.isFocused() && Notification.isSupported()) new Notification({ title: String(value?.title ?? 'Forge'), body: String(value?.body ?? '') }).show();
  });
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
  ipcMain.on('window:close', () => mainWindow?.close());
}

app.whenReady().then(() => {
  updaterReady = createUpdater((message) => console.log(`[updates] ${message}`));
  registerIpc();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => { void updaterReady?.then((updater) => updater.dispose()); });

