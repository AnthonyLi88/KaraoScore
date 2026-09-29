import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      downloadAudio: (url: string, type: string) => Promise<{ success: boolean; message?: string; error?: string; audioUrl?: string }>,
      normalizeAudio: (file: File, type: string) => Promise<{ success: boolean; message?: string; error?: string; audioUrl?: string }>,
      isolateVocalsPhase: () => Promise<{ success: boolean; message?: string; error?: string; audioUrl?: string }>,
      isolateVocalsDemucs: () => Promise<{ success: boolean; message?: string; error?: string; audioUrl?: string }>,
      checkDemucsEnv: () => Promise<{ status: 'ready' | 'needs_install' | 'missing_python' | 'error'; message?: string }>,
      installDemucs: () => Promise<{ success: boolean; error?: string }>
    }
  }
}
