<script setup lang="ts">
import type { SettingsState } from './types'

defineProps<{
  settings: SettingsState
}>()
</script>

<template>
  <div class="tab-panel">
    <!-- Sample Rate Selection -->
    <div class="setting-item">
      <div class="setting-text">
        <label for="sample-rate">Audio Engine Sample Rate</label>
        <span class="setting-desc">Sampling frequency for audio stream processing, Demucs stems, and pitch FFT</span>
      </div>
      <div class="setting-control">
        <select id="sample-rate" v-model="settings.sampleRate" class="custom-select">
          <option value="48,000 Hz (Professional)">48,000 Hz (Professional)</option>
          <option value="44,100 Hz (CD Standard)">44,100 Hz (CD Standard)</option>
          <option value="96,000 Hz (Studio HD)">96,000 Hz (Studio HD)</option>
        </select>
      </div>
    </div>

    <!-- Buffer Size Selection -->
    <div class="setting-item">
      <div class="setting-text">
        <label for="buffer-size">I/O Buffer Block Size</label>
        <span class="setting-desc">Lower values reduce acoustic latency; higher values prevent clicks and buffer underruns</span>
      </div>
      <div class="setting-control">
        <select id="buffer-size" v-model="settings.bufferSize" class="custom-select">
          <option value="128 samples (2.7ms)">128 samples (2.7ms - Low Latency)</option>
          <option value="256 samples (5.3ms)">256 samples (5.3ms - Balanced)</option>
          <option value="512 samples (10.7ms)">512 samples (10.7ms - High Stability)</option>
        </select>
      </div>
    </div>

    <!-- Latency Calibration Offset Slider -->
    <div class="setting-item">
      <div class="setting-text">
        <div class="label-with-badge">
          <label>Round-Trip Latency Offset</label>
          <span class="val-badge">{{ settings.latencyOffset }} ms</span>
        </div>
        <span class="setting-desc">Manual time alignment compensation for Bluetooth headphones and external audio interfaces</span>
      </div>
      <div class="setting-control range-control">
        <input
          v-model.number="settings.latencyOffset"
          type="range"
          min="0"
          max="120"
          step="1"
          class="custom-slider"
        />
      </div>
    </div>

    <!-- Noise Gate Threshold Slider -->
    <div class="setting-item">
      <div class="setting-text">
        <div class="label-with-badge">
          <label>Noise Gate Threshold</label>
          <span class="val-badge">{{ settings.noiseGateThreshold }} dB</span>
        </div>
        <span class="setting-desc">Mutes incoming microphone noise below this RMS energy level to eliminate scoring artifacts</span>
      </div>
      <div class="setting-control range-control">
        <input
          v-model.number="settings.noiseGateThreshold"
          type="range"
          min="-60"
          max="-20"
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
</style>
