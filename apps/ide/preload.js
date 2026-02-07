const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("codemm", {
  workspace: {
    get: () => ipcRenderer.invoke("codemm:workspace:get"),
    choose: () => ipcRenderer.invoke("codemm:workspace:choose"),
  },
  secrets: {
    getLlmSettings: () => ipcRenderer.invoke("codemm:secrets:getLlmSettings"),
    setLlmSettings: (args) => ipcRenderer.invoke("codemm:secrets:setLlmSettings", args),
    clearLlmSettings: () => ipcRenderer.invoke("codemm:secrets:clearLlmSettings"),
  },
});

