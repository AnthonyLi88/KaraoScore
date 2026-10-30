<script setup lang="ts">
import { ref, computed } from 'vue'

// Synchronized song metadata (2-way bound with App shell)
const songTitle = defineModel<string>('songTitle', { default: 'Midnight City' })
const songArtist = defineModel<string>('songArtist', { default: 'M83' })

const songYear = ref('2011')
const songBpm = ref('105')
const songKey = ref('B minor')

// Track A: Original Song States
const urlNormal = ref('')
const statusNormal = ref('')
const audioUrlNormal = ref('')
const normalFileName = ref('')
const tabNormal = ref<'url' | 'file'>('url')

// Track B: Instrumental States
const urlInstrumental = ref('')
const statusInstrumental = ref('')
const audioUrlInstrumental = ref('')
const instrumentalFileName = ref('')
const tabInstrumental = ref<'url' | 'file'>('file')

// Track C: Microphone Recording States
const isRecording = ref(false)
const recordingDuration = ref(0)
const statusRecording = ref('')
const audioUrlRecording = ref('')
const playBackingWhileRecording = ref(true)

// Vocal Isolation States
const statusVocals = ref('')
const audioUrlVocals = ref('')

// Gate mic input until Original song, Instrumental, and Isolated vocals are ready
const canRecord = computed(() => {
  return Boolean(audioUrlNormal.value && audioUrlInstrumental.value && audioUrlVocals.value)
})

const missingRequirements = computed(() => {
  const missing: string[] = []
  if (!audioUrlNormal.value) missing.push('Original song')
  if (!audioUrlInstrumental.value) missing.push('Instrumental')
  if (!audioUrlVocals.value) missing.push('Isolated vocals')
  return missing
})

let mediaRecorder: MediaRecorder | null = null
let recordingTimer: ReturnType<typeof setInterval> | null = null
let audioChunks: Blob[] = []
let backingAudioElem: HTMLAudioElement | null = null

const formatTimer = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const startRecording = async () => {
  if (!canRecord.value) {
    alert(`Microphone recording requires all 3 audio sources: ${missingRequirements.value.join(', ')}`)
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    audioChunks = []

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/mp4'

    mediaRecorder = new MediaRecorder(stream, { mimeType })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop())

      if (backingAudioElem) {
        backingAudioElem.pause()
        backingAudioElem.currentTime = 0
      }

      const audioBlob = new Blob(audioChunks, { type: mimeType })
      if (audioBlob.size === 0) {
        statusRecording.value = 'Recording empty'
        return
      }

      statusRecording.value = 'Saving recording...'
      const arrayBuffer = await audioBlob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      const result = await window.api.saveRecording(uint8Array)
      if (result.success && result.audioUrl) {
        audioUrlRecording.value = result.audioUrl
        statusRecording.value = `Ready (${formatTimer(recordingDuration.value)})`
      } else {
        audioUrlRecording.value = URL.createObjectURL(audioBlob)
        statusRecording.value = result.error ? `Saved locally: ${result.error}` : 'Ready'
      }
    }

    mediaRecorder.start(250)
    isRecording.value = true
    recordingDuration.value = 0
    statusRecording.value = 'Recording...'
    audioUrlRecording.value = ''

    recordingTimer = setInterval(() => {
      recordingDuration.value++
    }, 1000)

    if (playBackingWhileRecording.value && audioUrlInstrumental.value) {
      if (!backingAudioElem) {
        backingAudioElem = new Audio()
      }
      backingAudioElem.src = audioUrlInstrumental.value
      backingAudioElem.currentTime = 0
      backingAudioElem.play().catch((e) => console.warn('Could not auto-play backing track:', e))
    }
  } catch (err: any) {
    console.error('Microphone error:', err)
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      statusRecording.value = 'Mic permission denied'
      alert('Microphone access was denied. Please allow microphone access in Settings > Privacy > Microphone.')
    } else {
      statusRecording.value = `Error: ${err.message}`
    }
  }
}

const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  isRecording.value = false
  if (recordingTimer) {
    clearInterval(recordingTimer)
    recordingTimer = null
  }
}

const toggleRecording = () => {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

// File Selection Handler
const onFileSelected = (event: Event, type: 'normal' | 'instrumental') => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (type === 'normal') {
    normalFileName.value = file.name
  } else {
    instrumentalFileName.value = file.name
  }
  handleFileUpload(event, type)
}

const downloadAudio = async (type: 'normal' | 'instrumental'): Promise<void> => {
  const url = type === 'normal' ? urlNormal.value : urlInstrumental.value
  if (!url) return

  if (type === 'normal') {
    statusNormal.value = 'Downloading...'
    audioUrlNormal.value = ''
  } else {
    statusInstrumental.value = 'Downloading...'
    audioUrlInstrumental.value = ''
  }

  const result = await window.api.downloadAudio(url, type)

  if (type === 'normal') {
    if (result.success && result.audioUrl) {
      statusNormal.value = 'Ready'
      audioUrlNormal.value = result.audioUrl
    } else {
      statusNormal.value = `Error: ${result.error}`
    }
  } else {
    if (result.success && result.audioUrl) {
      statusInstrumental.value = 'Ready'
      audioUrlInstrumental.value = result.audioUrl
    } else {
      statusInstrumental.value = `Error: ${result.error}`
    }
  }
}

const handleFileUpload = async (event: Event, type: 'normal' | 'instrumental') => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (type === 'normal') {
    statusNormal.value = `Normalizing: ${file.name}...`
    audioUrlNormal.value = ''
  } else {
    statusInstrumental.value = `Normalizing: ${file.name}...`
    audioUrlInstrumental.value = ''
  }

  const result = await window.api.normalizeAudio(file, type)

  if (type === 'normal') {
    if (result.success && result.audioUrl) {
      statusNormal.value = 'Ready'
      audioUrlNormal.value = result.audioUrl
    } else {
      statusNormal.value = `Error: ${result.error}`
    }
  } else {
    if (result.success && result.audioUrl) {
      statusInstrumental.value = 'Ready'
      audioUrlInstrumental.value = result.audioUrl
    } else {
      statusInstrumental.value = `Error: ${result.error}`
    }
  }
}

const isolateVocalsPhase = async () => {
  statusVocals.value = 'Isolating vocals via Phase Cancellation...'
  audioUrlVocals.value = ''
  const result = await window.api.isolateVocalsPhase()
  if (result.success && result.audioUrl) {
    statusVocals.value = 'Success (Phase)!'
    audioUrlVocals.value = result.audioUrl
  } else {
    statusVocals.value = `Error: ${result.error}`
  }
}

const isolateVocalsDemucs = async () => {
  statusVocals.value = 'Checking AI dependencies...'
  const envCheck = await window.api.checkDemucsEnv()

  if (envCheck.status === 'missing_python') {
    statusVocals.value = 'Error: Python 3 is required!'
    alert('Python 3 is required to use Demucs AI. Please install it from python.org, then try again.')
    return
  }

  if (envCheck.status === 'needs_install') {
    statusVocals.value = 'Installing AI models (please wait)...'
    const installResult = await window.api.installDemucs()
    if (!installResult.success) {
      statusVocals.value = `Install Error: ${installResult.error}`
      return
    }
  }

  statusVocals.value = 'Isolating vocals via Demucs AI (takes a moment)...'
  audioUrlVocals.value = ''
  const result = await window.api.isolateVocalsDemucs()
  if (result.success && result.audioUrl) {
    statusVocals.value = 'Success (Demucs AI)!'
    audioUrlVocals.value = result.audioUrl
  } else {
    statusVocals.value = `Error: ${result.error}`
  }
}
</script>

<template>
  <div class="import-view">
    <!-- Header -->
    <header class="page-header">
      <div>
        <h1>Import song</h1>
        <p class="subtitle">Prepare original song and instrumental backing sources.</p>
      </div>
      <div class="header-status">
        <span class="status-dot" :class="{ 'recording-dot': isRecording, 'disabled-dot': !canRecord }"></span>
        <span>{{ isRecording ? 'Recording active' : canRecord ? 'Mic ready' : 'Mic locked' }}</span>
      </div>
    </header>

    <!-- Step Indicator Bar -->
    <div class="steps-bar">
      <span class="step-item done">&check; Song details</span>
      <span class="step-divider">&mdash;</span>
      <span class="step-item active">02 Source tracks</span>
      <span class="step-divider">&mdash;</span>
      <span class="step-item">03 Validate &amp; save</span>
    </div>

    <!-- Two-Column Grid -->
    <div class="grid-container">
      <!-- Left Column: Song Details -->
      <section class="panel song-panel">
        <div class="panel-title-row">
          <h2>Song details</h2>
          <span class="badge-accent">Metadata found</span>
        </div>

        <!-- Artwork Box -->
        <div class="artwork-card">
          <div class="waveform-icon">
            <svg width="48" height="28" viewBox="0 0 80 40" fill="none" stroke="#ea580c" stroke-width="3" stroke-linecap="round">
              <path d="M5 20h10l5-12 10 24 10-18 10 12 10-6h15" />
            </svg>
          </div>
          <span class="artwork-text">AUTO ARTWORK &bull; 1200&times;1200</span>
        </div>

        <!-- Metadata Form -->
        <div class="form-group">
          <label>TITLE</label>
          <input v-model="songTitle" type="text" placeholder="Title" />
        </div>

        <div class="form-group">
          <label>ARTIST</label>
          <input v-model="songArtist" type="text" placeholder="Artist" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>YEAR</label>
            <input v-model="songYear" type="text" placeholder="Year" />
          </div>
          <div class="form-group">
            <label>BPM</label>
            <input v-model="songBpm" type="text" placeholder="BPM" />
          </div>
        </div>

        <div class="form-group">
          <label>KEY</label>
          <input v-model="songKey" type="text" placeholder="Key" />
        </div>

        <div class="info-note">
          Tempo and key will be verified again after both sources finish processing.
        </div>
      </section>

      <!-- Right Column: Audio Sources & Vocal Isolation -->
      <section class="sources-column">
        <!-- Track A: Original Song / Normal Track -->
        <div class="panel track-panel">
          <div class="track-header">
            <span class="tag-letter">A</span>
            <div class="track-info">
              <h3>Original song</h3>
              <p>Full track with vocals. Used for audio reference and vocal isolation.</p>
            </div>
            <span v-if="statusNormal" class="track-status">{{ statusNormal }}</span>
          </div>

          <!-- Tabs: URL vs File -->
          <div class="tabs">
            <button
              class="tab"
              :class="{ active: tabNormal === 'url' }"
              @click="tabNormal = 'url'"
            >
              YouTube URL
            </button>
            <button
              class="tab"
              :class="{ active: tabNormal === 'file' }"
              @click="tabNormal = 'file'"
            >
              Local file
            </button>
          </div>

          <!-- YouTube URL Input -->
          <div v-if="tabNormal === 'url'" class="input-action-row">
            <input
              v-model="urlNormal"
              type="text"
              placeholder="Enter YouTube URL"
              class="text-input"
            />
            <button class="btn btn-secondary" @click="downloadAudio('normal')">
              Download
            </button>
          </div>

          <!-- Local File Input -->
          <div v-else class="input-action-row">
            <input
              type="file"
              accept="audio/*"
              class="file-input"
              @change="(e) => onFileSelected(e, 'normal')"
            />
          </div>

          <!-- Audio Player -->
          <div v-if="audioUrlNormal" class="player-wrap">
            <audio :src="audioUrlNormal" controls class="audio-control"></audio>
          </div>
        </div>

        <!-- Track B: Instrumental Track -->
        <div class="panel track-panel">
          <div class="track-header">
            <span class="tag-letter">B</span>
            <div class="track-info">
              <h3>Instrumental track</h3>
              <p>Playback bed the singer performs over. No guide vocal.</p>
            </div>
            <span v-if="statusInstrumental" class="track-status">{{ statusInstrumental }}</span>
          </div>

          <!-- Tabs: URL vs File -->
          <div class="tabs">
            <button
              class="tab"
              :class="{ active: tabInstrumental === 'url' }"
              @click="tabInstrumental = 'url'"
            >
              YouTube URL
            </button>
            <button
              class="tab"
              :class="{ active: tabInstrumental === 'file' }"
              @click="tabInstrumental = 'file'"
            >
              Local file
            </button>
          </div>

          <!-- YouTube URL Input -->
          <div v-if="tabInstrumental === 'url'" class="input-action-row">
            <input
              v-model="urlInstrumental"
              type="text"
              placeholder="Enter YouTube URL"
              class="text-input"
            />
            <button class="btn btn-secondary" @click="downloadAudio('instrumental')">
              Download
            </button>
          </div>

          <!-- Local File Input -->
          <div v-else class="input-action-row">
            <input
              type="file"
              accept="audio/*"
              class="file-input"
              @change="(e) => onFileSelected(e, 'instrumental')"
            />
          </div>

          <!-- Audio Player -->
          <div v-if="audioUrlInstrumental" class="player-wrap">
            <audio :src="audioUrlInstrumental" controls class="audio-control"></audio>
          </div>
        </div>

        <!-- Vocal Isolation & Actions -->
        <div class="panel actions-panel">
          <div class="actions-left">
            <h3>Vocal Isolation &amp; Validation</h3>
            <p class="desc-text">
              Generate isolated vocals from your tracks using Phase Cancellation or Demucs AI.
            </p>

            <!-- Isolation Action Buttons -->
            <div class="isolation-btn-row">
              <button
                class="btn btn-isolate phase"
                :disabled="!audioUrlNormal || !audioUrlInstrumental"
                @click="isolateVocalsPhase"
              >
                Isolate Vocals (Phase)
              </button>
              <button
                class="btn btn-isolate demucs"
                :disabled="!audioUrlNormal"
                @click="isolateVocalsDemucs"
              >
                Isolate Vocals (Demucs AI)
              </button>
            </div>

            <!-- Status Message -->
            <div v-if="statusVocals" class="status-msg">
              {{ statusVocals }}
            </div>

            <!-- Isolated Audio Player -->
            <div v-if="audioUrlVocals" class="player-wrap">
              <span class="preview-tag">Isolated Vocals:</span>
              <audio :src="audioUrlVocals" controls class="audio-control"></audio>
            </div>
          </div>

          <!-- Save Buttons -->
          <div class="actions-right">
            <button class="btn btn-primary">Save to library</button>
            <button class="btn btn-secondary">Save as draft</button>
          </div>
        </div>

        <!-- Track C: User Mic Recording -->
        <div class="panel track-panel" :class="{ 'track-locked': !canRecord }">
          <div class="track-header">
            <span class="tag-letter recording-badge" :class="{ 'is-live': isRecording, 'is-locked': !canRecord }">C</span>
            <div class="track-info">
              <h3>Vocal recording (Microphone)</h3>
              <p v-if="canRecord">Record your voice through your mic to test singing and scoring.</p>
              <p v-else class="lock-msg">
                Locked &bull; Requires {{ missingRequirements.join(', ') }}
              </p>
            </div>
            <span v-if="statusRecording" class="track-status" :class="{ 'recording-active': isRecording }">
              {{ statusRecording }}
            </span>
          </div>

          <!-- Record Actions -->
          <div class="record-action-row">
            <button
              class="btn btn-record"
              :class="{ recording: isRecording }"
              :disabled="!canRecord"
              @click="toggleRecording"
            >
              <span class="rec-icon"></span>
              <span>{{ isRecording ? `Stop Recording (${formatTimer(recordingDuration)})` : 'Record from Mic' }}</span>
            </button>

            <label v-if="audioUrlInstrumental && canRecord" class="backing-toggle">
              <input v-model="playBackingWhileRecording" type="checkbox" :disabled="isRecording" />
              <span>Play instrumental while recording</span>
            </label>
          </div>

          <!-- Audio Player Preview for Recording -->
          <div v-if="audioUrlRecording" class="player-wrap">
            <span class="preview-tag">Take preview:</span>
            <audio :src="audioUrlRecording" controls class="audio-control"></audio>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.import-view {
  display: flex;
  flex-direction: column;
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h1 {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.subtitle {
  font-size: 12.5px;
  color: #8b92a0;
  margin: 4px 0 0 0;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #8b92a0;
  background: #14151b;
  border: 1px solid #20222c;
  padding: 6px 12px;
  border-radius: 20px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #ea580c;
}

/* Buttons and Panels */
.btn {
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
}

.btn-primary {
  background-color: #ea580c;
  color: #fff;
}

.btn-primary:hover {
  background-color: #f97316;
}

.btn-secondary {
  background: #1e202a;
  border: 1px solid #2d3140;
  color: #e5e7eb;
}

.btn-secondary:hover {
  background: #282b39;
}

.panel {
  background: #14151b;
  border: 1px solid #20222c;
  border-radius: 8px;
  padding: 18px;
}

/* Step Bar */
.steps-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #14151b;
  border: 1px solid #20222c;
  border-radius: 6px;
  padding: 9px 16px;
  margin-bottom: 20px;
  font-size: 12.5px;
}

.step-item {
  color: #6b7280;
  font-weight: 500;
}

.step-item.active {
  color: #ea580c;
  font-weight: 600;
}

.step-item.done {
  color: #e5e7eb;
}

.step-divider {
  color: #383c4e;
}

/* 2-Column Grid */
.grid-container {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

/* Left Panel: Song Details */
.song-panel {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title-row h2 {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.badge-accent {
  font-size: 10px;
  font-weight: 600;
  background: #2b1713;
  color: #ea580c;
  padding: 2px 7px;
  border-radius: 4px;
  letter-spacing: 0.04em;
}

.artwork-card {
  height: 120px;
  background: #0f1014;
  border: 1px dashed #20222c;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.artwork-text {
  font-size: 9px;
  color: #6b7280;
  letter-spacing: 0.08em;
  font-weight: 600;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 10px;
  font-weight: 600;
  color: #6b7280;
}

.form-group input {
  background: #0f1014;
  border: 1px solid #20222c;
  border-radius: 5px;
  padding: 7px 10px;
  font-size: 13px;
  color: #fff;
  outline: none;
}

.form-group input:focus {
  border-color: #383c4e;
}

.form-row {
  display: flex;
  gap: 10px;
}

.form-row .form-group {
  flex: 1;
}

.info-note {
  font-size: 11px;
  color: #6b7280;
  line-height: 1.4;
  margin-top: 4px;
}

/* Right Column */
.sources-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.track-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.track-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.tag-letter {
  width: 22px;
  height: 22px;
  background: #2b1713;
  color: #ea580c;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 11px;
  flex-shrink: 0;
}

.track-info {
  flex: 1;
}

.track-info h3 {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 2px 0;
}

.track-info p {
  font-size: 12px;
  color: #8b92a0;
  margin: 0;
}

.track-status {
  font-size: 11px;
  color: #ea580c;
  font-weight: 500;
}

.tabs {
  display: flex;
  background: #101116;
  border: 1px solid #20222c;
  border-radius: 5px;
  padding: 3px;
}

.tab {
  flex: 1;
  background: transparent;
  border: none;
  color: #8b92a0;
  padding: 6px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
}

.tab.active {
  background: #1e202a;
  color: #fff;
}

.input-action-row {
  display: flex;
  gap: 8px;
}

.text-input {
  flex: 1;
  background: #0f1014;
  border: 1px solid #20222c;
  border-radius: 5px;
  padding: 7px 10px;
  font-size: 12.5px;
  color: #fff;
  outline: none;
}

.text-input:focus {
  border-color: #383c4e;
}

.file-input {
  font-size: 12px;
  color: #9ca3af;
  padding: 4px 0;
}

.player-wrap {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-tag {
  font-size: 11px;
  font-weight: 600;
  color: #ea580c;
}

.audio-control {
  width: 100%;
  height: 36px;
}

/* Actions Panel */
.actions-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.actions-left {
  flex: 1;
}

.actions-left h3 {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 2px 0;
}

.desc-text {
  font-size: 12px;
  color: #8b92a0;
  margin: 0 0 10px 0;
}

.isolation-btn-row {
  display: flex;
  gap: 10px;
  margin-bottom: 6px;
}

.btn-isolate {
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 5px;
  cursor: pointer;
  border: 1px solid #2d3140;
  background: #191b22;
  color: #e5e7eb;
}

.btn-isolate:hover:not(:disabled) {
  background: #252834;
  border-color: #ea580c;
}

.btn-isolate:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-isolate.demucs {
  border-color: #ea580c;
  color: #ea580c;
  background: #231612;
}

.btn-isolate.demucs:hover:not(:disabled) {
  background: #331e17;
}

.status-msg {
  font-size: 11.5px;
  color: #ea580c;
  margin-top: 4px;
}

.actions-right {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 130px;
}

.actions-right .btn {
  padding: 9px 16px;
  text-align: center;
}

/* Recording Track Styles */
.record-action-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.btn-record {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #1c1d24;
  border: 1px solid #323544;
  color: #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 12px;
  transition: all 0.2s ease;
}

.btn-record:hover:not(:disabled) {
  background: #282a36;
  border-color: #ef4444;
  color: #fff;
}

.btn-record .rec-icon {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  display: inline-block;
  transition: transform 0.2s;
}

.btn-record.recording {
  background: #3b1717;
  border-color: #ef4444;
  color: #fca5a5;
}

.btn-record.recording .rec-icon {
  border-radius: 2px;
  animation: rec-pulse 1s infinite;
}

.recording-dot {
  background: #ef4444 !important;
  box-shadow: 0 0 8px #ef4444 !important;
  animation: rec-pulse 1s infinite;
}

.recording-badge.is-live {
  background: #ef4444 !important;
  color: #fff !important;
  animation: rec-pulse 1s infinite;
}

.recording-active {
  color: #ef4444 !important;
  font-weight: 600;
}

.backing-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: #8b92a0;
  cursor: pointer;
  user-select: none;
}

.backing-toggle input[type="checkbox"] {
  cursor: pointer;
  accent-color: #ea580c;
}

.track-panel.track-locked {
  opacity: 0.65;
  border-color: #1a1c24;
}

.lock-msg {
  color: #f59e0b !important;
  font-size: 11.5px !important;
  font-weight: 500;
}

.btn-record:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  background: #15161b;
  border-color: #20222a;
  color: #6b7280;
}

.btn-record:disabled:hover {
  background: #15161b;
  border-color: #20222a;
}

.btn-record:disabled .rec-icon {
  background: #6b7280;
}

.recording-badge.is-locked {
  background: #1a1c24 !important;
  color: #6b7280 !important;
}

.disabled-dot {
  background-color: #4b5563 !important;
}

@keyframes rec-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
</style>
