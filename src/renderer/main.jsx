import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  CheckSquare,
  ExternalLink,
  FileDown,
  FileText,
  FilePenLine,
  FileUp,
  FolderInput,
  FolderOpen,
  History,
  Image as ImageIcon,
  Loader2,
  MoveRight,
  Play,
  RefreshCw,
  Search,
  Square,
  Undo2,
  Video,
  Wand2
} from 'lucide-react';
import { formatDateLabel, formatTimeLabel, getDisplayDate, groupMediaByDay } from '../shared/media-time.js';
import { DEFAULT_FOLDER_TEMPLATE, DEFAULT_NAME_TEMPLATE } from '../shared/default-templates.js';
import { getOperationCopy } from '../shared/operation-copy.js';
import { buildSpreadsheetRenamePlan } from '../shared/excel-rename.js';
import { buildFileTimePlan } from '../shared/file-time-plan.js';
import { buildMovePlan, buildRenamePlan, mergeRenameAndMovePlans } from '../shared/rename-plan.js';
import { OPERATION_MODES, SELECTION_ACTIONS } from '../shared/ui-layout.js';
import './styles.css';

const templateTokens = [
  { token: '{yy}', label: '年份 26' },
  { token: '{yyyy}', label: '年份 2026' },
  { token: '{MM}', label: '月份 06' },
  { token: '{dd}', label: '日期 30' },
  { token: '{HH}', label: '小时' },
  { token: '{mm}', label: '分钟' },
  { token: '{ss}', label: '秒' },
  { token: '{index}', label: '序号 001' },
  { token: '{i}', label: '序号 1' },
  { token: '{name}', label: '原名' },
  { token: '{type}', label: '类型' }
];

const pageOptions = [
  { id: 'files', label: '整理' },
  { id: 'history', label: '操作历史' }
];

const typeFilterOptions = [
  { id: 'all', label: '全部' },
  { id: 'image', label: '图片' },
  { id: 'video', label: '视频' },
  { id: 'file', label: '文件' }
];

function App() {
  const [directory, setDirectory] = useState('');
  const [destination, setDestination] = useState('');
  const [recursive, setRecursive] = useState(true);
  const [media, setMedia] = useState([]);
  const [selectedPaths, setSelectedPaths] = useState(() => new Set());
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [operationMode, setOperationMode] = useState('rename');
  const [nameTemplate, setNameTemplate] = useState(DEFAULT_NAME_TEMPLATE);
  const [folderTemplate, setFolderTemplate] = useState(DEFAULT_FOLDER_TEMPLATE);
  const [status, setStatus] = useState({ tone: 'idle', text: '选择一个文件夹开始' });
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [operationValidation, setOperationValidation] = useState({ checking: false, conflictCount: 0, conflicts: [] });
  const [operationProgress, setOperationProgress] = useState(null);
  const [spreadsheetPlan, setSpreadsheetPlan] = useState(null);
  const [timeStartValue, setTimeStartValue] = useState(() => formatDateTimeLocal(new Date()));
  const [timeIntervalSeconds, setTimeIntervalSeconds] = useState('1');
  const [confirmTimeOpen, setConfirmTimeOpen] = useState(false);
  const [duplicateScan, setDuplicateScan] = useState(null);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [excelMenuOpen, setExcelMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState('files');
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);

  const filteredMedia = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return media.filter((item) => {
      const typeMatch = typeFilter === 'all' || item.type === typeFilter;
      const queryMatch = !normalizedQuery || item.name.toLowerCase().includes(normalizedQuery);
      return typeMatch && queryMatch;
    });
  }, [media, query, typeFilter]);

  const groups = useMemo(() => groupMediaByDay(filteredMedia, 'zh-CN'), [filteredMedia]);
  const hasNonMediaFiles = media.some((item) => !item.previewable);
  const useListView = hasNonMediaFiles;

  const selectedItems = useMemo(
    () => media.filter((item) => selectedPaths.has(item.path)),
    [media, selectedPaths]
  );

  const selectedMap = useMemo(
    () => new Map(selectedItems.map((item) => [item.path, item])),
    [selectedItems]
  );

  const operationPlan = useMemo(() => {
    if (selectedItems.length === 0) {
      return [];
    }
    if (operationMode === 'rename') {
      return buildRenamePlan(selectedItems, nameTemplate, 'zh-CN').filter((operation) => operation.changed);
    }
    if (!destination) {
      return [];
    }
    if (operationMode === 'move') {
      return buildMovePlan(selectedItems, destination, folderTemplate, 'zh-CN').filter((operation) => operation.changed);
    }
    const renamePlan = buildRenamePlan(selectedItems, nameTemplate, 'zh-CN');
    return mergeRenameAndMovePlans(renamePlan, destination, folderTemplate, selectedMap).filter(
      (operation) => operation.changed
    );
  }, [destination, folderTemplate, nameTemplate, operationMode, selectedItems, selectedMap]);

  const stats = useMemo(() => {
    const totalSize = media.reduce((sum, item) => sum + item.size, 0);
    return { totalSize };
  }, [media]);

  const activePageOption = pageOptions.find((option) => option.id === activePage) ?? pageOptions[0];
  const activeTypeFilterOption = typeFilterOptions.find((option) => option.id === typeFilter) ?? typeFilterOptions[0];

  const operationCopy = useMemo(
    () => getOperationCopy(operationMode, operationPlan.length),
    [operationMode, operationPlan.length]
  );

  const activeOperationPlan = spreadsheetPlan?.operations ?? operationPlan;
  const activeOperationCopy = useMemo(() => {
    if (!spreadsheetPlan) {
      return operationCopy;
    }
    return {
      verb: '表格改名',
      buttonLabel: '运行表格改名',
      confirmVerb: '表格改名',
      successText: '表格改名成功',
      confirmTitle: `确认按表格改名 ${activeOperationPlan.length} 个文件？`,
      dangerText: '确认后会按导入表格里的“新文件名”和“新后缀”直接修改真实文件名。'
    };
  }, [activeOperationPlan.length, operationCopy, spreadsheetPlan]);

  const fileTimeStartMs = useMemo(() => new Date(timeStartValue).getTime(), [timeStartValue]);
  const fileTimePlan = useMemo(
    () =>
      buildFileTimePlan(selectedItems, {
        startMs: fileTimeStartMs,
        intervalSeconds: Number(timeIntervalSeconds)
      }),
    [fileTimeStartMs, selectedItems, timeIntervalSeconds]
  );

  const duplicateSelectionPaths = useMemo(() => {
    const paths = [];
    for (const group of duplicateScan?.groups ?? []) {
      for (const item of group.items.slice(1)) {
        paths.push(item.path);
      }
    }
    return paths;
  }, [duplicateScan]);

  const refreshHistory = useCallback(async () => {
    if (!window.albumApi?.getHistory) {
      setHistoryEntries([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const result = await window.albumApi.getHistory();
      setHistoryEntries(Array.isArray(result?.entries) ? result.entries : []);
    } catch {
      setHistoryEntries([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    return window.albumApi?.onOperationProgress?.((progress) => {
      setOperationProgress(progress);
    });
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    let cancelled = false;
    if (activeOperationPlan.length === 0) {
      setOperationValidation({ checking: false, conflictCount: 0, conflicts: [] });
      return () => {
        cancelled = true;
      };
    }

    setOperationValidation({ checking: true, conflictCount: 0, conflicts: [] });
    window.albumApi
      .validateOperations(activeOperationPlan)
      .then((result) => {
        if (!cancelled) {
          setOperationValidation({ checking: false, ...result });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setOperationValidation({
            checking: false,
            conflictCount: 1,
            conflicts: [{ newName: error.message || '冲突检查失败' }]
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeOperationPlan]);

  const chooseDirectory = useCallback(async () => {
    const selectedDirectory = await window.albumApi.selectDirectory();
    if (selectedDirectory) {
      setDirectory(selectedDirectory);
      setStatus({ tone: 'idle', text: '文件夹已选择，可以扫描' });
      setLastResult(null);
      setSpreadsheetPlan(null);
      setDuplicateScan(null);
    }
  }, []);

  const chooseDestination = useCallback(async () => {
    const selectedDirectory = await window.albumApi.selectDestination();
    if (selectedDirectory) {
      setDestination(selectedDirectory);
      setLastResult(null);
    }
  }, []);

  const scan = useCallback(async () => {
    if (!directory) {
      setStatus({ tone: 'warning', text: '请先选择文件夹' });
      return;
    }
    setBusy(true);
    setStatus({ tone: 'loading', text: '正在读取文件时间...' });
    setLastResult(null);
    setOperationProgress(null);
    setSpreadsheetPlan(null);
    setDuplicateScan(null);
    try {
      const result = await window.albumApi.scanDirectory({ directory, recursive });
      setMedia(result.items);
      setSelectedPaths(new Set(result.items.map((item) => item.path)));
      setStatus({ tone: 'success', text: `扫描完成：${result.items.length} 个文件` });
    } catch (error) {
      setStatus({ tone: 'danger', text: error.message || '扫描失败' });
    } finally {
      setBusy(false);
    }
  }, [directory, recursive]);

  const togglePath = useCallback((path) => {
    setSelectedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedPaths(new Set(media.map((item) => item.path)));
  }, [media]);

  const invertSelection = useCallback(() => {
    setSelectedPaths((current) => {
      const next = new Set();
      for (const item of media) {
        if (!current.has(item.path)) {
          next.add(item.path);
        }
      }
      return next;
    });
  }, [media]);

  const findDuplicates = useCallback(async () => {
    if (media.length === 0) {
      setStatus({ tone: 'warning', text: '请先扫描文件夹，再查找重复文件' });
      return;
    }
    setBusy(true);
    setDuplicateScan(null);
    setOperationProgress(null);
    setStatus({ tone: 'loading', text: '正在按文件内容查找重复项...' });
    try {
      const result = await window.albumApi.findDuplicates(media);
      setDuplicateScan(result);
      setStatus({
        tone: result.groupCount > 0 ? 'success' : 'warning',
        text:
          result.groupCount > 0
            ? `发现 ${result.groupCount} 组重复文件，可节省 ${formatBytes(result.duplicateBytes)}`
            : '没有发现重复文件'
      });
    } catch (error) {
      setStatus({ tone: 'danger', text: error.message || '查找重复文件失败' });
    } finally {
      setBusy(false);
    }
  }, [media]);

  const selectDuplicateItems = useCallback(() => {
    if (duplicateSelectionPaths.length === 0) {
      setStatus({ tone: 'warning', text: '没有可选中的重复项' });
      return;
    }
    setSelectedPaths(new Set(duplicateSelectionPaths));
    setStatus({ tone: 'success', text: `已选中 ${duplicateSelectionPaths.length} 个重复项` });
  }, [duplicateSelectionPaths]);

  const selectPage = useCallback(
    (pageId) => {
      setActivePage(pageId);
      setPageMenuOpen(false);
      setTypeMenuOpen(false);
      setExcelMenuOpen(false);
      if (pageId === 'history') {
        refreshHistory();
      }
    },
    [refreshHistory]
  );

  const togglePageMenu = useCallback(() => {
    setPageMenuOpen((current) => !current);
    setTypeMenuOpen(false);
    setExcelMenuOpen(false);
  }, []);

  const selectTypeFilter = useCallback((nextTypeFilter) => {
    setTypeFilter(nextTypeFilter);
    setTypeMenuOpen(false);
  }, []);

  const toggleTypeMenu = useCallback(() => {
    setTypeMenuOpen((current) => !current);
    setPageMenuOpen(false);
    setExcelMenuOpen(false);
  }, []);

  const toggleExcelMenu = useCallback(() => {
    setExcelMenuOpen((current) => !current);
    setPageMenuOpen(false);
    setTypeMenuOpen(false);
  }, []);

  const exportExcel = useCallback(async () => {
    if (selectedItems.length === 0) {
      setStatus({ tone: 'warning', text: '请先选择要导出的文件' });
      return;
    }
    setBusy(true);
    setStatus({ tone: 'loading', text: '正在导出表格...' });
    try {
      const result = await window.albumApi.exportExcel(selectedItems);
      if (!result) {
        setStatus({ tone: 'idle', text: '已取消导出表格' });
        return;
      }
      setStatus({ tone: 'success', text: `表格已导出：${result.count} 个文件` });
    } catch (error) {
      setStatus({ tone: 'danger', text: error.message || '导出表格失败' });
    } finally {
      setBusy(false);
    }
  }, [selectedItems]);

  const importExcel = useCallback(async () => {
    if (media.length === 0) {
      setStatus({ tone: 'warning', text: '请先扫描文件夹，再导入表格' });
      return;
    }
    setBusy(true);
    setStatus({ tone: 'loading', text: '正在导入表格...' });
    try {
      const result = await window.albumApi.importExcel();
      if (!result) {
        setStatus({ tone: 'idle', text: '已取消导入表格' });
        return;
      }
      const operations = buildSpreadsheetRenamePlan(media, result.rows);
      setSpreadsheetPlan({
        filePath: result.filePath,
        rowCount: result.count,
        operations
      });
      setLastResult(null);
      setStatus({
        tone: operations.length > 0 ? 'success' : 'warning',
        text:
          operations.length > 0
            ? `表格已导入：生成 ${operations.length} 个改名操作`
            : '表格已导入，但没有找到需要改名的文件'
      });
    } catch (error) {
      setStatus({ tone: 'danger', text: error.message || '导入表格失败' });
    } finally {
      setBusy(false);
    }
  }, [media]);

  const runExportExcel = useCallback(async () => {
    setExcelMenuOpen(false);
    await exportExcel();
  }, [exportExcel]);

  const runImportExcel = useCallback(async () => {
    setExcelMenuOpen(false);
    await importExcel();
  }, [importExcel]);

  const clearSpreadsheetPlan = useCallback(() => {
    setSpreadsheetPlan(null);
    setStatus({ tone: 'idle', text: '已清除表格改名预览' });
  }, []);

  const undoHistoryEntry = useCallback(
    async (entry) => {
      if (!entry?.results?.length) {
        setStatus({ tone: 'warning', text: '这条历史没有可撤销的文件记录' });
        return;
      }
      setBusy(true);
      setStatus({ tone: 'loading', text: '正在按历史记录撤销...' });
      setOperationProgress({ phase: 'undo', current: 0, total: entry.results.length });
      try {
        const result = await window.albumApi.undoOperations(entry.results, { historyId: entry.id });
        setLastResult(null);
        setStatus({ tone: 'success', text: `撤销成功：${result.count} 个文件，请重新扫描查看最新结果` });
        await refreshHistory();
      } catch (error) {
        setStatus({ tone: 'danger', text: error.message || '历史撤销失败，请检查文件是否被占用' });
      } finally {
        setBusy(false);
      }
    },
    [refreshHistory]
  );

  const requestApplyFileTimes = useCallback(() => {
    if (fileTimePlan.length === 0) {
      setStatus({ tone: 'warning', text: '请先选择要修改时间的文件' });
      return;
    }
    if (!Number.isFinite(fileTimeStartMs)) {
      setStatus({ tone: 'warning', text: '请先填写有效的起始时间' });
      return;
    }
    setConfirmTimeOpen(true);
  }, [fileTimePlan.length, fileTimeStartMs]);

  const applySelectedFileTimes = useCallback(async () => {
    if (fileTimePlan.length === 0) {
      setConfirmTimeOpen(false);
      setStatus({ tone: 'warning', text: '请先选择要修改时间的文件' });
      return;
    }
    setConfirmTimeOpen(false);
    setBusy(true);
    setStatus({ tone: 'loading', text: '正在修改文件时间...' });
    setOperationProgress({ phase: 'time', current: 0, total: fileTimePlan.length });
    try {
      const result = await window.albumApi.setFileTimes(fileTimePlan);
      const updatedTimes = new Map(result.results.map((item) => [item.path, item.newTimeMs]));
      setMedia((current) =>
        current.map((item) => {
          const newTimeMs = updatedTimes.get(item.path);
          if (!newTimeMs) {
            return item;
          }
          return {
            ...item,
            createdAtMs: newTimeMs,
            modifiedAtMs: newTimeMs,
            takenAtMs: newTimeMs,
            takenAtSource: '手动设置时间'
          };
        })
      );
      setLastResult(null);
      setStatus({ tone: 'success', text: `改时间成功：${result.count} 个文件` });
      await refreshHistory();
    } catch (error) {
      setStatus({ tone: 'danger', text: error.message || '修改文件时间失败' });
    } finally {
      setBusy(false);
    }
  }, [fileTimePlan, refreshHistory]);

  const requestApplyOperations = useCallback(() => {
    if (activeOperationPlan.length === 0) {
      setStatus({ tone: 'warning', text: '没有可执行的改名或移动操作' });
      return;
    }
    if (operationValidation.checking) {
      setStatus({ tone: 'warning', text: '正在检查文件冲突，请稍等' });
      return;
    }
    if (operationValidation.conflictCount > 0) {
      setStatus({ tone: 'danger', text: `发现 ${operationValidation.conflictCount} 个冲突，请先处理后再执行` });
      return;
    }
    setConfirmOpen(true);
  }, [activeOperationPlan.length, operationValidation.checking, operationValidation.conflictCount]);

  const applyOperations = useCallback(async () => {
    if (activeOperationPlan.length === 0) {
      setConfirmOpen(false);
      setStatus({ tone: 'warning', text: '没有可执行的改名或移动操作' });
      return;
    }
    setConfirmOpen(false);
    setBusy(true);
    setStatus({ tone: 'loading', text: '正在执行文件操作...' });
    setLastResult(null);
    setOperationProgress({ phase: 'execute', current: 0, total: activeOperationPlan.length });
    try {
      const result = await window.albumApi.executeOperations(activeOperationPlan, {
        mode: spreadsheetPlan ? 'spreadsheet' : operationMode,
        label: activeOperationCopy.buttonLabel
      });
      setLastResult({ ...result, successText: activeOperationCopy.successText });
      setStatus({
        tone: 'success',
        text: `${activeOperationCopy.successText}：${result.count} 个文件，请重新扫描查看最新结果`
      });
      await refreshHistory();
    } catch (error) {
      setStatus({ tone: 'danger', text: error.message || '执行失败，未完成的文件已尝试回滚' });
    } finally {
      setBusy(false);
    }
  }, [activeOperationCopy.buttonLabel, activeOperationCopy.successText, activeOperationPlan, operationMode, refreshHistory, spreadsheetPlan]);

  const undoLastOperations = useCallback(async () => {
    if (!lastResult?.results?.length) {
      setStatus({ tone: 'warning', text: '没有可撤销的操作' });
      return;
    }
    setBusy(true);
    setStatus({ tone: 'loading', text: '正在撤销上次操作...' });
    setOperationProgress({ phase: 'undo', current: 0, total: lastResult.results.length });
    try {
      const result = await window.albumApi.undoOperations(lastResult.results);
      setLastResult(null);
      setStatus({ tone: 'success', text: `撤销成功：${result.count} 个文件，请重新扫描查看最新结果` });
      await refreshHistory();
    } catch (error) {
      setStatus({ tone: 'danger', text: error.message || '撤销失败，请检查文件是否被占用' });
    } finally {
      setBusy(false);
    }
  }, [lastResult, refreshHistory]);

  return (
    <main className="app-shell">
      <section className="toolbar">
        {activePage === 'files' ? (
          <div className="toolbar-filters">
            <label className="search-box toolbar-search">
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索文件名"
              />
            </label>

            <div className="toolbar-menu-control">
              <button
                className={`button secondary toolbar-menu-button toolbar-filter-button${typeMenuOpen ? ' active' : ''}`}
                type="button"
                onClick={toggleTypeMenu}
                aria-label="文件类型"
                aria-haspopup="menu"
                aria-expanded={typeMenuOpen}
              >
                <FileText size={17} />
                {activeTypeFilterOption.label}
                <ChevronDown size={15} />
              </button>
              {typeMenuOpen && (
                <div className="toolbar-filter-dropdown" role="menu" aria-label="文件类型">
                  {typeFilterOptions.map((option) => (
                    <button
                      key={option.id}
                      className={typeFilter === option.id ? 'active' : ''}
                      type="button"
                      role="menuitem"
                      onClick={() => selectTypeFilter(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="toolbar-toggle toolbar-check" aria-label="包含子文件夹">
              <input type="checkbox" checked={recursive} onChange={(event) => setRecursive(event.target.checked)} />
              {recursive ? <CheckSquare size={17} /> : <Square size={17} />}
              <span>含子文件夹</span>
            </label>
          </div>
        ) : (
          <div className="toolbar-spacer" />
        )}

        <div className="toolbar-actions">
          <div className="toolbar-secondary-actions">
            <div className="toolbar-menu-control">
              <button
                className={`button secondary toolbar-menu-button${pageMenuOpen ? ' active' : ''}`}
                type="button"
                onClick={togglePageMenu}
                aria-label="页面"
                aria-haspopup="menu"
                aria-expanded={pageMenuOpen}
              >
                {activePage === 'history' && <History size={17} />}
                {activePageOption.label}
                <ChevronDown size={15} />
              </button>
              {pageMenuOpen && (
                <div className="toolbar-page-dropdown" role="menu" aria-label="页面">
                  {pageOptions.map((option) => (
                    <button
                      key={option.id}
                      className={activePage === option.id ? 'active' : ''}
                      type="button"
                      role="menuitem"
                      onClick={() => selectPage(option.id)}
                    >
                      {option.id === 'files' && <FileText size={16} />}
                      {option.id === 'history' && <History size={16} />}
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {activePage === 'files' && (
            <div className="toolbar-menu-control">
              <button
                className={`button secondary toolbar-menu-button${excelMenuOpen ? ' active' : ''}`}
                type="button"
                onClick={toggleExcelMenu}
                aria-haspopup="menu"
                aria-expanded={excelMenuOpen}
              >
                <FileDown size={18} />
                Excel 表格
                <ChevronDown size={15} />
              </button>
              {excelMenuOpen && (
                <div className="toolbar-dropdown" role="menu" aria-label="Excel 表格">
                  <button type="button" role="menuitem" onClick={runExportExcel} disabled={busy || selectedItems.length === 0}>
                    <FileDown size={16} />
                    导出表格
                  </button>
                  <button type="button" role="menuitem" onClick={runImportExcel} disabled={busy || media.length === 0}>
                    <FileUp size={16} />
                    导入表格
                  </button>
                </div>
              )}
            </div>
            )}
          </div>

          {activePage === 'files' && (
            <div className="toolbar-primary-actions">
            <button className="button secondary" type="button" onClick={chooseDirectory}>
              <FolderOpen size={18} />
              选择文件夹
            </button>
            <button className="button primary" type="button" onClick={scan} disabled={busy || !directory}>
              {busy ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
              扫描
            </button>
            </div>
          )}
        </div>
      </section>

      {activePage === 'files' ? (
      <section className="workspace">
        <aside className="control-panel">
          <PanelSection>
            {operationMode !== 'move' && (
              <TemplateField
                title="照片文件名格式"
                ariaLabel="照片文件名格式"
                value={nameTemplate}
                onChange={setNameTemplate}
                hint="例：{index}_{name} 会生成 001_IMG_0001.jpg"
              />
            )}

            {operationMode !== 'rename' && (
              <TemplateField
                title="文件夹格式"
                ariaLabel="文件夹格式"
                value={folderTemplate}
                onChange={setFolderTemplate}
                hint="例：{yy}{MM}{dd}_{name} 会生成 260630_IMG_0001 文件夹"
              />
            )}
          </PanelSection>
        </aside>

        <section className="timeline-panel">
          <div className={`status-line ${status.tone}`}>
            <div className="status-left">
              <div className="inline-actions status-selection-actions">
                {SELECTION_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="button ghost"
                    onClick={action.id === 'select-all' ? selectAll : invertSelection}
                    disabled={media.length === 0}
                  >
                    {action.id === 'select-all' ? <CheckSquare size={17} /> : <Square size={17} />}
                    {action.label}
                  </button>
                ))}
              </div>
              <span>{status.text}</span>
            </div>
            <strong>{formatBytes(stats.totalSize)}</strong>
          </div>

          {media.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="timeline">
              {groups.map((group) => (
                <section className="day-group" key={group.key}>
                  <header>
                    <h2>{group.label}</h2>
                    <span>{group.items.length} 个文件</span>
                  </header>
                  {useListView ? (
                    <div className="file-list">
                      {group.items.map((item) => (
                        <FileListRow
                          key={item.path}
                          item={item}
                          selected={selectedPaths.has(item.path)}
                          onToggle={() => togglePath(item.path)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="media-grid">
                      {group.items.map((item) => (
                        <MediaTile
                          key={item.path}
                          item={item}
                          selected={selectedPaths.has(item.path)}
                          onToggle={() => togglePath(item.path)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </section>

        <aside className="preview-panel">
          <div className="preview-header">
            <div className="preview-mode-control">
              <span>批量操作</span>
              <div className="segmented preview-mode-switch" aria-label="批量操作">
                {OPERATION_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    className={operationMode === mode.id ? 'active' : ''}
                    onClick={() => setOperationMode(mode.id)}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
            {operationMode !== 'rename' && (
              <div className="destination-control">
                <button className="button secondary stretch" type="button" onClick={chooseDestination}>
                  <FolderInput size={18} />
                  选择目标文件夹
                </button>
                <div className="path-readout">{destination || '未选择目标文件夹'}</div>
              </div>
            )}
            {spreadsheetPlan && (
              <div className="excel-import-summary">
                <span>
                  已导入 {spreadsheetPlan.rowCount} 行，生成 {spreadsheetPlan.operations.length} 个改名操作
                </span>
                <button className="text-button" type="button" onClick={clearSpreadsheetPlan}>
                  清除
                </button>
              </div>
            )}
            <div className="time-tools">
              <div className="time-field-grid">
                <label>
                  文件起始时间
                  <input
                    type="datetime-local"
                    step="1"
                    value={timeStartValue}
                    onChange={(event) => setTimeStartValue(event.target.value)}
                  />
                </label>
                <label>
                  时间间隔
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={timeIntervalSeconds}
                    onChange={(event) => setTimeIntervalSeconds(event.target.value)}
                  />
                </label>
              </div>
              <div className="time-actions">
                <span>{fileTimePlan.length} 个文件，每个相差 {Math.max(1, Number(timeIntervalSeconds) || 1)} 秒</span>
                <button
                  className="button secondary"
                  type="button"
                  onClick={requestApplyFileTimes}
                  disabled={busy || fileTimePlan.length === 0}
                >
                  <CalendarDays size={17} />
                  一键改时间
                </button>
              </div>
            </div>
            <div className="duplicate-tools">
              <div className="panel-tool-copy">
                <span>重复文件</span>
                <small>按文件内容哈希查重，默认保留每组第一个。</small>
              </div>
              <div className="duplicate-actions">
                <button className="button secondary" type="button" onClick={findDuplicates} disabled={busy || media.length === 0}>
                  <RefreshCw size={17} />
                  查找重复
                </button>
                <button
                  className="button secondary"
                  type="button"
                  onClick={selectDuplicateItems}
                  disabled={busy || duplicateSelectionPaths.length === 0}
                >
                  <CheckSquare size={17} />
                  选择重复项
                </button>
              </div>
              {duplicateScan && (
                <div className="duplicate-summary">
                  <strong>
                    {duplicateScan.groupCount} 组，{duplicateScan.duplicateCount} 个重复项
                  </strong>
                  <span>可节省 {formatBytes(duplicateScan.duplicateBytes)}</span>
                  {duplicateScan.groups.slice(0, 3).map((group) => (
                    <small key={group.id}>
                      {group.items.map((item) => item.name).join(' / ')}
                    </small>
                  ))}
                </div>
              )}
            </div>
          </div>

          {lastResult && (
            <div className="result-banner">
              <span>
                <CheckSquare size={18} />
                {lastResult.successText}：{lastResult.count} 个文件
              </span>
              {lastResult.results?.length > 0 && (
                <button className="button secondary" type="button" onClick={undoLastOperations} disabled={busy}>
                  撤销上次操作
                </button>
              )}
            </div>
          )}

          {operationValidation.conflictCount > 0 && (
            <div className="conflict-banner">
              <AlertTriangle size={18} />
              <div>
                <strong>发现 {operationValidation.conflictCount} 个冲突</strong>
                <span>这些目标文件已经存在，软件不会覆盖它们。</span>
                {operationValidation.conflicts.slice(0, 3).map((conflict) => (
                  <small key={`${conflict.from}-${conflict.to}`}>{conflict.newName || conflict.to}</small>
                ))}
              </div>
            </div>
          )}

           {operationProgress && busy && (
             <div className="progress-panel">
               <div>
                 <strong>{getProgressTitle(operationProgress.phase)}</strong>
                 <span>
                   {operationProgress.current} / {operationProgress.total}
                 </span>
              </div>
              <div className="progress-track">
                <span
                  style={{
                    width: `${operationProgress.total ? (operationProgress.current / operationProgress.total) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          )}

          <div className="operation-list">
            {activeOperationPlan.slice(0, 120).map((operation) => (
              <div className="operation-row" key={`${operation.from}-${operation.to}`}>
                <div className="operation-icon">
                  {operation.action === 'move' ? <MoveRight size={17} /> : <FilePenLine size={17} />}
                </div>
                <div className="operation-copy">
                  <span>{operation.oldName}</span>
                  <strong>{operation.newName}</strong>
                  <small>{operation.targetDirectory}</small>
                </div>
              </div>
            ))}
            {activeOperationPlan.length > 120 && (
              <div className="more-row">还有 {activeOperationPlan.length - 120} 个操作未显示</div>
            )}
            {activeOperationPlan.length === 0 && <div className="blank-preview">暂无待执行操作</div>}
          </div>

          <div className="preview-apply">
            <div>
              <strong>{activeOperationCopy.buttonLabel}</strong>
              <span>先确认上方预览，点击后还会再次弹窗确认。</span>
            </div>
            <button
              type="button"
              className="button danger"
              onClick={requestApplyOperations}
              disabled={
                busy ||
                activeOperationPlan.length === 0 ||
                operationValidation.checking ||
                operationValidation.conflictCount > 0
              }
            >
              <Wand2 size={18} />
              {activeOperationCopy.buttonLabel}
            </button>
          </div>
        </aside>
      </section>
      ) : (
        <HistoryPage
          entries={historyEntries}
          loading={historyLoading}
          busy={busy}
          onRefresh={refreshHistory}
          onUndo={undoHistoryEntry}
        />
      )}

      {confirmOpen && (
        <ConfirmApplyModal
          copy={activeOperationCopy}
          operations={activeOperationPlan}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={applyOperations}
          busy={busy}
        />
      )}
      {confirmTimeOpen && (
        <ConfirmTimeModal
          operations={fileTimePlan}
          onCancel={() => setConfirmTimeOpen(false)}
          onConfirm={applySelectedFileTimes}
          busy={busy}
        />
      )}
    </main>
  );
}

function HistoryPage({ entries, loading, busy, onRefresh, onUndo }) {
  return (
    <section className="history-page">
      <div className="history-page-shell">
        <header className="history-page-header">
          <h1>操作历史</h1>
          <button className="button secondary" type="button" onClick={onRefresh} disabled={loading}>
            <History size={17} />
            刷新历史
          </button>
        </header>
        <div className="history-list">
          {entries.map((entry) => (
            <div className="history-row" key={entry.id}>
              <div>
                <strong>{entry.label}</strong>
                <span>
                  {formatHistoryTime(entry.createdAt)} · {entry.count} 个文件
                </span>
              </div>
              {entry.type === 'operation' && entry.results?.length > 0 && (
                <button className="text-button" type="button" onClick={() => onUndo(entry)} disabled={busy}>
                  <Undo2 size={14} />
                  撤销这次
                </button>
              )}
            </div>
          ))}
          {entries.length === 0 && (
            <div className="history-empty">{loading ? '正在读取历史...' : '暂无操作历史'}</div>
          )}
        </div>
      </div>
    </section>
  );
}

function TemplateField({ title, ariaLabel, value, onChange, hint }) {
  return (
    <div className="template-field">
      <span className="template-title">{title}</span>
      <label className="field">
        <input aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
      <p className="field-hint">{hint}</p>
      <div className="token-row">
        {templateTokens.map((item) => (
          <button
            key={item.token}
            type="button"
            title={item.label}
            onClick={() => onChange((current) => `${current}${item.token}`)}
          >
            <span>{item.token}</span>
            <small>{item.label}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function ConfirmApplyModal({ copy, operations, onCancel, onConfirm, busy }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="confirm-icon">
          <AlertTriangle size={24} />
        </div>
        <div className="confirm-body">
          <h2 id="confirm-title">{copy.confirmTitle}</h2>
          <p>{copy.dangerText}</p>
          <div className="confirm-warning">
            这里不是预览按钮。点“确认应用”后，软件会开始改动磁盘上的真实文件。
          </div>
          <div className="confirm-samples">
            {operations.slice(0, 5).map((operation) => (
              <div className="confirm-sample-row" key={`${operation.from}-${operation.to}`}>
                <span>{operation.oldName}</span>
                <strong>{operation.newName}</strong>
              </div>
            ))}
            {operations.length > 5 && <div className="confirm-more">还有 {operations.length - 5} 个文件</div>}
          </div>
          <div className="confirm-actions">
            <button className="button secondary" type="button" onClick={onCancel} disabled={busy}>
              取消，继续检查预览
            </button>
            <button className="button danger" type="button" onClick={onConfirm} disabled={busy}>
              确认应用
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ConfirmTimeModal({ operations, onCancel, onConfirm, busy }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-time-title">
        <div className="confirm-icon">
          <CalendarDays size={24} />
        </div>
        <div className="confirm-body">
          <h2 id="confirm-time-title">确认修改 {operations.length} 个文件的时间？</h2>
          <p>确认后会直接修改真实文件的创建、修改和访问时间，并按下方顺序留出间隔。</p>
          <div className="confirm-warning">这里不是预览按钮。点“确认修改”后，软件会开始写入文件时间。</div>
          <div className="confirm-samples">
            {operations.slice(0, 5).map((operation) => (
              <div className="confirm-sample-row" key={`${operation.path}-${operation.newTimeMs}`}>
                <span>{operation.name}</span>
                <strong>{formatDateTimeText(operation.newTimeMs)}</strong>
              </div>
            ))}
            {operations.length > 5 && <div className="confirm-more">还有 {operations.length - 5} 个文件</div>}
          </div>
          <div className="confirm-actions">
            <button className="button secondary" type="button" onClick={onCancel} disabled={busy}>
              取消，继续检查
            </button>
            <button className="button danger" type="button" onClick={onConfirm} disabled={busy}>
              确认修改
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function PanelSection({ title, children }) {
  return (
    <section className="panel-section">
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}

function MediaTile({ item, selected, onToggle }) {
  const date = getDisplayDate(item);

  return (
    <article className={`media-tile ${selected ? 'selected' : ''}`}>
      <button className="select-button" type="button" onClick={onToggle} aria-label="选择文件">
        {selected ? <CheckSquare size={18} /> : <Square size={18} />}
      </button>
      <button className="thumb-button" type="button" onClick={() => window.albumApi.openPath(item.path)}>
        <MediaPreview item={item} />
      </button>
      <div className="tile-body">
        <div className="tile-title" title={item.name}>
          {item.type === 'video' ? <Video size={15} /> : <ImageIcon size={15} />}
          <span>{item.name}</span>
        </div>
        <div className="tile-meta">
          <span>{date ? formatTimeLabel(date, 'zh-CN') : '未知'}</span>
          <span>{item.takenAtSource}</span>
        </div>
        <div className="tile-actions">
          <button type="button" onClick={() => window.albumApi.showInFolder(item.path)}>
            <ExternalLink size={14} />
            位置
          </button>
          <span>{formatBytes(item.size)}</span>
        </div>
      </div>
    </article>
  );
}

function FileListRow({ item, selected, onToggle }) {
  const date = getDisplayDate(item);
  const Icon = item.type === 'image' ? ImageIcon : item.type === 'video' ? Video : FileText;

  return (
    <article className={`file-row ${selected ? 'selected' : ''}`}>
      <button className="file-select-button" type="button" onClick={onToggle} aria-label="选择文件">
        {selected ? <CheckSquare size={18} /> : <Square size={18} />}
      </button>
      <button className="file-name-button" type="button" onClick={() => window.albumApi.openPath(item.path)}>
        <span className={`file-kind-icon ${item.type}`}>
          <Icon size={18} />
        </span>
        <span className="file-name-text" title={item.name}>
          {item.name}
        </span>
      </button>
      <span className="file-type-label">{getTypeLabel(item)}</span>
      <span className="file-time">{date ? formatTimeLabel(date, 'zh-CN') : '未知'}</span>
      <span className="file-size">{formatBytes(item.size)}</span>
      <span className="file-source">{item.takenAtSource}</span>
      <button className="file-location-button" type="button" onClick={() => window.albumApi.showInFolder(item.path)}>
        <ExternalLink size={14} />
        位置
      </button>
    </article>
  );
}

function MediaPreview({ item }) {
  if (item.type === 'video') {
    return (
      <div className="video-preview">
        <video src={item.url} muted preload="metadata" />
        <span>
          <Play size={20} fill="currentColor" />
        </span>
      </div>
    );
  }
  return <img src={item.url} alt="" loading="lazy" />;
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <FolderOpen size={42} />
      </div>
      <h2>打开本地文件夹</h2>
    </div>
  );
}

function getTypeLabel(item) {
  if (item.type === 'image') {
    return '图片';
  }
  if (item.type === 'video') {
    return '视频';
  }
  return item.ext ? item.ext.slice(1).toUpperCase() : '文件';
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDateTimeLocal(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return [
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
  ].join('T');
}

function formatDateTimeText(timestampMs) {
  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) {
    return '未知时间';
  }
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

function formatHistoryTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '未知时间';
  }
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

function getProgressTitle(phase) {
  if (phase === 'undo') {
    return '撤销进度';
  }
  if (phase === 'time') {
    return '改时间进度';
  }
  if (phase === 'duplicates') {
    return '查重进度';
  }
  return '执行进度';
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

createRoot(document.getElementById('root')).render(<App />);
