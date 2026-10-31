import { ChevronDown, FolderOpen, Menu, MessageSquarePlus, Moon, PanelLeft, Search, Settings2, Sun, SunMoon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { platform } from '../platform';
import { useApp } from '../store/app';

function baseName(value: string): string { return value.replaceAll('\\', '/').split('/').at(-1) || value; }

export function TopBar() {
  const workspace = useApp((state) => state.workspace);
  const dockVisible = useApp((state) => state.dockVisible);
  const theme = useApp((state) => state.theme);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false); };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [menuOpen]);
  const openWorkspace = async () => { const folder = await platform.pickWorkspace(); if (folder) useApp.getState().setWorkspace(folder); };
  const cycleTheme = () => useApp.getState().setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark');
  const ThemeIcon = theme === 'system' ? SunMoon : theme === 'dark' ? Moon : Sun;
  return <header className="topbar" aria-label="Application">
    <div className="brand"><span className="brand-mark small">F</span><span className="brand-name">Forge</span></div>
    <div className="top-menu-wrap" ref={menuRef}>
      <button className={`icon-button ${menuOpen ? 'on' : ''}`} title="Main menu" onClick={() => setMenuOpen(!menuOpen)}><Menu size={16} /></button>
      {menuOpen && <div className="app-menu">
        <button onClick={() => { useApp.getState().createConversation(); setMenuOpen(false); }}>New task <kbd>Ctrl N</kbd></button>
        <button onClick={() => { void openWorkspace(); setMenuOpen(false); }}>Open workspace…</button>
        <span />
        <button onClick={() => { useApp.getState().setSettingsOpen(true); setMenuOpen(false); }}>Settings <kbd>Ctrl ,</kbd></button>
        <button onClick={() => { platform.close(); }}>Exit</button>
      </div>}
    </div>
    <button className={`icon-button ${dockVisible ? 'on' : ''}`} title="Toggle side panel (Ctrl+B)" onClick={() => useApp.getState().toggleDock()}><PanelLeft size={16} /></button>
    <div className="topbar-sep" />
    <button className="ws-pill" title={workspace ?? 'Open workspace'} onClick={openWorkspace}><FolderOpen size={15} /><span>{workspace ? baseName(workspace) : 'Open…'}</span><ChevronDown size={13} /></button>
    <div className="topbar-flex" />
    <button className="palette-trigger" onClick={() => { useApp.getState().showDock('tasks'); window.dispatchEvent(new Event('forge:search-tasks')); }} title="Search tasks and actions"><Search size={14} /><span>Search everywhere</span><span className="kbd-group"><kbd>Shift</kbd><kbd>Shift</kbd></span></button>
    <div className="topbar-flex" />
    <button className="icon-button" title="New task (Ctrl+N)" onClick={() => useApp.getState().createConversation()}><MessageSquarePlus size={16} /></button>
    <button className="icon-button" title={`Theme: ${theme}`} onClick={cycleTheme}><ThemeIcon size={16} /></button>
    <button className="icon-button" title="Settings" onClick={() => useApp.getState().setSettingsOpen(true)}><Settings2 size={16} /></button>
  </header>;
}

