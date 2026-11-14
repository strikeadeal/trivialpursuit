// Sound effects made with the Web Audio API, so there are no audio files to load.
// Each sound is a list of notes: [frequency in Hz, start in seconds, length in seconds].
const SOUNDS = {
  roll: [[220, 0, 0.04], [330, 0.08, 0.04], [262, 0.16, 0.04], [392, 0.24, 0.04], [294, 0.32, 0.04], [440, 0.4, 0.04]],
  move: [[523, 0, 0.07]],
  correct: [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.2]],
  wrong: [[220, 0, 0.15], [165, 0.15, 0.3]],
  win: [[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.5]],
}

let ctx

export function play(name) {
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    for (const [freq, at, length] of SOUNDS[name]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = ctx.currentTime + at
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.18, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + length)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + length)
    }
  } catch {
    // No audio available: play silently.
  }
}
