<script setup lang="ts">
import { ref } from 'vue'
import { PhFolderOpen, PhCheck } from '@phosphor-icons/vue'
import type { SettingsState } from './types'

defineProps<{
  settings: SettingsState
}>()

const browseFeedback = ref(false)

function handleBrowse(): void {
  browseFeedback.value = true
  setTimeout(() => {
    browseFeedback.value = false
  }, 2000)
}
</script>

<template>
  <div class="tab-panel">
    <!-- Visual Theme Selection -->
    <div class="setting-item">
      <div class="setting-text">
        <label for="theme-select">Interface Theme</label>
        <span class="setting-desc">Color palette and contrast mode for application surfaces</span>
      </div>
      <div class="setting-control">
        <select id="theme-select" v-model="settings.theme" class="custom-select">
          <option value="KaraoDark (Default)">KaraoDark (Default)</option>
          <option value="OLED Pure Black">OLED Pure Black</option>
          <option value="High Contrast Studio">High Contrast Studio</option>
        </select>
      </div>
    </div>

    <!-- Waveform Refresh Rate -->
    <div class="setting-item">
      <div class="setting-text">
        <label for="waveform-fps">Audio Waveform Render Rate</label>
        <span class="setting-desc">Display frame rate for live rehearsal pitch line and playback scrubber</span>
      </div>
      <div class="setting-control">
        <select id="waveform-fps" v-model="settings.waveformFps" class="custom-select">
          <option value="60 FPS (Ultra Smooth)">60 FPS (Ultra Smooth)</option>
          <option value="30 FPS (Power Saver)">30 FPS (Power Saver)</option>
        </select>
      </div>
    </div>

    <!-- Auto-Save Practice Runs -->
    <div class="setting-item">
      <div class="setting-text">
        <label>Auto-Save Recorded Takes</label>
        <span class="setting-desc">Preserve microphone recordings in local cache after scoring finishes</span>
      </div>
      <div class="setting-control">
        <label class="toggle-switch">
          <input v-model="settings.autoSaveRecordings" type="checkbox" />
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <!-- Storage Folder Path -->
    <div class="setting-item">
      <div class="setting-text">
        <label>Stem Cache &amp; Project Storage</label>
        <span class="setting-desc">Location for isolated vocals, backing tracks, and recorded audio runs</span>
      </div>
      <div class="setting-control folder-control">
        <span class="path-badge">{{ settings.storagePath }}</span>
        <button class="browse-btn" @click="handleBrowse">
          <PhCheck v-if="browseFeedback" :size="14" />
          <PhFolderOpen v-else :size="14" />
          <span>{{ browseFeedback ? 'Copied' : 'Browse' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.setting-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.setting-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-text label {
  font-size: 13.5px;
  font-weight: 600;
  color: #f4f4f5;
}

.setting-desc {
  font-size: 12px;
  color: #8b92a0;
  line-height: 1.4;
}

.setting-control {
  flex-shrink: 0;
}

.custom-select {
  background: #1e2029;
  color: #f4f4f5;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12.5px;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  min-width: 230px;
  transition: all 0.15s ease;
}

.custom-select:hover {
  border-color: rgba(255, 255, 255, 0.2);
  background: #232530;
}

.custom-select:focus {
  border-color: #ea580c;
  box-shadow: 0 0 0 2px rgba(234, 88, 12, 0.2);
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #27272a;
  transition: 0.2s;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: #ffffff;
  transition: 0.2s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #ea580c;
  border-color: #ea580c;
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.folder-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.path-badge {
  font-size: 11px;
  font-family: monospace;
  color: #a1a1aa;
  background: #191a21;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.browse-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #27272a;
  color: #f4f4f5;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.browse-btn:hover {
  background: #3f3f46;
  border-color: rgba(255, 255, 255, 0.2);
}
</style>
