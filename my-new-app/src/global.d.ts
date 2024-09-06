export interface ElectronAPI {
    connectHID: () => void;
    onHIDConnected: (callback: (message: string) => void) => void;
    onHIDError: (callback: (message: string) => void) => void;
  }
  
  declare global {
    interface Window {
      electronAPI: ElectronAPI;
    }
  }
  