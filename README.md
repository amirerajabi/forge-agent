# Forge

Forge is a focused desktop coding agent for GLM and other OpenAI-compatible APIs. Its UI follows the useful desktop patterns from `emdi` and `kod`: an Electron shell, a React/Vite interface, persistent local state, an IDE-style workspace explorer, and a keyboard-first layout.

## What is included

- GLM connection settings: base URL, model name, and API key
- Streaming Chat Completions with reasoning-content support
- Agent, Auto, and Chat modes
- Workspace tools: list, read, search, focused replace, write, and run command
- Approval cards before edits and commands in Agent mode
- Persistent conversations, task search, rename, and delete
- Workspace explorer, file preview, and explicit file-context attachments
- Markdown/GFM answers, code blocks, copy buttons, tool output, and usage counts
- Automatic RTL rendering for Persian and Arabic messages, Markdown blocks, reasoning, titles, and the composer; code and terminal output remain LTR
- Dark, light, and system themes
- Encrypted API-key storage through Electron `safeStorage`
- Data-driven providers: add another OpenAI-compatible backend from Settings
- Emdi/Kod-style workbench: top bar, tool stripe, resizable dock, center area, status bar, and sectioned settings
- GitHub Releases auto-update: background checks/downloads, progress, restart-to-update, and install-on-quit

## Run in development

Requirements: Node.js 20+ and PowerShell on Windows.

```powershell
npm run install:all
npm run dev
```

`npm run dev` builds the Electron bridge, starts Vite, and opens Forge.

## Build

```powershell
npm run build
```

Create a Windows installer:

```powershell
npm run dist
```

The installer is written to `release/`.

## Releases and automatic updates

Forge uses `electron-updater` with the public `amirerajabi/forge-agent` GitHub Releases feed. A Windows release must contain all three generated update assets:

- `Forge-Setup-X.Y.Z.exe`
- `Forge-Setup-X.Y.Z.exe.blockmap`
- `latest.yml`

The bundled GitHub Actions workflow builds and uploads these files whenever a version tag is pushed. Before tagging, set the same version in the root, `ui`, and `desktop` package files, commit, then push a matching tag:

```powershell
git tag v0.3.0
git push origin main v0.3.0
```

Installed builds check after startup and every six hours when automatic updates are enabled. New installers download in the background; the status bar and Settings › Updates show progress and offer **Restart now** when ready.

## Configure GLM

Open **Settings**, then enter:

- **Base URL** — for example `https://open.bigmodel.cn/api/paas/v4`
- **Model name** — the exact model exposed by your account
- **API key** — saved in the operating system's encrypted credential storage

Use **Test connection** to verify the endpoint and fetch its model list. Forge accepts either an API root or a full `/chat/completions` URL.

## Architecture

```text
desktop/  Electron shell, secure bridge, updater, agent loop, provider client, workspace tools
ui/       React workbench, conversations, settings, dock/explorer, status bar, Markdown transcript
scripts/  development and production build entry points
```

The renderer never receives the saved API key. Provider requests, command execution, and filesystem access stay in the Electron main process. Workspace paths are resolved and checked before every file operation.

## Adding providers and agents later

OpenAI-compatible providers can already be added at runtime from Settings. The provider model is deliberately small (`id`, `name`, `baseUrl`, `model`), while the agent loop consumes a provider-neutral configuration. Native provider protocols and specialized agent profiles can therefore be added behind the same desktop bridge without changing the conversation UI.

