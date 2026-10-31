export type AgentMode = 'agent' | 'auto' | 'chat';
export type Theme = 'dark' | 'light' | 'system';

export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  builtIn?: boolean;
}

export type ToolStatus = 'running' | 'approval' | 'done' | 'error' | 'denied';

export type TranscriptItem =
  | { id: string; kind: 'user'; content: string; createdAt: number }
  | { id: string; kind: 'assistant'; content: string; reasoning: string; createdAt: number }
  | { id: string; kind: 'tool'; callId: string; name: string; title: string; status: ToolStatus; input: string; output?: string; changedFile?: string; createdAt: number }
  | { id: string; kind: 'notice'; content: string; error?: boolean; createdAt: number };

export interface Conversation {
  id: string;
  title: string;
  items: TranscriptItem[];
  createdAt: number;
  updatedAt: number;
  mode: AgentMode;
  contextFiles: string[];
  busy: boolean;
  runId: string | null;
  usage: { input: number; output: number };
}

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
}

export type AgentEvent =
  | { type: 'assistant:start'; messageId: string }
  | { type: 'assistant:delta'; messageId: string; text: string }
  | { type: 'assistant:reasoning'; messageId: string; text: string }
  | { type: 'tool'; callId: string; name: string; title: string; status: ToolStatus; input: string; output?: string; changedFile?: string }
  | { type: 'usage'; input: number; output: number }
  | { type: 'done' }
  | { type: 'error'; message: string };

