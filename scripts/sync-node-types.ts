import { spawnSync, SpawnSyncReturns } from 'child_process';

let major: string | undefined = process.argv[2] ?? process.versions.node.split('.')[0];
if (major) major = major.trim();
if (major === undefined || !Number.isSafeInteger(Number.parseInt(major))) throw new Error('Invalid Node version');

const pkg: string = `@types/node@^${major}`;

const r: SpawnSyncReturns<Buffer<ArrayBuffer>> = spawnSync('npm', ['i', '--save-dev', pkg], { stdio: 'inherit' });

if (r.error) console.error('Node types syncing failed:', r.error);