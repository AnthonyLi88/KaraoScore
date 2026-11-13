import { app, dialog, BrowserWindow, ipcMain } from 'electron'
import { join, basename, extname } from 'path'
import * as fs from 'fs'
import { spawn } from 'child_process'
import ffmpegStatic from 'ffmpeg-static'

const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm', '.wma'])

function isAudioFile(fileName: string): boolean {
  if (fileName.startsWith('.')) return false
  const ext = extname(fileName).toLowerCase()
  return AUDIO_EXTS.has(ext)
}

function findAudioInDir(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return []
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    return entries
      .filter((e) => e.isFile() && isAudioFile(e.name))
      .map((e) => join(dirPath, e.name))
  } catch (err) {
    console.error(`Error reading directory ${dirPath}:`, err)
    return []
  }
}

export interface DiscoveredFiles {
  trackPath?: string
  instrumentalPath?: string
  recordingPath?: string
  vocalsPath?: string
}

export function discoverTestAssets(folderPath: string): DiscoveredFiles {
  const result: DiscoveredFiles = {}
  if (!fs.existsSync(folderPath)) return result

  const entries = fs.readdirSync(folderPath, { withFileTypes: true })
  const subdirs = entries.filter((e) => e.isDirectory()).map((e) => e.name)
  const rootAudioFiles = entries
    .filter((e) => e.isFile() && isAudioFile(e.name))
    .map((e) => join(folderPath, e.name))

  const findSubdir = (names: string[]): string | undefined => {
    const match = subdirs.find((d) => names.includes(d.toLowerCase()))
    return match ? join(folderPath, match) : undefined
  }

  // 1. Original Song (Track A)
  const tracksDir = findSubdir(['tracks', 'track', 'original', 'songs', 'song'])
  if (tracksDir) {
    const files = findAudioInDir(tracksDir)
    if (files.length > 0) result.trackPath = files[0]
  }
  if (!result.trackPath) {
    const file = rootAudioFiles.find((f) => {
      const lower = basename(f).toLowerCase()
      return (
        lower.includes('track') ||
        lower.includes('original') ||
        lower.includes('normal') ||
        lower.includes('mix') ||
        lower.includes('song')
      )
    })
    if (file) result.trackPath = file
  }

  // 2. Instrumental (Track B)
  const instDir = findSubdir(['instrumentals', 'instrumental', 'inst', 'backing', 'karaoke'])
  if (instDir) {
    const files = findAudioInDir(instDir)
    if (files.length > 0) result.instrumentalPath = files[0]
  }
  if (!result.instrumentalPath) {
    const file = rootAudioFiles.find((f) => {
      const lower = basename(f).toLowerCase()
      return (
        lower.includes('instrumental') ||
        lower.includes('inst') ||
        lower.includes('backing') ||
        lower.includes('karaoke') ||
        lower.includes('novocal') ||
        lower.includes('no_vocal')
      )
    })
    if (file) result.instrumentalPath = file
  }

  // 3. User Vocals (Track C) & Isolated Vocals
  const vocalsDir = findSubdir(['vocals', 'vocal', 'user_vocals', 'singer', 'recordings'])
  let vocalFiles: string[] = []
  if (vocalsDir) {
    vocalFiles = findAudioInDir(vocalsDir)
  }

  // Check for isolated vocals if present
  const isolatedInVocals = vocalFiles.find((f) => basename(f).toLowerCase().includes('isolated'))
  const isolatedDir = findSubdir(['isolated', 'isolated_vocals'])
  if (isolatedDir) {
    const files = findAudioInDir(isolatedDir)
    if (files.length > 0) result.vocalsPath = files[0]
  } else if (isolatedInVocals) {
    result.vocalsPath = isolatedInVocals
  }

  // Find user/singer vocal file:
  const userLabeled = vocalFiles.find((f) => {
    const lower = basename(f).toLowerCase()
    return (
      lower.includes('user') ||
      lower.includes('singer') ||
      lower.includes('record') ||
      lower.includes('take') ||
      lower.includes('input')
    )
  })
  if (userLabeled) {
    result.recordingPath = userLabeled
  } else {
    // If not specifically labeled "user", pick candidate in vocalsDir that isn't isolated
    const candidate = vocalFiles.find((f) => f !== result.vocalsPath)
    if (candidate) {
      result.recordingPath = candidate
    } else if (vocalFiles.length > 0 && !result.recordingPath) {
      result.recordingPath = vocalFiles[0]
    }
  }

  // Fallback to root files for recording / user vocals
  if (!result.recordingPath) {
    const file = rootAudioFiles.find((f) => {
      const lower = basename(f).toLowerCase()
      return (
        (lower.includes('user') ||
          lower.includes('singer') ||
          lower.includes('record') ||
          lower.includes('vocal')) &&
        !lower.includes('isolated') &&
        !lower.includes('novocal')
      )
    })
    if (file) result.recordingPath = file
  }

  // Fallback to root files for isolated vocals
  if (!result.vocalsPath) {
    const file = rootAudioFiles.find((f) => basename(f).toLowerCase().includes('isolated'))
    if (file) result.vocalsPath = file
  }

  return result
}

async function convertToMp3(inputPath: string, outputPath: string): Promise<string> {
  const ffmpegBin = ffmpegStatic || 'ffmpeg'
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, ['-y', '-i', inputPath, outputPath])
    proc.on('close', (code: number) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited with code ${code} converting ${inputPath}`))
    })
    proc.on('error', (err) => reject(err))
  })
  const buffer = await fs.promises.readFile(outputPath)
  return `data:audio/mp3;base64,${buffer.toString('base64')}`
}

export async function loadTestAssetFolder(folderPath: string) {
  const discovered = discoverTestAssets(folderPath)
  const missing: string[] = []
  if (!discovered.trackPath) missing.push('Original track')
  if (!discovered.instrumentalPath) missing.push('Instrumental')
  if (!discovered.recordingPath) missing.push('User vocals')

  const response: any = {
    success: true,
    folderPath,
    folderName: basename(folderPath),
    missing
  }

  // Normalize / convert Original Track
  if (discovered.trackPath) {
    const normalOut = join(app.getPath('userData'), 'track_normal.mp3')
    const audioUrl = await convertToMp3(discovered.trackPath, normalOut)
    response.trackNormal = {
      fileName: basename(discovered.trackPath),
      audioUrl
    }
  }

  // Normalize / convert Instrumental Track
  if (discovered.instrumentalPath) {
    const instOut = join(app.getPath('userData'), 'track_instrumental.mp3')
    const audioUrl = await convertToMp3(discovered.instrumentalPath, instOut)
    response.trackInstrumental = {
      fileName: basename(discovered.instrumentalPath),
      audioUrl
    }
  }

  // Normalize / convert User Vocals (Recording)
  if (discovered.recordingPath) {
    const recOut = join(app.getPath('userData'), 'track_recording.mp3')
    const audioUrl = await convertToMp3(discovered.recordingPath, recOut)
    response.trackRecording = {
      fileName: basename(discovered.recordingPath),
      audioUrl
    }
  }

  // Normalize / convert Isolated Vocals (if present)
  if (discovered.vocalsPath) {
    const vocalsOut = join(app.getPath('userData'), 'track_vocals_phase.mp3')
    const audioUrl = await convertToMp3(discovered.vocalsPath, vocalsOut)
    response.trackVocals = {
      fileName: basename(discovered.vocalsPath),
      audioUrl
    }
  }

  return response
}

export function getAvailableTestFolders(): Array<{ name: string; path: string }> {
  const results: Array<{ name: string; path: string }> = []

  const candidates = [
    join(process.cwd(), 'test-assets'),
    join(app.getAppPath(), 'test-assets')
  ]

  const testAssetsDir = candidates.find((dir) => fs.existsSync(dir))
  if (!testAssetsDir) return results

  try {
    const rootEntries = fs.readdirSync(testAssetsDir, { withFileTypes: true })

    // Check if test-assets itself directly contains tracks, instrumentals, or vocals
    const hasCategoryDirs = rootEntries.some(
      (e) =>
        e.isDirectory() &&
        ['tracks', 'instrumentals', 'vocals'].includes(e.name.toLowerCase())
    )
    if (hasCategoryDirs) {
      results.push({
        name: 'Default (test-assets/)',
        path: testAssetsDir
      })
    }

    // Check for song/case subfolders in test-assets/ (e.g. test-assets/midnight-city)
    for (const entry of rootEntries) {
      if (
        entry.isDirectory() &&
        !['tracks', 'instrumentals', 'vocals', '.git'].includes(entry.name.toLowerCase())
      ) {
        results.push({
          name: entry.name,
          path: join(testAssetsDir, entry.name)
        })
      }
    }
  } catch (err) {
    console.error('Error finding test asset folders:', err)
  }

  return results
}

export function registerTestAssetIpc() {
  ipcMain.handle('select-test-folder', async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    const options = {
      title: 'Select Test Asset Folder',
      properties: ['openDirectory' as const]
    }
    const result = focusedWindow
      ? await dialog.showOpenDialog(focusedWindow, options)
      : await dialog.showOpenDialog(options)

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true }
    }
    return { canceled: false, folderPath: result.filePaths[0] }
  })

  ipcMain.handle('load-test-folder', async (_, folderPath?: string) => {
    try {
      let targetPath = folderPath
      if (!targetPath) {
        const focusedWindow = BrowserWindow.getFocusedWindow()
        const options = {
          title: 'Select Test Asset Folder',
          properties: ['openDirectory' as const]
        }
        const result = focusedWindow
          ? await dialog.showOpenDialog(focusedWindow, options)
          : await dialog.showOpenDialog(options)

        if (result.canceled || result.filePaths.length === 0) {
          return { canceled: true }
        }
        targetPath = result.filePaths[0]
      }
      return await loadTestAssetFolder(targetPath)
    } catch (error: any) {
      console.error('Error loading test asset folder:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('get-test-asset-folders', async () => {
    try {
      return getAvailableTestFolders()
    } catch (error: any) {
      console.error('Error getting test asset folders:', error)
      return []
    }
  })
}
