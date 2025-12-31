import { spawnSync, SpawnSyncReturns } from "child_process";
import pkg from "../package.json";

const majorNodeVer: number = Number(
  String(
    process.argv[2] !== undefined && process.argv[2].trim().length > 0
      ? process.argv[2]
      : process.versions.node.split(".")[0],
  ).trim(),
);
if (!Number.isSafeInteger(majorNodeVer))
  throw new Error("Invalid Node version");

const deps: string[] = Object.keys(pkg.dependencies).map(
  (dep: string) => `${dep}@latest`,
);
const devDeps: string[] = Object.keys(pkg.devDependencies).map(
  (dep: string) =>
    `${dep}${dep !== "@types/node" ? "@latest" : `@^${majorNodeVer}`}`,
);

if (
  process.argv[2] === undefined ||
  !Number.isSafeInteger(Number.parseInt(process.argv[2].trim()))
) {
  if (deps.length > 0) {
    const depsCmd: SpawnSyncReturns<Buffer<ArrayBuffer>> = spawnSync(
      "npm",
      ["i", "--save", ...deps],
      { stdio: "inherit" },
    );

    if (depsCmd.error !== undefined)
      console.error("Error while updating dependencies:", depsCmd.error);
  }

  if (devDeps.length > 0) {
    const devDepsCmd: SpawnSyncReturns<Buffer<ArrayBuffer>> = spawnSync(
      "npm",
      ["i", "--save-dev", ...devDeps],
      { stdio: "inherit" },
    );

    if (devDepsCmd.error !== undefined)
      console.error("Error while updating dev dependencies:", devDepsCmd.error);
  }
} else {
  const nodeTypesCmd: SpawnSyncReturns<Buffer<ArrayBuffer>> = spawnSync(
    "npm",
    ["i", "--save-dev", `@types/node@^${majorNodeVer}`],
    { stdio: "inherit" },
  );

  if (nodeTypesCmd.error !== undefined)
    console.error("Error while updating Node types:", nodeTypesCmd.error);
}
