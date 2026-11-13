<script setup lang="ts">
import { ref } from 'vue'
import HomeView from './views/HomeView.vue'
import ImportView from './views/ImportView.vue'

// Navigation state within HomeApp
const currentNav = ref<'home' | 'import' | 'library'>('home')

// Active Song Information
const activeSongTitle = ref('Midnight City')
const activeSongArtist = ref('M83')

// Active Audio Tracks & Recording States
const audioUrlNormal = ref('')
const audioUrlInstrumental = ref('')
const audioUrlVocals = ref('')
const audioUrlRecording = ref('')
const isRecording = ref(false)
</script>

<template>
  <div class="app-shell">
    <!-- Left Sidebar -->
    <aside class="sidebar">
      <!-- App Brand -->
      <div class="brand">
        <div class="brand-badge">KS</div>
        <div>
          <div class="brand-title">KaraoScore</div>
          <div class="brand-subtitle">KARAOKE 1.4</div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="nav-links">
        <button
          class="nav-btn"
          :class="{ active: currentNav === 'home' }"
          @click="currentNav = 'home'"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
          </svg>
          <span>Home</span>
        </button>
        <button
          class="nav-btn"
          :class="{ active: currentNav === 'import' }"
          @click="currentNav = 'import'"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Import</span>
        </button>
        <button
          class="nav-btn"
          :class="{ active: currentNav === 'library' }"
          @click="currentNav = 'library'"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span>Library</span>
        </button>
      </nav>

      <!-- Active Set Box -->
      <div class="active-set">
        <div class="active-set-label">
          <span>NOW SINGING</span>
          <span class="pulse-dot"></span>
        </div>
        <div class="active-set-title">{{ activeSongTitle || 'Midnight City' }}</div>
        <div class="active-set-meta">{{ activeSongArtist || 'M83' }} &bull; 04:03</div>
      </div>

      <div class="sidebar-spacer"></div>

      <!-- Sidebar Footer -->
      <div class="sidebar-footer">
        <button class="footer-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
          <span>Audio settings</span>
        </button>
        <button class="footer-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
          </svg>
          <span>Shortcuts</span>
        </button>
        <div class="device-pill">
          <span class="pulse-dot"></span>
          <span>Scarlett Solo &bull; 48 kHz</span>
        </div>
      </div>
    </aside>

    <!-- Main Workspace Area -->
    <main class="main-content">
      <HomeView
        v-show="currentNav === 'home'"
        :song-title="activeSongTitle"
        :song-artist="activeSongArtist"
        :audio-url-normal="audioUrlNormal"
        :audio-url-instrumental="audioUrlInstrumental"
        :audio-url-vocals="audioUrlVocals"
        :is-recording="isRecording"
        @navigate="currentNav = $event"
      />

      <ImportView
        v-show="currentNav === 'import'"
        v-model:song-title="activeSongTitle"
        v-model:song-artist="activeSongArtist"
        v-model:audio-url-normal="audioUrlNormal"
        v-model:audio-url-instrumental="audioUrlInstrumental"
        v-model:audio-url-vocals="audioUrlVocals"
        v-model:audio-url-recording="audioUrlRecording"
        v-model:is-recording="isRecording"
      />

      <!-- Library View Placeholder -->
      <div v-show="currentNav === 'library'" class="library-placeholder">
        <header class="page-header">
          <div>
            <h1>Library</h1>
            <p class="subtitle">All imported songs and practice recordings</p>
          </div>
        </header>
        <div class="panel placeholder-panel">
          <div class="placeholder-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <h3>Song Library</h3>
          <p>Your library contains your imported tracks. Import a new song or return to Home to start singing.</p>
          <button class="btn btn-primary" @click="currentNav = 'import'">Import a song</button>
        </div>
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
  width: 240px;
  background: #14151b;
  border-right: 1px solid #20222c;
  display: flex;
  flex-direction: column;
  padding: 20px 16px;
  flex-shrink: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
}

.brand-badge {
  width: 28px;
  height: 28px;
  background-color: #ea580c;
  color: #fff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 13px;
}

.brand-title {
  font-weight: 700;
  font-size: 15px;
  color: #fff;
  line-height: 1.1;
}

.brand-subtitle {
  font-size: 9.5px;
  letter-spacing: 0.08em;
  color: #8b92a0;
  font-weight: 600;
}

.nav-links {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  background: transparent;
  border: none;
  color: #8b92a0;
  padding: 9px 12px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.nav-btn:hover {
  background: #1e202a;
  color: #fff;
}

.nav-btn.active {
  background: #1e202a;
  color: #fff;
  font-weight: 600;
}

.active-set {
  margin-top: 24px;
  background: #101116;
  border: 1px solid #20222c;
  border-radius: 6px;
  padding: 12px;
}

.active-set-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 9px;
  letter-spacing: 0.08em;
  color: #6b7280;
  font-weight: 700;
  margin-bottom: 4px;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #ea580c;
}

.active-set-title {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.active-set-meta {
  font-size: 11px;
  color: #8b92a0;
  margin-top: 2px;
}

.sidebar-spacer {
  flex: 1;
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.footer-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  background: transparent;
  border: none;
  color: #8b92a0;
  font-size: 11.5px;
  padding: 5px 8px;
  cursor: pointer;
  border-radius: 4px;
}

.footer-btn:hover {
  color: #fff;
  background: #1a1c24;
}

.device-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #6b7280;
  padding: 6px 8px;
  background: #101116;
  border-radius: 4px;
  border: 1px solid #1a1c24;
}

/* Main Workspace */
.main-content {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* Library Placeholder */
.library-placeholder {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.placeholder-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
  gap: 12px;
}

.placeholder-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: #1e202a;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.placeholder-panel h3 {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.placeholder-panel p {
  font-size: 13px;
  color: #8b92a0;
  max-width: 380px;
  margin: 0 0 8px 0;
}

/* Button Primitives */
.btn {
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  border: none;
  padding: 8px 16px;
  transition: all 0.15s ease;
}

.btn-primary {
  background-color: #ea580c;
  color: #fff;
}

.btn-primary:hover {
  background-color: #f97316;
}

.panel {
  background: #14151b;
  border: 1px solid #20222c;
  border-radius: 8px;
  padding: 18px;
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
</style>
