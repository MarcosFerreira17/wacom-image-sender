import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  connectHID: () => ipcRenderer.send('connect-hid'),
  onHIDConnected: (callback: (message: string) => void) => ipcRenderer.on('hid-connected', (_, message) => callback(message)),
  onHIDError: (callback: (message: string) => void) => ipcRenderer.on('hid-error', (_, message) => callback(message)),
});
