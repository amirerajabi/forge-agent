import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { FileEntry } from './types';

const SKIP = new Set(['.git', '.idea', '.vs', '.vscode', 'node_modules', 'bin', 'obj', 'dist', 'out', 'release', 'coverage']);
const MAX_FILE_BYTES = 2_000_000;

function inside(root: string, candidate: string): boolean {
  const rel = path.relative(path.resolve(root), path.resolve(candidate));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

export function resolveWorkspacePath(root: string, relativePath = ''): string {
  const full = path.resolve(root, relativePath);
  if (!inside(root, full)) throw new Error(`Path is outside the workspace: ${relativePath}`);
  return full;
}

export async function listDirectory(root: string, relativePath = ''): Promise<FileEntry[]> {
  const full = resolveWorkspacePath(root, relativePath);
  const entries = await fs.readdir(full, { withFileTypes: true });
  const result: FileEntry[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') && SKIP.has(entry.name)) continue;
    if (SKIP.has(entry.name)) continue;
    const child = path.join(full, entry.name);
    let size: number | undefined;
    if (!entry.isDirectory()) {
      try { size = (await fs.stat(child)).size; } catch { /* file disappeared */ }
    }
    result.push({ name: entry.name, path: path.relative(root, child).replaceAll('\\', '/'), isDirectory: entry.isDirectory(), size });
  }
  return result.sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export async function readTextFile(root: string, relativePath: string): Promise<string> {
  const full = resolveWorkspacePath(root, relativePath);
  const stat = await fs.stat(full);
  if (!stat.isFile()) throw new Error('Not a file');
  if (stat.size > MAX_FILE_BYTES) throw new Error('File is larger than 2 MB');
  const buffer = await fs.readFile(full);
  if (buffer.includes(0)) throw new Error('Binary files cannot be opened as text');
  return buffer.toString('utf8');
}

export async function writeTextFile(root: string, relativePath: string, content: string): Promise<string> {
  const full = resolveWorkspacePath(root, relativePath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, 'utf8');
  return path.relative(root, full).replaceAll('\\', '/');
}

export async function replaceInFile(root: string, relativePath: string, oldText: string, newText: string): Promise<string> {
  const current = await readTextFile(root, relativePath);
  const crlf = current.includes('\r\n');
  const normalize = (text: string) => crlf ? text.replaceAll('\r\n', '\n').replaceAll('\n', '\r\n') : text.replaceAll('\r\n', '\n');
  const needle = normalize(oldText);
  const index = current.indexOf(needle);
  if (index < 0) throw new Error('old_text was not found; read the file again and copy it exactly');
  if (current.indexOf(needle, index + needle.length) >= 0) throw new Error('old_text occurs more than once; include more surrounding text');
  return writeTextFile(root, relativePath, current.slice(0, index) + normalize(newText) + current.slice(index + needle.length));
}

async function walk(root: string, relativePath: string, output: string[], limit = 600): Promise<void> {
  if (output.length >= limit) return;
  for (const entry of await listDirectory(root, relativePath)) {
    output.push(`${entry.path}${entry.isDirectory ? '/' : ''}`);
    if (entry.isDirectory) await walk(root, entry.path, output, limit);
    if (output.length >= limit) break;
  }
}

export async function listTree(root: string, relativePath = '', recursive = false): Promise<string> {
  if (!recursive) return (await listDirectory(root, relativePath)).map((entry) => `${entry.path}${entry.isDirectory ? '/' : ''}`).join('\n') || '(empty)';
  const output: string[] = [];
  await walk(root, relativePath, output);
  if (output.length >= 600) output.push('… (truncated at 600 entries)');
  return output.join('\n') || '(empty)';
}

function globMatches(file: string, include: string): boolean {
  if (!include.trim()) return true;
  return include.split(',').map((part) => part.trim()).filter(Boolean).some((pattern) => {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('**', '§§').replaceAll('*', '[^/]*').replaceAll('§§', '.*').replaceAll('?', '.');
    return new RegExp(`^${escaped}$`, 'i').test(file) || new RegExp(`(^|/)${escaped}$`, 'i').test(file);
  });
}

export async function searchWorkspace(root: string, query: string, regex = false, include = ''): Promise<string> {
  const files: string[] = [];
  await walk(root, '', files, 3000);
  const matcher = regex ? new RegExp(query, 'i') : null;
  const results: string[] = [];
  for (const file of files) {
    if (file.endsWith('/') || !globMatches(file, include)) continue;
    let text: string;
    try { text = await readTextFile(root, file); } catch { continue; }
    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
      if (matcher ? matcher.test(lines[index]) : lines[index].toLocaleLowerCase().includes(query.toLocaleLowerCase())) {
        results.push(`${file}:${index + 1}: ${lines[index].trim().slice(0, 400)}`);
        if (results.length >= 200) return `${results.join('\n')}\n… (truncated at 200 matches)`;
      }
    }
  }
  return results.join('\n') || 'No matches';
}

export async function runCommand(root: string, command: string, timeoutSeconds = 120, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const windows = process.platform === 'win32';
    const child = spawn(windows ? 'powershell.exe' : '/bin/sh', windows ? ['-NoProfile', '-NonInteractive', '-Command', command] : ['-c', command], {
      cwd: root,
      windowsHide: true,
      env: { ...process.env, NO_COLOR: '1', CI: '1' },
    });
    const chunks: Buffer[] = [];
    const add = (data: Buffer) => { if (Buffer.concat(chunks).length < 60_000) chunks.push(data); };
    child.stdout.on('data', add);
    child.stderr.on('data', add);
    const timer = setTimeout(() => child.kill(), Math.max(5, Math.min(600, timeoutSeconds)) * 1000);
    const abort = () => child.kill();
    signal?.addEventListener('abort', abort, { once: true });
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      const output = Buffer.concat(chunks).toString('utf8').trimEnd();
      resolve(`${output}${output ? '\n' : ''}[exit code ${code ?? -1}]`);
    });
  });
}

