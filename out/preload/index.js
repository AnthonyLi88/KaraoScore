"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
const api = {
  downloadAudio: (url, type) => electron.ipcRenderer.invoke("download-audio", url, type),
  normalizeAudio: (file, type) => {
    const filePath = electron.webUtils.getPathForFile(file);
    return electron.ipcRenderer.invoke("normalize-audio", filePath, type);
  }
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", preload.electronAPI);
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
}
