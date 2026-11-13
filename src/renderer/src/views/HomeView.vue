<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    songTitle?: string
    songArtist?: string
    audioUrlNormal?: string
    audioUrlInstrumental?: string
    audioUrlVocals?: string
    isRecording?: boolean
  }>(),
  {
    songTitle: 'Midnight City',
    songArtist: 'M83',
    audioUrlNormal: '',
    audioUrlInstrumental: '',
    audioUrlVocals: '',
    isRecording: false
  }
)

const emit = defineEmits<{
  (e: 'navigate', tab: 'home' | 'import' | 'library'): void
}>()

// Track Readiness Computation
const canRecord = computed(() => {
  return Boolean(props.audioUrlNormal && props.audioUrlInstrumental && props.audioUrlVocals)
})

const tracksReadyText = computed(() => {
  const normal = Boolean(props.audioUrlNormal)
  const inst = Boolean(props.audioUrlInstrumental)
  if (normal && inst) return '2/2 TRACKS READY'
  if (normal || inst) return '1/2 TRACK READY'
  return 'NO AUDIO LOADED'
})

// Dynamic Microphone & Audio Readiness Status
const headerStatus = computed(() => {
  if (props.isRecording) {
    return { text: 'RECORDING ACTIVE', dotClass: 'recording-dot' }
  }
  if (canRecord.value) {
    return { text: 'MIC READY', dotClass: 'ready-dot' }
  }
  return { text: 'MIC STANDBY', dotClass: 'standby-dot' }
})

// Audio Playback State for Continue Set Card
const audioElem = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)

const activeAudioSrc = computed(() => {
  return props.audioUrlInstrumental || props.audioUrlNormal || ''
})

const formatTimer = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return '00:00'
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const progressPercent = computed(() => {
  if (!duration.value || duration.value === 0) return 0
  return Math.min(100, (currentTime.value / duration.value) * 100)
})

const togglePlay = () => {
  if (!activeAudioSrc.value) {
    // If no audio loaded, navigate user to import workspace
    emit('navigate', 'import')
    return
  }

  if (!audioElem.value) {
    audioElem.value = new Audio(activeAudioSrc.value)
    audioElem.value.ontimeupdate = () => {
      if (audioElem.value) {
        currentTime.value = audioElem.value.currentTime
      }
    }
    audioElem.value.onloadedmetadata = () => {
      if (audioElem.value) {
        duration.value = audioElem.value.duration
      }
    }
    audioElem.value.onended = () => {
      isPlaying.value = false
      currentTime.value = 0
    }
  }

  if (isPlaying.value) {
    audioElem.value.pause()
    isPlaying.value = false
  } else {
    audioElem.value.play().then(() => {
      isPlaying.value = true
    }).catch((err) => {
      console.warn('Playback error:', err)
      isPlaying.value = false
    })
  }
}

const seek = (event: MouseEvent) => {
  if (!audioElem.value || !duration.value) return
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const ratio = Math.max(0, Math.min(1, clickX / rect.width))
  audioElem.value.currentTime = ratio * duration.value
  currentTime.value = audioElem.value.currentTime
}

// Watch for audio source updates
watch(activeAudioSrc, (newSrc) => {
  if (audioElem.value) {
    audioElem.value.pause()
    isPlaying.value = false
    currentTime.value = 0
    if (newSrc) {
      audioElem.value.src = newSrc
      audioElem.value.load()
    }
  }
})

onUnmounted(() => {
  if (audioElem.value) {
    audioElem.value.pause()
    audioElem.value = null
  }
})
</script>

<template>
  <div class="home-view">
    <!-- Home Header -->
    <header class="page-header">
      <div>
        <h1>Home</h1>
        <p class="subtitle">{{ songTitle }} &bull; {{ songArtist }}</p>
      </div>
      <div class="header-actions">
        <div class="header-status">
          <span class="status-dot" :class="headerStatus.dotClass"></span>
          <span>{{ headerStatus.text }}</span>
        </div>
      </div>
    </header>

    <!-- Hero Card (Continue Singing) -->
    <div class="hero-banner">
      <div class="hero-content">
        <h2>Ready for the next verse?</h2>
        <p class="hero-desc">
          Continue singing "{{ songTitle }}" or import a new song from YouTube or local audio to split stems and practice.
        </p>
        <div class="hero-actions">
          <button class="btn btn-primary btn-hero" @click="emit('navigate', 'import')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
            <span>Start singing</span>
          </button>
          <button class="btn btn-secondary btn-hero-secondary" @click="emit('navigate', 'import')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            <span>Choose another song</span>
          </button>
        </div>
      </div>

      <!-- Continue Set Card Preview (Fully Functional) -->
      <div class="hero-preview-card">
        <div class="preview-header">
          <div class="preview-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round">
              <path d="M4 12v1M8 8v9M12 4v16M16 9v7M20 11v3" />
            </svg>
          </div>
          <div class="preview-titles">
            <span class="preview-tag">CONTINUE SET</span>
            <h4>{{ songTitle }}</h4>
            <span class="preview-sub">{{ songArtist }}</span>
          </div>
          <button class="play-target-btn" :title="isPlaying ? 'Pause' : 'Play Track'" @click="togglePlay">
            <svg v-if="!isPlaying" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
          </button>
        </div>

        <!-- Real Audio Playback Progress Bar -->
        <div class="playback-container" @click="seek" title="Seek playback">
          <div class="playback-bar">
            <div class="playback-progress" :style="{ width: progressPercent + '%' }"></div>
          </div>
        </div>

        <div class="preview-footer">
          <span class="time-readout">{{ formatTimer(currentTime) }} / {{ formatTimer(duration) }}</span>
          <span class="tracks-ready-tag">{{ tracksReadyText }}</span>
        </div>
      </div>
    </div>

    <!-- Quick Functional Feature Actions -->
    <div class="quick-actions-grid">
      <!-- Import Song Action Card -->
      <div class="panel action-card" @click="emit('navigate', 'import')">
        <div class="action-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <div class="action-content">
          <h3>Import Song Sources</h3>
          <p>Download from YouTube or import local audio files to automatically prepare tracks.</p>
        </div>
        <span class="action-arrow">&rarr;</span>
      </div>

      <!-- Vocal Isolation Action Card -->
      <div class="panel action-card" @click="emit('navigate', 'import')">
        <div class="action-icon isolation">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
          </svg>
        </div>
        <div class="action-content">
          <h3>Vocal Isolation</h3>
          <p>Extract instrumental and vocal stems using Demucs AI or Phase Cancellation.</p>
        </div>
        <span class="action-arrow">&rarr;</span>
      </div>

      <!-- Microphone Recording Action Card -->
      <div class="panel action-card" @click="emit('navigate', 'import')">
        <div class="action-icon mic">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </div>
        <div class="action-content">
          <h3>Sing &amp; Record</h3>
          <p>Sing through your microphone with real-time backing instrumental playback.</p>
        </div>
        <span class="action-arrow">&rarr;</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
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
}

.ready-dot {
  background-color: #ea580c;
}

.standby-dot {
  background-color: #4b5563;
}

.recording-dot {
  background-color: #ef4444;
  box-shadow: 0 0 8px #ef4444;
  animation: pulse-dot 1s infinite;
}

@keyframes pulse-dot {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

/* Button & Panel primitives */
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

/* Hero Banner */
.hero-banner {
  background: #14151b;
  border: 1px solid #20222c;
  border-radius: 8px;
  padding: 24px 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 28px;
}

.hero-content {
  flex: 1;
}

.hero-content h2 {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 8px 0;
}

.hero-desc {
  font-size: 13px;
  color: #8b92a0;
  margin: 0 0 20px 0;
  max-width: 500px;
  line-height: 1.5;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-hero {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
}

.btn-hero-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
}

/* Continue Set Card Preview */
.hero-preview-card {
  background: #0f1014;
  border: 1px solid #1e2029;
  border-radius: 8px;
  padding: 18px;
  width: 330px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.preview-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.preview-badge {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: #1c1514;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.preview-titles {
  flex: 1;
}

.preview-tag {
  font-size: 9px;
  color: #ea580c;
  font-weight: 700;
  letter-spacing: 0.08em;
  display: block;
  margin-bottom: 2px;
}

.preview-titles h4 {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 2px 0;
}

.preview-sub {
  font-size: 11px;
  color: #8b92a0;
  display: block;
}

.play-target-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #ea580c;
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.15s ease, background-color 0.15s ease;
}

.play-target-btn:hover {
  transform: scale(1.08);
  background: #f97316;
}

/* Playback Progress Container */
.playback-container {
  cursor: pointer;
  padding: 4px 0;
}

.playback-bar {
  width: 100%;
  height: 6px;
  background: #1e2029;
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.playback-progress {
  height: 100%;
  background: #ea580c;
  border-radius: 3px;
  transition: width 0.1s linear;
}

.preview-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}

.time-readout {
  color: #6b7280;
  font-family: monospace;
}

.tracks-ready-tag {
  color: #ea580c;
  font-weight: 700;
  letter-spacing: 0.06em;
  font-size: 10px;
}

/* Quick Functional Feature Actions */
.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-card:hover {
  border-color: #383c4e;
  background: #171922;
  transform: translateY(-1px);
}

.action-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(234, 88, 12, 0.1);
  color: #ea580c;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-icon.isolation {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.action-icon.mic {
  background: rgba(96, 165, 250, 0.1);
  color: #60a5fa;
}

.action-content {
  flex: 1;
}

.action-content h3 {
  font-size: 13.5px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 3px 0;
}

.action-content p {
  font-size: 11.5px;
  color: #8b92a0;
  margin: 0;
  line-height: 1.4;
}

.action-arrow {
  color: #6b7280;
  font-size: 16px;
  transition: transform 0.15s ease, color 0.15s ease;
}

.action-card:hover .action-arrow {
  color: #ea580c;
  transform: translateX(3px);
}
</style>
