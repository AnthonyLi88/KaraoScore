# karaoscore

An Electron application with Vue and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

## Architecture & Contribution Guide

To support parallel contributions across teammates and prevent git merge conflicts, the frontend is organized into decoupled, independent views coordinated by a lightweight application shell:

```
src/renderer/src/
├── App.vue                   # Application shell: sidebar, navigation routing, active set metadata
├── views/
│   ├── HomeView.vue          # Home dashboard: activity metrics, recent songs list, weekly goal gauge
│   └── ImportView.vue        # Song workspace: YouTube download, file normalization, mic recording, Demucs/Phase isolation
└── assets/
    ├── base.css              # Color tokens and CSS resets
    └── main.css              # Global styles, scrollbar styling, shared layout primitives
```

### Guidelines for Collaborators

- **Audio & Vocal Isolation Work**: If modifying YouTube download (`yt-dlp`), local file normalization, Phase cancellation, Demucs AI vocal isolation, or live microphone recording, make changes inside [`src/renderer/src/views/ImportView.vue`](src/renderer/src/views/ImportView.vue) or `src/main/` IPC handlers.
- **Home & Dashboard Work**: If designing dashboard widgets, recommendation cards, or activity stats, make changes inside [`src/renderer/src/views/HomeView.vue`](src/renderer/src/views/HomeView.vue).
- **Navigation & Global State**: The active song title and artist are synchronized between views and the sidebar via standard Vue 3 `defineModel` / props.
- Keeping these views separate ensures feature branches can be merged cleanly with `main` without conflicts.
