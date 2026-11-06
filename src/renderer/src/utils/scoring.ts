export interface ScoreResult {
  overallScore: number // 0 - 100
  pitchScore: number // 0 - 100
  timingScore: number // 0 - 100
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  totalVoicedFrames: number
  matchedFrames: number
  feedback: string
  details: {
    perfectPercent: number
    goodPercent: number
    missPercent: number
  }
}

/**
 * Detects fundamental frequency using Normalized Autocorrelation with parabolic interpolation.
 */
function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
  const minFreq = 70 // C2
  const maxFreq = 900 // ~A5
  const minLag = Math.floor(sampleRate / maxFreq)
  const maxLag = Math.floor(sampleRate / minFreq)
  const W = buffer.length

  // Energy check (RMS) to filter out breath, background hum and silence
  let sumSq = 0
  for (let i = 0; i < W; i++) {
    sumSq += buffer[i] * buffer[i]
  }
  const rms = Math.sqrt(sumSq / W)
  if (rms < 0.012) return null

  let bestLag = -1
  let maxCorr = -1
  const corrs = new Float32Array(maxLag + 2)

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0
    let energy = 0
    for (let i = 0; i < W - lag; i++) {
      corr += buffer[i] * buffer[i + lag]
      energy += buffer[i] * buffer[i] + buffer[i + lag] * buffer[i + lag]
    }
    const normCorr = energy > 0 ? (2 * corr) / energy : 0
    corrs[lag] = normCorr
    if (normCorr > maxCorr) {
      maxCorr = normCorr
      bestLag = lag
    }
  }

  // Threshold for periodicity
  if (maxCorr > 0.45 && bestLag > minLag && bestLag < maxLag) {
    const alpha = corrs[bestLag - 1]
    const beta = corrs[bestLag]
    const gamma = corrs[bestLag + 1]
    const denom = 2 * (alpha - 2 * beta + gamma)
    const delta = denom !== 0 ? (alpha - gamma) / denom : 0
    const refinedLag = bestLag + delta
    if (refinedLag > 0) {
      return sampleRate / refinedLag
    }
  }

  return null
}

function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440)
}

/**
 * Extracts a sequence of pitch values (MIDI semitones or null) across 30ms time slices.
 */
function extractPitchTrack(audioBuffer: AudioBuffer, hopSeconds = 0.03): (number | null)[] {
  const sampleRate = audioBuffer.sampleRate
  const length = audioBuffer.length
  const ch0 = audioBuffer.getChannelData(0)
  const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : null

  // Mix down to mono
  const mono = new Float32Array(length)
  if (ch1) {
    for (let i = 0; i < length; i++) {
      mono[i] = (ch0[i] + ch1[i]) * 0.5
    }
  } else {
    mono.set(ch0)
  }

  const hopSize = Math.floor(sampleRate * hopSeconds)
  const windowSize = 2048
  const totalFrames = Math.floor((length - windowSize) / hopSize)
  const pitchTrack: (number | null)[] = []
  const frameBuf = new Float32Array(windowSize)

  for (let i = 0; i < totalFrames; i++) {
    const start = i * hopSize
    for (let j = 0; j < windowSize; j++) {
      frameBuf[j] = mono[start + j]
    }
    const freq = detectPitch(frameBuf, sampleRate)
    pitchTrack.push(freq ? freqToMidi(freq) : null)
  }

  return pitchTrack
}

/**
 * Finds the optimal frame shift within [-maxShift, maxShift] to account for audio device latency.
 */
function findBestLatencyOffset(
  guidePitches: (number | null)[],
  userPitches: (number | null)[],
  maxShift = 10 // ~300ms
): number {
  let bestShift = 0
  let maxMatches = -1

  for (let shift = -maxShift; shift <= maxShift; shift++) {
    let matches = 0
    for (let i = 0; i < guidePitches.length; i++) {
      const uIdx = i + shift
      if (uIdx < 0 || uIdx >= userPitches.length) continue
      const g = guidePitches[i]
      const u = userPitches[uIdx]
      if (g !== null && u !== null) {
        let diff = Math.abs(g - u) % 12
        if (diff > 6) diff = 12 - diff
        if (diff <= 1.5) matches++
      }
    }
    if (matches > maxMatches) {
      maxMatches = matches
      bestShift = shift
    }
  }

  return bestShift
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const B64_LOOKUP = new Uint8Array(256)
for (let i = 0; i < B64_CHARS.length; i++) {
  B64_LOOKUP[B64_CHARS.charCodeAt(i)] = i
}

/**
 * Fast direct in-memory Base64 to ArrayBuffer decoder.
 * Completely avoids Chromium's URL-length limits on giant data URIs.
 */
function base64ToArrayBuffer(base64Str: string): ArrayBuffer {
  const commaIdx = base64Str.indexOf(',')
  const b64 = commaIdx >= 0 ? base64Str.slice(commaIdx + 1).replace(/\s/g, '') : base64Str.replace(/\s/g, '')

  let len = b64.length
  if (b64.endsWith('==')) len -= 2
  else if (b64.endsWith('=')) len -= 1
  const byteLength = (len * 3) >>> 2
  const bytes = new Uint8Array(byteLength)

  let p = 0
  for (let i = 0; i < b64.length; i += 4) {
    const enc1 = B64_LOOKUP[b64.charCodeAt(i)]
    const enc2 = B64_LOOKUP[b64.charCodeAt(i + 1)]
    const enc3 = B64_LOOKUP[b64.charCodeAt(i + 2)]
    const enc4 = B64_LOOKUP[b64.charCodeAt(i + 3)]

    bytes[p++] = (enc1 << 2) | (enc2 >> 4)
    if (p < byteLength) bytes[p++] = ((enc2 & 15) << 4) | (enc3 >> 2)
    if (p < byteLength) bytes[p++] = ((enc3 & 3) << 6) | enc4
  }
  return bytes.buffer
}

/**
 * Decodes audio from any URL (data URI, blob URL, or HTTP) into an AudioBuffer.
 */
async function decodeAudio(url: string): Promise<AudioBuffer> {
  let arrayBuffer: ArrayBuffer
  if (url.startsWith('data:')) {
    arrayBuffer = base64ToArrayBuffer(url)
  } else {
    const response = await fetch(url)
    arrayBuffer = await response.arrayBuffer()
  }

  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const audioCtx = new AudioContextClass()
  try {
    return await new Promise<AudioBuffer>((resolve, reject) => {
      const promise = audioCtx.decodeAudioData(arrayBuffer, resolve, reject)
      if (promise && typeof promise.then === 'function') {
        promise.then(resolve).catch(reject)
      }
    })
  } finally {
    audioCtx.close().catch(() => {})
  }
}

/**
 * Compares isolated guide vocals to the singer's vocal input and produces a detailed score.
 */
export async function calculateVocalScore(guideUrl: string, userUrl: string): Promise<ScoreResult> {
  const [guideBuf, userBuf] = await Promise.all([decodeAudio(guideUrl), decodeAudio(userUrl)])

  const guidePitches = extractPitchTrack(guideBuf)
  const userPitches = extractPitchTrack(userBuf)

  // Align potential recording device latency
  const shift = findBestLatencyOffset(guidePitches, userPitches, 10)

  let totalGuideVoiced = 0
  let totalUserVoiced = 0
  let overlappingVoiced = 0
  let perfectCount = 0
  let goodCount = 0
  let missCount = 0

  const compareLength = guidePitches.length

  for (let i = 0; i < compareLength; i++) {
    const g = guidePitches[i]
    const uIdx = i + shift
    const u = uIdx >= 0 && uIdx < userPitches.length ? userPitches[uIdx] : null

    if (g !== null) {
      totalGuideVoiced++
      if (u !== null) {
        overlappingVoiced++
        // Octave-invariant pitch distance in semitones
        let diff = Math.abs(g - u) % 12
        if (diff > 6) diff = 12 - diff

        if (diff <= 0.8) {
          perfectCount++
        } else if (diff <= 1.8) {
          goodCount++
        } else {
          missCount++
        }
      } else {
        missCount++
      }
    }

    if (u !== null) {
      totalUserVoiced++
    }
  }

  if (totalGuideVoiced === 0 || totalUserVoiced === 0) {
    return {
      overallScore: 0,
      pitchScore: 0,
      timingScore: 0,
      grade: 'D',
      totalVoicedFrames: totalGuideVoiced,
      matchedFrames: 0,
      feedback:
        'No sustained vocals detected in one or both tracks. Ensure the singer audio is clear and audible.',
      details: {
        perfectPercent: 0,
        goodPercent: 0,
        missPercent: 100
      }
    }
  }

  // Pitch Accuracy (% of guide notes matched within tolerance)
  const pitchRaw = ((perfectCount * 1.0 + goodCount * 0.65) / totalGuideVoiced) * 100
  const pitchScore = Math.min(100, Math.max(0, Math.round(pitchRaw)))

  // Timing overlap (Intersection over Union of voiced activity)
  const unionVoiced = totalGuideVoiced + totalUserVoiced - overlappingVoiced
  const timingRaw = unionVoiced > 0 ? (overlappingVoiced / unionVoiced) * 100 : 0
  const timingScore = Math.min(100, Math.max(0, Math.round(timingRaw)))

  // Weighted overall score
  const overallRaw = pitchScore * 0.7 + timingScore * 0.3
  const overallScore = Math.min(100, Math.max(0, Math.round(overallRaw)))

  // Details
  const perfectPercent = Math.round((perfectCount / totalGuideVoiced) * 100)
  const goodPercent = Math.round((goodCount / totalGuideVoiced) * 100)
  const missPercent = Math.max(0, 100 - perfectPercent - goodPercent)

  // Grade classification
  let grade: 'S' | 'A' | 'B' | 'C' | 'D' = 'D'
  if (overallScore >= 90) grade = 'S'
  else if (overallScore >= 80) grade = 'A'
  else if (overallScore >= 70) grade = 'B'
  else if (overallScore >= 50) grade = 'C'
  else grade = 'D'

  // Qualitative feedback
  let feedback = ''
  if (grade === 'S') {
    feedback =
      'Outstanding performance! Superb pitch accuracy and tight rhythmic alignment with the guide track.'
  } else if (grade === 'A') {
    feedback =
      'Great job! Strong vocal control with very close pitch tracking on the majority of the melody.'
  } else if (grade === 'B') {
    feedback = 'Solid take! Good sense of melody with minor pitch drift on transition notes.'
  } else if (grade === 'C') {
    feedback =
      'Promising start! Watch the melody phrasing and try to sustain notes with the reference vocals.'
  } else {
    feedback =
      'Keep practicing! Focus on locking onto the reference melody pitch and starting phrases in rhythm.'
  }

  return {
    overallScore,
    pitchScore,
    timingScore,
    grade,
    totalVoicedFrames: totalGuideVoiced,
    matchedFrames: perfectCount + goodCount,
    feedback,
    details: {
      perfectPercent,
      goodPercent,
      missPercent
    }
  }
}
