import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDirectory = path.join(projectRoot, 'dist');
const distAppDirectory = path.join(distDirectory, 'resources', 'app');
const obsoleteDesktopDirectory = path.join(distDirectory, 'desktop');
const builderDesktopDirectory = path.join(distDirectory, 'win-unpacked');
const obsoleteRendererDirectory = path.join(distDirectory, 'renderer');
const legacyShellDirectory = path.join(projectRoot, '\u76f8\u518c\u7ba1\u7406\u8f6f\u4ef6');
const sourcePackagePath = path.join(projectRoot, 'package.json');
const sourcePackageJson = JSON.parse(await readFile(sourcePackagePath, 'utf8'));
const releaseVersion = sourcePackageJson.releaseVersion || sourcePackageJson.version;
const releaseLabel = `V${releaseVersion}`;
const desktopExecutableName = `\u6587\u4ef6\u6574\u7406-v${releaseVersion}.exe`;
const releaseArchiveName = `FileOrganizer-${releaseLabel}-win-x64.zip`;
const releasePackageDirectoryName = `\u6587\u4ef6\u6574\u7406-v${releaseVersion}`;
const builderDesktopExecutableName = '\u6587\u4ef6\u6574\u7406.exe';
const legacyDesktopExecutableNames = [builderDesktopExecutableName, 'ChronoFile.exe', '\u76f8\u518c\u7ba1\u7406.exe'];
const desktopExecutable = path.join(distDirectory, desktopExecutableName);
const releaseArchive = path.join(distDirectory, releaseArchiveName);
const legacyDistExecutables = legacyDesktopExecutableNames.map((name) => path.join(distDirectory, name));
const desktopShellDirectories = [builderDesktopDirectory, legacyShellDirectory];
const rendererDirectory = path.join(projectRoot, 'dist', 'renderer');
const appIconIco = path.join(projectRoot, 'assets', 'app-icon.ico');
const rceditPath = path.join(
  projectRoot,
  'node_modules',
  '.pnpm',
  'electron-winstaller@5.4.0',
  'node_modules',
  'electron-winstaller',
  'vendor',
  'rcedit.exe'
);

const appEntries = [
  ['assets', 'assets'],
  ['electron', 'electron'],
  ['src/shared', 'src/shared'],
  ['dist/renderer', 'dist/renderer'],
  ['package.json', 'package.json']
];

function isInside(parent, target) {
  const relative = path.relative(parent, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function assertDirectory(directory, label) {
  if (!existsSync(directory) || !(await stat(directory)).isDirectory()) {
    throw new Error(`${label} does not exist: ${directory}`);
  }
}

async function assertFile(filePath, label) {
  if (!existsSync(filePath) || !(await stat(filePath)).isFile()) {
    throw new Error(`${label} does not exist: ${filePath}`);
  }
}

async function copyDirectoryContents(source, destination) {
  await mkdir(destination, { recursive: true });
  await cp(source, destination, {
    recursive: true,
    force: true,
    filter: (sourcePath) => path.basename(sourcePath) !== 'resources'
  });
}

function quotePowerShellString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

async function compressDirectory(sourceDirectory, archivePath) {
  const command = [
    "$ErrorActionPreference = 'Stop'",
    `Compress-Archive -LiteralPath ${quotePowerShellString(sourceDirectory)} -DestinationPath ${quotePowerShellString(archivePath)} -Force`
  ].join('; ');

  await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
    { windowsHide: true, maxBuffer: 1024 * 1024 * 10 }
  );
}

async function createReleaseArchive(archivePath) {
  const stageRoot = path.join(tmpdir(), `file-organizer-release-${Date.now()}`);
  const stagePackageDirectory = path.join(stageRoot, releasePackageDirectoryName);
  const excludedDistEntries = new Set([
    releaseArchiveName,
    'builder-debug.yml',
    'win-unpacked',
    'renderer',
    'desktop'
  ]);

  try {
    await rm(stageRoot, { recursive: true, force: true });
    await mkdir(stagePackageDirectory, { recursive: true });

    for (const entry of await readdir(distDirectory, { withFileTypes: true })) {
      if (excludedDistEntries.has(entry.name)) {
        continue;
      }

      await cp(path.join(distDirectory, entry.name), path.join(stagePackageDirectory, entry.name), {
        recursive: true,
        force: true
      });
    }

    await assertFile(path.join(stagePackageDirectory, desktopExecutableName), 'release package exe');
    await assertFile(path.join(stagePackageDirectory, 'resources', 'app', 'electron', 'main.js'), 'release package entrypoint');
    await rm(archivePath, { force: true });
    await compressDirectory(stagePackageDirectory, archivePath);
  } finally {
    await rm(stageRoot, { recursive: true, force: true });
  }
}

function assertInsideDist(target, action) {
  const resolvedDist = path.resolve(distDirectory);
  const resolvedTarget = path.resolve(target);
  if (!isInside(resolvedDist, resolvedTarget)) {
    throw new Error(`Refusing to ${action} outside dist: ${resolvedTarget}`);
  }
  return resolvedTarget;
}

await assertDirectory(rendererDirectory, 'renderer build directory');
await assertFile(appIconIco, 'app ico');

const desktopShellDirectory = desktopShellDirectories.find((directory) => existsSync(directory));
if (desktopShellDirectory) {
  await assertDirectory(desktopShellDirectory, 'desktop shell directory');
  const shellExecutableName = [desktopExecutableName, ...legacyDesktopExecutableNames].find((name) =>
    existsSync(path.join(desktopShellDirectory, name))
  );
  if (!shellExecutableName) {
    throw new Error(`desktop shell exe does not exist in: ${desktopShellDirectory}`);
  }
  await mkdir(distDirectory, { recursive: true });
  await copyDirectoryContents(desktopShellDirectory, distDirectory);
  const copiedShellExecutable = path.join(distDirectory, shellExecutableName);
  if (shellExecutableName !== desktopExecutableName) {
    await cp(copiedShellExecutable, desktopExecutable, { force: true });
  }
} else if (!existsSync(desktopExecutable)) {
  const legacyDistExecutable = legacyDistExecutables.find((filePath) => existsSync(filePath));
  if (legacyDistExecutable) {
    await cp(legacyDistExecutable, desktopExecutable, { force: true });
  } else {
    throw new Error(`desktop shell directory does not exist: ${desktopShellDirectories.join(', ')}`);
  }
}

await assertFile(desktopExecutable, 'dist root exe');

const resolvedApp = assertInsideDist(distAppDirectory, 'write');
const resolvedObsoleteDesktop = assertInsideDist(obsoleteDesktopDirectory, 'delete');
const resolvedBuilderDesktop = assertInsideDist(builderDesktopDirectory, 'delete');
const resolvedObsoleteRenderer = assertInsideDist(obsoleteRendererDirectory, 'delete');
const resolvedLegacyExecutables = legacyDistExecutables
  .filter((filePath) => path.resolve(filePath) !== path.resolve(desktopExecutable))
  .map((filePath) => assertInsideDist(filePath, 'delete'));
const resolvedReleaseArchive = assertInsideDist(releaseArchive, 'write');

await rm(resolvedObsoleteDesktop, { recursive: true, force: true });
await rm(resolvedApp, { recursive: true, force: true });

for (const [from, to] of appEntries) {
  const sourcePath = path.join(projectRoot, from);
  const targetPath = assertInsideDist(path.join(distAppDirectory, to), 'write');
  await mkdir(path.dirname(targetPath), { recursive: true });
  await cp(sourcePath, targetPath, { recursive: true, force: true });
}

const packagePath = path.join(distAppDirectory, 'package.json');
const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
if (packageJson.main !== 'electron/main.js') {
  throw new Error(`package.json main must be electron/main.js, got: ${packageJson.main}`);
}
await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

if (existsSync(rceditPath)) {
  const iconWorkDirectory = path.join(tmpdir(), `file-organizer-icon-${Date.now()}`);
  const tempExecutable = path.join(iconWorkDirectory, 'file-organizer.exe');
  const tempIcon = path.join(iconWorkDirectory, 'app-icon.ico');

  await mkdir(iconWorkDirectory, { recursive: true });
  await cp(desktopExecutable, tempExecutable, { force: true });
  await cp(appIconIco, tempIcon, { force: true });
  await execFileAsync(rceditPath, [tempExecutable, '--set-icon', tempIcon]);
  await cp(tempExecutable, desktopExecutable, { force: true });
  await rm(iconWorkDirectory, { recursive: true, force: true });
}

for (const legacyExecutable of resolvedLegacyExecutables) {
  await rm(legacyExecutable, { force: true });
}

await rm(resolvedObsoleteRenderer, { recursive: true, force: true });
await rm(resolvedBuilderDesktop, { recursive: true, force: true });
await createReleaseArchive(resolvedReleaseArchive);

await assertFile(desktopExecutable, 'dist root exe');
await assertFile(resolvedReleaseArchive, 'release archive');
await assertFile(path.join(distAppDirectory, packageJson.main), 'dist app entrypoint');

console.log(`Desktop app generated: ${desktopExecutable}`);
console.log(`Desktop release archive generated: ${resolvedReleaseArchive}`);
