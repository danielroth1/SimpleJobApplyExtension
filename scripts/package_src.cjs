#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const pkgPath = path.join(root, 'package.json');
let version = '0.0.0';
try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  version = pkg.version || version;
} catch (err) {
  console.warn('Could not read package.json to determine version, using', version);
}

const outDir = path.join(root, 'web-ext-artifacts', 'source_code');
fs.mkdirSync(outDir, { recursive: true });

const outName = `simple_job_apply-src-${version}.zip`;
const outPath = path.join(outDir, outName);

// Read .gitignore if present and parse patterns (skip comments and blank lines)
let gitignorePatterns = [];
try {
  const gi = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  gitignorePatterns = gi
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
} catch (e) {
  // no .gitignore
}

// Default exclusions to ensure these are always ignored
// Explicitly exclude the .git directory so the repository metadata isn't packaged
const defaultExcludes = ['dist/', 'node_modules/', 'web-ext-artifacts/', '.vscode/*-profile', '.git/'];

// Combine and normalize patterns
const combined = Array.from(new Set([...gitignorePatterns, ...defaultExcludes]));

// Transform patterns for zip - ensure directories end with * so contents are excluded
const excludeArgs = [];
for (let p of combined) {
  if (!p) continue;
  // Remove leading slash (we run zip from project root)
  if (p.startsWith('/')) p = p.slice(1);
  // If pattern refers to a directory, make it match contents
  if (p.endsWith('/')) p = p + '*';
  // zip expects patterns relative to the paths being zipped; pass as -x pattern
  excludeArgs.push('-x', p);
}

console.log('Packaging source into', outPath);

// Build zip: zip -r <outPath> . -x <patterns...>
const args = ['-r', outPath, '.', ...excludeArgs];

const res = spawnSync('zip', args, { stdio: 'inherit' });
if (res.error) {
  console.error('Failed to run `zip` command:', res.error);
  process.exit(1);
}
if (res.status !== 0) {
  console.error('zip exited with status', res.status);
  process.exit(res.status || 1);
}

console.log('Created', outPath);
