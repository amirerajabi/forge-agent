import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/app';
import { Explorer } from './Explorer';
import { TaskPanel } from './Sidebar';

export function Dock() {
  const visible = useApp((state) => state.dockVisible);
  const panel = useApp((state) => state.dockPanel);
  const [width, setWidth] = useState(280);
  const dragging = useRef(false);
  useEffect(() => {
    const move = (event: PointerEvent) => { if (dragging.current) setWidth(Math.max(220, Math.min(460, event.clientX - 40))); };
    const up = () => { dragging.current = false; document.body.classList.remove('resizing'); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, []);
  if (!visible) return null;
  return <><aside className="dock" style={{ width }} aria-label="Side panel">{panel === 'tasks' ? <TaskPanel /> : <Explorer />}</aside><div className="dock-splitter" onDoubleClick={() => setWidth(280)} onPointerDown={() => { dragging.current = true; document.body.classList.add('resizing'); }} /></>;
}

