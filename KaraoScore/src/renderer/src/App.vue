<script setup lang="ts">
import { ref } from 'vue'
import Versions from './components/Versions.vue'

const url = ref('')
const status = ref('')
const audioUrl = ref('')

const downloadAudio = async (): Promise<void> => {
  if (!url.value) return
  status.value = 'Downloading...'
  audioUrl.value = '' // Reset player
  
  const result = await window.api.downloadAudio(url.value)
  if (result.success && result.audioUrl) {
    status.value = 'Success!'
    audioUrl.value = result.audioUrl
  } else {
    status.value = `Error: ${result.error}`
  }
}
</script>

<template>
  <img alt="logo" class="logo" src="./assets/electron.svg" />
  <div class="creator">KaraoScore Backend Test</div>
  <div class="text">
    Test your <span class="vue">yt-dlp</span> audio extraction
  </div>
  
  <div style="margin-top: 2rem; display: flex; flex-direction: column; align-items: center; gap: 10px;">
    <input 
      v-model="url" 
      placeholder="Enter YouTube URL" 
      style="padding: 10px; width: 300px; border-radius: 5px; border: 1px solid #ccc; background: #2f3241; color: white;" 
    />
    <button @click="downloadAudio" style="padding: 10px 20px; cursor: pointer;">Download Audio</button>
    <p v-if="status" style="margin-top: 10px;">{{ status }}</p>
    
    <!-- Audio Player -->
    <audio v-if="audioUrl" :src="audioUrl" controls style="margin-top: 15px; width: 400px;"></audio>
  </div>
  
  <Versions />
</template>
