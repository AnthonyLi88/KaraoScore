<script setup lang="ts">
import { ref } from 'vue'

const urlNormal = ref('')
const statusNormal = ref('')
const audioUrlNormal = ref('')

const urlInstrumental = ref('')
const statusInstrumental = ref('')
const audioUrlInstrumental = ref('')

const statusVocals = ref('')
const audioUrlVocals = ref('')

// Navigation
const currentNav = ref('import')

// Song Metadata
const songTitle = ref('Midnight City')
const songArtist = ref('M83')
const songYear = ref('2011')
const songBpm = ref('105')
const songKey = ref('B minor')

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
      statusNormal.value = 'Success!'
      audioUrlNormal.value = result.audioUrl
    } else {
      statusNormal.value = `Error: ${result.error}`
    }
  } else {
    if (result.success && result.audioUrl) {
      statusInstrumental.value = 'Success!'
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
      statusNormal.value = `Loaded: ${file.name}`
      audioUrlNormal.value = result.audioUrl
    } else {
      statusNormal.value = `Error: ${result.error}`
    }
  } else {
    if (result.success && result.audioUrl) {
      statusInstrumental.value = `Loaded: ${file.name}`
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
    statusVocals.value = 'Error: You must install Python on your computer first!'
    alert('Python 3 is required to use Demucs AI. Please install it from python.org, then try again.')
    return
  }

  if (envCheck.status === 'needs_install') {
    statusVocals.value = 'Downloading and installing AI models (This takes a few minutes, please do not close the app)...'
    const installResult = await window.api.installDemucs()
    if (!installResult.success) {
      statusVocals.value = `Install Error: ${installResult.error}`
      return
    }
  }

  statusVocals.value = 'Isolating vocals via AI (This will take a few minutes)...'
  audioUrlVocals.value = ''
  const result = await window.api.isolateVocalsDemucs()
  if (result.success && result.audioUrl) {
    statusVocals.value = 'Success (AI Demucs)!'
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
        <div class="brand-badge">VA</div>
        <div>
          <div class="brand-title">VocalArc</div>
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

    <!-- Main Content Area -->
    <main class="main-content">
      <!-- Page Header -->
      <header class="page-header">
        <div>
          <h1>Import song</h1>
          <p class="subtitle">Prepare separate instrumental and reference vocal sources.</p>
        </div>
        <div class="header-status">
          <span class="status-dot"></span>
          <span>Mic ready</span>
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

        <!-- Right Side: Existing audio functional tracks during development -->
        <section class="sources-column">
          <div class="panel" style="display: flex; flex-direction: column; gap: 20px;">
            <div style="display: flex; justify-content: space-around; width: 100%;">
              <!-- Normal Track -->
              <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                <h3>Normal Track</h3>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <div style="display: flex; gap: 5px;">
                    <input
                      v-model="urlNormal"
                      placeholder="Enter YouTube URL"
                      style="padding: 8px; width: 180px; border-radius: 5px; border: 1px solid #333; background: #0f1014; color: white;"
                    />
                    <button @click="downloadAudio('normal')" style="padding: 8px 12px; cursor: pointer; background: #ea580c; color: white; border: none; border-radius: 4px;">Download</button>
                  </div>
                  <input
                    type="file"
                    accept="audio/*"
                    @change="(e) => handleFileUpload(e, 'normal')"
                    style="width: 250px; padding: 5px;"
                  />
                </div>
                <p v-if="statusNormal" style="font-size: 0.85em; color: #ea580c;">{{ statusNormal }}</p>
                <audio v-if="audioUrlNormal" :src="audioUrlNormal" controls style="width: 260px; height: 32px;"></audio>
              </div>

              <!-- Instrumental Track -->
              <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                <h3>Instrumental Track</h3>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <div style="display: flex; gap: 5px;">
                    <input
                      v-model="urlInstrumental"
                      placeholder="Enter YouTube URL"
                      style="padding: 8px; width: 180px; border-radius: 5px; border: 1px solid #333; background: #0f1014; color: white;"
                    />
                    <button @click="downloadAudio('instrumental')" style="padding: 8px 12px; cursor: pointer; background: #ea580c; color: white; border: none; border-radius: 4px;">Download</button>
                  </div>
                  <input
                    type="file"
                    accept="audio/*"
                    @change="(e) => handleFileUpload(e, 'instrumental')"
                    style="width: 250px; padding: 5px;"
                  />
                </div>
                <p v-if="statusInstrumental" style="font-size: 0.85em; color: #ea580c;">{{ statusInstrumental }}</p>
                <audio v-if="audioUrlInstrumental" :src="audioUrlInstrumental" controls style="width: 260px; height: 32px;"></audio>
              </div>
            </div>

            <!-- Isolation buttons -->
            <div style="display: flex; justify-content: center; gap: 15px; padding-top: 15px; border-top: 1px solid #222;">
              <button
                @click="isolateVocalsPhase"
                :disabled="!audioUrlNormal || !audioUrlInstrumental"
                style="padding: 10px 18px; font-weight: 600; cursor: pointer; background-color: #172b1d; color: #4ade80; border: 1px solid #24462e; border-radius: 6px;"
              >
                Isolate Vocals (Phase)
              </button>
              <button
                @click="isolateVocalsDemucs"
                :disabled="!audioUrlNormal"
                style="padding: 10px 18px; font-weight: 600; cursor: pointer; background-color: #2b1836; color: #c084fc; border: 1px solid #462558; border-radius: 6px;"
              >
                Isolate Vocals (Demucs AI)
              </button>
            </div>
            <p v-if="statusVocals" style="text-align: center; font-size: 0.9em; color: #ea580c;">{{ statusVocals }}</p>
            <audio v-if="audioUrlVocals" :src="audioUrlVocals" controls style="margin: 0 auto; width: 360px; height: 34px;"></audio>
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

/* Main Content */
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

.sources-column {
  flex: 1;
}
</style>
