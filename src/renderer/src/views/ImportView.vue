<script setup lang="ts">
import { ref, computed } from 'vue'
import { calculateVocalScore, type ScoreResult } from '../utils/scoring'

// Synchronized song metadata (2-way bound with App shell)
const songTitle = defineModel<string>('songTitle', { default: 'Midnight City' })
const songArtist = defineModel<string>('songArtist', { default: 'M83' })

const songYear = ref('2011')
const songBpm = ref('105')
const songKey = ref('B minor')

// Track A: Original Song States
const urlNormal = ref('')
const statusNormal = ref('')
const audioUrlNormal = defineModel<string>('audioUrlNormal', { default: '' })
const normalFileName = ref('')
const tabNormal = ref<'url' | 'file'>('url')

// Track B: Instrumental States
const urlInstrumental = ref('')
const statusInstrumental = ref('')
const audioUrlInstrumental = defineModel<string>('audioUrlInstrumental', { default: '' })
const instrumentalFileName = ref('')
const tabInstrumental = ref<'url' | 'file' | 'demucs'>('file')
const isExtractingDemucs = ref(false)

// Track C: Microphone Recording / Singer Input States
const isRecording = defineModel<boolean>('isRecording', { default: false })
const recordingDuration = ref(0)
const statusRecording = ref('')
const audioUrlRecording = defineModel<string>('audioUrlRecording', { default: '' })
const recordingFileName = ref('')
const tabSinger = ref<'record' | 'file'>('record')
const playBackingWhileRecording = ref(true)

// Vocal Isolation States
const statusVocals = ref('')
const audioUrlVocals = defineModel<string>('audioUrlVocals', { default: '' })

// Rudimentary Vocal Scoring States
const isCalculatingScore = ref(false)
const scoreError = ref('')
const scoreResult = ref<ScoreResult | null>(null)

// Gate scoring until both isolated vocals and singer vocals are available
const canScore = computed(() => {
  return Boolean(audioUrlVocals.value && audioUrlRecording.value)
})

const calculateScore = async () => {
  if (!canScore.value || !audioUrlVocals.value || !audioUrlRecording.value) return

  isCalculatingScore.value = true
  scoreError.value = ''
  try {
    const result = await calculateVocalScore(audioUrlVocals.value, audioUrlRecording.value)
    scoreResult.value = result
  } catch (err: any) {
    console.error('Scoring error:', err)
    scoreError.value = err.message || 'Failed to analyze vocal audio.'
  } finally {
    isCalculatingScore.value = false
  }
}

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
    scoreResult.value = null

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
      alert('Microphone access was denied. Please allow microphone access in Settings > Privacy > Microphone.')
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

// File Selection Handler
const onFileSelected = (event: Event, type: 'normal' | 'instrumental' | 'recording') => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (type === 'normal') {
    normalFileName.value = file.name
  } else if (type === 'instrumental') {
    instrumentalFileName.value = file.name
  } else if (type === 'recording') {
    recordingFileName.value = file.name
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

const handleFileUpload = async (event: Event, type: 'normal' | 'instrumental' | 'recording') => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (type === 'normal') {
    statusNormal.value = `Normalizing: ${file.name}...`
    audioUrlNormal.value = ''
  } else if (type === 'instrumental') {
    statusInstrumental.value = `Normalizing: ${file.name}...`
    audioUrlInstrumental.value = ''
  } else if (type === 'recording') {
    statusRecording.value = `Loading: ${file.name}...`
    audioUrlRecording.value = ''
    scoreResult.value = null
  }

  const result = await window.api.normalizeAudio(file, type)

  if (type === 'normal') {
    if (result.success && result.audioUrl) {
      statusNormal.value = 'Ready'
      audioUrlNormal.value = result.audioUrl
    } else {
      statusNormal.value = `Error: ${result.error}`
    }
  } else if (type === 'instrumental') {
    if (result.success && result.audioUrl) {
      statusInstrumental.value = 'Ready'
      audioUrlInstrumental.value = result.audioUrl
    } else {
      statusInstrumental.value = `Error: ${result.error}`
    }
  } else if (type === 'recording') {
    if (result.success && result.audioUrl) {
      statusRecording.value = `Ready (${file.name})`
      audioUrlRecording.value = result.audioUrl
    } else {
      statusRecording.value = `Error: ${result.error}`
    }
  }
}

const isolateVocalsPhase = async () => {
  statusVocals.value = 'Isolating vocals via Phase Cancellation...'
  audioUrlVocals.value = ''
  scoreResult.value = null
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
  scoreResult.value = null
  const result = await window.api.isolateVocalsDemucs('normal')
  if (result.success && result.audioUrl) {
    statusVocals.value = 'Success (Demucs AI)!'
    audioUrlVocals.value = result.audioUrl

    // If Track B is set to Demucs AI or has no instrumental yet, populate it from Demucs output!
    if ((tabInstrumental.value === 'demucs' || !audioUrlInstrumental.value) && result.instrumentalUrl) {
      statusInstrumental.value = 'Ready (Demucs AI)'
      audioUrlInstrumental.value = result.instrumentalUrl
      instrumentalFileName.value = 'Demucs Instrumental (AI)'
    }
  } else {
    statusVocals.value = `Error: ${result.error}`
  }
}

const extractInstrumentalDemucs = async () => {
  if (!audioUrlNormal.value) return

  statusInstrumental.value = 'Checking AI dependencies...'
  const envCheck = await window.api.checkDemucsEnv()

  if (envCheck.status === 'missing_python') {
    statusInstrumental.value = 'Error: Python 3 is required!'
    alert('Python 3 is required to use Demucs AI. Please install it from python.org, then try again.')
    return
  }

  if (envCheck.status === 'needs_install') {
    statusInstrumental.value = 'Installing AI models (please wait)...'
    const installResult = await window.api.installDemucs()
    if (!installResult.success) {
      statusInstrumental.value = `Install Error: ${installResult.error}`
      return
    }
  }

  isExtractingDemucs.value = true
  statusInstrumental.value = 'Separating instrumental via Demucs AI (takes a moment)...'
  audioUrlInstrumental.value = ''

  const result = await window.api.isolateVocalsDemucs('normal')
  isExtractingDemucs.value = false

  if (result.success && result.instrumentalUrl) {
    statusInstrumental.value = 'Ready (Demucs AI)'
    audioUrlInstrumental.value = result.instrumentalUrl
    instrumentalFileName.value = 'Demucs Instrumental (AI)'

    // Demucs separates both vocals and backing track at the same time
    if (!audioUrlVocals.value && result.audioUrl) {
      audioUrlVocals.value = result.audioUrl
      statusVocals.value = 'Success (Demucs AI)!'
    }
  } else {
    statusInstrumental.value = `Error: ${result.error || 'Failed to extract instrumental'}`
  }
}
</script>

<template>
  <div class="import-view">
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

          <!-- Tabs: URL vs File vs Demucs AI -->
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
            <button
              class="tab"
              :class="{ active: tabInstrumental === 'demucs' }"
              @click="tabInstrumental = 'demucs'"
            >
              Demucs AI
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
          <div v-else-if="tabInstrumental === 'file'" class="input-action-row">
            <input
              type="file"
              accept="audio/*"
              class="file-input"
              @change="(e) => onFileSelected(e, 'instrumental')"
            />
          </div>

          <!-- Demucs AI Extraction Option -->
          <div v-else-if="tabInstrumental === 'demucs'" class="demucs-track-action">
            <div v-if="!audioUrlNormal" class="demucs-hint">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>Load <strong>Track A (Original song)</strong> first to extract the instrumental using Demucs AI.</span>
            </div>
            <div v-else class="demucs-ready-row">
              <button
                class="btn btn-isolate demucs"
                :disabled="isExtractingDemucs"
                @click="extractInstrumentalDemucs"
              >
                <span v-if="isExtractingDemucs">Extracting Instrumental (AI)...</span>
                <span v-else>{{ audioUrlInstrumental && instrumentalFileName === 'Demucs Instrumental (AI)' ? 'Re-extract Instrumental with Demucs' : 'Separate Instrumental with Demucs' }}</span>
              </button>
              <span class="demucs-note">Uses AI to separate backing music from Track A</span>
            </div>
          </div>

          <!-- Audio Player -->
          <div v-if="audioUrlInstrumental" class="player-wrap">
            <span v-if="tabInstrumental === 'demucs'" class="preview-tag">Demucs Instrumental:</span>
            <audio :src="audioUrlInstrumental" controls class="audio-control"></audio>
          </div>
        </div>

        <!-- Vocal Isolation & Actions -->
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

        <!-- Track C: Singer's Vocal Input -->
        <div class="panel track-panel" :class="{ 'track-locked': !canRecord }">
          <div class="track-header">
            <span class="tag-letter recording-badge" :class="{ 'is-live': isRecording, 'is-locked': !canRecord }">C</span>
            <div class="track-info">
              <h3>Singer's vocal input</h3>
              <p v-if="canRecord">Record through your mic or upload an audio file to test singing and scoring.</p>
              <p v-else class="lock-msg">
                Locked &bull; Requires {{ missingRequirements.join(', ') }}
              </p>
            </div>
            <span v-if="statusRecording" class="track-status" :class="{ 'recording-active': isRecording }">
              {{ statusRecording }}
            </span>
          </div>

          <!-- Tabs: Record from mic vs Local file -->
          <div class="tabs">
            <button
              class="tab"
              :class="{ active: tabSinger === 'record' }"
              :disabled="!canRecord"
              @click="tabSinger = 'record'"
            >
              Record from mic
            </button>
            <button
              class="tab"
              :class="{ active: tabSinger === 'file' }"
              :disabled="!canRecord"
              @click="tabSinger = 'file'"
            >
              Local file
            </button>
          </div>

          <!-- Record Tab Content -->
          <div v-if="tabSinger === 'record'" class="record-action-row">
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

          <!-- Local File Tab Content -->
          <div v-else class="input-action-row">
            <input
              type="file"
              accept="audio/*"
              class="file-input"
              :disabled="!canRecord"
              @change="(e) => onFileSelected(e, 'recording')"
            />
          </div>

          <!-- Audio Player Preview for Recording or Uploaded Audio -->
          <div v-if="audioUrlRecording" class="player-wrap">
            <span class="preview-tag">{{ tabSinger === 'file' ? 'Singer audio preview:' : 'Take preview:' }}</span>
            <audio :src="audioUrlRecording" controls class="audio-control"></audio>
          </div>
        </div>

        <!-- Section: Vocal Performance Score -->
        <div class="panel scoring-panel" :class="{ 'track-locked': !canScore }">
          <div class="track-header">
            <span
              class="tag-letter score-badge"
              :class="{ 'score-ready': canScore && !isCalculatingScore, 'score-active': isCalculatingScore, 'score-locked': !canScore }"
            >
              ★
            </span>
            <div class="track-info">
              <h3>Vocal performance score</h3>
              <p v-if="canScore">Compare your vocals with the isolated guide vocals to evaluate pitch, rhythm, and accuracy.</p>
              <p v-else class="lock-msg">
                Locked &bull; Requires Isolated vocals and Singer's vocal input
              </p>
            </div>
            <span v-if="isCalculatingScore" class="track-status score-evaluating">
              Analyzing pitch...
            </span>
            <span v-else-if="scoreResult" class="grade-pill" :class="'grade-' + scoreResult.grade.toLowerCase()">
              Grade {{ scoreResult.grade }} &bull; {{ scoreResult.overallScore }}%
            </span>
          </div>

          <!-- Scoring Action Row -->
          <div class="scoring-action-row">
            <button
              class="btn btn-score"
              :disabled="!canScore || isCalculatingScore"
              @click="calculateScore"
            >
              <span v-if="isCalculatingScore">Analyzing Pitch &amp; Timing...</span>
              <span v-else-if="scoreResult">Recalculate Score</span>
              <span v-else>Evaluate &amp; Score Vocals</span>
            </button>
            <span v-if="canScore && !scoreResult && !isCalculatingScore" class="score-ready-hint">
              Both vocal tracks ready &bull; Click to score performance
            </span>
          </div>

          <!-- Error notice -->
          <div v-if="scoreError" class="status-msg score-error">
            {{ scoreError }}
          </div>

          <!-- Score Card Display -->
          <div v-if="scoreResult" class="score-card">
            <!-- Top Hero Row: Grade Badge + Score Circle/Meter -->
            <div class="score-hero">
              <div class="grade-circle" :class="'grade-' + scoreResult.grade.toLowerCase()">
                <div class="grade-letter">{{ scoreResult.grade }}</div>
                <div class="grade-subtext">GRADE</div>
              </div>

              <div class="score-main-stats">
                <div class="score-number-row">
                  <span class="score-big-num">{{ scoreResult.overallScore }}</span>
                  <span class="score-denom">/ 100</span>
                </div>
                <!-- Main Progress Bar -->
                <div class="score-bar-track">
                  <div
                    class="score-bar-fill"
                    :style="{ width: scoreResult.overallScore + '%' }"
                    :class="'fill-' + scoreResult.grade.toLowerCase()"
                  ></div>
                </div>
                <p class="score-feedback-text">{{ scoreResult.feedback }}</p>
              </div>
            </div>

            <!-- Metric Breakdown Grid -->
            <div class="score-metrics-grid">
              <!-- Pitch Accuracy -->
              <div class="metric-box">
                <div class="metric-label-row">
                  <span>Pitch Accuracy</span>
                  <span class="metric-val">{{ scoreResult.pitchScore }}%</span>
                </div>
                <div class="metric-track">
                  <div class="metric-fill pitch-fill" :style="{ width: scoreResult.pitchScore + '%' }"></div>
                </div>
                <span class="metric-desc">Melody semitone precision</span>
              </div>

              <!-- Rhythm & Timing -->
              <div class="metric-box">
                <div class="metric-label-row">
                  <span>Rhythm &amp; Timing</span>
                  <span class="metric-val">{{ scoreResult.timingScore }}%</span>
                </div>
                <div class="metric-track">
                  <div class="metric-fill timing-fill" :style="{ width: scoreResult.timingScore + '%' }"></div>
                </div>
                <span class="metric-desc">Phrase entrance and sustain</span>
              </div>

              <!-- Notes Breakdown -->
              <div class="metric-box">
                <div class="metric-label-row">
                  <span>Notes Hit</span>
                  <span class="metric-val">{{ scoreResult.details.perfectPercent + scoreResult.details.goodPercent }}%</span>
                </div>
                <div class="stacked-bar">
                  <div class="bar-perfect" :style="{ width: scoreResult.details.perfectPercent + '%' }" title="Perfect"></div>
                  <div class="bar-good" :style="{ width: scoreResult.details.goodPercent + '%' }" title="Good"></div>
                  <div class="bar-miss" :style="{ width: scoreResult.details.missPercent + '%' }" title="Miss"></div>
                </div>
                <div class="legend-row">
                  <span class="leg-item"><i class="leg-dot dot-perfect"></i> Perfect {{ scoreResult.details.perfectPercent }}%</span>
                  <span class="leg-item"><i class="leg-dot dot-good"></i> Good {{ scoreResult.details.goodPercent }}%</span>
                  <span class="leg-item"><i class="leg-dot dot-miss"></i> Miss {{ scoreResult.details.missPercent }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.import-view {
  display: flex;
  flex-direction: column;
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
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

/* Buttons and Panels */
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

.step-item.active {
  color: #ea580c;
  font-weight: 600;
}

.step-item.done {
  color: #e5e7eb;
}

.step-divider {
  color: #383c4e;
}

/* 2-Column Grid */
.grid-container {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

/* Left Panel: Song Details */
.song-panel {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title-row h2 {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.badge-accent {
  font-size: 10px;
  font-weight: 600;
  background: #2b1713;
  color: #ea580c;
  padding: 2px 7px;
  border-radius: 4px;
  letter-spacing: 0.04em;
}

.artwork-card {
  height: 120px;
  background: #0f1014;
  border: 1px dashed #20222c;
  border-radius: 6px;
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
  gap: 10px;
}

.form-row .form-group {
  flex: 1;
}

.info-note {
  font-size: 11px;
  color: #6b7280;
  line-height: 1.4;
  margin-top: 4px;
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

.tab:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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

.player-wrap {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-tag {
  font-size: 11px;
  font-weight: 600;
  color: #ea580c;
}

.audio-control {
  width: 100%;
  height: 36px;
}

/* Actions Panel */
.actions-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.actions-left {
  flex: 1;
}

.actions-left h3 {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 2px 0;
}

.desc-text {
  font-size: 12px;
  color: #8b92a0;
  margin: 0 0 10px 0;
}

.isolation-btn-row {
  display: flex;
  gap: 10px;
  margin-bottom: 6px;
}

.btn-isolate {
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 5px;
  cursor: pointer;
  border: 1px solid #2d3140;
  background: #191b22;
  color: #e5e7eb;
}

.btn-isolate:hover:not(:disabled) {
  background: #252834;
  border-color: #ea580c;
}

.btn-isolate:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-isolate.demucs {
  border-color: #ea580c;
  color: #ea580c;
  background: #231612;
}

.btn-isolate.demucs:hover:not(:disabled) {
  background: #331e17;
}

/* Demucs Option inside Track B */
.demucs-track-action {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
}

.demucs-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  color: #f59e0b;
}

.demucs-ready-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.demucs-note {
  font-size: 11.5px;
  color: #8b92a0;
}

.status-msg {
  font-size: 11.5px;
  color: #ea580c;
  margin-top: 4px;
}

.actions-right {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 130px;
}

.actions-right .btn {
  padding: 9px 16px;
  text-align: center;
}

/* Recording Track Styles */
.record-action-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.btn-record {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #1c1d24;
  border: 1px solid #323544;
  color: #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 12px;
  transition: all 0.2s ease;
}

.btn-record:hover:not(:disabled) {
  background: #282a36;
  border-color: #ef4444;
  color: #fff;
}

.btn-record .rec-icon {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  display: inline-block;
  transition: transform 0.2s;
}

.btn-record.recording {
  background: #3b1717;
  border-color: #ef4444;
  color: #fca5a5;
}

.btn-record.recording .rec-icon {
  border-radius: 2px;
  animation: rec-pulse 1s infinite;
}

.recording-dot {
  background: #ef4444 !important;
  box-shadow: 0 0 8px #ef4444 !important;
  animation: rec-pulse 1s infinite;
}

.recording-badge.is-live {
  background: #ef4444 !important;
  color: #fff !important;
  animation: rec-pulse 1s infinite;
}

.recording-active {
  color: #ef4444 !important;
  font-weight: 600;
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

/* Vocal Performance Scoring Styles */
.scoring-panel {
  border-color: #272a39;
}

.score-badge {
  font-size: 13px !important;
  background: #2b1f13 !important;
  color: #f59e0b !important;
}

.score-badge.score-ready {
  background: #3b2810 !important;
  color: #fbbf24 !important;
  border: 1px solid #784812;
}

.score-badge.score-active {
  background: #ea580c !important;
  color: #fff !important;
  animation: rec-pulse 0.9s infinite ease-in-out;
}

.score-badge.score-locked {
  background: #1a1c24 !important;
  color: #6b7280 !important;
}

.score-evaluating {
  color: #f59e0b !important;
  font-weight: 600;
  animation: rec-pulse 1s infinite ease-in-out;
}

.scoring-action-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.btn-score {
  background: linear-gradient(135deg, #ea580c, #c2410c);
  color: #ffffff;
  padding: 8px 18px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(234, 88, 12, 0.25);
}

.btn-score:hover:not(:disabled) {
  background: linear-gradient(135deg, #f97316, #ea580c);
  box-shadow: 0 4px 12px rgba(234, 88, 12, 0.4);
}

.btn-score:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  box-shadow: none;
}

.score-ready-hint {
  font-size: 11.5px;
  color: #10b981;
  font-weight: 500;
}

.score-error {
  color: #ef4444 !important;
  margin-top: 6px;
}

.grade-pill {
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.grade-pill.grade-s {
  background: #2e2410;
  color: #fbbf24;
  border: 1px solid #784f10;
}

.grade-pill.grade-a {
  background: #112c22;
  color: #34d399;
  border: 1px solid #16654a;
}

.grade-pill.grade-b {
  background: #102636;
  color: #38bdf8;
  border: 1px solid #164f73;
}

.grade-pill.grade-c {
  background: #2b1b13;
  color: #fb923c;
  border: 1px solid #783515;
}

.grade-pill.grade-d {
  background: #2d1418;
  color: #f87171;
  border: 1px solid #7f1d2d;
}

/* Score Card Container */
.score-card {
  margin-top: 14px;
  background: #0f1016;
  border: 1px solid #232635;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.score-hero {
  display: flex;
  align-items: center;
  gap: 18px;
}

.grade-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid;
}

.grade-circle.grade-s {
  background: radial-gradient(circle, #382c12 0%, #171308 100%);
  border-color: #fbbf24;
  color: #fbbf24;
  box-shadow: 0 0 16px rgba(251, 191, 36, 0.25);
}

.grade-circle.grade-a {
  background: radial-gradient(circle, #133327 0%, #081611 100%);
  border-color: #34d399;
  color: #34d399;
  box-shadow: 0 0 16px rgba(52, 211, 153, 0.25);
}

.grade-circle.grade-b {
  background: radial-gradient(circle, #122b3d 0%, #07131b 100%);
  border-color: #38bdf8;
  color: #38bdf8;
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.25);
}

.grade-circle.grade-c {
  background: radial-gradient(circle, #331f16 0%, #170d08 100%);
  border-color: #fb923c;
  color: #fb923c;
  box-shadow: 0 0 16px rgba(251, 146, 60, 0.25);
}

.grade-circle.grade-d {
  background: radial-gradient(circle, #36171c 0%, #17080a 100%);
  border-color: #f87171;
  color: #f87171;
  box-shadow: 0 0 16px rgba(248, 113, 113, 0.25);
}

.grade-letter {
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
}

.grade-subtext {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  opacity: 0.8;
  margin-top: 1px;
}

.score-main-stats {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.score-number-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.score-big-num {
  font-size: 28px;
  font-weight: 800;
  color: #fff;
  line-height: 1;
}

.score-denom {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.score-bar-track {
  height: 8px;
  width: 100%;
  background: #1a1c26;
  border-radius: 4px;
  overflow: hidden;
}

.score-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.score-bar-fill.fill-s {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.score-bar-fill.fill-a {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.score-bar-fill.fill-b {
  background: linear-gradient(90deg, #0284c7, #38bdf8);
}

.score-bar-fill.fill-c {
  background: linear-gradient(90deg, #ea580c, #fb923c);
}

.score-bar-fill.fill-d {
  background: linear-gradient(90deg, #dc2626, #f87171);
}

.score-feedback-text {
  font-size: 12.5px;
  color: #d1d5db;
  margin: 2px 0 0 0;
  line-height: 1.4;
}

.score-metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  border-top: 1px solid #1c1e29;
  padding-top: 14px;
}

.metric-box {
  background: #14151e;
  border: 1px solid #20222f;
  border-radius: 6px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.metric-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11.5px;
  color: #9ca3af;
  font-weight: 500;
}

.metric-val {
  font-weight: 700;
  color: #fff;
}

.metric-track {
  height: 6px;
  width: 100%;
  background: #1f212f;
  border-radius: 3px;
  overflow: hidden;
}

.metric-fill.pitch-fill {
  height: 100%;
  background: #ea580c;
  border-radius: 3px;
}

.metric-fill.timing-fill {
  height: 100%;
  background: #38bdf8;
  border-radius: 3px;
}

.metric-desc {
  font-size: 10.5px;
  color: #6b7280;
}

.stacked-bar {
  height: 6px;
  width: 100%;
  display: flex;
  border-radius: 3px;
  overflow: hidden;
  background: #1f212f;
}

.bar-perfect {
  background: #10b981;
}

.bar-good {
  background: #38bdf8;
}

.bar-miss {
  background: #ef4444;
}

.legend-row {
  display: flex;
  gap: 8px;
  font-size: 10px;
  color: #8b92a0;
  flex-wrap: wrap;
  margin-top: 2px;
}

.leg-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.leg-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.dot-perfect {
  background: #10b981;
}

.dot-good {
  background: #38bdf8;
}

.dot-miss {
  background: #ef4444;
}
</style>
