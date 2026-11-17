<script setup lang="ts">
import { ref, computed } from 'vue'
import { PhMagnifyingGlass } from '@phosphor-icons/vue'

export interface ShortcutItem {
  id: string
  keys: string[]
  description: string
  category: 'Playback & Recording' | 'Navigation' | 'Settings & Windows'
}

const allShortcuts: ShortcutItem[] = [
  {
    id: 'play-pause',
    keys: ['Spacebar'],
    description: 'Play / Pause audio playback',
    category: 'Playback & Recording'
  },
  {
    id: 'record-toggle',
    keys: ['Ctrl', 'R'],
    description: 'Start / Stop microphone recording',
    category: 'Playback & Recording'
  },
  {
    id: 'nav-home',
    keys: ['Ctrl', '1'],
    description: 'Switch to Home View',
    category: 'Navigation'
  },
  {
    id: 'nav-import',
    keys: ['Ctrl', '2'],
    description: 'Switch to Import Workspace',
    category: 'Navigation'
  },
  {
    id: 'nav-library',
    keys: ['Ctrl', '3'],
    description: 'Switch to Library View',
    category: 'Navigation'
  },
  {
    id: 'open-settings-audio',
    keys: ['Ctrl', ','],
    description: 'Open Audio Settings dialog',
    category: 'Settings & Windows'
  },
  {
    id: 'open-settings-shortcuts',
    keys: ['Ctrl', '/'],
    description: 'Open Keyboard Shortcuts panel',
    category: 'Settings & Windows'
  },
  {
    id: 'close-modal',
    keys: ['Esc'],
    description: 'Close active modal window or cancel recording',
    category: 'Settings & Windows'
  }
]

const searchQuery = ref('')

const filteredShortcuts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return allShortcuts
  return allShortcuts.filter((item) => {
    return (
      item.description.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.keys.some((k) => k.toLowerCase().includes(query))
    )
  })
})

const categories = computed(() => {
  const cats = ['Playback & Recording', 'Navigation', 'Settings & Windows'] as const
  return cats.filter((cat) => filteredShortcuts.value.some((item) => item.category === cat))
})

function shortcutsForCategory(cat: string): ShortcutItem[] {
  return filteredShortcuts.value.filter((item) => item.category === cat)
}
</script>

<template>
  <div class="shortcuts-panel">
    <!-- Search Bar -->
    <div class="search-box">
      <PhMagnifyingGlass :size="16" class="search-icon" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search shortcuts by action or key..."
        class="search-input"
      />
    </div>

    <!-- Category Groups -->
    <div v-if="filteredShortcuts.length > 0" class="category-list">
      <div v-for="cat in categories" :key="cat" class="category-block">
        <h4 class="category-title">{{ cat }}</h4>
        <div class="shortcut-rows">
          <div v-for="sc in shortcutsForCategory(cat)" :key="sc.id" class="shortcut-row">
            <span class="shortcut-desc">{{ sc.description }}</span>
            <div class="key-combo">
              <kbd v-for="(k, idx) in sc.keys" :key="idx" class="keycap">{{ k }}</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <span>No shortcuts match your search</span>
    </div>
  </div>
</template>

<style scoped>
.shortcuts-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #8b92a0;
  pointer-events: none;
}

.search-input {
  width: 100%;
  background: #1e2029;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 12px 8px 36px;
  font-size: 13px;
  color: #f4f4f5;
  outline: none;
  transition: all 0.15s ease;
}

.search-input:focus {
  border-color: #ea580c;
  box-shadow: 0 0 0 2px rgba(234, 88, 12, 0.2);
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.category-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-title {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #ea580c;
}

.shortcut-rows {
  background: #191a21;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  overflow: hidden;
}

.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.shortcut-row:last-child {
  border-bottom: none;
}

.shortcut-desc {
  font-size: 13px;
  color: #e4e4e7;
}

.key-combo {
  display: flex;
  align-items: center;
  gap: 4px;
}

.keycap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  padding: 3px 7px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  color: #f4f4f5;
  background: #27272a;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-bottom-width: 2px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

.empty-state {
  padding: 32px;
  text-align: center;
  color: #8b92a0;
  font-size: 13px;
}
</style>
