import { spawnSync, SpawnSyncReturns } from 'child_process';
import pkg from '../package.json';

const majorNodeVer: number = Number(String(process.argv[2] && process.argv[2].trim().length > 0 ? process.argv[2] : process.versions.node.split('.')[0]).trim());
if (!Number.isSafeInteger(majorNodeVer)) throw new Error('Invalid Node version');

const deps: string[] = (pkg.dependencies) ? Object.keys(pkg.dependencies).map((dep: string) => `${dep}@latest`) : [];
const devDeps: string[] = (pkg.devDependencies) ? Object.keys(pkg.devDependencies).map((dep: string) => `${dep}${(dep !== '@types/node') ? '@latest' : `@^${majorNodeVer}`}`) : [];
const optionalDeps: string[] = ((pkg as any).optionalDependencies) ? Object.keys((pkg as any).optionalDependencies).map((dep: string) => `${dep}@latest`) : [];

if (process.argv[2] === undefined || !Number.isSafeInteger(Number.parseInt(process.argv[2].trim()))) {
    if (deps.length > 0) {
        const depsCmd: SpawnSyncReturns<Buffer<ArrayBuffer>> = spawnSync('npm', ['i', '--save', ...deps], { stdio: 'inherit' });

        if (depsCmd.error) console.error('Error while updating dependencies:', depsCmd.error);
    }

    if (devDeps.length > 0) {
        const devDepsCmd: SpawnSyncReturns<Buffer<ArrayBuffer>> = spawnSync('npm', ['i', '--save-dev', ...devDeps], { stdio: 'inherit' });

        if (devDepsCmd.error) console.error('Error while updating dev dependencies:', devDepsCmd.error);
    }

    if (optionalDeps.length > 0) {
        const optionalDepsCmd: SpawnSyncReturns<Buffer<ArrayBuffer>> = spawnSync('npm', ['i', '--save-optional', ...optionalDeps], { stdio: 'inherit' });

        if (optionalDepsCmd.error) console.error('Error while updating optional dependencies:', optionalDepsCmd.error);
    }
} else {
    const nodeTypesCmd: SpawnSyncReturns<Buffer<ArrayBuffer>> = spawnSync('npm', ['i', '--save-dev', `@types/node@^${majorNodeVer}`], { stdio: 'inherit' });

    if (nodeTypesCmd.error) console.error('Error while updating Node types:', nodeTypesCmd.error);
}