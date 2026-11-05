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
const tracksReadyText = computed(() => {
  const normal = Boolean(props.audioUrlNormal)
  const inst = Boolean(props.audioUrlInstrumental)
  if (normal && inst) return '2/2 TRACKS READY'
  if (normal || inst) return '1/2 TRACK READY'
  return 'NO AUDIO LOADED'
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
          <span class="status-dot"></span>
          <span>MIC READY</span>
        </div>
        </div>
    </header>

    <!-- Hero Card (Continue Singing) -->
    <div class="hero-banner">
      <div class="hero-content">
        <h2>Ready for the next verse?</h2>
        <p class="hero-desc">
          Continue with "{{ songTitle }}" or pick any prepared song from your library. Input monitoring is calibrated.
        </p>
        <div class="hero-actions">
          <button class="btn btn-primary btn-hero">
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

      <!-- Continue Set Card Preview -->
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

    <!-- Bottom 2-Column Section -->
    <div class="home-bottom-grid">
      <!-- Quick Import Action Card -->
      <div class="panel quick-import-panel full-width">
        <div class="import-quick-card" @click="emit('navigate', 'import')">
          <div class="import-quick-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <div class="import-quick-text">
            <span class="quick-title">Import a new song</span>
            <span class="quick-sub">YouTube or local audio</span>
          </div>
          <span class="quick-arrow">&rarr;</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  background-color: #ea580c;
}

.icon-btn {
  background: transparent;
  border: 1px solid #20222c;
  border-radius: 6px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8b92a0;
  cursor: pointer;
}

.avatar-pill {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  background: #1e202a;
  color: #e5e7eb;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
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
  padding: 22px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}

.hero-content {
  flex: 1;
}

.streak-pill {
  font-size: 11px;
  font-weight: 700;
  color: #ea580c;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 6px;
  display: inline-block;
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
  margin: 0 0 18px 0;
  max-width: 480px;
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
  padding: 9px 16px;
}

.btn-hero-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
}

.shortcut-hint {
  font-size: 11px;
  color: #555966;
  font-family: monospace;
  letter-spacing: 0.05em;
  margin-left: 4px;
}

/* Continue Set Card Preview */
.hero-preview-card {
  background: #0f1014;
  border: 1px solid #1e2029;
  border-radius: 8px;
  padding: 16px;
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.preview-badge {
  width: 34px;
  height: 34px;
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
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #ea580c;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.play-target-btn:hover {
  transform: scale(1.05);
}

.target-inner-circle {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #14151b;
}

.waveform-graphic {
  background: #0b0c0f;
  border-radius: 4px;
  padding: 8px 12px;
  height: 48px;
  display: flex;
  align-items: center;
}

.wave-bars {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
}

.wave-bars span {
  width: 3px;
  background: #252834;
  border-radius: 2px;
  display: inline-block;
}

.wave-bars .playhead-bar {
  width: 2px;
  height: 100%;
  background: #ea580c;
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

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.stat-card {
  background: #14151b;
  border: 1px solid #20222c;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.stat-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-wrap.flame {
  background: rgba(234, 88, 12, 0.1);
}

.stat-icon-wrap.chart {
  background: rgba(16, 185, 129, 0.1);
}

.stat-icon-wrap.target {
  background: rgba(96, 165, 250, 0.1);
}

.stat-body {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 10px;
  font-weight: 700;
  color: #6b7280;
  letter-spacing: 0.06em;
}

.stat-val {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin: 2px 0;
}

.stat-sub {
  font-size: 11px;
  color: #8b92a0;
}

/* Home Bottom Grid */
.home-bottom-grid {
  display: flex;
  gap: 16px;
  align-items: stretch;
}

.recent-songs-panel {
  flex: 1.6;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header-row h3 {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 2px 0;
}

.panel-sub {
  font-size: 12px;
  color: #8b92a0;
  margin: 0;
}

.view-library-link {
  font-size: 12px;
  color: #ea580c;
  cursor: pointer;
  font-weight: 600;
  text-decoration: none;
}

.view-library-link:hover {
  text-decoration: underline;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #0f1014;
  border: 1px solid #1e2029;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.recent-item:hover {
  border-color: #2b2e3c;
}

.song-disc-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #181922;
  color: #8b92a0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.song-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.song-name {
  font-size: 13.5px;
  font-weight: 600;
  color: #fff;
}

.song-meta {
  font-size: 11.5px;
  color: #8b92a0;
}

.song-status {
  font-size: 11.5px;
  font-weight: 500;
}

.song-status.ready {
  color: #ea580c;
}

.song-status.needs-vocal {
  color: #f87171;
}

.score-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 44px;
}

.score-number {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.score-label {
  font-size: 8.5px;
  color: #6b7280;
  letter-spacing: 0.08em;
}

.song-play-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid #282a36;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.song-play-btn:hover {
  border-color: #ea580c;
  color: #ea580c;
}

.quick-import-panel {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.import-quick-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #101116;
  border: 1px solid #20222c;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.import-quick-card:hover {
  border-color: #383c4e;
  background: #14151b;
}

.import-quick-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #181922;
  color: #ea580c;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.import-quick-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.quick-title {
  font-size: 12.5px;
  font-weight: 600;
  color: #fff;
}

.quick-sub {
  font-size: 10.5px;
  color: #8b92a0;
}

.quick-arrow {
  color: #6b7280;
  font-size: 14px;
}
</style>
