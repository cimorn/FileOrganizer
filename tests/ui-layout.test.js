import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { OPERATION_MODES, SELECTION_ACTIONS } from '../src/shared/ui-layout.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('album manager layout controls', () => {
  it('keeps only select all and invert selection actions in the selection section', () => {
    expect(SELECTION_ACTIONS.map((action) => action.label)).toEqual(['全选', '反选']);
  });

  it('defines the batch operation mode buttons for the preview panel', () => {
    expect(OPERATION_MODES.map((mode) => mode.label)).toEqual(['改名', '移动', '改名并移动']);
  });

  it('does not render summary stat cards inside the selection section', () => {
    const rendererSource = readFileSync(resolve(projectRoot, 'src/renderer/main.jsx'), 'utf8');

    expect(rendererSource).not.toContain('stat-grid');
    expect(rendererSource).not.toContain('<Stat label=');
  });

  it('does not render the left-side helper headings requested for removal', () => {
    const rendererSource = readFileSync(resolve(projectRoot, 'src/renderer/main.jsx'), 'utf8');

    expect(rendererSource).not.toContain('title="筛选"');
    expect(rendererSource).not.toContain('title="选择"');
    expect(rendererSource).not.toContain('title="批量格式"');
  });

  it('shows compact names for the filename and folder template inputs', () => {
    const rendererSource = readFileSync(resolve(projectRoot, 'src/renderer/main.jsx'), 'utf8');

    expect(rendererSource).toContain('title="照片文件名格式"');
    expect(rendererSource).toContain('title="文件夹格式"');
    expect(rendererSource).toContain('<span className="template-title">{title}</span>');
  });

  it('uses the active operation success text after applying files', () => {
    const rendererSource = readFileSync(resolve(projectRoot, 'src/renderer/main.jsx'), 'utf8');

    expect(rendererSource).toContain('activeOperationCopy.successText');
    expect(rendererSource).toContain('${activeOperationCopy.successText}：${result.count} 个文件');
  });

  it('switches to a list view when scanned results include ordinary files', () => {
    const rendererSource = readFileSync(resolve(projectRoot, 'src/renderer/main.jsx'), 'utf8');

    expect(rendererSource).toContain("const hasNonMediaFiles = media.some((item) => !item.previewable)");
    expect(rendererSource).toContain('const useListView = hasNonMediaFiles');
    expect(rendererSource).toContain('<FileListRow');
    expect(rendererSource).toContain('className="file-list"');
  });

  it('keeps ordinary file filtering available from the toolbar', () => {
    const rendererSource = readFileSync(resolve(projectRoot, 'src/renderer/main.jsx'), 'utf8');

    expect(rendererSource).toContain("{ id: 'file', label: '文件' }");
    expect(rendererSource).toContain('selectTypeFilter');
    expect(rendererSource).toContain('文件');
    expect(rendererSource).toContain('选择文件夹');
    expect(rendererSource).toContain('扫描完成：${result.items.length} 个文件');
  });

  it('warns about conflicts, shows progress, and offers undo after execution', () => {
    const rendererSource = readFileSync(resolve(projectRoot, 'src/renderer/main.jsx'), 'utf8');

    expect(rendererSource).toContain('validateOperations(activeOperationPlan)');
    expect(rendererSource).toContain('window.albumApi?.onOperationProgress?.');
    expect(rendererSource).toContain('operationProgress');
    expect(rendererSource).toContain('执行进度');
    expect(rendererSource).toContain('冲突');
    expect(rendererSource).toContain('撤销上次操作');
    expect(rendererSource).toContain('undoLastOperations');
  });

  it('keeps the destination folder control in the preview panel instead of the left panel', () => {
    const rendererSource = readFileSync(resolve(projectRoot, 'src/renderer/main.jsx'), 'utf8');
    const leftStart = rendererSource.indexOf('<aside className="control-panel">');
    const leftEnd = rendererSource.indexOf('<section className="timeline-panel">', leftStart);
    const previewStart = rendererSource.indexOf('<aside className="preview-panel">');
    const previewEnd = rendererSource.indexOf('</aside>', previewStart);
    const leftPanel = rendererSource.slice(leftStart, leftEnd);
    const previewPanel = rendererSource.slice(previewStart, previewEnd);

    expect(leftPanel).not.toContain('选择目标文件夹');
    expect(leftPanel).not.toContain('未选择目标文件夹');
    expect(previewPanel).toContain('选择目标文件夹');
    expect(previewPanel).toContain('未选择目标文件夹');
  });

  it('keeps search, file type, and recursive filters in the top toolbar', () => {
    const rendererSource = readFileSync(resolve(projectRoot, 'src/renderer/main.jsx'), 'utf8');
    const toolbarStart = rendererSource.indexOf('<section className="toolbar">');
    const toolbarEnd = rendererSource.indexOf('</section>', toolbarStart);
    const leftStart = rendererSource.indexOf('<aside className="control-panel">');
    const leftEnd = rendererSource.indexOf('<section className="timeline-panel">', leftStart);
    const toolbar = rendererSource.slice(toolbarStart, toolbarEnd);
    const leftPanel = rendererSource.slice(leftStart, leftEnd);

    expect(toolbar).toContain('placeholder="搜索文件名"');
    expect(toolbar).toContain('aria-label="文件类型"');
    expect(toolbar).toContain('typeMenuOpen');
    expect(toolbar).toContain('className="toolbar-filter-dropdown"');
    expect(toolbar).not.toContain('className="segmented toolbar-type-filter"');
    expect(toolbar).toContain('包含子文件夹');
    expect(leftPanel).not.toContain('placeholder="搜索文件名"');
    expect(leftPanel).not.toContain('aria-label="文件类型"');
    expect(leftPanel).not.toContain('包含子文件夹');
  });

  it('separates toolbar filters from right-side actions with a compact subfolder toggle', () => {
    const rendererSource = readFileSync(resolve(projectRoot, 'src/renderer/main.jsx'), 'utf8');
    const styleSource = readFileSync(resolve(projectRoot, 'src/renderer/styles.css'), 'utf8').replace(/\r\n/g, '\n');
    const toolbarStart = rendererSource.indexOf('<section className="toolbar">');
    const toolbarEnd = rendererSource.indexOf('</section>', toolbarStart);
    const toolbar = rendererSource.slice(toolbarStart, toolbarEnd);

    expect(toolbar.indexOf('className="toolbar-filters"')).toBeLessThan(toolbar.indexOf('className="toolbar-actions"'));
    expect(toolbar).toContain('className="toolbar-toggle toolbar-check"');
    expect(toolbar).not.toContain('toolbar-check${recursive');
    expect(toolbar).toContain('toolbar-secondary-actions');
    expect(toolbar).toContain('toolbar-primary-actions');
    expect(styleSource).toContain('.toolbar-filters {\n  display: flex;\n  align-items: center;\n  justify-content: flex-start;');
    expect(styleSource).toContain('.toolbar-toggle {');
    expect(styleSource).not.toContain('.toolbar-toggle.active');
    expect(styleSource).toContain('.toolbar-primary-actions {');
  });

  it('keeps the empty folder state minimal without duplicate help text or action buttons', () => {
    const rendererSource = readFileSync(resolve(projectRoot, 'src/renderer/main.jsx'), 'utf8');
    const emptyStart = rendererSource.indexOf('function EmptyState');
    const emptyEnd = rendererSource.indexOf('function getTypeLabel', emptyStart);
    const emptyState = rendererSource.slice(emptyStart, emptyEnd);

    expect(emptyState).toContain('className="empty-state"');
    expect(emptyState).toContain('className="empty-icon"');
    expect(emptyState).toContain('<h2>');
    expect(emptyState).not.toContain('<p>');
    expect(emptyState).not.toContain('className="empty-actions"');
    expect(emptyState).not.toContain('onChoose');
    expect(emptyState).not.toContain('onScan');
  });

  it('moves select all and invert selection controls into the timeline status bar', () => {
    const rendererSource = readFileSync(resolve(projectRoot, 'src/renderer/main.jsx'), 'utf8');
    const leftStart = rendererSource.indexOf('<aside className="control-panel">');
    const leftEnd = rendererSource.indexOf('<section className="timeline-panel">', leftStart);
    const timelineStart = rendererSource.indexOf('<section className="timeline-panel">');
    const timelineEnd = rendererSource.indexOf('</section>', timelineStart);
    const leftPanel = rendererSource.slice(leftStart, leftEnd);
    const timelinePanel = rendererSource.slice(timelineStart, timelineEnd);

    expect(leftPanel).not.toContain('SELECTION_ACTIONS.map');
    expect(timelinePanel).toContain('SELECTION_ACTIONS.map');
    expect(timelinePanel).toContain('selectAll');
    expect(timelinePanel).toContain('invertSelection');
  });

  it('moves Excel export and import controls into a top toolbar dropdown', () => {
    const rendererSource = readFileSync(resolve(projectRoot, 'src/renderer/main.jsx'), 'utf8');
    const preloadSource = readFileSync(resolve(projectRoot, 'electron/preload.js'), 'utf8');
    const mainSource = readFileSync(resolve(projectRoot, 'electron/main.js'), 'utf8');
    const toolbarStart = rendererSource.indexOf('<section className="toolbar">');
    const toolbarEnd = rendererSource.indexOf('</section>', toolbarStart);
    const previewStart = rendererSource.indexOf('<aside className="preview-panel">');
    const previewEnd = rendererSource.indexOf('</aside>', previewStart);
    const toolbar = rendererSource.slice(toolbarStart, toolbarEnd);
    const previewPanel = rendererSource.slice(previewStart, previewEnd);

    expect(toolbar).toContain('Excel 表格');
    expect(toolbar).toContain('excelMenuOpen');
    expect(toolbar).toContain('className="toolbar-dropdown"');
    expect(toolbar).toContain('导出表格');
    expect(toolbar).toContain('导入表格');
    expect(previewPanel).not.toContain('Excel 表格');
    expect(previewPanel).not.toContain('导出后可编辑');
    expect(previewPanel).not.toContain('导出表格');
    expect(previewPanel).not.toContain('导入表格');
    expect(rendererSource).toContain('运行表格改名');
    expect(rendererSource).toContain('buildSpreadsheetRenamePlan');
    expect(preloadSource).toContain('exportExcel');
    expect(preloadSource).toContain('importExcel');
    expect(mainSource).toContain('album:export-excel');
    expect(mainSource).toContain('album:import-excel');
  });

  it('adds one-click file time editing controls with interval support', () => {
    const rendererSource = readFileSync(resolve(projectRoot, 'src/renderer/main.jsx'), 'utf8');
    const preloadSource = readFileSync(resolve(projectRoot, 'electron/preload.js'), 'utf8');
    const mainSource = readFileSync(resolve(projectRoot, 'electron/main.js'), 'utf8');

    expect(rendererSource).toContain('文件起始时间');
    expect(rendererSource).toContain('时间间隔');
    expect(rendererSource).toContain('一键改时间');
    expect(rendererSource).toContain('buildFileTimePlan');
    expect(preloadSource).toContain('setFileTimes');
    expect(mainSource).toContain('album:set-file-times');
  });

  it('removes bulky preview and file-time helper headings from the right panel', () => {
    const rendererSource = readFileSync(resolve(projectRoot, 'src/renderer/main.jsx'), 'utf8');

    expect(rendererSource).not.toContain('<h2>操作预览</h2>');
    expect(rendererSource).not.toContain('{activeOperationPlan.length} 个待处理');
    expect(rendererSource).not.toContain('className="preview-heading-row"');
    expect(rendererSource).not.toContain('<span>文件时间</span>');
    expect(rendererSource).not.toContain('按当前时间线顺序批量修改创建、修改和访问时间。');
    expect(rendererSource).not.toContain('className="time-tools-copy"');
  });

  it('keeps duplicate detection in the preview panel and moves history to a separate page', () => {
    const rendererSource = readFileSync(resolve(projectRoot, 'src/renderer/main.jsx'), 'utf8');
    const preloadSource = readFileSync(resolve(projectRoot, 'electron/preload.js'), 'utf8');
    const mainSource = readFileSync(resolve(projectRoot, 'electron/main.js'), 'utf8');
    const previewStart = rendererSource.indexOf('<aside className="preview-panel">');
    const previewEnd = rendererSource.indexOf('</aside>', previewStart);
    const historyStart = rendererSource.indexOf('<HistoryPage');
    const toolbarStart = rendererSource.indexOf('<section className="toolbar">');
    const toolbarEnd = rendererSource.indexOf('</section>', toolbarStart);
    const previewPanel = rendererSource.slice(previewStart, previewEnd);
    const historyPageArea = rendererSource.slice(historyStart);
    const toolbar = rendererSource.slice(toolbarStart, toolbarEnd);

    expect(rendererSource).toContain('重复文件');
    expect(rendererSource).toContain('查找重复');
    expect(rendererSource).toContain('选择重复项');
    expect(rendererSource).toContain("const [activePage, setActivePage] = useState('files')");
    expect(rendererSource).toContain('pageMenuOpen');
    expect(rendererSource).toContain('className="toolbar-page-dropdown"');
    expect(rendererSource).not.toContain('className="toolbar-page-nav"');
    expect(toolbar.indexOf('pageMenuOpen')).toBeGreaterThan(toolbar.indexOf('className="toolbar-actions"'));
    expect(rendererSource).toContain('<HistoryPage');
    expect(rendererSource).toContain('className="history-page"');
    expect(previewPanel).not.toContain('操作历史');
    expect(previewPanel).not.toContain('刷新历史');
    expect(previewPanel).not.toContain('撤销这次');
    expect(historyPageArea).toContain('操作历史');
    expect(historyPageArea).toContain('刷新历史');
    expect(historyPageArea).toContain('撤销这次');
    expect(preloadSource).toContain('findDuplicates');
    expect(preloadSource).toContain('getHistory');
    expect(mainSource).toContain('album:find-duplicates');
    expect(mainSource).toContain('album:get-history');
  });

  it('keeps the page switch dropdown compact and aligned like a menu', () => {
    const rendererSource = readFileSync(resolve(projectRoot, 'src/renderer/main.jsx'), 'utf8');
    const styleSource = readFileSync(resolve(projectRoot, 'src/renderer/styles.css'), 'utf8');

    expect(rendererSource).toContain("option.id === 'files' && <FileText size={16} />");
    expect(rendererSource).toContain("option.id === 'history' && <History size={16} />");
    expect(styleSource).toMatch(/\.toolbar-page-dropdown\s*{[^}]*min-width:\s*118px;[^}]*gap:\s*2px;[^}]*padding:\s*4px;/s);
    expect(styleSource).toMatch(/\.toolbar-page-dropdown button\s*{[^}]*min-height:\s*30px;[^}]*gap:\s*7px;[^}]*padding:\s*0 9px;[^}]*border-radius:\s*5px;/s);
    expect(styleSource).toMatch(/\.toolbar-page-dropdown button\.active\s*{[^}]*background:\s*transparent;/s);
  });

  it('uses a blue visual theme instead of the old green palette', () => {
    const styleSource = readFileSync(resolve(projectRoot, 'src/renderer/styles.css'), 'utf8');

    expect(styleSource).toContain('--accent: #2563eb;');
    expect(styleSource).toContain('--accent-dark: #1d4ed8;');
    expect(styleSource).toContain('--accent-soft: #dbeafe;');
    expect(styleSource).toContain('#eff6ff');
    expect(styleSource).toContain('#bfdbfe');
    expect(styleSource).not.toMatch(/#(?:1e7a6d|115c52|dff1ed|0f4f47|0f655b|53a999|8cc6bd|f0f5ef|edf2ed)/i);
    expect(styleSource).not.toContain('30, 122, 109');
  });

  it('uses packaged app icon assets and a compact top toolbar without an inline logo', () => {
    const rendererSource = readFileSync(resolve(projectRoot, 'src/renderer/main.jsx'), 'utf8');
    const mainSource = readFileSync(resolve(projectRoot, 'electron/main.js'), 'utf8');
    const packageSource = readFileSync(resolve(projectRoot, 'package.json'), 'utf8');

    expect(existsSync(resolve(projectRoot, 'assets/app-icon.ico'))).toBe(true);
    expect(existsSync(resolve(projectRoot, 'assets/app-icon.png'))).toBe(true);
    expect(rendererSource).not.toContain("import appIconUrl from '../../assets/app-icon.svg'");
    expect(rendererSource).not.toContain('className="brand-icon"');
    expect(rendererSource).not.toContain('className="brand-mark"');
    expect(rendererSource).not.toContain('<h1>文件整理</h1>');
    expect(rendererSource).not.toContain('className="brand-block"');
    expect(rendererSource).toContain('className="toolbar-filters"');
    expect(rendererSource).toContain('className="toolbar-actions"');
    expect(rendererSource).not.toContain('className="toolbar-menu"');
    expect(rendererSource).not.toContain('className="toolbar-label"');
    expect(rendererSource).not.toContain("{directory || '未选择文件夹'}");
    expect(mainSource).toContain('autoHideMenuBar: true');
    expect(mainSource).toContain('Menu.setApplicationMenu(null)');
    expect(mainSource).toContain("assets', 'app-icon.png");
    expect(packageSource).toContain('assets/**/*');
  });
});
