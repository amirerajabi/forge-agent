import { CircleAlert, GitBranch, Keyboard, LoaderCircle, RefreshCw, Sparkles } from 'lucide-react';
import { describeUpdate, restartToUpdate } from '../lib/updates';
import { activeConversation, useApp } from '../store/app';
import { useUpdates } from '../store/updates';

export function StatusBar() {
  const workspace = useApp((state) => state.workspace);
  const provider = useApp((state) => state.providers.find((item) => item.id === state.activeProviderId) ?? state.providers[0]);
  const conversation = useApp(activeConversation);
  const status = useUpdates((state) => state.status);
  const update = describeUpdate(status);
  const UpdateIcon = status?.state === 'error' ? CircleAlert : status?.state === 'ready' ? RefreshCw : LoaderCircle;
  return <footer className="statusbar">
    <span className="sb-item" title={workspace ?? 'No workspace'}><GitBranch size={12} />{workspace ? workspace.replaceAll('\\', '/').split('/').at(-1) : 'No workspace'}</span>
    <span className="sb-item"><Sparkles size={12} />{provider?.name} · {provider?.model}</span>
    <span className="sb-item">{conversation?.mode ?? 'agent'}</span>
    <span className="status-flex" />
    {conversation && conversation.usage.input + conversation.usage.output > 0 && <span className="sb-item muted">{conversation.usage.input.toLocaleString()} in · {conversation.usage.output.toLocaleString()} out</span>}
    {update.chip && <button className={`sb-item update-chip tone-${update.tone}`} title={update.text} onClick={() => status?.state === 'ready' ? void restartToUpdate() : useApp.getState().setSettingsOpen(true)}><UpdateIcon size={12} className={status?.state === 'checking' || status?.state === 'downloading' ? 'spin' : ''} />{update.chip}{update.percent !== undefined && <span className="status-progress"><i style={{ width: `${update.percent}%` }} /></span>}</button>}
    <button className="sb-item" title="Keyboard shortcuts" onClick={() => useApp.getState().setSettingsOpen(true)}><Keyboard size={12} /></button>
  </footer>;
}

