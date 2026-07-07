import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 44100;

/**
 * A bright, bouncy "cartoon" tone: exponential pitch glide (not linear —
 * that's what makes a sweep sound like a springy hop instead of a synth
 * sweep) under an exponential-decay envelope, with a sub-octave layer for
 * body, a bright upper-harmonic layer for toy-like sparkle, and optional
 * vibrato for a "boing" wobble.
 */
function blob({
	duration,
	freqStart,
	freqEnd = freqStart,
	amp = 0.5,
	attack = 0.003,
	decay = 20,
	sub = 0.3,
	bright = 0.28,
	brightRatio = 2,
	vibratoRate = 0,
	vibratoDepth = 0,
}) {
	const n = Math.max(1, Math.floor(duration * SAMPLE_RATE));
	const samples = new Float32Array(n);
	const attackSamples = Math.max(1, attack * SAMPLE_RATE);
	const freqRatio = freqEnd / freqStart;
	let phase = 0;
	let subPhase = 0;
	let brightPhase = 0;
	for (let i = 0; i < n; i++) {
		const t = i / SAMPLE_RATE;
		const frac = i / n;
		const baseFreq = freqStart * freqRatio ** frac;
		const vibrato =
			vibratoRate > 0
				? 1 + vibratoDepth * Math.sin(2 * Math.PI * vibratoRate * t)
				: 1;
		const freq = baseFreq * vibrato;
		phase += (2 * Math.PI * freq) / SAMPLE_RATE;
		subPhase += (2 * Math.PI * freq * 0.5) / SAMPLE_RATE;
		brightPhase += (2 * Math.PI * freq * brightRatio) / SAMPLE_RATE;
		const attackEnv = i < attackSamples ? i / attackSamples : 1;
		const env = attackEnv * Math.exp(-decay * t);
		samples[i] =
			(Math.sin(phase) + sub * Math.sin(subPhase) + bright * Math.sin(brightPhase)) *
			amp *
			env;
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

/** Scales a buffer so its peak sample hits `target`, for consistent loudness. */
function normalize(samples, target = 0.92) {
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
	// Bright, quick upward chirp — a snappy "blip" instead of a flat beep.
	click: blob({ duration: 0.06, freqStart: 650, freqEnd: 950, decay: 30, bright: 0.32 }),

	// Springy upward boing — "picking something up".
	pickup: blob({
		duration: 0.13,
		freqStart: 380,
		freqEnd: 700,
		decay: 14,
		bright: 0.3,
		vibratoRate: 32,
		vibratoDepth: 0.06,
	}),

	// Springy downward boing — a bouncy little landing.
	drop: blob({
		duration: 0.15,
		freqStart: 700,
		freqEnd: 360,
		decay: 12,
		sub: 0.35,
		bright: 0.28,
		vibratoRate: 28,
		vibratoDepth: 0.06,
	}),

	// Playful descending "womp womp" with a wobble, not a harsh buzz.
	error: mixAt(0.3, [
		{
			samples: blob({
				duration: 0.14,
				freqStart: 480,
				freqEnd: 380,
				decay: 12,
				sub: 0.35,
				bright: 0.2,
				vibratoRate: 20,
				vibratoDepth: 0.08,
			}),
			offset: 0,
		},
		{
			samples: blob({
				duration: 0.18,
				freqStart: 360,
				freqEnd: 260,
				decay: 9,
				sub: 0.4,
				bright: 0.2,
				vibratoRate: 16,
				vibratoDepth: 0.08,
			}),
			offset: 0.12,
		},
	]),

	// Bright staccato 3-note ascending arpeggio — a snappy "coin get".
	success: mixAt(0.26, [
		{ samples: blob({ duration: 0.08, freqStart: 600, freqEnd: 650, decay: 22 }), offset: 0 },
		{ samples: blob({ duration: 0.08, freqStart: 800, freqEnd: 850, decay: 22 }), offset: 0.06 },
		{
			samples: blob({ duration: 0.12, freqStart: 1050, freqEnd: 1100, decay: 16, bright: 0.32 }),
			offset: 0.12,
		},
	]),

	// Fuller staccato 4-note ascending run with a shimmering flourish on the last note.
	complete: mixAt(0.34, [
		{ samples: blob({ duration: 0.07, freqStart: 500, freqEnd: 520, decay: 24 }), offset: 0 },
		{ samples: blob({ duration: 0.07, freqStart: 650, freqEnd: 670, decay: 24 }), offset: 0.06 },
		{ samples: blob({ duration: 0.07, freqStart: 820, freqEnd: 840, decay: 22, bright: 0.32 }), offset: 0.12 },
		{
			samples: blob({
				duration: 0.16,
				freqStart: 1040,
				freqEnd: 1080,
				decay: 11,
				bright: 0.35,
				vibratoRate: 24,
				vibratoDepth: 0.04,
			}),
			offset: 0.18,
		},
	]),
};

for (const [name, samples] of Object.entries(sounds)) {
	writeWav(path.join(outDir, `${name}.wav`), normalize(samples));
}

console.log("Wrote", Object.keys(sounds).join(", "), "to", outDir);
