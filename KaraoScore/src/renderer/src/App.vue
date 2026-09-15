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
</script>

<template>
  <img alt="logo" class="logo" src="./assets/electron.svg" />
  <div class="creator">KaraoScore Backend Test</div>
  <div class="text">
    Test your <span class="vue">yt-dlp</span> audio extraction
  </div>
  
  <div style="display: flex; justify-content: center; gap: 60px; margin-top: 2rem; width: 100%;">
    <!-- Normal Track -->
    <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
      <h3>Normal Track</h3>
      <input 
        v-model="urlNormal" 
        placeholder="Enter YouTube URL" 
        style="padding: 10px; width: 300px; border-radius: 5px; border: 1px solid #ccc; background: #2f3241; color: white;" 
      />
      <button @click="downloadAudio('normal')" style="padding: 10px 20px; cursor: pointer;">Download Audio</button>
      <p v-if="statusNormal" style="margin-top: 10px;">{{ statusNormal }}</p>
      <audio v-if="audioUrlNormal" :src="audioUrlNormal" controls style="margin-top: 15px; width: 300px;"></audio>
    </div>

    <!-- Instrumental Track -->
    <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
      <h3>Instrumental Track</h3>
      <input 
        v-model="urlInstrumental" 
        placeholder="Enter YouTube URL" 
        style="padding: 10px; width: 300px; border-radius: 5px; border: 1px solid #ccc; background: #2f3241; color: white;" 
      />
      <button @click="downloadAudio('instrumental')" style="padding: 10px 20px; cursor: pointer;">Download Audio</button>
      <p v-if="statusInstrumental" style="margin-top: 10px;">{{ statusInstrumental }}</p>
      <audio v-if="audioUrlInstrumental" :src="audioUrlInstrumental" controls style="margin-top: 15px; width: 300px;"></audio>
    </div>
  </div>
</template>
