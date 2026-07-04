const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('albumApi', {
  selectDirectory: () => ipcRenderer.invoke('album:select-directory'),
  selectDestination: () => ipcRenderer.invoke('album:select-destination'),
  scanDirectory: (options) => ipcRenderer.invoke('album:scan-directory', options),
  findDuplicates: (items) => ipcRenderer.invoke('album:find-duplicates', items),
  getHistory: () => ipcRenderer.invoke('album:get-history'),
  validateOperations: (operations) => ipcRenderer.invoke('album:validate-operations', operations),
  executeOperations: (operations, metadata) => ipcRenderer.invoke('album:execute-operations', operations, metadata),
  undoOperations: (results, metadata) => ipcRenderer.invoke('album:undo-operations', results, metadata),
  exportExcel: (items) => ipcRenderer.invoke('album:export-excel', items),
  importExcel: () => ipcRenderer.invoke('album:import-excel'),
  setFileTimes: (operations) => ipcRenderer.invoke('album:set-file-times', operations),
  onOperationProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('album:operation-progress', listener);
    return () => ipcRenderer.removeListener('album:operation-progress', listener);
  },
  openPath: (filePath) => ipcRenderer.invoke('album:open-path', filePath),
  showInFolder: (filePath) => ipcRenderer.invoke('album:show-in-folder', filePath)
});
