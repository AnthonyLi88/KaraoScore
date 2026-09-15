import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      downloadAudio: (url: string, type: string) => Promise<{ success: boolean; message?: string; error?: string; audioUrl?: string }>
    }
  }
}
