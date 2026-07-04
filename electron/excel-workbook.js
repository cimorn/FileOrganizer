import XLSX from 'xlsx';
import { EXCEL_RENAME_COLUMNS, buildExcelExportRows } from '../src/shared/excel-rename.js';

const sheetName = '表格改名';

export async function writeRenameWorkbook(filePath, items) {
  const rows = buildExcelExportRows(items);
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: EXCEL_RENAME_COLUMNS });
  worksheet['!cols'] = [
    { wch: 48 },
    { wch: 24 },
    { wch: 10 },
    { wch: 12 },
    { wch: 24 },
    { wch: 10 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filePath, { bookType: 'xlsx' });

  return {
    ok: true,
    filePath,
    count: rows.length
  };
}

export async function readRenameWorkbook(filePath) {
  const workbook = XLSX.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  return rows.map((row) => {
    const normalized = {};
    for (const column of EXCEL_RENAME_COLUMNS) {
      normalized[column] = row[column] ?? '';
    }
    return normalized;
  });
}
