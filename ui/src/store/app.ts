import { create } from 'zustand';
import { platform } from '../platform';
import type { AgentEvent, AgentMode, Conversation, Provider, Theme, TranscriptItem } from '../types/app';

const STORAGE_KEY = 'forge.state.v1';
const DEFAULT_PROVIDER: Provider = {
  id: 'glm',
  name: 'GLM',
  baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
  model: 'glm-4.6',
  builtIn: true,
};

interface PersistedState {
  providers: Provider[];
  activeProviderId: string;
  conversations: Conversation[];
  activeConversationId: string | null;
  workspace: string | null;
  theme: Theme;
}

function load(): PersistedState {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as Partial<PersistedState>;
    return {
      providers: parsed.providers?.length ? parsed.providers : [DEFAULT_PROVIDER],
      activeProviderId: parsed.activeProviderId ?? 'glm',
      conversations: (parsed.conversations ?? []).map((conversation) => ({ ...conversation, busy: false, runId: null })),
      activeConversationId: parsed.activeConversationId ?? parsed.conversations?.[0]?.id ?? null,
      workspace: parsed.workspace ?? null,
      theme: parsed.theme ?? 'dark',
    };
  } catch {
    return { providers: [DEFAULT_PROVIDER], activeProviderId: 'glm', conversations: [], activeConversationId: null, workspace: null, theme: 'dark' };
  }
}

interface AppState extends PersistedState {
  settingsOpen: boolean;
  explorerOpen: boolean;
  sidebarOpen: boolean;
  previewFile: string | null;
  hasActiveKey: boolean;
  createConversation(mode?: AgentMode): string;
  selectConversation(id: string): void;
  deleteConversation(id: string): void;
  renameConversation(id: string, title: string): void;
  setConversationMode(mode: AgentMode): void;
  setWorkspace(root: string | null): void;
  setTheme(theme: Theme): void;
  setActiveProvider(id: string): void;
  saveProvider(provider: Provider): void;
  deleteProvider(id: string): void;
  setSettingsOpen(open: boolean): void;
  setExplorerOpen(open: boolean): void;
  setSidebarOpen(open: boolean): void;
  setPreviewFile(path: string | null): void;
  addContextFile(path: string): void;
  removeContextFile(path: string): void;
  refreshKeyState(): Promise<void>;
}

const initial = load();
const uid = () => crypto.randomUUID();

export const useApp = create<AppState>((set, get) => ({
  ...initial,
  settingsOpen: false,
  explorerOpen: true,
  sidebarOpen: true,
  previewFile: null,
  hasActiveKey: false,
  createConversation(mode = 'agent') {
    const now = Date.now();
    const conversation: Conversation = { id: uid(), title: 'New task', items: [], createdAt: now, updatedAt: now, mode, contextFiles: [], busy: false, runId: null, usage: { input: 0, output: 0 } };
    set((state) => ({ conversations: [conversation, ...state.conversations], activeConversationId: conversation.id }));
    return conversation.id;
  },
  selectConversation: (id) => set({ activeConversationId: id }),
  deleteConversation(id) {
    set((state) => {
      const target = state.conversations.find((item) => item.id === id);
      if (target?.runId) platform.stopAgent(target.runId);
      const conversations = state.conversations.filter((item) => item.id !== id);
      return { conversations, activeConversationId: state.activeConversationId === id ? conversations[0]?.id ?? null : state.activeConversationId };
    });
  },
  renameConversation: (id, title) => set((state) => ({ conversations: state.conversations.map((item) => item.id === id ? { ...item, title: title.trim() || 'Untitled task' } : item) })),
  setConversationMode(mode) {
    const id = get().activeConversationId;
    if (id) set((state) => ({ conversations: state.conversations.map((item) => item.id === id ? { ...item, mode } : item) }));
  },
  setWorkspace: (workspace) => set({ workspace, explorerOpen: Boolean(workspace) }),
  setTheme: (theme) => set({ theme }),
  setActiveProvider: (activeProviderId) => { set({ activeProviderId }); void get().refreshKeyState(); },
  saveProvider(provider) {
    set((state) => ({ providers: state.providers.some((item) => item.id === provider.id) ? state.providers.map((item) => item.id === provider.id ? provider : item) : [...state.providers, provider], activeProviderId: provider.id }));
    void get().refreshKeyState();
  },
  deleteProvider(id) {
    set((state) => {
      const providers = state.providers.filter((item) => item.id !== id);
      return { providers: providers.length ? providers : [DEFAULT_PROVIDER], activeProviderId: state.activeProviderId === id ? (providers[0]?.id ?? 'glm') : state.activeProviderId };
    });
  },
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setExplorerOpen: (explorerOpen) => set({ explorerOpen }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setPreviewFile: (previewFile) => set({ previewFile }),
  addContextFile(path) {
    const id = get().activeConversationId ?? get().createConversation();
    set((state) => ({ conversations: state.conversations.map((item) => item.id === id && !item.contextFiles.includes(path) ? { ...item, contextFiles: [...item.contextFiles, path] } : item) }));
  },
  removeContextFile(path) {
    const id = get().activeConversationId;
    set((state) => ({ conversations: state.conversations.map((item) => item.id === id ? { ...item, contextFiles: item.contextFiles.filter((file) => file !== path) } : item) }));
  },
  async refreshKeyState() {
    const id = get().activeProviderId;
    const hasActiveKey = await platform.hasApiKey(id).catch(() => false);
    if (get().activeProviderId === id) set({ hasActiveKey });
  },
}));

function updateConversation(id: string, update: (conversation: Conversation) => Conversation): void {
  useApp.setState((state) => ({ conversations: state.conversations.map((conversation) => conversation.id === id ? update(conversation) : conversation) }));
}

export async function sendMessage(text: string): Promise<void> {
  const value = text.trim();
  if (!value) return;
  const state = useApp.getState();
  const id = state.activeConversationId ?? state.createConversation();
  const conversation = useApp.getState().conversations.find((item) => item.id === id)!;
  if (conversation.busy) return;
  const provider = state.providers.find((item) => item.id === state.activeProviderId) ?? state.providers[0];
  const history = conversation.items.reduce<{ role: 'user' | 'assistant'; content: string }[]>((messages, item) => {
    if (item.kind === 'user') messages.push({ role: 'user', content: item.content });
    else if (item.kind === 'assistant' && item.content) messages.push({ role: 'assistant', content: item.content });
    return messages;
  }, []);
  const runId = uid();
  const now = Date.now();
  updateConversation(id, (item) => ({
    ...item,
    title: item.items.length === 0 ? value.replace(/\s+/g, ' ').slice(0, 52) : item.title,
    items: [...item.items, { id: uid(), kind: 'user', content: value, createdAt: now }],
    busy: true,
    runId,
    updatedAt: now,
    usage: { input: 0, output: 0 },
  }));
  try {
    await platform.startAgent({ runId, conversationId: id, provider, mode: conversation.mode, history, message: value, workspace: state.workspace, contextFiles: conversation.contextFiles });
  } catch (error) {
    updateConversation(id, (item) => ({ ...item, busy: false, runId: null, items: [...item.items, { id: uid(), kind: 'notice', content: error instanceof Error ? error.message : String(error), error: true, createdAt: Date.now() }] }));
  }
}

export function stopActive(): void {
  const state = useApp.getState();
  const conversation = state.conversations.find((item) => item.id === state.activeConversationId);
  if (conversation?.runId) platform.stopAgent(conversation.runId);
}

export function approve(callId: string, allow: boolean, always = false): void {
  platform.approveTool(callId, allow, always);
}

function handleEvent(runId: string, event: AgentEvent): void {
  const state = useApp.getState();
  const conversation = state.conversations.find((item) => item.runId === runId);
  if (!conversation) return;
  updateConversation(conversation.id, (current) => {
    const now = Date.now();
    if (event.type === 'assistant:start') {
      if (current.items.some((item) => item.id === event.messageId)) return current;
      return { ...current, items: [...current.items, { id: event.messageId, kind: 'assistant', content: '', reasoning: '', createdAt: now }] };
    }
    if (event.type === 'assistant:delta' || event.type === 'assistant:reasoning') return {
      ...current,
      items: current.items.map((item) => item.kind === 'assistant' && item.id === event.messageId ? { ...item, ...(event.type === 'assistant:delta' ? { content: item.content + event.text } : { reasoning: item.reasoning + event.text }) } : item),
      updatedAt: now,
    };
    if (event.type === 'tool') {
      const existing = current.items.find((item) => item.kind === 'tool' && item.callId === event.callId);
      const toolItem: TranscriptItem = { id: existing?.id ?? uid(), kind: 'tool', callId: event.callId, name: event.name, title: event.title, status: event.status, input: event.input, output: event.output, changedFile: event.changedFile, createdAt: existing?.createdAt ?? now };
      return { ...current, items: existing ? current.items.map((item) => item.id === existing.id ? toolItem : item) : [...current.items, toolItem], updatedAt: now };
    }
    if (event.type === 'usage') return { ...current, usage: { input: event.input, output: event.output } };
    if (event.type === 'done') return { ...current, busy: false, runId: null, updatedAt: now };
    return { ...current, busy: false, runId: null, updatedAt: now, items: [...current.items, { id: uid(), kind: 'notice', content: event.message, error: true, createdAt: now }] };
  });
}

let listening = false;
export function initializeApp(): void {
  if (listening) return;
  listening = true;
  platform.onAgentEvent(({ runId, event }) => handleEvent(runId, event as AgentEvent));
  void useApp.getState().refreshKeyState();
  useApp.subscribe((state) => {
    const persisted: PersistedState = { providers: state.providers, activeProviderId: state.activeProviderId, conversations: state.conversations, activeConversationId: state.activeConversationId, workspace: state.workspace, theme: state.theme };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  });
}

export function activeConversation(state = useApp.getState()): Conversation | null {
  return state.conversations.find((item) => item.id === state.activeConversationId) ?? null;
}

