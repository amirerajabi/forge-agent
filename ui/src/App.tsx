import { useEffect } from 'react';
import { Chat } from './components/Chat';
import { FilePreview } from './components/Explorer';
import { Settings } from './components/Settings';
import { Dock } from './components/Dock';
import { StatusBar } from './components/StatusBar';
import { ToolStripe } from './components/ToolStripe';
import { TopBar } from './components/TopBar';
import { activeConversation, useApp } from './store/app';

export default function App() {
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
      if (event.key.toLowerCase() === 'b') { event.preventDefault(); useApp.getState().toggleDock(); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);
  useEffect(() => { document.title = `${conversation?.title ?? 'Forge'} — Forge`; }, [conversation?.title]);
  return <div className="app">
    <TopBar />
    <div className="main-layout">
      <ToolStripe />
      <Dock />
      <div className="center"><Chat /></div>
    </div>
    <StatusBar />
    <Settings />
    <FilePreview />
  </div>;
}

