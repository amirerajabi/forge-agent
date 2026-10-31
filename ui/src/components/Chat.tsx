import { AlertCircle, Bot, Brain, Check, ChevronDown, ChevronRight, Circle, FileCode2, FolderOpen, LoaderCircle, PanelRight, Paperclip, Play, Send, Settings2, ShieldCheck, Sparkles, Square, Terminal, X, XCircle } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { platform } from '../platform';
import { approve, activeConversation, sendMessage, stopActive, useApp } from '../store/app';
import type { AgentMode, TranscriptItem } from '../types/app';
import { Markdown } from './Markdown';

const MODES: { id: AgentMode; name: string; description: string }[] = [
  { id: 'agent', name: 'Agent', description: 'Reads freely; asks before edits and commands' },
  { id: 'auto', name: 'Auto', description: 'Runs tools without approval' },
  { id: 'chat', name: 'Chat', description: 'Conversation only; no workspace tools' },
];

function ToolCard({ item }: { item: Extract<TranscriptItem, { kind: 'tool' }> }) {
  const [open, setOpen] = useState(item.status === 'approval');
  useEffect(() => { if (item.status === 'approval') setOpen(true); }, [item.status]);
  let input: Record<string, unknown> = {};
  try { input = JSON.parse(item.input || '{}') as Record<string, unknown>; } catch { /* raw input is shown */ }
  const icon = item.name === 'run_command' ? <Terminal size={14} /> : item.name === 'read_file' || item.name === 'list_files' ? <FileCode2 size={14} /> : <Play size={14} />;
  const stateIcon = item.status === 'running' ? <LoaderCircle size={13} className="spin" /> : item.status === 'done' ? <Check size={13} className="ok" /> : item.status === 'error' ? <AlertCircle size={13} className="bad" /> : item.status === 'denied' ? <XCircle size={13} className="muted" /> : <ShieldCheck size={13} className="warn" />;
  return (
    <div className={`tool-card ${item.status}`}>
      <button className="tool-summary" onClick={() => setOpen(!open)}>{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}{icon}<span>{item.title}</span>{stateIcon}</button>
      {open && <div className="tool-details">
        {item.name === 'replace_in_file' && typeof input.old_text === 'string' ? <div className="mini-diff"><pre className="removed">{input.old_text}</pre><pre className="added">{String(input.new_text ?? '')}</pre></div> : item.name === 'write_file' && typeof input.content === 'string' ? <pre className="added">{String(input.content).slice(0, 5000)}</pre> : item.name === 'run_command' ? <pre>&gt; {String(input.command ?? '')}</pre> : item.input !== '{}' ? <pre>{item.input}</pre> : null}
        {item.output && <pre className="tool-output">{item.output}</pre>}
        {item.changedFile && <button className="text-button" onClick={() => useApp.getState().setPreviewFile(item.changedFile!)}>Open {item.changedFile}</button>}
      </div>}
      {item.status === 'approval' && <div className="approval-row"><span>Allow this action?</span><button className="button primary small" onClick={() => approve(item.callId, true)}>Allow</button><button className="button small" onClick={() => approve(item.callId, true, true)}>Always allow</button><button className="button ghost small" onClick={() => approve(item.callId, false)}>Deny</button></div>}
    </div>
  );
}

function TranscriptItemView({ item, live }: { item: TranscriptItem; live: boolean }) {
  const [thinkingOpen, setThinkingOpen] = useState(false);
  if (item.kind === 'user') return <div className="message user-message"><div dir="auto">{item.content}</div></div>;
  if (item.kind === 'tool') return <ToolCard item={item} />;
  if (item.kind === 'notice') return <div className={`notice ${item.error ? 'error' : ''}`} dir="auto">{item.error && <AlertCircle size={14} />}{item.content}</div>;
  if (!item.content && !item.reasoning) return live ? <div className="working"><span /><span /><span /></div> : null;
  return <div className="message assistant-message">
    <div className="assistant-avatar"><Sparkles size={15} /></div>
    <div className="assistant-body">
      {item.reasoning && <div className="thinking"><button onClick={() => setThinkingOpen(!thinkingOpen)}>{thinkingOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}<Brain size={13} />{live && !item.content ? 'Thinking…' : 'Reasoning'}</button>{thinkingOpen && <div dir="auto">{item.reasoning}</div>}</div>}
      {item.content && <Markdown content={item.content} />}
    </div>
  </div>;
}

function EmptyChat() {
  const hasKey = useApp((state) => state.hasActiveKey);
  const workspace = useApp((state) => state.workspace);
  const suggestions = workspace ? ['Understand this codebase', 'Find likely bugs and risky code', 'Add a feature to this project', 'Run the tests and fix failures'] : ['Explain a coding concept', 'Help me design an API', 'Review a code snippet', 'Plan a new project'];
  return <div className="empty-chat">
    <div className="empty-orb"><Bot size={28} /></div>
    <h1>What do you want to build?</h1>
    <p>{workspace ? 'Forge can inspect your workspace, edit files, and run commands with your approval.' : 'Open a workspace for agent tools, or start a regular coding conversation.'}</p>
    {!hasKey && <button className="button primary" onClick={() => useApp.getState().setSettingsOpen(true)}><Settings2 size={15} /> Configure GLM</button>}
    {!workspace && <button className="button" onClick={async () => { const folder = await platform.pickWorkspace(); if (folder) useApp.getState().setWorkspace(folder); }}><FolderOpen size={15} /> Open workspace</button>}
    <div className="suggestions">{suggestions.map((text) => <button key={text} onClick={() => void sendMessage(text)}>{text}<span>↗</span></button>)}</div>
  </div>;
}

function Composer() {
  const conversation = useApp(activeConversation);
  const provider = useApp((state) => state.providers.find((item) => item.id === state.activeProviderId) ?? state.providers[0]);
  const [text, setText] = useState('');
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const focus = () => textarea.current?.focus();
    window.addEventListener('forge:focus-composer', focus);
    return () => window.removeEventListener('forge:focus-composer', focus);
  }, []);
  useEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = '0px';
    element.style.height = `${Math.min(220, Math.max(58, element.scrollHeight))}px`;
  }, [text]);
  if (!conversation) return null;
  const submit = () => { if (!conversation.busy && text.trim()) { void sendMessage(text); setText(''); } };
  return <div className="composer-wrap">
    {conversation.contextFiles.length > 0 && <div className="context-chips">{conversation.contextFiles.map((file) => <span key={file}><FileCode2 size={12} />{file}<button onClick={() => useApp.getState().removeContextFile(file)}><X size={12} /></button></span>)}</div>}
    <div className="composer">
      <textarea ref={textarea} dir="auto" value={text} onChange={(event) => setText(event.target.value)} placeholder="Ask Forge to explain, build, fix, or test…" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} />
      <div className="composer-bar">
        <select value={conversation.mode} onChange={(event) => useApp.getState().setConversationMode(event.target.value as AgentMode)} title={MODES.find((mode) => mode.id === conversation.mode)?.description}>{MODES.map((mode) => <option key={mode.id} value={mode.id}>{mode.name}</option>)}</select>
        <button className="composer-provider" onClick={() => useApp.getState().setSettingsOpen(true)}><Circle size={7} fill="currentColor" /> {provider?.name} · {provider?.model}</button>
        <span className="composer-spacer" />
        <button className="icon-button" title="Browse files to add context" onClick={() => useApp.getState().setExplorerOpen(true)}><Paperclip size={16} /></button>
        {conversation.busy ? <button className="send-button stop" title="Stop" onClick={stopActive}><Square size={13} fill="currentColor" /></button> : <button className="send-button" title="Send" disabled={!text.trim()} onClick={submit}><Send size={16} /></button>}
      </div>
    </div>
    <div className="composer-note">Forge can make mistakes. Review edits and commands before approval.</div>
  </div>;
}

export function Chat() {
  const conversation = useApp(activeConversation);
  const explorerOpen = useApp((state) => state.explorerOpen);
  const workspace = useApp((state) => state.workspace);
  const scroll = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  useLayoutEffect(() => { if (stick.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [conversation?.items]);
  return <main className="chat-area">
    <header className="chat-head">
      <div className="chat-title"><span dir="auto">{conversation?.title ?? 'New task'}</span>{workspace && <small>{workspace.replaceAll('\\', '/').split('/').at(-1)}</small>}</div>
      <div className="chat-actions">{conversation && conversation.usage.input + conversation.usage.output > 0 && <span className="usage">{conversation.usage.input.toLocaleString()} in · {conversation.usage.output.toLocaleString()} out</span>}{workspace && !explorerOpen && <button className="icon-button" title="Show workspace" onClick={() => useApp.getState().setExplorerOpen(true)}><PanelRight size={17} /></button>}<button className="icon-button" title="Settings" onClick={() => useApp.getState().setSettingsOpen(true)}><Settings2 size={17} /></button></div>
    </header>
    {!conversation || conversation.items.length === 0 ? <EmptyChat /> : <div ref={scroll} className="transcript" onScroll={(event) => { const element = event.currentTarget; stick.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80; }}><div className="transcript-inner">{conversation.items.map((item) => <TranscriptItemView key={item.id} item={item} live={conversation.busy && item.id === conversation.items.at(-1)?.id} />)}</div></div>}
    <Composer />
  </main>;
}

