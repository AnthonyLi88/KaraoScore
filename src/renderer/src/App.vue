<script setup lang="ts">
import { ref, computed } from 'vue'

// Functional Track States
const urlNormal = ref('')
const statusNormal = ref('')
const audioUrlNormal = ref('')
const normalFileName = ref('')

const urlInstrumental = ref('')
const statusInstrumental = ref('')
const audioUrlInstrumental = ref('')
const instrumentalFileName = ref('')

const statusVocals = ref('')
const audioUrlVocals = ref('')

// Microphone Recording States
const isRecording = ref(false)
const recordingDuration = ref(0)
const statusRecording = ref('')
const audioUrlRecording = ref('')
const playBackingWhileRecording = ref(true)

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
      // Stop all mic tracks
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
      alert('Microphone access was denied. Please allow microphone access in macOS System Settings > Privacy & Security > Microphone.')
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

// Tabs: 'url' | 'file'
const tabNormal = ref<'url' | 'file'>('url')
const tabInstrumental = ref<'url' | 'file'>('file')

// Navigation
const currentNav = ref('import')

// Song Metadata
const songTitle = ref('Midnight City')
const songArtist = ref('M83')
const songYear = ref('2011')
const songBpm = ref('105')
const songKey = ref('B minor')

// File input handlers
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
  const result = await window.api.isolateVocalsDemucs('normal')
  if (result.success && result.audioUrl) {
    statusVocals.value = 'Success (Demucs AI)!'
    audioUrlVocals.value = result.audioUrl
  } else {
    statusVocals.value = `Error: ${result.error}`
  }
}
</script>

<template>
  <div class="app-shell">
    <!-- Left Sidebar -->
    <aside class="sidebar">
      <!-- App Brand -->
      <div class="brand">
        <div class="brand-badge">KS</div>
        <div>
          <div class="brand-title">KaraoScore</div>
          <div class="brand-subtitle">KARAOKE MODE</div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="nav-links">
        <button
          class="nav-btn"
          :class="{ active: currentNav === 'home' }"
          @click="currentNav = 'home'"
        >
          Home
        </button>
        <button
          class="nav-btn"
          :class="{ active: currentNav === 'import' }"
          @click="currentNav = 'import'"
        >
          Import
        </button>
        <button
          class="nav-btn"
          :class="{ active: currentNav === 'library' }"
          @click="currentNav = 'library'"
        >
          Library
        </button>
      </nav>

      <!-- Active Set Box -->
      <div class="active-set">
        <div class="active-set-label">ACTIVE SET</div>
        <div class="active-set-title">{{ songTitle || 'Midnight City' }}</div>
        <div class="active-set-meta">{{ songArtist || 'M83' }} &bull; 04:03</div>
      </div>

      <div class="sidebar-spacer"></div>

      <!-- Sidebar Footer -->
      <div class="sidebar-footer">
        <button class="footer-btn">Audio settings</button>
        <button class="footer-btn">Shortcuts</button>
        <div class="device-pill">Scarlett Solo &bull; 48 kHz</div>
      </div>
    </aside>

    <!-- Main Workspace Area -->
    <main class="main-content">
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

          <!-- Bottom Card: Vocal Isolation & Actions -->
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
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  width: 100vw;
  height: 100vh;
  background-color: #0d0e12;
  color: #e5e7eb;
  overflow: hidden;
  font-family: inherit;
}

/* Sidebar */
.sidebar {
  width: 220px;
  min-width: 220px;
  background-color: #111217;
  border-right: 1px solid #1f212a;
  display: flex;
  flex-direction: column;
  padding: 18px 14px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
}

.brand-badge {
  width: 32px;
  height: 32px;
  background-color: #ea580c;
  color: #fff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
}

.brand-title {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
}

.brand-subtitle {
  font-size: 9px;
  letter-spacing: 0.08em;
  color: #6b7280;
  font-weight: 600;
}

.nav-links {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-btn {
  text-align: left;
  background: transparent;
  border: none;
  color: #9ca3af;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
}

.nav-btn.active {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.active-set {
  margin-top: 24px;
  padding: 12px;
  background: #16171e;
  border: 1px solid #232532;
  border-radius: 6px;
}

.active-set-label {
  font-size: 9px;
  letter-spacing: 0.08em;
  color: #6b7280;
  font-weight: 600;
  margin-bottom: 4px;
}

.active-set-title {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.active-set-meta {
  font-size: 11px;
  color: #9ca3af;
}

.sidebar-spacer {
  flex: 1;
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 12px;
  border-top: 1px solid #1f212a;
}

.footer-btn {
  text-align: left;
  background: transparent;
  border: none;
  color: #9ca3af;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.footer-btn:hover {
  color: #fff;
}

.device-pill {
  font-size: 11px;
  color: #6b7280;
  padding: 6px 8px;
}

/* Main Workspace */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 30px;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.subtitle {
  font-size: 13px;
  color: #8b92a0;
  margin: 4px 0 0 0;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #ea580c;
  font-weight: 500;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #ea580c;
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

.step-item.done {
  color: #9ca3af;
}

.step-item.active {
  color: #ea580c;
  font-weight: 600;
}

.step-divider {
  color: #2b2e3b;
}

/* 2-Column Grid */
.grid-container {
  display: flex;
  gap: 18px;
  align-items: flex-start;
}

.panel {
  background: #14151b;
  border: 1px solid #20222c;
  border-radius: 8px;
  padding: 16px;
}

/* Left Panel: Song Details */
.song-panel {
  width: 280px;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title-row h2 {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.badge-accent {
  font-size: 11px;
  color: #ea580c;
  font-weight: 500;
}

.artwork-card {
  background: #101116;
  border: 1px solid #1e2029;
  border-radius: 6px;
  height: 120px;
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
  gap: 8px;
}

.form-row .form-group {
  flex: 1;
}

.info-note {
  background: rgba(234, 88, 12, 0.06);
  border: 1px solid rgba(234, 88, 12, 0.2);
  border-radius: 5px;
  padding: 8px 10px;
  font-size: 11px;
  line-height: 1.4;
  color: #ea580c;
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

.btn {
  padding: 7px 14px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.btn-secondary {
  background: #1a1c24;
  border-color: #262937;
  color: #e5e7eb;
}

.btn-secondary:hover {
  background: #222530;
}

.btn-primary {
  background: #ea580c;
  color: #fff;
}

.btn-primary:hover {
  background: #f97316;
}

.player-wrap {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.preview-tag {
  font-size: 11.5px;
  color: #8b92a0;
  white-space: nowrap;
}

.audio-control {
  width: 100%;
  height: 34px;
}

/* Actions Panel */
.actions-panel {
  display: flex;
  gap: 18px;
}

.actions-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.actions-left h3 {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.desc-text {
  font-size: 12px;
  color: #8b92a0;
  margin: 0;
}

.isolation-btn-row {
  display: flex;
  gap: 10px;
}

.btn-isolate {
  padding: 8px 14px;
}

.btn-isolate.phase {
  background: #132418;
  color: #4ade80;
  border-color: #1e3a26;
}

.btn-isolate.phase:hover:not(:disabled) {
  background: #1a3222;
}

.btn-isolate.demucs {
  background: #25162e;
  color: #c084fc;
  border-color: #3b224a;
}

.btn-isolate.demucs:hover:not(:disabled) {
  background: #311c3e;
}

.btn-isolate:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.status-msg {
  font-size: 11.5px;
  color: #ea580c;
  font-weight: 500;
}

.actions-right {
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  border-left: 1px solid #1f212a;
  padding-left: 18px;
  min-width: 130px;
}

/* Recording Track Styles */
.record-action-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.btn-record {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #1c1417;
  color: #f87171;
  border: 1px solid #3f1d24;
  padding: 8px 16px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-record:hover {
  background: #2a161b;
  border-color: #5c2430;
}

.btn-record.recording {
  background: #7f1d1d;
  color: #fff;
  border-color: #b91c1c;
  animation: rec-pulse 1.5s infinite ease-in-out;
}

.rec-icon {
  width: 9px;
  height: 9px;
  background: #ef4444;
  border-radius: 50%;
  display: inline-block;
  transition: all 0.2s ease;
}

.btn-record.recording .rec-icon {
  background: #fff;
  border-radius: 2px;
}

.recording-badge {
  background: #3b171f !important;
  color: #f87171 !important;
}

.recording-badge.is-live {
  background: #991b1b !important;
  color: #fff !important;
  animation: rec-pulse 1.2s infinite ease-in-out;
}

.recording-active {
  color: #ef4444 !important;
  font-weight: 600;
}

.recording-dot {
  background: #ef4444 !important;
  box-shadow: 0 0 8px #ef4444 !important;
  animation: rec-pulse 1s infinite;
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
