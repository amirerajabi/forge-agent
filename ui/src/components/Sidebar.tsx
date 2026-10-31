import { ChevronLeft, FolderOpen, MessageSquarePlus, MoreHorizontal, PanelLeftClose, Search, Settings, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { platform } from '../platform';
import { useApp } from '../store/app';

function shortPath(value: string): string {
  const parts = value.replaceAll('\\', '/').split('/');
  return parts.at(-1) || value;
}

export function Sidebar() {
  const conversations = useApp((state) => state.conversations);
  const activeId = useApp((state) => state.activeConversationId);
  const workspace = useApp((state) => state.workspace);
  const [query, setQuery] = useState('');
  const visible = useMemo(() => conversations.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.updatedAt - a.updatedAt), [conversations, query]);
  const pickWorkspace = async () => {
    const folder = await platform.pickWorkspace();
    if (folder) useApp.getState().setWorkspace(folder);
  };
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">F</div>
        <span>Forge</span>
        <button className="icon-button sidebar-collapse" title="Hide sidebar" onClick={() => useApp.getState().setSidebarOpen(false)}><PanelLeftClose size={16} /></button>
      </div>
      <button className="new-task" onClick={() => useApp.getState().createConversation()}><MessageSquarePlus size={16} /> New task <span>Ctrl N</span></button>
      <label className="sidebar-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" /></label>
      <div className="thread-label">Tasks</div>
      <div className="thread-list">
        {visible.length === 0 && <div className="thread-empty">{query ? 'No matching tasks' : 'Your tasks will appear here'}</div>}
        {visible.map((conversation) => (
          <div key={conversation.id} className={`thread ${conversation.id === activeId ? 'active' : ''}`} onClick={() => useApp.getState().selectConversation(conversation.id)}>
            <span className={`thread-status ${conversation.busy ? 'busy' : ''}`} />
            <span className="thread-title" dir="auto" title={conversation.title}>{conversation.title}</span>
            <div className="thread-actions">
              <button title="Rename" onClick={(event) => { event.stopPropagation(); const title = window.prompt('Task name', conversation.title); if (title) useApp.getState().renameConversation(conversation.id, title); }}><MoreHorizontal size={14} /></button>
              <button title="Delete" onClick={(event) => { event.stopPropagation(); useApp.getState().deleteConversation(conversation.id); }}><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="sidebar-bottom">
        <button className="workspace-button" onClick={pickWorkspace} title={workspace ?? 'Open a workspace'}>
          <FolderOpen size={16} /><span><b>{workspace ? shortPath(workspace) : 'Open workspace'}</b>{workspace && <small>{workspace}</small>}</span>
        </button>
        <button className="icon-button" title="Settings" onClick={() => useApp.getState().setSettingsOpen(true)}><Settings size={17} /></button>
      </div>
    </aside>
  );
}

export function CollapsedSidebarButton() {
  return <button className="sidebar-reveal icon-button" title="Show sidebar" onClick={() => useApp.getState().setSidebarOpen(true)}><ChevronLeft size={17} /></button>;
}

