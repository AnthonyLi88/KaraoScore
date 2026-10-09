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
