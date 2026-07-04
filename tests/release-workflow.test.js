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
    expect(workflow).toContain('$releaseLabel = "V$($tag.Substring(1))"');
    expect(workflow).toContain('title=FileOrganizer-$releaseLabel');
    expect(workflow).toContain('FileOrganizer-$releaseLabel-win-x64.zip');
    expect(workflow).toContain('-Encoding utf8');
    expect(workflow).toContain('[Console]::OutputEncoding = [System.Text.Encoding]::UTF8');
    expect(workflow).toContain('$assetPath = Join-Path "dist" $env:ASSET_NAME');
    expect(workflow).toContain('Test-Path -LiteralPath $assetPath');
    expect(workflow).toContain('https://api.github.com/repos/$env:GITHUB_REPOSITORY');
    expect(workflow).toContain('releases/tags/$env:RELEASE_TAG');
    expect(workflow).toContain('Invoke-RestMethod -Method Delete');
    expect(workflow).toContain('releases/assets/$($releaseAsset.id)');
    expect(workflow).toContain("EndsWith('.zip')");
    expect(workflow).toContain('generate_release_notes = $true');
    expect(workflow).toContain('[System.Uri]::EscapeDataString($env:ASSET_NAME)');
    expect(workflow).toContain('https://uploads.github.com/repos/$env:GITHUB_REPOSITORY/releases/$($release.id)/assets?name=$encodedName');
    expect(workflow).toContain('-ContentType "application/octet-stream"');
    expect(workflow).toContain('-InFile $assetPath');
  });
});
