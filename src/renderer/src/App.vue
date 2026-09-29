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
  const url = type === 'normal' ? urlNormal.value : urlInstrumental.value;
  if (!url) return;
  
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

  // Pass the raw File object to the securely isolated preload script
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
  // 1. Check if the AI Environment is ready
  statusVocals.value = 'Checking AI dependencies...'
  const envCheck = await window.api.checkDemucsEnv()
  
  if (envCheck.status === 'missing_python') {
    statusVocals.value = 'Error: You must install Python on your computer first!'
    alert('Python 3 is required to use Demucs AI. Please install it from python.org, then try again.')
    return
  }

  // 2. Install if needed
  if (envCheck.status === 'needs_install') {
    statusVocals.value = 'Downloading and installing AI models (This takes a few minutes, please do not close the app)...'
    const installResult = await window.api.installDemucs()
    if (!installResult.success) {
      statusVocals.value = `Install Error: ${installResult.error}`
      return
    }
  }

  // 3. Run the AI Isolation
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
  <img alt="logo" class="logo" src="./assets/electron.svg" />
  <div class="creator">KaraoScore Audio Pipeline</div>
  <div class="text">
    Test phase cancellation and AI source separation
  </div>
  
  <div style="display: flex; justify-content: center; gap: 60px; margin-top: 2rem; width: 100%;">
    <!-- Normal Track -->
    <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
      <h3>Normal Track</h3>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; gap: 5px;">
          <input 
            v-model="urlNormal" 
            placeholder="Enter YouTube URL" 
            style="padding: 10px; width: 200px; border-radius: 5px; border: 1px solid #ccc; background: #2f3241; color: white;" 
          />
          <button @click="downloadAudio('normal')" style="padding: 10px 15px; cursor: pointer;">Download</button>
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
            style="padding: 10px; width: 200px; border-radius: 5px; border: 1px solid #ccc; background: #2f3241; color: white;" 
          />
          <button @click="downloadAudio('instrumental')" style="padding: 10px 15px; cursor: pointer;">Download</button>
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

  <!-- Isolated Vocals Result -->
  <div style="display: flex; flex-direction: column; align-items: center; margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #444; width: 80%;">
    <div style="display: flex; gap: 20px;">
      <button 
        @click="isolateVocalsPhase" 
        :disabled="!audioUrlNormal || !audioUrlInstrumental"
        style="padding: 15px 30px; font-size: 1.1em; font-weight: bold; cursor: pointer; background-color: #4CAF50; color: white; border: none; border-radius: 8px;"
      >
        Isolate Vocals (Phase)
      </button>

      <button 
        @click="isolateVocalsDemucs" 
        :disabled="!audioUrlNormal"
        style="padding: 15px 30px; font-size: 1.1em; font-weight: bold; cursor: pointer; background-color: #9C27B0; color: white; border: none; border-radius: 8px;"
      >
        Isolate Vocals (Demucs AI)
      </button>
    </div>
    <p v-if="statusVocals" style="margin-top: 15px; font-size: 0.95em;">{{ statusVocals }}</p>
    <audio v-if="audioUrlVocals" :src="audioUrlVocals" controls style="margin-top: 15px; width: 400px;"></audio>
  </div>
</template>
