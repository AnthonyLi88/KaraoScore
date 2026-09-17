<script setup lang="ts">
import { ref } from 'vue'

const urlNormal = ref('')
const statusNormal = ref('')
const audioUrlNormal = ref('')

const urlInstrumental = ref('')
const statusInstrumental = ref('')
const audioUrlInstrumental = ref('')

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
</script>

<template>
  <img alt="logo" class="logo" src="./assets/electron.svg" />

  
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
</template>
