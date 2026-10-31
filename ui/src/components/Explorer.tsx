import { ChevronDown, ChevronRight, File, FileCode2, Folder, FolderOpen, PanelRightClose, Plus, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { platform } from '../platform';
import { activeConversation, useApp } from '../store/app';
import type { FileEntry } from '../types/app';

function TreeNode({ root, entry, depth }: { root: string; entry: FileEntry; depth: number }) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<FileEntry[] | null>(null);
  const activate = async () => {
    if (!entry.isDirectory) { useApp.getState().setPreviewFile(entry.path); return; }
    const next = !open;
    setOpen(next);
    if (next && !children) setChildren(await platform.listDirectory(root, entry.path));
  };
  return <>
    <button className="tree-row" style={{ paddingLeft: 10 + depth * 14 }} onClick={activate} title={entry.path}>
      {entry.isDirectory ? (open ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : <span className="tree-spacer" />}
      {entry.isDirectory ? (open ? <FolderOpen size={15} /> : <Folder size={15} />) : <File size={14} />}
      <span>{entry.name}</span>
    </button>
    {open && children?.map((child) => <TreeNode key={child.path} root={root} entry={child} depth={depth + 1} />)}
  </>;
}

export function Explorer() {
  const root = useApp((state) => state.workspace);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const refresh = async () => {
    if (!root) return;
    setLoading(true);
    try { setEntries(await platform.listDirectory(root)); } finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, [root]);
  if (!root) return null;
  return (
    <div className="explorer">
      <div className="dock-head"><span>Explorer</span><button className={`icon-button ${loading ? 'spin' : ''}`} title="Refresh" onClick={refresh}><RefreshCw size={14} /></button><button className="icon-button" title="Close explorer" onClick={() => useApp.getState().toggleDock()}><PanelRightClose size={15} /></button></div>
      <div className="workspace-root" title={root}><FolderOpen size={14} /> {root.replaceAll('\\', '/').split('/').at(-1)}</div>
      <div className="tree">{entries.map((entry) => <TreeNode key={entry.path} root={root} entry={entry} depth={0} />)}</div>
    </div>
  );
}

export function FilePreview() {
  const root = useApp((state) => state.workspace);
  const path = useApp((state) => state.previewFile);
  const conversation = useApp(activeConversation);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    setContent(''); setError('');
    if (root && path) platform.readFile(root, path).then(setContent).catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)));
  }, [root, path]);
  if (!root || !path) return null;
  const attached = conversation?.contextFiles.includes(path) ?? false;
  return (
    <div className="preview-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) useApp.getState().setPreviewFile(null); }}>
      <section className="file-preview">
        <div className="preview-head"><FileCode2 size={15} /><span title={path}>{path}</span><button className={`button small ${attached ? 'attached' : ''}`} onClick={() => attached ? useApp.getState().removeContextFile(path) : useApp.getState().addContextFile(path)}>{attached ? <X size={13} /> : <Plus size={13} />}{attached ? 'Remove context' : 'Add context'}</button><button className="icon-button" onClick={() => useApp.getState().setPreviewFile(null)}><X size={16} /></button></div>
        {error ? <div className="preview-error">{error}</div> : <pre className="file-content"><code>{content || 'Loading…'}</code></pre>}
      </section>
    </div>
  );
}

