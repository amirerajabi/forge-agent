import { Check, KeyRound, Plus, Server, SunMoon, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { platform } from '../platform';
import { useApp } from '../store/app';
import type { Provider, Theme } from '../types/app';

export function Settings() {
  const open = useApp((state) => state.settingsOpen);
  const providers = useApp((state) => state.providers);
  const activeId = useApp((state) => state.activeProviderId);
  const theme = useApp((state) => state.theme);
  const hasKey = useApp((state) => state.hasActiveKey);
  const [selectedId, setSelectedId] = useState(activeId);
  const [draft, setDraft] = useState<Provider>(providers.find((item) => item.id === activeId) ?? providers[0]);
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [models, setModels] = useState<string[]>([]);
  useEffect(() => {
    const provider = providers.find((item) => item.id === selectedId) ?? providers[0];
    if (provider) setDraft(provider);
    setApiKey(''); setResult(null); setModels([]);
  }, [selectedId, open]);
  useEffect(() => { if (open) setSelectedId(activeId); }, [open, activeId]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') useApp.getState().setSettingsOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);
  if (!open || !draft) return null;
  const save = async () => {
    useApp.getState().saveProvider({ ...draft, name: draft.name.trim() || 'Custom provider', baseUrl: draft.baseUrl.trim(), model: draft.model.trim() });
    if (apiKey.trim()) await platform.setApiKey(draft.id, apiKey.trim());
    await useApp.getState().refreshKeyState();
    setApiKey('');
    setResult({ ok: true, message: 'Settings saved' });
  };
  const test = async () => {
    setTesting(true); setResult(null);
    try {
      useApp.getState().saveProvider(draft);
      if (apiKey.trim()) await platform.setApiKey(draft.id, apiKey.trim());
      const response = await platform.testProvider(draft);
      setResult(response); setModels(response.models);
      await useApp.getState().refreshKeyState();
    } finally { setTesting(false); }
  };
  const addProvider = () => {
    const provider: Provider = { id: crypto.randomUUID(), name: 'New provider', baseUrl: 'https://example.com/v1', model: '' };
    useApp.getState().saveProvider(provider); setSelectedId(provider.id);
  };
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) useApp.getState().setSettingsOpen(false); }}>
    <section className="settings-modal">
      <header><div><h2>Settings</h2><p>Connect Forge to GLM or another OpenAI-compatible API.</p></div><button className="icon-button" onClick={() => useApp.getState().setSettingsOpen(false)}><X size={18} /></button></header>
      <div className="settings-layout">
        <nav className="provider-list">
          <div className="settings-nav-label">Providers</div>
          {providers.map((provider) => <button key={provider.id} className={provider.id === selectedId ? 'active' : ''} onClick={() => setSelectedId(provider.id)}><Server size={14} /><span>{provider.name}<small>{provider.model || 'No model'}</small></span>{provider.id === activeId && <Check size={13} />}</button>)}
          <button className="add-provider" onClick={addProvider}><Plus size={14} /> Add provider</button>
          <div className="settings-nav-label appearance-label">Appearance</div>
          <div className="theme-picker"><SunMoon size={14} /><select value={theme} onChange={(event) => useApp.getState().setTheme(event.target.value as Theme)}><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select></div>
        </nav>
        <div className="provider-form">
          <div className="form-heading"><div className="provider-logo">{draft.name.slice(0, 1).toUpperCase()}</div><div><h3>{draft.name}</h3><p>OpenAI-compatible Chat Completions</p></div>{!draft.builtIn && <button className="icon-button danger" title="Delete provider" onClick={() => { useApp.getState().deleteProvider(draft.id); setSelectedId(useApp.getState().providers[0].id); }}><Trash2 size={15} /></button>}</div>
          <label>Display name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label>Base URL<input value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} placeholder="https://open.bigmodel.cn/api/paas/v4" /><small>Use the API root. Forge appends /chat/completions and /models.</small></label>
          <label>Model name<input list="provider-models" value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} placeholder="glm-4.6" /><datalist id="provider-models">{models.map((model) => <option key={model} value={model} />)}</datalist></label>
          <label>API key<div className="key-field"><KeyRound size={15} /><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={hasKey && draft.id === activeId ? 'Saved securely — enter to replace' : 'Paste API key'} /></div><small>Stored with your operating system's encryption and never exposed to the web UI.</small></label>
          {hasKey && draft.id === activeId && <button className="text-button clear-key" onClick={async () => { await platform.setApiKey(draft.id, null); await useApp.getState().refreshKeyState(); setResult({ ok: true, message: 'Saved API key removed' }); }}>Remove saved API key</button>}
          <div className={`connection-result ${result ? (result.ok ? 'success' : 'failure') : ''}`}>{result?.message ?? 'Test the connection to verify the URL, key, and available models.'}</div>
          <footer><button className="button" disabled={testing || !draft.baseUrl || !draft.model} onClick={test}>{testing ? 'Testing…' : 'Test connection'}</button><span /><button className="button ghost" onClick={() => useApp.getState().setSettingsOpen(false)}>Cancel</button><button className="button primary" onClick={save}>Save</button></footer>
        </div>
      </div>
    </section>
  </div>;
}

