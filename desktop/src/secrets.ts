import { app, safeStorage } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';

type SecretData = Record<string, { encrypted: boolean; value: string }>;

function filePath(): string {
  return path.join(app.getPath('userData'), 'secrets.json');
}

async function load(): Promise<SecretData> {
  try {
    return JSON.parse(await fs.readFile(filePath(), 'utf8')) as SecretData;
  } catch {
    return {};
  }
}

async function save(data: SecretData): Promise<void> {
  await fs.mkdir(path.dirname(filePath()), { recursive: true });
  await fs.writeFile(filePath(), JSON.stringify(data), { encoding: 'utf8', mode: 0o600 });
}

export async function hasSecret(name: string): Promise<boolean> {
  const data = await load();
  return Boolean(data[name]?.value);
}

export async function getSecret(name: string): Promise<string | null> {
  const item = (await load())[name];
  if (!item) return null;
  try {
    return item.encrypted ? safeStorage.decryptString(Buffer.from(item.value, 'base64')) : item.value;
  } catch {
    return null;
  }
}

export async function setSecret(name: string, value: string | null): Promise<void> {
  const data = await load();
  if (!value) delete data[name];
  else if (safeStorage.isEncryptionAvailable()) data[name] = { encrypted: true, value: safeStorage.encryptString(value).toString('base64') };
  else data[name] = { encrypted: false, value };
  await save(data);
}

