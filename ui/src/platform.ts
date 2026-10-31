import type { AgentMode, FileEntry, Provider } from './types/app';

interface AgentRequest {
  runId: string;
  conversationId: string;
  provider: Provider;
  mode: AgentMode;
  history: { role: 'user' | 'assistant'; content: string }[];
  message: string;
  workspace: string | null;
  contextFiles?: string[];
}

export interface ForgeBridge {
  platform: string;
  appVersion: string;
  pickWorkspace(): Promise<string | null>;
  listDirectory(root: string, relativePath?: string): Promise<FileEntry[]>;
  readFile(root: string, relativePath: string): Promise<string>;
  revealFile(root: string, relativePath: string): Promise<void>;
  hasApiKey(providerId: string): Promise<boolean>;
  setApiKey(providerId: string, value: string | null): Promise<void>;
  testProvider(provider: Provider): Promise<{ ok: boolean; message: string; models: string[] }>;
  startAgent(request: AgentRequest): Promise<void>;
  stopAgent(runId: string): void;
  approveTool(callId: string, allow: boolean, always?: boolean): void;
  onAgentEvent(callback: (payload: { runId: string; event: unknown }) => void): () => void;
  minimize(): void;
  maximize(): void;
  close(): void;
}

declare global {
  interface Window { forge?: ForgeBridge }
}

const unavailable = () => Promise.reject(new Error('Forge desktop bridge is unavailable. Start the Electron app with npm run dev.'));

export const platform: ForgeBridge = window.forge ?? {
  platform: navigator.platform,
  appVersion: 'browser',
  pickWorkspace: unavailable,
  listDirectory: unavailable,
  readFile: unavailable,
  revealFile: unavailable,
  hasApiKey: async () => false,
  setApiKey: unavailable,
  testProvider: unavailable,
  startAgent: unavailable,
  stopAgent: () => undefined,
  approveTool: () => undefined,
  onAgentEvent: () => () => undefined,
  minimize: () => undefined,
  maximize: () => undefined,
  close: () => undefined,
};

