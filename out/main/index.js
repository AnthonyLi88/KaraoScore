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
  electron.ipcMain.handle("isolate-vocals-phase", async () => {
    try {
      const normalPath = path.join(electron.app.getPath("userData"), `track_normal.mp3`);
      const instrumentalPath = path.join(electron.app.getPath("userData"), `track_instrumental.mp3`);
      const outputPath = path.join(electron.app.getPath("userData"), `track_vocals_phase.mp3`);
      console.log(`Isolating vocals via phase cancellation...`);
      const { spawn } = require("child_process");
      await new Promise((resolve, reject) => {
        const proc = spawn(ffmpegStatic, [
          "-y",
          "-i",
          normalPath,
          "-i",
          instrumentalPath,
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
      console.log("Phase Isolation complete! Reading file to base64...");
      const fs = require("fs");
      const buffer = await fs.promises.readFile(outputPath);
      const base64Audio = buffer.toString("base64");
      const dataUri = `data:audio/mp3;base64,${base64Audio}`;
      return { success: true, audioUrl: dataUri };
    } catch (error) {
      console.error("Phase Isolate error:", error);
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("check-demucs-env", async () => {
    try {
      const { execSync } = require("child_process");
      const isWindows = process.platform === "win32";
      const pythonCmd = isWindows ? "python" : "python3";
      try {
        execSync(`${pythonCmd} --version`);
      } catch (e) {
        return { status: "missing_python", message: "Python 3 is not installed or not in PATH." };
      }
      const venvDir = path.join(electron.app.getPath("userData"), "ai-env");
      const demucsCmd = path.join(venvDir, isWindows ? "Scripts" : "bin", isWindows ? "demucs.exe" : "demucs");
      const fs = require("fs");
      if (fs.existsSync(demucsCmd)) {
        return { status: "ready" };
      } else {
        return { status: "needs_install" };
      }
    } catch (e) {
      return { status: "error", message: e.message };
    }
  });
  electron.ipcMain.handle("install-demucs", async () => {
    try {
      const { spawn } = require("child_process");
      const isWindows = process.platform === "win32";
      const pythonCmd = isWindows ? "python" : "python3";
      const venvDir = path.join(electron.app.getPath("userData"), "ai-env");
      const pipCmd = path.join(venvDir, isWindows ? "Scripts" : "bin", isWindows ? "pip.exe" : "pip");
      console.log("Creating Python virtual environment...");
      await new Promise((resolve, reject) => {
        const proc = spawn(pythonCmd, ["-m", "venv", venvDir]);
        proc.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error("Failed to create virtual environment."));
        });
      });
      console.log("Installing demucs into virtual environment...");
      await new Promise((resolve, reject) => {
        const proc = spawn(pipCmd, ["install", "-U", "demucs", "torchaudio", "numpy"]);
        proc.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error("Failed to install demucs via pip."));
        });
      });
      return { success: true };
    } catch (e) {
      console.error("Install error:", e);
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("isolate-vocals-demucs", async () => {
    try {
      const normalPath = path.join(electron.app.getPath("userData"), `track_normal.mp3`);
      const outputDir = path.join(electron.app.getPath("userData"), "demucs_output");
      const isWindows = process.platform === "win32";
      const venvDir = path.join(electron.app.getPath("userData"), "ai-env");
      const demucsCmd = path.join(venvDir, isWindows ? "Scripts" : "bin", isWindows ? "demucs.exe" : "demucs");
      console.log(`Isolating vocals via Demucs AI...`);
      const { spawn } = require("child_process");
      await new Promise((resolve, reject) => {
        const proc = spawn(demucsCmd, ["--two-stems", "vocals", "-n", "htdemucs", "-o", outputDir, normalPath]);
        let errorOutput = "";
        proc.stderr.on("data", (data) => {
          errorOutput += data.toString();
        });
        proc.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Demucs failed (code ${code}): ${errorOutput}`));
        });
      });
      console.log("AI Isolation complete! Reading file to base64...");
      const fs = require("fs");
      const vocalsPath = path.join(outputDir, "htdemucs", "track_normal", "vocals.wav");
      const buffer = await fs.promises.readFile(vocalsPath);
      const base64Audio = buffer.toString("base64");
      const dataUri = `data:audio/wav;base64,${base64Audio}`;
      return { success: true, audioUrl: dataUri };
    } catch (error) {
      console.error("Demucs error:", error);
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
