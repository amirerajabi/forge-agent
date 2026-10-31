import { Bot, Check, CircleAlert, CircleCheck, Download, ExternalLink, Info, KeyRound, LoaderCircle, Palette, Plus, RefreshCw, Search, Server, Settings2, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { checkForUpdates, describeUpdate, openReleases, restartToUpdate } from '../lib/updates';
import { platform } from '../platform';
import { useApp } from '../store/app';
import { useUpdates } from '../store/updates';
import type { Provider, Theme } from '../types/app';

type Section = 'general' | 'ai' | 'appearance' | 'updates' | 'about';
const SECTIONS: { id: Section; name: string; description: string; icon: ReactNode }[] = [
  { id: 'general', name: 'General', description: 'Workspace and behavior', icon: <SlidersHorizontal size={16} /> },
  { id: 'ai', name: 'AI Providers', description: 'Models and API access', icon: <Bot size={16} /> },
  { id: 'appearance', name: 'Appearance', description: 'Theme and interface', icon: <Palette size={16} /> },
  { id: 'updates', name: 'Updates', description: 'Version and releases', icon: <Download size={16} /> },
  { id: 'about', name: 'About', description: 'Forge information', icon: <Info size={16} /> },
];

function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="settings-card"><div className="settings-card-head"><h3>{title}</h3>{description && <p>{description}</p>}</div><div className="settings-card-body">{children}</div></section>;
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange(value: boolean): void; label: string; hint: string }) {
  return <label className="setting-row"><span><b>{label}</b><small>{hint}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}

function GeneralSection() {
  const workspace = useApp((state) => state.workspace);
  const autoCheck = useApp((state) => state.autoCheckUpdates);
  return <><Card title="Workspace" description="The folder available to the agent and Explorer."><div className="setting-path"><span>{workspace ?? 'No workspace is open'}</span><button className="button small" onClick={async () => { const folder = await platform.pickWorkspace(); if (folder) useApp.getState().setWorkspace(folder); }}>Choose…</button></div></Card><Card title="Application"><Toggle checked={autoCheck} onChange={(value) => useApp.getState().setAutoCheckUpdates(value)} label="Automatically check for updates" hint="Check after startup and every 6 hours" /></Card></>;
}

function AppearanceSection() {
  const theme = useApp((state) => state.theme);
  return <Card title="Interface theme" description="Choose how Forge looks."><div className="theme-cards">{(['system', 'light', 'dark'] as Theme[]).map((value) => <button key={value} className={theme === value ? 'active' : ''} onClick={() => useApp.getState().setTheme(value)}><span className={`theme-preview ${value}`} /><b>{value[0].toUpperCase() + value.slice(1)}</b>{theme === value && <Check size={14} />}</button>)}</div></Card>;
}

function AiSection() {
  const providers = useApp((state) => state.providers);
  const activeId = useApp((state) => state.activeProviderId);
  const hasKey = useApp((state) => state.hasActiveKey);
  const [selectedId, setSelectedId] = useState(activeId);
  const selected = providers.find((item) => item.id === selectedId) ?? providers[0];
  const [draft, setDraft] = useState<Provider>(selected);
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [models, setModels] = useState<string[]>([]);
  useEffect(() => { setDraft(selected); setApiKey(''); setResult(null); setModels([]); }, [selectedId]);
  if (!draft) return null;
  const save = async () => {
    useApp.getState().saveProvider({ ...draft, name: draft.name.trim() || 'Custom provider', baseUrl: draft.baseUrl.trim(), model: draft.model.trim() });
    if (apiKey.trim()) await platform.setApiKey(draft.id, apiKey.trim());
    await useApp.getState().refreshKeyState(); setApiKey(''); setResult({ ok: true, message: 'Provider settings saved.' });
  };
  const test = async () => {
    setTesting(true); setResult(null);
    try { useApp.getState().saveProvider(draft); if (apiKey.trim()) await platform.setApiKey(draft.id, apiKey.trim()); const response = await platform.testProvider(draft); setResult(response); setModels(response.models); await useApp.getState().refreshKeyState(); }
    finally { setTesting(false); }
  };
  const add = () => { const provider: Provider = { id: crypto.randomUUID(), name: 'Custom provider', baseUrl: 'https://example.com/v1', model: '' }; useApp.getState().saveProvider(provider); setSelectedId(provider.id); };
  return <><Card title="Provider" description="Choose the model used for new and existing tasks."><div className="provider-tabs">{providers.map((provider) => <button key={provider.id} className={provider.id === selectedId ? 'active' : ''} onClick={() => setSelectedId(provider.id)}><Server size={14} /><span>{provider.name}<small>{provider.model || 'No model'}</small></span>{provider.id === activeId && <Check size={13} />}</button>)}<button className="provider-add" onClick={add}><Plus size={14} /> Add</button></div></Card><Card title={draft.name} description="OpenAI-compatible Chat Completions API.">
    <div className="provider-fields">
      <label>Display name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label>Base URL<input value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} placeholder="https://open.bigmodel.cn/api/paas/v4" /><small>API root or a full /chat/completions URL</small></label>
      <label>Model name<input list="provider-models" value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} /><datalist id="provider-models">{models.map((model) => <option key={model} value={model} />)}</datalist></label>
      <label>API key<div className="key-field"><KeyRound size={15} /><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={hasKey && draft.id === activeId ? 'Saved securely — enter to replace' : 'Paste API key'} /></div><small>Encrypted by the operating system; never exposed to the renderer.</small></label>
    </div>
    <div className={`connection-result ${result ? (result.ok ? 'success' : 'failure') : ''}`}>{result?.message ?? 'Test the connection to verify this provider.'}</div>
    <div className="settings-actions">{!draft.builtIn && <button className="button ghost danger-text" onClick={() => { useApp.getState().deleteProvider(draft.id); setSelectedId(useApp.getState().providers[0].id); }}><Trash2 size={14} /> Delete</button>}<span /><button className="button" disabled={testing || !draft.baseUrl || !draft.model} onClick={test}>{testing ? <LoaderCircle size={14} className="spin" /> : <RefreshCw size={14} />} Test connection</button><button className="button primary" onClick={save}>Save provider</button></div>
  </Card></>;
}

function UpdatesSection() {
  const status = useUpdates((state) => state.status);
  const autoCheck = useApp((state) => state.autoCheckUpdates);
  const description = describeUpdate(status);
  const busy = status?.state === 'checking' || status?.state === 'downloading';
  const Icon = status?.state === 'error' ? CircleAlert : status?.state === 'up-to-date' ? CircleCheck : busy ? LoaderCircle : Download;
  return <><Card title="Forge updates" description="Updates are downloaded from GitHub Releases and installed when Forge restarts."><div className="update-hero"><span className="update-logo">F</span><div><b>Version {status?.currentVersion ?? platform.appVersion}</b><p className={`tone-${description.tone}`}><Icon size={14} className={busy ? 'spin' : ''} />{description.text}</p>{description.percent !== undefined && <div className="update-progress"><i style={{ width: `${description.percent}%` }} /></div>}</div><span />{status?.state === 'ready' ? <button className="button primary" onClick={() => void restartToUpdate()}><RefreshCw size={14} /> Restart now</button> : <button className="button" disabled={busy} onClick={() => void checkForUpdates()}><RefreshCw size={14} className={status?.state === 'checking' ? 'spin' : ''} /> Check for updates</button>}</div><button className="text-button release-link" onClick={() => openReleases(status?.releaseUrl)}>{status?.version ? `What's new in ${status.version}` : 'Open releases page'} <ExternalLink size={12} /></button></Card><Card title="Automatic updates"><Toggle checked={autoCheck} onChange={(value) => useApp.getState().setAutoCheckUpdates(value)} label="Automatically check for updates" hint="Check at startup and every 6 hours; download new versions in the background" /></Card></>;
}

function AboutSection() { return <Card title="Forge" description="A focused desktop coding agent."><div className="about-box"><span className="brand-mark about">F</span><div><h3>Forge {platform.appVersion}</h3><p>GLM and OpenAI-compatible coding agent with workspace tools, approvals, persistent tasks, and RTL support.</p><button className="text-button" onClick={() => openReleases()}>GitHub Releases <ExternalLink size={12} /></button></div></div></Card>; }

export function Settings() {
  const open = useApp((state) => state.settingsOpen);
  const [section, setSection] = useState<Section>('ai');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => SECTIONS.filter((item) => `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase())), [query]);
  useEffect(() => { if (!open) return; const close = (event: KeyboardEvent) => { if (event.key === 'Escape') useApp.getState().setSettingsOpen(false); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [open]);
  if (!open) return null;
  const current = SECTIONS.find((item) => item.id === section)!;
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) useApp.getState().setSettingsOpen(false); }}><section className="settings-dialog">
    <aside className="settings-side"><div className="settings-side-title"><Settings2 size={17} /> Settings</div><label className="settings-search"><Search size={13} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search settings" /></label><nav>{filtered.map((item) => <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => setSection(item.id)}>{item.icon}<span>{item.name}<small>{item.description}</small></span>{section === item.id && <Check size={13} />}</button>)}</nav><div className="settings-version">Forge {platform.appVersion}</div></aside>
    <div className="settings-content"><header><div><h2>{current.name}</h2><p>{current.description}</p></div><button className="icon-button" onClick={() => useApp.getState().setSettingsOpen(false)}><X size={18} /></button></header><div className="settings-scroll">{section === 'general' ? <GeneralSection /> : section === 'ai' ? <AiSection /> : section === 'appearance' ? <AppearanceSection /> : section === 'updates' ? <UpdatesSection /> : <AboutSection />}</div></div>
  </section></div>;
}
