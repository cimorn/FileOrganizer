# File Organizer

[中文](README.md) | **English**

File Organizer is a local desktop file organizer. It reads timestamps from photos, videos, and ordinary files, shows files by time, and helps you batch rename, move, rename from Excel, edit file times, find duplicates, and undo completed rename or move operations.

It is not limited to photo albums. When a folder contains only photos and videos, File Organizer shows thumbnails. When a folder contains ordinary files or mixed content, it switches to a list view.

## Use Cases

- Photo and video exports from phones, cameras, or chat apps have messy names.
- You want file names like `001_IMG_0001.jpg`.
- You want dated folders such as `260702_IMG_0001`.
- You want to move files into a destination folder while keeping or changing their names.
- You want to edit new names and extensions in Excel, then apply them in batch.
- You want to update creation, modified, and access times for many files.
- You want to find duplicate files and choose which ones to process.

## Interface Preview

![Main window preview](docs/images/main-window.png)

The left side edits name and folder templates, the middle area previews files, and the right side shows batch operation previews and actions.

## Features

- **Folder scan**: Select a local folder and choose whether to include subfolders.
- **Time-based browsing**: Reads image EXIF time and video creation time when available, then falls back to file modified time.
- **Search and filtering**: Search by file name and filter by all, photos, videos, or files.
- **Batch rename**: Generate new names from templates and preview the result before applying changes.
- **Batch move**: Move selected files into a destination folder.
- **Rename and move**: Rename files and place them into generated folders in one operation.
- **Excel rename**: Export a file list, edit new names and extensions, then import the sheet to run the rename.
- **File time editing**: Set a start time and interval, then update creation, modified, and access times.
- **Duplicate detection**: Find duplicates by size and SHA-256 hash.
- **Operation history**: Review completed rename and move operations and undo them.

## How To Use

1. Click **Select Folder** in the top toolbar and choose the folder you want to organize.
2. Enable or disable **Include Subfolders**.
3. Click **Scan**. File Organizer reads file times and builds the preview.
4. Use search or the type filter to narrow the list.
5. Use **Select All** or **Invert** to choose files.
6. On the right, choose **Rename**, **Move**, or **Rename and Move**.
7. If you are moving files, choose the destination folder on the right.
8. Check the preview on the right, then click the action button.

## Batch Rename

Default file name template:

```text
{index}_{name}
```

Example:

```text
IMG_0001.jpg -> 001_IMG_0001.jpg
IMG_0002.png -> 002_IMG_0002.png
```

Common tokens:

| Token | Meaning | Example |
|---|---|---|
| `{yyyy}` | Four-digit year | `2026` |
| `{yy}` | Two-digit year | `26` |
| `{MM}` | Month | `07` |
| `{dd}` | Day | `02` |
| `{HH}` | Hour | `09` |
| `{mm}` | Minute | `30` |
| `{ss}` | Second | `05` |
| `{index}` | Padded index | `001` |
| `{i}` | Raw index | `1` |
| `{name}` | Original base name | `IMG_0001` |
| `{type}` | File type | `image` |

## Move To A Destination Folder

You can move files directly into a destination folder, or generate subfolders from a folder template.

Default folder template:

```text
{yy}{MM}{dd}_{name}
```

Example:

```text
IMG_0001.jpg -> 260702_IMG_0001\IMG_0001.jpg
```

When you choose **Rename and Move**, File Organizer first generates the new file name, then moves the file into the generated target folder.

## Excel Rename

1. Scan a folder and select the files you want to process.
2. Click **Excel Sheet** in the top toolbar and choose **Export Sheet**.
3. Edit **New File Name** and **New Extension** in the spreadsheet.
4. Return to File Organizer, click **Excel Sheet**, and choose **Import Sheet**.
5. Check the spreadsheet rename preview on the right, then click **Run Spreadsheet Rename**.

`New Extension` can be written as `jpg`, `.jpg`, `png`, or `.pdf`. If the field is empty, File Organizer keeps the original extension.

## Edit File Times

On the right, set **File Start Time** and **Interval**. File Organizer then updates creation, modified, and access times in the current file order.

Example: if the start time is `2026-07-02 09:30:00` and the interval is `1` second, 4 files will become:

```text
09:30:00
09:30:01
09:30:02
09:30:03
```

## Changelog

See [CHANGELOG_EN.md](CHANGELOG_EN.md).

## Download And Run

Windows users should download `FileOrganizer-V26.07.02-win-x64.zip` from GitHub Releases, extract the full folder, then run `文件整理-v26.07.02.exe` inside it.

To run from source:

```bash
pnpm install
pnpm run dev
```

To build the desktop app:

```bash
pnpm run build:desktop
```
