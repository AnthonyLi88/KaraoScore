"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const ytDlp = require("yt-dlp-exec");
const ffmpegStatic = require("ffmpeg-static");
const icon = path.join(__dirname, "../../resources/icon.png");
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...process.platform === "linux" ? { icon } : {},
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.electron");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  electron.ipcMain.on("ping", () => console.log("pong"));
  electron.ipcMain.handle("download-audio", async (_, url, type = "track") => {
    try {
      const outputPath = path.join(electron.app.getPath("userData"), `track_${type}.mp3`);
      console.log(`Downloading ${type} audio from ${url}...`);
      await ytDlp(url, {
        extractAudio: true,
        audioFormat: "mp3",
        output: outputPath,
        ffmpegLocation: ffmpegStatic || void 0,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: ["referer:youtube.com", "user-agent:Mozilla/5.0"],
        forceOverwrites: true
      });
      console.log("Download complete! Reading file to base64...");
      const fs = require("fs");
      const buffer = await fs.promises.readFile(outputPath);
      const base64Audio = buffer.toString("base64");
      const dataUri = `data:audio/mp3;base64,${base64Audio}`;
      return { success: true, audioUrl: dataUri };
    } catch (error) {
      console.error("Download error:", error);
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("normalize-audio", async (_, inputPath, type = "track") => {
    try {
      const outputPath = path.join(electron.app.getPath("userData"), `track_${type}.mp3`);
      console.log(`Normalizing local audio from ${inputPath}...`);
      const { spawn } = require("child_process");
      await new Promise((resolve, reject) => {
        const proc = spawn(ffmpegStatic, ["-y", "-i", inputPath, outputPath]);
        proc.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`ffmpeg exited with code ${code}`));
        });
      });
      console.log("Normalization complete! Reading file to base64...");
      const fs = require("fs");
      const buffer = await fs.promises.readFile(outputPath);
      const base64Audio = buffer.toString("base64");
      const dataUri = `data:audio/mp3;base64,${base64Audio}`;
      return { success: true, audioUrl: dataUri };
    } catch (error) {
      console.error("Normalize error:", error);
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("isolate-vocals", async () => {
    try {
      const normalPath = path.join(electron.app.getPath("userData"), `track_normal.mp3`);
      const instrumentalPath = path.join(electron.app.getPath("userData"), `track_instrumental.mp3`);
      const outputPath = path.join(electron.app.getPath("userData"), `track_vocals.mp3`);
      console.log(`Isolating vocals via phase cancellation...`);
      const { spawn } = require("child_process");
      await new Promise((resolve, reject) => {
        const proc = spawn(ffmpegStatic, [
          "-y",
          "-i",
          normalPath,
          "-i",
          instrumentalPath,
          // amerge joins the two stereo tracks into one 4-channel track. 
          // pan subtracts the instrumental channels from the normal channels.
          "-filter_complex",
          "[0:a][1:a]amerge=inputs=2[a];[a]pan=stereo|c0=c0-c2|c1=c1-c3[out]",
          "-map",
          "[out]",
          outputPath
        ]);
        proc.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`ffmpeg exited with code ${code}. Ensure both tracks are downloaded.`));
        });
      });
      console.log("Isolation complete! Reading file to base64...");
      const fs = require("fs");
      const buffer = await fs.promises.readFile(outputPath);
      const base64Audio = buffer.toString("base64");
      const dataUri = `data:audio/mp3;base64,${base64Audio}`;
      return { success: true, audioUrl: dataUri };
    } catch (error) {
      console.error("Isolate error:", error);
      return { success: false, error: error.message };
    }
  });
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
