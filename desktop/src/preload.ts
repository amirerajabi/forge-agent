import { contextBridge, ipcRenderer } from 'electron';
import type { AgentRequest, FileEntry, ProviderConfig } from './types';

contextBridge.exposeInMainWorld('forge', {
  platform: process.platform,
  appVersion: process.argv.find((arg) => arg.startsWith('--forge-version='))?.split('=')[1] ?? '0.1.0',
  pickWorkspace: (): Promise<string | null> => ipcRenderer.invoke('workspace:pick'),
  listDirectory: (root: string, relativePath?: string): Promise<FileEntry[]> => ipcRenderer.invoke('workspace:list', root, relativePath ?? ''),
  readFile: (root: string, relativePath: string): Promise<string> => ipcRenderer.invoke('workspace:read', root, relativePath),
  revealFile: (root: string, relativePath: string): Promise<void> => ipcRenderer.invoke('workspace:reveal', root, relativePath),
  hasApiKey: (providerId: string): Promise<boolean> => ipcRenderer.invoke('secret:has', providerId),
  setApiKey: (providerId: string, value: string | null): Promise<void> => ipcRenderer.invoke('secret:set', providerId, value),
  testProvider: (provider: ProviderConfig): Promise<{ ok: boolean; message: string; models: string[] }> => ipcRenderer.invoke('provider:test', provider),
  startAgent: (request: AgentRequest): Promise<void> => ipcRenderer.invoke('agent:start', request),
  stopAgent: (runId: string): void => ipcRenderer.send('agent:stop', runId),
  approveTool: (callId: string, allow: boolean, always?: boolean): void => ipcRenderer.send('agent:approve', callId, allow, always === true),
  onAgentEvent: (callback: (payload: { runId: string; event: unknown }) => void) => {
    const listener = (_event: unknown, payload: { runId: string; event: unknown }) => callback(payload);
    ipcRenderer.on('agent:event', listener);
    return () => ipcRenderer.removeListener('agent:event', listener);
  },
  minimize: (): void => ipcRenderer.send('window:minimize'),
  maximize: (): void => ipcRenderer.send('window:maximize'),
  close: (): void => ipcRenderer.send('window:close'),
});

