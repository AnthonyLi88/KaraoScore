import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import HomeApp from './HomeApp.vue'

// By default, mounts HomeApp for the new Home UI preview.
// Pass ?view=import or #import to launch the original App.vue audio workspace.
const urlParams = new URLSearchParams(window.location.search)
const isImport = urlParams.get('view') === 'import' || window.location.hash === '#import'

createApp(isImport ? App : HomeApp).mount('#app')
