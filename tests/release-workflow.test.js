import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

describe('release automation', () => {
  it('has a clean desktop release build script for CI', () => {
    const sourcePackage = readJson(resolve(projectRoot, 'package.json'));

    expect(sourcePackage.scripts['release:desktop']).toBe(
      'pnpm run build && pnpm exec electron-builder --win dir --x64 --publish never && node scripts/sync-desktop-dist.mjs'
    );
  });

  it('creates or updates a GitHub release with the Windows executable when pushing to main', () => {
    const workflowPath = resolve(projectRoot, '.github/workflows/release.yml');
    expect(existsSync(workflowPath)).toBe(true);

    const workflow = readFileSync(workflowPath, 'utf8');
    expect(workflow).toContain('branches:');
    expect(workflow).toContain('main');
    expect(workflow).toContain('tags:');
    expect(workflow).toContain("'v*'");
    expect(workflow).toContain('contents: write');
    expect(workflow).toContain('pnpm install --frozen-lockfile');
    expect(workflow).toContain('pnpm test');
    expect(workflow).toContain('pnpm run release:desktop');
    expect(workflow).toContain('releaseVersion');
    expect(workflow).toContain('ASSET_NAME');
    expect(workflow).toContain('文件整理-$tag.exe');
    expect(workflow).toContain('gh release view');
    expect(workflow).toContain('gh release create');
    expect(workflow).toContain('gh release upload');
    expect(workflow).toContain('--clobber');
    expect(workflow).toContain('dist/$env:ASSET_NAME#$env:ASSET_NAME');
  });
});
