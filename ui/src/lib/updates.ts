import { platform, type UpdateStatus } from '../platform';
import { useApp } from '../store/app';
import { useUpdates } from '../store/updates';

export const RELEASES_URL = 'https://github.com/amirerajabi/forge-agent/releases';

export function installUpdateWiring(): void {
  platform.onUpdateStatus((status) => {
    const previous = useUpdates.getState().status;
    useUpdates.getState().setStatus(status);
    if (status.state === 'ready' && status.version && previous?.state !== 'ready') void platform.showNotification({ title: `Forge ${status.version} is ready`, body: 'Restart Forge to finish installing the update.' });
  });
  void platform.getUpdateStatus().then((status) => useUpdates.getState().setStatus(status));
  const configure = () => platform.configureUpdates({ autoCheck: useApp.getState().autoCheckUpdates }).catch(() => undefined);
  configure();
  useApp.subscribe((state, previous) => { if (state.autoCheckUpdates !== previous.autoCheckUpdates) configure(); });
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  const previous = useUpdates.getState().status;
  useUpdates.getState().setStatus({ state: 'checking', currentVersion: previous?.currentVersion ?? platform.appVersion });
  const status = await platform.checkForUpdates({ manual: true });
  useUpdates.getState().setStatus(status);
  return status;
}

export async function restartToUpdate(): Promise<boolean> {
  return platform.quitAndInstall();
}

export function openReleases(url = RELEASES_URL): void {
  platform.openExternal(url);
}

export type UpdateTone = 'muted' | 'busy' | 'success' | 'accent' | 'warning';
export function describeUpdate(status: UpdateStatus | null): { text: string; chip: string | null; tone: UpdateTone; percent?: number } {
  switch (status?.state) {
    case 'checking': return { text: 'Checking for updates…', chip: 'Checking…', tone: 'busy' };
    case 'up-to-date': return { text: `Forge ${status.currentVersion} is the latest version.`, chip: null, tone: 'success' };
    case 'available': return { text: `Forge ${status.version} is available and will download in the background.`, chip: `v${status.version} available`, tone: 'accent' };
    case 'downloading': {
      const percent = Math.round(status.percent ?? 0);
      return { text: `Downloading Forge ${status.version}… ${percent}%`, chip: `Downloading ${percent}%`, tone: 'busy', percent };
    }
    case 'ready': return { text: `Forge ${status.version} is ready. Restart to finish updating.`, chip: 'Restart to update', tone: 'accent', percent: 100 };
    case 'error': return { text: `Update check failed${status.message ? `: ${status.message}` : '.'}`, chip: 'Update failed', tone: 'warning' };
    case 'disabled': return { text: status.message ?? 'Updates are unavailable in this build.', chip: null, tone: 'muted' };
    default: return { text: 'Updates have not been checked in this session.', chip: null, tone: 'muted' };
  }
}
