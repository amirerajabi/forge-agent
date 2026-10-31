import { Bot, FolderTree, MessageSquareText, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { useApp } from '../store/app';

export function ToolStripe() {
  const panel = useApp((state) => state.dockPanel);
  const visible = useApp((state) => state.dockVisible);
  const button = (id: 'tasks' | 'explorer', title: string, icon: ReactNode) => <button className={`stripe-btn ${visible && panel === id ? 'active' : ''}`} title={title} onClick={() => useApp.getState().toggleDock(id)}>{icon}</button>;
  return <nav className="tool-stripe" aria-label="Tool windows">
    <div className="stripe-group">
      {button('tasks', 'Tasks', <MessageSquareText size={17} />)}
      {button('explorer', 'Explorer', <FolderTree size={17} />)}
      <button className="stripe-btn" title="Search tasks" onClick={() => { useApp.getState().showDock('tasks'); window.dispatchEvent(new Event('forge:search-tasks')); }}><Search size={17} /></button>
    </div>
    <span />
    <button className="stripe-btn ai-stripe" title="AI provider settings" onClick={() => useApp.getState().setSettingsOpen(true)}><Bot size={17} /></button>
  </nav>;
}

