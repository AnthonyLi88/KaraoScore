<script setup lang="ts">
import type { SettingsState } from './types'

defineProps<{
  settings: SettingsState
}>()
</script>

<template>
  <div class="tab-panel">
    <!-- Input Device Selection -->
    <div class="setting-item">
      <div class="setting-text">
        <label for="audio-input">Microphone Input Device</label>
        <span class="setting-desc">Primary audio input used for rehearsal recording and pitch analysis</span>
      </div>
      <div class="setting-control">
        <select id="audio-input" v-model="settings.audioInput" class="custom-select">
          <option value="Scarlett Solo USB (Interface)">Scarlett Solo USB (Interface)</option>
          <option value="Microphone Array (Realtek Audio)">Microphone Array (Realtek Audio)</option>
          <option value="Blue Yeti USB">Blue Yeti USB</option>
          <option value="Default System Microphone">Default System Microphone</option>
        </select>
      </div>
    </div>

    <!-- Output Device Selection -->
    <div class="setting-item">
      <div class="setting-text">
        <label for="audio-output">Output &amp; Monitor Device</label>
        <span class="setting-desc">Playback destination for backing tracks and guide audio</span>
      </div>
      <div class="setting-control">
        <select id="audio-output" v-model="settings.audioOutput" class="custom-select">
          <option value="Scarlett Solo USB (Headphones)">Scarlett Solo USB (Headphones)</option>
          <option value="Speakers (Realtek Audio)">Speakers (Realtek Audio)</option>
          <option value="Default System Output">Default System Output</option>
        </select>
      </div>
    </div>

    <!-- Direct Monitoring Toggle -->
    <div class="setting-item">
      <div class="setting-text">
        <label>Zero-Latency Direct Monitoring</label>
        <span class="setting-desc">Route microphone audio directly to headphones without software round-trip buffer</span>
      </div>
      <div class="setting-control">
        <label class="toggle-switch">
          <input v-model="settings.directMonitoring" type="checkbox" />
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <!-- Input Gain Slider -->
    <div class="setting-item">
      <div class="setting-text">
        <div class="label-with-badge">
          <label>Microphone Pre-Gain</label>
          <span class="val-badge">{{ settings.inputGain >= 0 ? `+${settings.inputGain}` : settings.inputGain }} dB</span>
        </div>
        <span class="setting-desc">Pre-amplification boost applied before pitch detection and stem scoring</span>
      </div>
      <div class="setting-control range-control">
        <input
          v-model.number="settings.inputGain"
          type="range"
          min="-12"
          max="12"
          step="1"
          class="custom-slider"
        />
      </div>
    </div>

    <!-- Master Output Volume Slider -->
    <div class="setting-item">
      <div class="setting-text">
        <div class="label-with-badge">
          <label>Master Output Volume</label>
          <span class="val-badge">{{ settings.masterVolume }}%</span>
        </div>
        <span class="setting-desc">Overall playback output level across all loaded audio channels</span>
      </div>
      <div class="setting-control range-control">
        <input
          v-model.number="settings.masterVolume"
          type="range"
          min="0"
          max="100"
          step="1"
          class="custom-slider"
        />
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

.label-with-badge {
  display: flex;
  align-items: center;
  gap: 10px;
}

.val-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(234, 88, 12, 0.15);
  color: #ea580c;
  border: 1px solid rgba(234, 88, 12, 0.3);
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

.range-control {
  min-width: 170px;
}

.custom-slider {
  width: 100%;
  accent-color: #ea580c;
  cursor: pointer;
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
</style>
