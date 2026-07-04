# Changelog

[中文](CHANGELOG.md) | **English**

This file documents notable changes to File Organizer.

## [26.07.02] - 2026-07-02

### Added

- Unified the app name as `文件整理`, with `File Organizer` used in English documentation.
- Added timeline browsing for photos, videos, and ordinary files.
- Added custom batch rename templates, including `{yy}`, `{MM}`, `{dd}`, `{index}`, and `{name}`.
- Added folder templates for move and rename-and-move operations.
- Added Excel export, import, and spreadsheet-based rename workflows.
- Added extension editing through Excel import. Empty new extension values keep the original extension.
- Added batch editing for file creation, modified, and access times with configurable intervals.
- Added duplicate file detection by size and SHA-256 hash.
- Added operation history and undo support for completed rename and move operations.
- Added conflict detection before file operations.
- Added a product QA report for the first public release candidate.

### Changed

- Changed the visual theme to a blue color system.
- Moved search, file type, recursive mode, page navigation, and Excel actions into the top toolbar.
- Moved operation controls and destination folder selection into the right-side preview panel.
- Renamed the generated Windows executable to `dist\文件整理.exe`.
- Updated project metadata to `file-organizer`, `local.file-organizer`, and `文件整理`.

### Fixed

- Fixed a packaged app startup error caused by an incorrect main process path.
- Fixed layout issues in the toolbar and empty state.
- Removed old green theme remnants after the blue theme update.

### Known Notes

- If the Windows executable is running, `pnpm run build:desktop` may fail because Windows locks `dist\文件整理.exe`. Close the app before rebuilding.
- `package.json` uses `26.7.2` because npm package versions must follow semantic version rules. The public release version remains `26.07.02`.
