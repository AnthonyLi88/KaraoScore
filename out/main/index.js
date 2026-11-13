"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const ytDlp = require("yt-dlp-exec");
const ffmpegStatic = require("ffmpeg-static");
const fs = require("fs");
const child_process = require("child_process");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const icon = path.join(__dirname, "../../resources/icon.png");
const AUDIO_EXTS = /* @__PURE__ */ new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".webm", ".wma"]);
function isAudioFile(fileName) {
  if (fileName.startsWith(".")) return false;
  const ext = path.extname(fileName).toLowerCase();
  return AUDIO_EXTS.has(ext);
}
function findAudioInDir(dirPath) {
  if (!fs__namespace.existsSync(dirPath)) return [];
  try {
    const entries = fs__namespace.readdirSync(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isFile() && isAudioFile(e.name)).map((e) => path.join(dirPath, e.name));
  } catch (err) {
    console.error(`Error reading directory ${dirPath}:`, err);
    return [];
  }
}
function discoverTestAssets(folderPath) {
  const result = {};
  if (!fs__namespace.existsSync(folderPath)) return result;
  const entries = fs__namespace.readdirSync(folderPath, { withFileTypes: true });
  const subdirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  const rootAudioFiles = entries.filter((e) => e.isFile() && isAudioFile(e.name)).map((e) => path.join(folderPath, e.name));
  const findSubdir = (names) => {
    const match = subdirs.find((d) => names.includes(d.toLowerCase()));
    return match ? path.join(folderPath, match) : void 0;
  };
  const tracksDir = findSubdir(["tracks", "track", "original", "songs", "song"]);
  if (tracksDir) {
    const files = findAudioInDir(tracksDir);
    if (files.length > 0) result.trackPath = files[0];
  }
  if (!result.trackPath) {
    const file = rootAudioFiles.find((f) => {
      const lower = path.basename(f).toLowerCase();
      return lower.includes("track") || lower.includes("original") || lower.includes("normal") || lower.includes("mix") || lower.includes("song");
    });
    if (file) result.trackPath = file;
  }
  const instDir = findSubdir(["instrumentals", "instrumental", "inst", "backing", "karaoke"]);
  if (instDir) {
    const files = findAudioInDir(instDir);
    if (files.length > 0) result.instrumentalPath = files[0];
  }
  if (!result.instrumentalPath) {
    const file = rootAudioFiles.find((f) => {
      const lower = path.basename(f).toLowerCase();
      return lower.includes("instrumental") || lower.includes("inst") || lower.includes("backing") || lower.includes("karaoke") || lower.includes("novocal") || lower.includes("no_vocal");
    });
    if (file) result.instrumentalPath = file;
  }
  const vocalsDir = findSubdir(["vocals", "vocal", "user_vocals", "singer", "recordings"]);
  let vocalFiles = [];
  if (vocalsDir) {
    vocalFiles = findAudioInDir(vocalsDir);
  }
  const isolatedInVocals = vocalFiles.find((f) => path.basename(f).toLowerCase().includes("isolated"));
  const isolatedDir = findSubdir(["isolated", "isolated_vocals"]);
  if (isolatedDir) {
    const files = findAudioInDir(isolatedDir);
    if (files.length > 0) result.vocalsPath = files[0];
  } else if (isolatedInVocals) {
    result.vocalsPath = isolatedInVocals;
  }
  const userLabeled = vocalFiles.find((f) => {
    const lower = path.basename(f).toLowerCase();
    return lower.includes("user") || lower.includes("singer") || lower.includes("record") || lower.includes("take") || lower.includes("input");
  });
  if (userLabeled) {
    result.recordingPath = userLabeled;
  } else {
    const candidate = vocalFiles.find((f) => f !== result.vocalsPath);
    if (candidate) {
      result.recordingPath = candidate;
    } else if (vocalFiles.length > 0 && !result.recordingPath) {
      result.recordingPath = vocalFiles[0];
    }
  }
  if (!result.recordingPath) {
    const file = rootAudioFiles.find((f) => {
      const lower = path.basename(f).toLowerCase();
      return (lower.includes("user") || lower.includes("singer") || lower.includes("record") || lower.includes("vocal")) && !lower.includes("isolated") && !lower.includes("novocal");
    });
    if (file) result.recordingPath = file;
  }
  if (!result.vocalsPath) {
    const file = rootAudioFiles.find((f) => path.basename(f).toLowerCase().includes("isolated"));
    if (file) result.vocalsPath = file;
  }
  return result;
}
async function convertToMp3(inputPath, outputPath) {
  const ffmpegBin = ffmpegStatic || "ffmpeg";
  await new Promise((resolve, reject) => {
    const proc = child_process.spawn(ffmpegBin, ["-y", "-i", inputPath, outputPath]);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code} converting ${inputPath}`));
    });
    proc.on("error", (err) => reject(err));
  });
  const buffer = await fs__namespace.promises.readFile(outputPath);
  return `data:audio/mp3;base64,${buffer.toString("base64")}`;
}
async function loadTestAssetFolder(folderPath) {
  const discovered = discoverTestAssets(folderPath);
  const missing = [];
  if (!discovered.trackPath) missing.push("Original track");
  if (!discovered.instrumentalPath) missing.push("Instrumental");
  if (!discovered.recordingPath) missing.push("User vocals");
  const response = {
    success: true,
    folderPath,
    folderName: path.basename(folderPath),
    missing
  };
  if (discovered.trackPath) {
    const normalOut = path.join(electron.app.getPath("userData"), "track_normal.mp3");
    const audioUrl = await convertToMp3(discovered.trackPath, normalOut);
    response.trackNormal = {
      fileName: path.basename(discovered.trackPath),
      audioUrl
    };
  }
  if (discovered.instrumentalPath) {
    const instOut = path.join(electron.app.getPath("userData"), "track_instrumental.mp3");
    const audioUrl = await convertToMp3(discovered.instrumentalPath, instOut);
    response.trackInstrumental = {
      fileName: path.basename(discovered.instrumentalPath),
      audioUrl
    };
  }
  if (discovered.recordingPath) {
    const recOut = path.join(electron.app.getPath("userData"), "track_recording.mp3");
    const audioUrl = await convertToMp3(discovered.recordingPath, recOut);
    response.trackRecording = {
      fileName: path.basename(discovered.recordingPath),
      audioUrl
    };
  }
  if (discovered.vocalsPath) {
    const vocalsOut = path.join(electron.app.getPath("userData"), "track_vocals_phase.mp3");
    const audioUrl = await convertToMp3(discovered.vocalsPath, vocalsOut);
    response.trackVocals = {
      fileName: path.basename(discovered.vocalsPath),
      audioUrl
    };
  }
  return response;
}
function getAvailableTestFolders() {
  const results = [];
  const candidates = [
    path.join(process.cwd(), "test-assets"),
    path.join(electron.app.getAppPath(), "test-assets")
  ];
  const testAssetsDir = candidates.find((dir) => fs__namespace.existsSync(dir));
  if (!testAssetsDir) return results;
  try {
    const rootEntries = fs__namespace.readdirSync(testAssetsDir, { withFileTypes: true });
    const hasCategoryDirs = rootEntries.some(
      (e) => e.isDirectory() && ["tracks", "instrumentals", "vocals"].includes(e.name.toLowerCase())
    );
    if (hasCategoryDirs) {
      results.push({
        name: "Default (test-assets/)",
        path: testAssetsDir
      });
    }
    for (const entry of rootEntries) {
      if (entry.isDirectory() && !["tracks", "instrumentals", "vocals", ".git"].includes(entry.name.toLowerCase())) {
        results.push({
          name: entry.name,
          path: path.join(testAssetsDir, entry.name)
        });
      }
    }
  } catch (err) {
    console.error("Error finding test asset folders:", err);
  }
  return results;
}
function registerTestAssetIpc() {
  electron.ipcMain.handle("select-test-folder", async () => {
    const focusedWindow = electron.BrowserWindow.getFocusedWindow();
    const options = {
      title: "Select Test Asset Folder",
      properties: ["openDirectory"]
    };
    const result = focusedWindow ? await electron.dialog.showOpenDialog(focusedWindow, options) : await electron.dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }
    return { canceled: false, folderPath: result.filePaths[0] };
  });
  electron.ipcMain.handle("load-test-folder", async (_, folderPath) => {
    try {
      let targetPath = folderPath;
      if (!targetPath) {
        const focusedWindow = electron.BrowserWindow.getFocusedWindow();
        const options = {
          title: "Select Test Asset Folder",
          properties: ["openDirectory"]
        };
        const result = focusedWindow ? await electron.dialog.showOpenDialog(focusedWindow, options) : await electron.dialog.showOpenDialog(options);
        if (result.canceled || result.filePaths.length === 0) {
          return { canceled: true };
        }
        targetPath = result.filePaths[0];
      }
      return await loadTestAssetFolder(targetPath);
    } catch (error) {
      console.error("Error loading test asset folder:", error);
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("get-test-asset-folders", async () => {
    try {
      return getAvailableTestFolders();
    } catch (error) {
      console.error("Error getting test asset folders:", error);
      return [];
    }
  });
}
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
  utils.electronApp.setAppUserModelId("com.karaoscore");
  registerTestAssetIpc();
  electron.ipcMain.handle("download-audio", async (_, url, type = "track") => {
    try {
      const outputPath = path.join(electron.app.getPath("userData"), `track_${type}.mp3`);
      console.log(`Downloading ${type} audio from ${url}...`);
      await ytDlp(url, {
        extractAudio: true,
        audioFormat: "mp3",
        output: outputPath,
        ffmpegLocation: ffmpegStatic || void 0,
        noCheckCertificate: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: ["referer:youtube.com", "user-agent:Mozilla/5.0"],
        noOverwrites: false
      });
      console.log("Download complete! Reading file to base64...");
      const fs2 = require("fs");
      const buffer = await fs2.promises.readFile(outputPath);
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
      const fs2 = require("fs");
      const buffer = await fs2.promises.readFile(outputPath);
      const base64Audio = buffer.toString("base64");
      const dataUri = `data:audio/mp3;base64,${base64Audio}`;
      return { success: true, audioUrl: dataUri };
    } catch (error) {
      console.error("Normalize error:", error);
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("save-recording", async (_, buffer) => {
    try {
      const fs2 = require("fs");
      const rawPath = path.join(electron.app.getPath("userData"), "track_recording_raw.webm");
      const outputPath = path.join(electron.app.getPath("userData"), "track_recording.mp3");
      console.log(`Saving ${buffer.length} bytes of user recording...`);
      await fs2.promises.writeFile(rawPath, Buffer.from(buffer));
      const { spawn } = require("child_process");
      await new Promise((resolve, reject) => {
        const proc = spawn(ffmpegStatic, ["-y", "-i", rawPath, outputPath]);
        proc.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`ffmpeg conversion failed with code ${code}`));
        });
      });
      console.log("Recording converted to mp3! Reading to base64...");
      const convertedBuffer = await fs2.promises.readFile(outputPath);
      const base64Audio = convertedBuffer.toString("base64");
      const dataUri = `data:audio/mp3;base64,${base64Audio}`;
      return { success: true, audioUrl: dataUri };
    } catch (error) {
      console.error("Save recording error:", error);
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
      const fs2 = require("fs");
      const buffer = await fs2.promises.readFile(outputPath);
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
      const fs2 = require("fs");
      if (fs2.existsSync(demucsCmd)) {
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
  electron.ipcMain.handle("isolate-vocals-demucs", async (_, trackType = "normal") => {
    try {
      const inputPath = path.join(electron.app.getPath("userData"), `track_${trackType}.mp3`);
      const outputDir = path.join(electron.app.getPath("userData"), "demucs_output");
      const isWindows = process.platform === "win32";
      const venvDir = path.join(electron.app.getPath("userData"), "ai-env");
      const demucsCmd = path.join(venvDir, isWindows ? "Scripts" : "bin", isWindows ? "demucs.exe" : "demucs");
      console.log(`Isolating vocals via Demucs AI from track_${trackType}.mp3...`);
      const { spawn } = require("child_process");
      await new Promise((resolve, reject) => {
        const proc = spawn(demucsCmd, ["--two-stems", "vocals", "-n", "htdemucs", "-o", outputDir, inputPath]);
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
      const fs2 = require("fs");
      const trackStem = `track_${trackType}`;
      const vocalsPath = path.join(outputDir, "htdemucs", trackStem, "vocals.wav");
      const noVocalsPath = path.join(outputDir, "htdemucs", trackStem, "no_vocals.wav");
      const buffer = await fs2.promises.readFile(vocalsPath);
      const base64Audio = buffer.toString("base64");
      const dataUri = `data:audio/wav;base64,${base64Audio}`;
      let instrumentalUri = void 0;
      if (fs2.existsSync(noVocalsPath)) {
        const instrumentalMp3 = path.join(electron.app.getPath("userData"), "track_instrumental.mp3");
        await new Promise((resolveConvert) => {
          const cvt = spawn(ffmpegStatic, ["-y", "-i", noVocalsPath, instrumentalMp3]);
          cvt.on("close", () => resolveConvert());
        });
        const noVocalsBuffer = await fs2.promises.readFile(noVocalsPath);
        instrumentalUri = `data:audio/wav;base64,${noVocalsBuffer.toString("base64")}`;
      }
      return { success: true, audioUrl: dataUri, instrumentalUrl: instrumentalUri };
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
