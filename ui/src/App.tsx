import { useEffect } from 'react';
import { Chat } from './components/Chat';
import { Explorer, FilePreview } from './components/Explorer';
import { Settings } from './components/Settings';
import { CollapsedSidebarButton, Sidebar } from './components/Sidebar';
import { activeConversation, useApp } from './store/app';

export default function App() {
  const sidebarOpen = useApp((state) => state.sidebarOpen);
  const explorerOpen = useApp((state) => state.explorerOpen);
  const workspace = useApp((state) => state.workspace);
  const theme = useApp((state) => state.theme);
  const conversation = useApp(activeConversation);
  useEffect(() => {
    const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [theme]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === 'n') { event.preventDefault(); useApp.getState().createConversation(); }
      if (event.key.toLowerCase() === 'l') { event.preventDefault(); window.dispatchEvent(new Event('forge:focus-composer')); }
      if (event.key === ',') { event.preventDefault(); useApp.getState().setSettingsOpen(true); }
      if (event.key.toLowerCase() === 'b') { event.preventDefault(); useApp.getState().setSidebarOpen(!useApp.getState().sidebarOpen); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);
  useEffect(() => { document.title = `${conversation?.title ?? 'Forge'} — Forge`; }, [conversation?.title]);
  return <div className="app-shell">
    <div className="drag-region" />
    {sidebarOpen ? <Sidebar /> : <CollapsedSidebarButton />}
    <Chat />
    {explorerOpen && workspace && <Explorer />}
    <Settings />
    <FilePreview />
  </div>;
}

