import { MessageSquarePlus, MoreHorizontal, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store/app';

export function TaskPanel() {
  const conversations = useApp((state) => state.conversations);
  const activeId = useApp((state) => state.activeConversationId);
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const visible = useMemo(() => conversations.filter((item) => item.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a, b) => b.updatedAt - a.updatedAt), [conversations, query]);
  useEffect(() => {
    const focus = () => input.current?.focus();
    window.addEventListener('forge:search-tasks', focus);
    return () => window.removeEventListener('forge:search-tasks', focus);
  }, []);
  return <div className="task-panel">
    <div className="dock-head"><span>Tasks</span><button className="icon-button" title="Hide panel" onClick={() => useApp.getState().toggleDock()}><X size={14} /></button></div>
    <button className="new-task compact" onClick={() => useApp.getState().createConversation()}><MessageSquarePlus size={15} /> New task <kbd>Ctrl N</kbd></button>
    <label className="dock-search"><Search size={13} /><input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" /></label>
    <div className="thread-list">
      {visible.length === 0 && <div className="thread-empty">{query ? 'No matching tasks' : 'Your tasks will appear here'}</div>}
      {visible.map((conversation) => <div key={conversation.id} className={`thread ${conversation.id === activeId ? 'active' : ''}`} onClick={() => useApp.getState().selectConversation(conversation.id)}>
        <span className={`thread-status ${conversation.busy ? 'busy' : ''}`} />
        <span className="thread-title" dir="auto" title={conversation.title}>{conversation.title}</span>
        <div className="thread-actions">
          <button title="Rename" onClick={(event) => { event.stopPropagation(); const title = window.prompt('Task name', conversation.title); if (title) useApp.getState().renameConversation(conversation.id, title); }}><MoreHorizontal size={14} /></button>
          <button title="Delete" onClick={(event) => { event.stopPropagation(); useApp.getState().deleteConversation(conversation.id); }}><Trash2 size={13} /></button>
        </div>
      </div>)}
    </div>
  </div>;
}

export const Sidebar = TaskPanel;
