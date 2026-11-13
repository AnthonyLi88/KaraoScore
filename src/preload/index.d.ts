import { ElectronAPI } from '@electron-toolkit/preload'

export interface TestFolderAudioResult {
  fileName: string
  audioUrl: string
}

export interface TestFolderLoadResult {
  canceled?: boolean
  success: boolean
  error?: string
  folderPath?: string
  folderName?: string
  trackNormal?: TestFolderAudioResult
  trackInstrumental?: TestFolderAudioResult
  trackRecording?: TestFolderAudioResult
  trackVocals?: TestFolderAudioResult
  missing?: string[]
}

export interface TestFolderItem {
  name: string
  path: string
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      downloadAudio: (url: string, type: string) => Promise<{ success: boolean; message?: string; error?: string; audioUrl?: string }>,
      normalizeAudio: (file: File, type: string) => Promise<{ success: boolean; message?: string; error?: string; audioUrl?: string }>,
      isolateVocalsPhase: () => Promise<{ success: boolean; message?: string; error?: string; audioUrl?: string }>,
      isolateVocalsDemucs: (trackType?: 'normal' | 'instrumental') => Promise<{ success: boolean; message?: string; error?: string; audioUrl?: string; instrumentalUrl?: string }>,
      checkDemucsEnv: () => Promise<{ status: 'ready' | 'needs_install' | 'missing_python' | 'error'; message?: string }>,
      installDemucs: () => Promise<{ success: boolean; error?: string }>,
      saveRecording: (buffer: Uint8Array) => Promise<{ success: boolean; message?: string; error?: string; audioUrl?: string }>,
      selectTestFolder: () => Promise<{ canceled: boolean; folderPath?: string }>,
      loadTestFolder: (folderPath?: string) => Promise<TestFolderLoadResult>,
      getTestAssetFolders: () => Promise<TestFolderItem[]>
    }
  }
}
