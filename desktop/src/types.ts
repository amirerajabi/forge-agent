export type AgentMode = 'agent' | 'auto' | 'chat';

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
}

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentRequest {
  runId: string;
  conversationId: string;
  provider: ProviderConfig;
  mode: AgentMode;
  history: HistoryMessage[];
  message: string;
  workspace: string | null;
  contextFiles?: string[];
}

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
}

