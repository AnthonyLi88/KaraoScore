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

// Song Metadata preview
const songTitle = ref('Midnight City')
const songArtist = ref('M83')

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

      <!-- Track Setup Section -->
      <div style="display: flex; justify-content: center; gap: 60px; margin-top: 2rem; width: 100%;">
        <!-- Normal Track -->
        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
          <h3>Normal Track</h3>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; gap: 5px;">
              <input
                v-model="urlNormal"
                placeholder="Enter YouTube URL"
                style="padding: 10px; width: 200px; border-radius: 5px; border: 1px solid #333; background: #14151b; color: white;"
              />
              <button @click="downloadAudio('normal')" style="padding: 10px 15px; cursor: pointer; background: #ea580c; color: white; border: none; border-radius: 4px;">Download</button>
            </div>
            <div style="text-align: center; color: #888; font-size: 0.9em;">OR</div>
            <input
              type="file"
              accept="audio/*"
              @change="(e) => handleFileUpload(e, 'normal')"
              style="width: 280px; padding: 5px;"
            />
          </div>
          <p v-if="statusNormal" style="margin-top: 10px; font-size: 0.9em; max-width: 300px; text-align: center;">{{ statusNormal }}</p>
          <audio v-if="audioUrlNormal" :src="audioUrlNormal" controls style="margin-top: 15px; width: 300px;"></audio>
        </div>

        <!-- Instrumental Track -->
        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
          <h3>Instrumental Track</h3>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; gap: 5px;">
              <input
                v-model="urlInstrumental"
                placeholder="Enter YouTube URL"
                style="padding: 10px; width: 200px; border-radius: 5px; border: 1px solid #333; background: #14151b; color: white;"
              />
              <button @click="downloadAudio('instrumental')" style="padding: 10px 15px; cursor: pointer; background: #ea580c; color: white; border: none; border-radius: 4px;">Download</button>
            </div>
            <div style="text-align: center; color: #888; font-size: 0.9em;">OR</div>
            <input
              type="file"
              accept="audio/*"
              @change="(e) => handleFileUpload(e, 'instrumental')"
              style="width: 280px; padding: 5px;"
            />
          </div>
          <p v-if="statusInstrumental" style="margin-top: 10px; font-size: 0.9em; max-width: 300px; text-align: center;">{{ statusInstrumental }}</p>
          <audio v-if="audioUrlInstrumental" :src="audioUrlInstrumental" controls style="margin-top: 15px; width: 300px;"></audio>
        </div>
      </div>

      <!-- Vocal Isolation Controls -->
      <div style="display: flex; flex-direction: column; align-items: center; margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #222; width: 100%;">
        <div style="display: flex; gap: 20px;">
          <button
            @click="isolateVocalsPhase"
            :disabled="!audioUrlNormal || !audioUrlInstrumental"
            style="padding: 12px 24px; font-size: 1em; font-weight: bold; cursor: pointer; background-color: #172b1d; color: #4ade80; border: 1px solid #24462e; border-radius: 6px;"
          >
            Isolate Vocals (Phase)
          </button>
          <button
            @click="isolateVocalsDemucs"
            :disabled="!audioUrlNormal"
            style="padding: 12px 24px; font-size: 1em; font-weight: bold; cursor: pointer; background-color: #2b1836; color: #c084fc; border: 1px solid #462558; border-radius: 6px;"
          >
            Isolate Vocals (Demucs AI)
          </button>
        </div>
        <p v-if="statusVocals" style="margin-top: 15px; font-size: 0.95em; color: #ea580c;">{{ statusVocals }}</p>
        <audio v-if="audioUrlVocals" :src="audioUrlVocals" controls style="margin-top: 15px; width: 400px;"></audio>
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
</style>
