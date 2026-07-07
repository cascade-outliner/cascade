import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 44100;

/**
 * A warm, soft tone: a steady (or barely-gliding) sine with a strong
 * sub-octave for body, under a slow-attack exponential-decay envelope, with
 * gentle `tanh` saturation to round off the peaks. Deliberately no vibrato
 * and no wide pitch bends — those read as "boingy/twangy" (a plucked
 * string, a spring); a wide, cushiony envelope with heavy sub-bass and
 * almost no pitch movement is what reads as warm and enveloping instead.
 */
function blob({
	duration,
	freqStart,
	freqEnd = freqStart,
	amp = 0.5,
	attack = 0.014,
	decay = 13,
	sub = 0.55,
	bright = 0.04,
	brightRatio = 2,
	drive = 1.15,
}) {
	const n = Math.max(1, Math.floor(duration * SAMPLE_RATE));
	const samples = new Float32Array(n);
	const attackSamples = Math.max(1, attack * SAMPLE_RATE);
	const freqRatio = freqEnd / freqStart;
	const driveNorm = Math.tanh(drive);
	let phase = 0;
	let subPhase = 0;
	let brightPhase = 0;
	for (let i = 0; i < n; i++) {
		const t = i / SAMPLE_RATE;
		const frac = i / n;
		const freq = freqStart * freqRatio ** frac;
		phase += (2 * Math.PI * freq) / SAMPLE_RATE;
		subPhase += (2 * Math.PI * freq * 0.5) / SAMPLE_RATE;
		brightPhase += (2 * Math.PI * freq * brightRatio) / SAMPLE_RATE;
		const attackEnv = i < attackSamples ? i / attackSamples : 1;
		const env = attackEnv * Math.exp(-decay * t);
		const raw = Math.sin(phase) + sub * Math.sin(subPhase) + bright * Math.sin(brightPhase);
		samples[i] = (Math.tanh(raw * drive) / driveNorm) * amp * env;
	}
	return samples;
}

/** A soft, heavily filtered noise burst — a muffled, fabric-like "thud", not a hiss. */
function thud({ duration, amp = 0.22, decay = 45, cutoff = 0.1 }) {
	const n = Math.max(1, Math.floor(duration * SAMPLE_RATE));
	const samples = new Float32Array(n);
	let filtered = 0;
	for (let i = 0; i < n; i++) {
		const t = i / SAMPLE_RATE;
		const white = Math.random() * 2 - 1;
		filtered += cutoff * (white - filtered);
		samples[i] = filtered * amp * Math.exp(-decay * t);
	}
	return samples;
}

/** Additively overlays layers at their given start offsets into one buffer. */
function mixAt(totalDuration, layers) {
	const n = Math.max(1, Math.floor(totalDuration * SAMPLE_RATE));
	const out = new Float32Array(n);
	for (const { samples, offset } of layers) {
		const start = Math.floor(offset * SAMPLE_RATE);
		for (let i = 0; i < samples.length && start + i < n; i++) {
			out[start + i] += samples[i];
		}
	}
	return out;
}

/**
 * A soft settle sequence: each hop is quieter and quicker than the last,
 * the way a cushion or a bean bag settles after being set down — not a
 * spring bouncing. Pitch barely moves between hops (`freqRatio` close to
 * 1); the settling is carried by loudness and timing, not a pitch slide.
 */
function bounceTrain({
	hops,
	freqStart,
	freqRatio = 0.97,
	ampStart = 0.55,
	ampDecay = 0.55,
	gapStart = 0.1,
	gapDecay = 0.6,
	decay = 11,
	sub = 0.55,
	withThud = true,
}) {
	const layers = [];
	let t = 0;
	let amp = ampStart;
	let gap = gapStart;
	let freq = freqStart;
	for (let i = 0; i < hops; i++) {
		const hopDuration = Math.max(0.05, gap * 1.1);
		layers.push({
			samples: blob({
				duration: hopDuration,
				freqStart: freq,
				freqEnd: freq * freqRatio,
				amp,
				decay: decay / Math.max(0.4, gap / gapStart),
				sub,
			}),
			offset: t,
		});
		if (withThud) {
			layers.push({
				samples: thud({ duration: 0.05, amp: 0.16 * (amp / ampStart), decay: 55 }),
				offset: t,
			});
		}
		t += gap;
		amp *= ampDecay;
		gap *= gapDecay;
		freq *= freqRatio;
	}
	return mixAt(t + 0.08, layers);
}

/** Scales a buffer so its peak sample hits `target`, for consistent loudness. */
function normalize(samples, target = 0.9) {
	let peak = 0;
	for (const s of samples) peak = Math.max(peak, Math.abs(s));
	if (peak === 0) return samples;
	const gain = target / peak;
	for (let i = 0; i < samples.length; i++) samples[i] *= gain;
	return samples;
}

function writeWav(filePath, samples) {
	const dataSize = samples.length * 2;
	const buffer = Buffer.alloc(44 + dataSize);
	buffer.write("RIFF", 0);
	buffer.writeUInt32LE(36 + dataSize, 4);
	buffer.write("WAVE", 8);
	buffer.write("fmt ", 12);
	buffer.writeUInt32LE(16, 16);
	buffer.writeUInt16LE(1, 20);
	buffer.writeUInt16LE(1, 22);
	buffer.writeUInt32LE(SAMPLE_RATE, 24);
	buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
	buffer.writeUInt16LE(2, 32);
	buffer.writeUInt16LE(16, 34);
	buffer.write("data", 36);
	buffer.writeUInt32LE(dataSize, 40);
	for (let i = 0; i < samples.length; i++) {
		const s = Math.max(-1, Math.min(1, samples[i]));
		buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
	}
	fs.writeFileSync(filePath, buffer);
}

const defaultOutDir = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"../public/sounds",
);
const outDir = process.argv[2] ?? defaultOutDir;
fs.mkdirSync(outDir, { recursive: true });

const sounds = {
	// A soft, steady tap with a whisper of muffled thud underneath.
	click: mixAt(0.1, [
		{ samples: blob({ duration: 0.09, freqStart: 380, freqEnd: 360, decay: 16 }), offset: 0 },
		{ samples: thud({ duration: 0.03, amp: 0.1, decay: 60 }), offset: 0 },
	]),

	// A gentle, unhurried lift settling into place — barely any pitch movement.
	pickup: bounceTrain({
		hops: 2,
		freqStart: 280,
		freqRatio: 1.06,
		ampStart: 0.45,
		ampDecay: 0.55,
		gapStart: 0.09,
		gapDecay: 0.65,
		decay: 10,
		withThud: false,
	}),

	// The star: a soft object set down, settling to rest like a cushion.
	drop: bounceTrain({
		hops: 4,
		freqStart: 300,
		freqRatio: 0.97,
		ampStart: 0.6,
		ampDecay: 0.55,
		gapStart: 0.11,
		gapDecay: 0.6,
		decay: 9,
		sub: 0.6,
	}),

	// A soft, low descending "womp womp" — a gentle sigh, not a buzz.
	error: mixAt(0.36, [
		{ samples: blob({ duration: 0.16, freqStart: 300, freqEnd: 260, decay: 9, sub: 0.5 }), offset: 0 },
		{ samples: blob({ duration: 0.2, freqStart: 240, freqEnd: 200, decay: 7, sub: 0.55 }), offset: 0.14 },
	]),

	// Gentle staccato 3-note rising hum — steady notes, no per-note glide.
	success: mixAt(0.3, [
		{ samples: blob({ duration: 0.1, freqStart: 300, decay: 14 }), offset: 0 },
		{ samples: blob({ duration: 0.1, freqStart: 360, decay: 13 }), offset: 0.08 },
		{ samples: blob({ duration: 0.15, freqStart: 430, decay: 10 }), offset: 0.16 },
	]),

	// Fuller staccato 4-note rising hum with a soft, held final note.
	complete: mixAt(0.42, [
		{ samples: blob({ duration: 0.09, freqStart: 270, decay: 15 }), offset: 0 },
		{ samples: blob({ duration: 0.09, freqStart: 320, decay: 14 }), offset: 0.08 },
		{ samples: blob({ duration: 0.09, freqStart: 380, decay: 13 }), offset: 0.16 },
		{ samples: blob({ duration: 0.2, freqStart: 460, decay: 8 }), offset: 0.24 },
	]),
};

for (const [name, samples] of Object.entries(sounds)) {
	writeWav(path.join(outDir, `${name}.wav`), normalize(samples));
}

console.log("Wrote", Object.keys(sounds).join(", "), "to", outDir);
