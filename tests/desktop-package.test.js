import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function fileHash(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

describe('desktop package entrypoint', () => {
  it('builds the runnable desktop app into the dist root', () => {
    const sourcePackage = readJson(resolve(projectRoot, 'package.json'));
    const sourceMainPath = resolve(projectRoot, sourcePackage.main);

    expect(sourcePackage.main).toBe('electron/main.js');
    expect(existsSync(sourceMainPath)).toBe(true);
    expect(sourcePackage.name).toBe('file-organizer');
    expect(sourcePackage.scripts.desktop).toBe('.\\dist\\文件整理-v26.07.02.exe');
    expect(sourcePackage.scripts['build:desktop']).toBe('pnpm run build && node scripts/sync-desktop-dist.mjs');
    expect(sourcePackage.build.appId).toBe('local.file-organizer');
    expect(sourcePackage.build.productName).toBe('文件整理');
    expect(sourcePackage.build.directories.output).toBe('dist');

    const portablePackagePath = resolve(projectRoot, 'dist/resources/app/package.json');
    if (!existsSync(portablePackagePath)) {
      return;
    }

    const portablePackage = readJson(portablePackagePath);
    const portableMainPath = resolve(projectRoot, 'dist/resources/app', portablePackage.main);

    expect(portablePackage.main).toBe(sourcePackage.main);
    expect(existsSync(portableMainPath)).toBe(true);
    const distExePath = resolve(projectRoot, 'dist/文件整理-v26.07.02.exe');
    const releaseArchivePath = resolve(projectRoot, 'dist/FileOrganizer-V26.07.02-win-x64.zip');
    expect(existsSync(distExePath)).toBe(true);
    expect(existsSync(releaseArchivePath)).toBe(true);
    expect(existsSync(resolve(projectRoot, 'dist/文件整理.exe'))).toBe(false);
    expect(existsSync(resolve(projectRoot, 'dist/ChronoFile.exe'))).toBe(false);
    expect(existsSync(resolve(projectRoot, 'dist/相册管理.exe'))).toBe(false);
    expect(existsSync(resolve(projectRoot, 'dist/desktop'))).toBe(false);
    expect(existsSync(resolve(projectRoot, 'dist/renderer'))).toBe(false);
    expect(existsSync(resolve(projectRoot, '相册管理软件'))).toBe(false);
  });

  it('uses the bundled blue icon assets for the app icon', () => {
    const sourceIconPath = resolve(projectRoot, 'assets/app-icon.png');
    const sourceIcoPath = resolve(projectRoot, 'assets/app-icon.ico');
    const packagedIconPath = resolve(projectRoot, 'dist/resources/app/assets/app-icon.png');
    const packagedIcoPath = resolve(projectRoot, 'dist/resources/app/assets/app-icon.ico');
    const syncScript = readFileSync(resolve(projectRoot, 'scripts/sync-desktop-dist.mjs'), 'utf8');

    expect(existsSync(sourceIconPath)).toBe(true);
    expect(existsSync(sourceIcoPath)).toBe(true);
    expect(existsSync(resolve(projectRoot, 'assets/app-icon.svg'))).toBe(false);
    expect(syncScript).toContain("'--set-icon'");
    expect(syncScript).toContain('rcedit.exe');

    if (existsSync(packagedIconPath)) {
      expect(fileHash(packagedIconPath)).toBe(fileHash(sourceIconPath));
      expect(existsSync(packagedIcoPath)).toBe(true);
    }
  });

  it('keeps only one desktop app instance and focuses the open window', () => {
    const mainSource = readFileSync(resolve(projectRoot, 'electron/main.js'), 'utf8');

    expect(mainSource).toContain('app.requestSingleInstanceLock()');
    expect(mainSource).toContain("app.on('second-instance'");
    expect(mainSource).toContain('mainWindow.isMinimized()');
    expect(mainSource).toContain('mainWindow.restore()');
    expect(mainSource).toContain('mainWindow.focus()');
  });
});
