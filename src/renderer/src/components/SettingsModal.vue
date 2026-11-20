<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  PhSpeakerHigh,
  PhKeyboard,
  PhFaders,
  PhGear,
  PhX,
  PhCheck,
  PhArrowCounterClockwise
} from '@phosphor-icons/vue'

import {
  type SettingsState,
  type SettingsTabKey,
  type TabMeta,
  DEFAULT_SETTINGS,
  STORAGE_KEY
} from './settings/types'

import AudioTab from './settings/AudioTab.vue'
import LatencyTab from './settings/LatencyTab.vue'
import ShortcutsTab from './settings/ShortcutsTab.vue'
import GeneralTab from './settings/GeneralTab.vue'

export type { SettingsState }

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    initialTab?: SettingsTabKey
  }>(),
  {
    initialTab: 'audio'
  }
)

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
  (e: 'save', settings: SettingsState): void
}>()

// Active Navigation Tab
const activeTab = ref<SettingsTabKey>(props.initialTab || 'audio')

// Reactive Settings State
const settings = ref<SettingsState>({ ...DEFAULT_SETTINGS })

// Success Toast State
const toastMessage = ref('')
const showToast = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | null = null

// Tab definitions
const tabs: TabMeta[] = [
  {
    id: 'audio',
    label: 'Audio Devices',
    icon: PhSpeakerHigh,
    title: 'Audio Devices',
    subtitle: 'Configure input hardware, direct monitoring routing, and playback levels'
  },
  {
    id: 'shortcuts',
    label: 'Keyboard Shortcuts',
    icon: PhKeyboard,
    title: 'Keyboard Shortcuts',
    subtitle: 'Review and filter hotkeys for quick playback, recording, and navigation'
  },
  {
    id: 'latency',
    label: 'Latency & Buffer',
    icon: PhFaders,
    title: 'Latency & Buffer',
    subtitle: 'Tune audio engine sample rate, buffer size, and alignment compensation'
  },
  {
    id: 'general',
    label: 'General & App',
    icon: PhGear,
    title: 'General & App',
    subtitle: 'Personalize appearance theme, waveform rendering rate, and storage folder'
  }
]

const currentTabMeta = computed(() => {
  return tabs.find((t) => t.id === activeTab.value) || tabs[0]
})

function loadSettings(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      settings.value = {
        ...DEFAULT_SETTINGS,
        ...parsed
      }
    }
  } catch {
    settings.value = { ...DEFAULT_SETTINGS }
  }
}

function triggerToast(message: string): void {
  toastMessage.value = message
  showToast.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    showToast.value = false
  }, 2500)
}

function saveSettings(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
  } catch (err) {
    console.error('Failed to persist settings to localStorage', err)
  }
  emit('save', { ...settings.value })
  triggerToast('Settings saved!')
}

function resetDefaults(): void {
  settings.value = { ...DEFAULT_SETTINGS }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS))
  } catch {
    // ignore
  }
  emit('save', { ...DEFAULT_SETTINGS })
  triggerToast('Settings reset to defaults')
}

function closeModal(): void {
  emit('update:isOpen', false)
}

function handleKeyDown(e: KeyboardEvent): void {
  if (props.isOpen && e.key === 'Escape') {
    closeModal()
  }
}

watch(
  () => props.initialTab,
  (newTab) => {
    if (newTab) {
      activeTab.value = newTab
    }
  }
)

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      loadSettings()
      if (props.initialTab) {
        activeTab.value = props.initialTab
      }
    }
  }
)

onMounted(() => {
  loadSettings()
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="modal-backdrop" @click.self="closeModal">
        <div class="modal-card" role="dialog" aria-modal="true">
          <!-- Sidebar Navigation -->
          <aside class="modal-sidebar">
            <div class="sidebar-header">
              <span class="sidebar-title">Preferences</span>
            </div>
            <nav class="sidebar-tabs">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                class="tab-btn"
                :class="{ active: activeTab === tab.id }"
                @click="activeTab = tab.id"
              >
                <component :is="tab.icon" :size="17" class="tab-icon" />
                <span>{{ tab.label }}</span>
              </button>
            </nav>
          </aside>

          <!-- Main Content Area -->
          <div class="modal-main">
            <!-- Header -->
            <header class="content-header">
              <div class="header-titles">
                <h2 class="content-title">{{ currentTabMeta.title }}</h2>
                <p class="content-subtitle">{{ currentTabMeta.subtitle }}</p>
              </div>
              <button class="close-btn" aria-label="Close settings" @click="closeModal">
                <PhX :size="18" />
              </button>
            </header>

            <!-- Scrollable Body -->
            <div class="content-body">
              <AudioTab v-if="activeTab === 'audio'" :settings="settings" />
              <ShortcutsTab v-else-if="activeTab === 'shortcuts'" />
              <LatencyTab v-else-if="activeTab === 'latency'" :settings="settings" />
              <GeneralTab v-else-if="activeTab === 'general'" :settings="settings" />
            </div>

            <!-- Footer Action Bar -->
            <footer class="content-footer">
              <button class="btn-reset" @click="resetDefaults">
                <PhArrowCounterClockwise :size="14" />
                <span>Reset Defaults</span>
              </button>
              <div class="footer-actions">
                <button class="btn-cancel" @click="closeModal">Cancel</button>
                <button class="btn-save" @click="saveSettings">
                  <PhCheck :size="14" />
                  <span>Save Changes</span>
                </button>
              </div>
            </footer>
          </div>

          <!-- Notification Toast -->
          <Transition name="toast">
            <div v-if="showToast" class="toast">
              <PhCheck :size="15" weight="bold" />
              <span>{{ toastMessage }}</span>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-card {
  position: relative;
  display: flex;
  width: 90%;
  max-width: 820px;
  height: 600px;
  background: #14151b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

.modal-sidebar {
  width: 220px;
  background: #0f1015;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  padding: 24px 14px;
  flex-shrink: 0;
}

.sidebar-header {
  margin-bottom: 20px;
  padding-left: 10px;
}

.sidebar-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #ea580c;
}

.sidebar-tabs {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: none;
  color: #8b92a0;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.tab-btn.active {
  background: rgba(234, 88, 12, 0.15);
  color: #ea580c;
  font-weight: 600;
}

.tab-icon {
  flex-shrink: 0;
}

.modal-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #14151b;
  overflow: hidden;
}

.content-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 28px 18px 28px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.content-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.content-subtitle {
  margin: 0;
  font-size: 12.5px;
  color: #8b92a0;
}

.close-btn {
  background: transparent;
  border: none;
  color: #8b92a0;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.content-body {
  flex: 1;
  padding: 24px 28px;
  overflow-y: auto;
}

.content-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 28px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: #111217;
}

.btn-reset {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: #8b92a0;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.btn-reset:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #f4f4f5;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-cancel {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f4f4f5;
  font-size: 12.5px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.2);
}

.btn-save {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ea580c;
  color: #fff;
  border: none;
  font-size: 12.5px;
  font-weight: 600;
  padding: 8px 18px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 2px 6px rgba(234, 88, 12, 0.3);
}

.btn-save:hover {
  background: #f97316;
}

.toast {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #181920;
  border: 1px solid #ea580c;
  color: #fff;
  padding: 8px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}
</style>
