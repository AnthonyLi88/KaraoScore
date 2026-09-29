import { app, shell, BrowserWindow, ipcMain, protocol, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import ytDlp from 'yt-dlp-exec'
import ffmpegStatic from 'ffmpeg-static'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Audio Downloader IPC
  ipcMain.handle('download-audio', async (_, url: string, type: string = 'track') => {
    try {
      // Unify the output filename so vocal isolation can always find it regardless of source
      const outputPath = join(app.getPath('userData'), `track_${type}.mp3`);
      console.log(`Downloading ${type} audio from ${url}...`);
      
      await ytDlp(url, {
        extractAudio: true,
        audioFormat: 'mp3',
        output: outputPath,
        ffmpegLocation: ffmpegStatic || undefined,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: ['referer:youtube.com', 'user-agent:Mozilla/5.0'],
        forceOverwrites: true
      });

      console.log('Download complete! Reading file to base64...');
      
      const fs = require('fs');
      const buffer = await fs.promises.readFile(outputPath);
      const base64Audio = buffer.toString('base64');
      const dataUri = `data:audio/mp3;base64,${base64Audio}`;

      return { success: true, audioUrl: dataUri };
    } catch (error: any) {
      console.error('Download error:', error);
      return { success: false, error: error.message };
    }
  })

  // Audio Normalizer IPC (for local files)
  ipcMain.handle('normalize-audio', async (_, inputPath: string, type: string = 'track') => {
    try {
      const outputPath = join(app.getPath('userData'), `track_${type}.mp3`);
      console.log(`Normalizing local audio from ${inputPath}...`);
      
      const { spawn } = require('child_process');
      await new Promise<void>((resolve, reject) => {
        // -y overwrites, -i is input. We must remove loudnorm so phase isn't destroyed.
        const proc = spawn(ffmpegStatic, ['-y', '-i', inputPath, outputPath]);
        
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`ffmpeg exited with code ${code}`));
        });
      });

      console.log('Normalization complete! Reading file to base64...');
      
      const fs = require('fs');
      const buffer = await fs.promises.readFile(outputPath);
      const base64Audio = buffer.toString('base64');
      const dataUri = `data:audio/mp3;base64,${base64Audio}`;

      return { success: true, audioUrl: dataUri };
    } catch (error: any) {
      console.error('Normalize error:', error);
      return { success: false, error: error.message };
    }
  })

  // Vocal Isolation IPC
  ipcMain.handle('isolate-vocals', async () => {
    try {
      const normalPath = join(app.getPath('userData'), `track_normal.mp3`);
      const instrumentalPath = join(app.getPath('userData'), `track_instrumental.mp3`);
      const outputPath = join(app.getPath('userData'), `track_vocals.mp3`);
      
      console.log(`Isolating vocals via phase cancellation...`);
      
      const { spawn } = require('child_process');
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(ffmpegStatic, [
          '-y', 
          '-i', normalPath, 
          '-i', instrumentalPath, 
          // amerge joins the two stereo tracks into one 4-channel track. 
          // pan subtracts the instrumental channels from the normal channels.
          '-filter_complex', '[0:a][1:a]amerge=inputs=2[a];[a]pan=stereo|c0=c0-c2|c1=c1-c3[out]', 
          '-map', '[out]', 
          outputPath
        ]);
        
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`ffmpeg exited with code ${code}. Ensure both tracks are downloaded.`));
        });
      });

      console.log('Isolation complete! Reading file to base64...');
      const fs = require('fs');
      const buffer = await fs.promises.readFile(outputPath);
      const base64Audio = buffer.toString('base64');
      const dataUri = `data:audio/mp3;base64,${base64Audio}`;

      return { success: true, audioUrl: dataUri };
    } catch (error: any) {
      console.error('Isolate error:', error);
      return { success: false, error: error.message };
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
