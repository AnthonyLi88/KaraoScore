export interface SettingsState {
  audioInput: string
  audioOutput: string
  directMonitoring: boolean
  inputGain: number
  masterVolume: number
  sampleRate: string
  bufferSize: string
  latencyOffset: number
  noiseGateThreshold: number
  theme: string
  waveformFps: string
  autoSaveRecordings: boolean
  storagePath: string
}

export const STORAGE_KEY = 'karaoscore_settings'

export const DEFAULT_SETTINGS: SettingsState = {
  audioInput: 'Scarlett Solo USB (Interface)',
  audioOutput: 'Scarlett Solo USB (Headphones)',
  directMonitoring: true,
  inputGain: 0,
  masterVolume: 85,
  sampleRate: '48,000 Hz (Professional)',
  bufferSize: '256 samples (5.3ms)',
  latencyOffset: 24,
  noiseGateThreshold: -42,
  theme: 'KaraoDark (Default)',
  waveformFps: '60 FPS (Ultra Smooth)',
  autoSaveRecordings: true,
  storagePath: '~/AppData/Roaming/KaraoScore'
}

export type SettingsTabKey = 'audio' | 'shortcuts' | 'latency' | 'general'

export interface TabMeta {
  id: SettingsTabKey
  label: string
  icon: any
  title: string
  subtitle: string
}
