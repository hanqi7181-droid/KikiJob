import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = join(import.meta.dirname, '..');
const envFiles = ['.env.local', '.env'];

for (const fileName of envFiles) {
  const filePath = join(projectRoot, fileName);
  if (!existsSync(filePath)) continue;

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = stripEnvQuotes(trimmed.slice(separator + 1).trim());
    if (!process.env[key]) process.env[key] = value;
  }
}

function stripEnvQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
