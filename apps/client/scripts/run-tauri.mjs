import { spawn } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const projectRoot = path.resolve(import.meta.dirname, "..");
const packageJsonPath = path.join(projectRoot, "package.json");
const cargoTomlPath = path.join(projectRoot, "src-tauri", "Cargo.toml");
const tauriConfigPath = path.join(projectRoot, "src-tauri", "tauri.conf.json");

function resolveExecutable(command) {
  if (
    process.platform === "win32" &&
    !path.extname(command) &&
    !command.includes(path.sep) &&
    !command.includes("/")
  ) {
    return `${command}.cmd`;
  }

  return command;
}

function run(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const executable = resolveExecutable(command);
    const child = spawn(executable, commandArgs, {
      cwd: projectRoot,
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
      env: process.env,
      shell: process.platform === "win32" && executable.endsWith(".cmd"),
    });

    let stdout = "";
    let stderr = "";

    if (options.capture) {
      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const error = new Error(
        `${command} ${commandArgs.join(" ")} exited with code ${code}`,
      );
      error.stdout = stdout;
      error.stderr = stderr;
      error.exitCode = code ?? 1;
      reject(error);
    });
  });
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getPackageVersion() {
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

  if (typeof packageJson.version !== "string" || packageJson.version.length === 0) {
    throw new Error("apps/client/package.json is missing a valid version");
  }

  return packageJson.version;
}

async function syncCargoVersion(version) {
  const cargoToml = await readFile(cargoTomlPath, "utf8");
  const nextCargoToml = cargoToml.replace(
    /^version = ".*"$/m,
    `version = "${version}"`,
  );

  if (nextCargoToml === cargoToml) {
    return false;
  }

  await writeFile(cargoTomlPath, nextCargoToml);
  return true;
}

async function syncTauriVersion(version) {
  const tauriConfig = JSON.parse(await readFile(tauriConfigPath, "utf8"));

  if (tauriConfig.version === version) {
    return false;
  }

  tauriConfig.version = version;
  await writeFile(tauriConfigPath, `${JSON.stringify(tauriConfig, null, 2)}\n`);
  return true;
}

async function syncAppVersions() {
  const version = await getPackageVersion();
  const changedFiles = [];

  if (await syncCargoVersion(version)) {
    changedFiles.push("src-tauri/Cargo.toml");
  }

  if (await syncTauriVersion(version)) {
    changedFiles.push("src-tauri/tauri.conf.json");
  }

  if (changedFiles.length > 0) {
    console.log(`Synced app version ${version} -> ${changedFiles.join(", ")}`);
  }
}

function getTargetArg(commandArgs) {
  const targetFlagIndex = commandArgs.findIndex(
    (arg) => arg === "--target" || arg === "-t",
  );

  if (targetFlagIndex === -1) {
    return null;
  }

  return commandArgs[targetFlagIndex + 1] ?? null;
}

function getDmgOutputDir(commandArgs) {
  const targetArg = getTargetArg(commandArgs);

  return path.join(
    projectRoot,
    "src-tauri",
    "target",
    ...(targetArg ? [targetArg] : []),
    "release",
    "bundle",
    "dmg",
  );
}

async function getDmgPaths(commandArgs) {
  const dmgOutputDir = getDmgOutputDir(commandArgs);

  if (!(await exists(dmgOutputDir))) {
    return [];
  }

  const entries = await readdir(dmgOutputDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".dmg"))
    .map((entry) => path.join(dmgOutputDir, entry.name))
    .sort();
}

function parseMountPoint(plistOutput) {
  const mountMatches = [...plistOutput.matchAll(/<key>mount-point<\/key>\s*<string>([^<]+)<\/string>/g)];

  if (mountMatches.length > 0) {
    return mountMatches.at(-1)[1];
  }

  return null;
}

function getBundlesArg(commandArgs) {
  const bundlesFlagIndex = commandArgs.findIndex(
    (arg) => arg === "--bundles" || arg === "-b",
  );

  if (bundlesFlagIndex === -1) {
    return null;
  }

  return commandArgs[bundlesFlagIndex + 1] ?? null;
}

function normalizeBuildArgs(commandArgs) {
  if (
    process.platform !== "darwin" ||
    !commandArgs.includes("build") ||
    getTargetArg(commandArgs)
  ) {
    return commandArgs;
  }

  return [...commandArgs, "--target", "aarch64-apple-darwin"];
}

function shouldPatchDmgs(commandArgs) {
  // Keep CI release artifacts untouched so signing/notarization stays valid.
  if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") {
    return false;
  }

  const bundlesArg = getBundlesArg(commandArgs);

  if (!bundlesArg) {
    return true;
  }

  const bundles = bundlesArg
    .split(",")
    .map((bundle) => bundle.trim().toLowerCase())
    .filter(Boolean);

  return bundles.includes("all") || bundles.includes("dmg");
}

async function stripDmgVolumeIcon(dmgPath) {
  const baseName = path.basename(dmgPath, ".dmg");
  const tempRoot = os.tmpdir();
  await mkdir(tempRoot, { recursive: true });
  const tempDir = await mkdtemp(path.join(tempRoot, "sisyphean-dmg-"));
  const rwDmgPath = path.join(tempDir, `${baseName}-rw.dmg`);
  const fixedDmgPath = path.join(tempDir, `${baseName}-fixed.dmg`);
  let mountPoint = null;

  try {
    await run("hdiutil", ["convert", dmgPath, "-format", "UDRW", "-ov", "-o", rwDmgPath]);

    const attachResult = await run(
      "hdiutil",
      ["attach", "-readwrite", "-noverify", "-noautoopen", "-nobrowse", "-plist", rwDmgPath],
      { capture: true },
    );
    mountPoint = parseMountPoint(attachResult.stdout);

    if (!mountPoint) {
      throw new Error(`Unable to determine mounted volume for ${path.basename(dmgPath)}`);
    }

    const volumeIconPath = path.join(mountPoint, ".VolumeIcon.icns");
    if (await exists(volumeIconPath)) {
      await rm(volumeIconPath, { force: true });
    }
    await run("xcrun", ["SetFile", "-a", "c", mountPoint]);

    await run("hdiutil", ["detach", mountPoint]);
    mountPoint = null;

    await run(
      "hdiutil",
      ["convert", rwDmgPath, "-format", "UDZO", "-imagekey", "zlib-level=9", "-ov", "-o", fixedDmgPath],
    );

    await rename(fixedDmgPath, dmgPath);
    console.log(`Removed DMG volume icon: ${path.basename(dmgPath)}`);
  } finally {
    if (mountPoint) {
      try {
        await run("hdiutil", ["detach", mountPoint]);
      } catch {
        // Ignore cleanup failures so the original error can surface.
      }
    }

    await rm(tempDir, { recursive: true, force: true });
  }
}

async function patchAllDmgs(commandArgs = []) {
  if (process.platform !== "darwin") {
    return;
  }

  const dmgPaths = await getDmgPaths(commandArgs);
  if (dmgPaths.length === 0) {
    return;
  }

  for (const dmgPath of dmgPaths) {
    await stripDmgVolumeIcon(dmgPath);
  }
}

async function main() {
  if (args[0] === "--fix-dmg-only") {
    await patchAllDmgs(args.slice(1));
    return;
  }

  await syncAppVersions();

  const tauriArgs = normalizeBuildArgs(args.length > 0 ? args : ["--help"]);
  const isBuild = tauriArgs.includes("build");
  const patchDmgs = isBuild && shouldPatchDmgs(tauriArgs);

  try {
    await run("pnpm", ["exec", "tauri", ...tauriArgs]);

    if (patchDmgs) {
      await patchAllDmgs(tauriArgs);
    }
  } catch (error) {
    const exitCode = typeof error.exitCode === "number" ? error.exitCode : 1;

    if (error.stdout) {
      process.stdout.write(error.stdout);
    }

    if (error.stderr) {
      process.stderr.write(error.stderr);
    }

    console.error(error.message);

    process.exit(exitCode);
  }
}

await main();
