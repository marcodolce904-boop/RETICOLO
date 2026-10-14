"""Musichetta delicata, da spot, per la versione da 20 s di Reticolo: 96 BPM, 8 battute (2,5 s l'una) = 20 s esatti.
Sintetizzata da zero (niente brani o campioni di terzi). Uso: python3 music20.py out.wav"""
import sys, wave
import numpy as np

SR = 44100
BPM = 96
BEAT = 60 / BPM
BAR = BEAT * 4
DUR = BAR * 8
N = int(SR * DUR)
rng = np.random.default_rng(11)
L = np.zeros(N); R = np.zeros(N)

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)

def add(sig, t0, pan=0.0, gain=1.0):
    i = int(t0 * SR)
    if i >= N: return
    seg = sig[: N - i]
    L[i:i + len(seg)] += seg * gain * (1 - max(0, pan))
    R[i:i + len(seg)] += seg * gain * (1 + min(0, pan))

def adsr(n, a, d, s, r):
    e = np.ones(n); ai = int(a * SR); di = int(d * SR)
    if ai: e[:ai] = np.linspace(0, 1, ai, endpoint=False)
    seg = np.linspace(1, s, di) if di else np.array([])
    e[ai:ai + di] = seg[: max(0, n - ai)]
    e[ai + di:] = s
    ri = min(int(r * SR), n); e[n - ri:] *= np.linspace(1, 0, ri)
    return e

def lowpass(x, c):
    a = 1 - np.exp(-2 * np.pi * c / SR); y = np.empty_like(x); acc = 0.0
    for k in range(len(x)):
        acc += a * (x[k] - acc); y[k] = acc
    return y

def piano(freq, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * 2 * freq * t) * np.exp(-t * 6)
         + 0.12 * np.sin(2 * np.pi * 3 * freq * t) * np.exp(-t * 10) + 0.25 * np.sin(2 * np.pi * freq * 4.0 * t) * np.exp(-t * 22))
    return s * np.exp(-t * 2.6) * adsr(n, 0.004, 0.0, 1.0, 0.12)

def bell(freq, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) + 0.4 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-t * 4) + 0.2 * np.sin(2 * np.pi * freq * 5.4 * t) * np.exp(-t * 9)
    return s * np.exp(-t * 1.8) * adsr(n, 0.003, 0.0, 1.0, 0.2)

def pad(freqs, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.003 * t + 1.1) + 0.25 * (4 * np.abs((f * 0.5 * t) % 1 - 0.5) - 1) for f in freqs) / len(freqs)
    return lowpass(s, 1800) * adsr(n, 0.7, 0.3, 0.85, 0.9)

def bass(freq, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(2 * np.pi * 2 * freq * t)) * adsr(n, 0.01, 0.2, 0.8, 0.25)

def soft_kick():
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = 52 + 70 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)

def shaker():
    n = int(0.09 * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n); x = x - lowpass(x, 5000)
    return x * np.exp(-t * 45) * np.sin(np.pi * np.minimum(1, t / 0.02))

# Do maggiore, giro morbido: Cmaj7 | Am7 | Fmaj7 | G6 | Cmaj7 | Em7 | Fmaj7 | Cmaj9
CH = [
    (36, [60, 64, 67, 71]), (33, [60, 64, 67, 69]), (41, [60, 64, 65, 69]), (43, [59, 62, 64, 67]),
    (36, [60, 64, 67, 71]), (40, [59, 62, 64, 67]), (41, [60, 64, 65, 69]), (36, [62, 64, 67, 71]),
]
PENTA = [0, 2, 4, 7, 9]
MELODY = {  # nota di campana per battuta: (battuta intera, offset in quarti, grado pentatonico, ottava)
    2: [(0, 4, 5), (1.5, 2, 5), (2.5, 3, 5)],
    3: [(0, 4, 5), (1, 3, 5), (2, 2, 5), (3, 0, 6)],
    4: [(0, 4, 5), (1.5, 2, 5), (2.5, 3, 5)],
    5: [(0, 2, 5), (1, 3, 5), (2, 4, 5), (3, 3, 5)],
    6: [(0, 4, 5), (1.5, 0, 6), (2.5, 4, 5)],
}

for bar, (root, tones) in enumerate(CH):
    t0 = bar * BAR; last = bar == 7
    add(pad([mtof(m - 12) for m in tones], BAR * (2.4 if last else 1.15)), t0, 0.0, 0.55)
    add(bass(mtof(root), BEAT * 2 * 0.95), t0, 0, 0.55)
    if not last:
        add(bass(mtof(root), BEAT * 1.9), t0 + BEAT * 2, 0, 0.42)
    # arpeggio di piano a ottavi, dolce
    if bar >= 0 and not last:
        order = [0, 1, 2, 3, 2, 1, 2, 1] if bar % 2 == 0 else [0, 2, 1, 3, 1, 2, 3, 2]
        for e in range(8):
            note = tones[order[e]] + (12 if e % 4 == 3 else 0)
            vel = 0.5 if e % 2 == 0 else 0.34
            add(piano(mtof(note), BEAT * 1.4), t0 + e * BEAT / 2, -0.15 + 0.3 * (e % 2), vel * (0.7 if bar == 0 else 1.0))
    # cassa morbida e shaker dalla battuta 3
    if 2 <= bar <= 6:
        add(soft_kick(), t0, 0, 0.55)
        add(soft_kick(), t0 + BEAT * 2, 0, 0.45)
        for e in range(8):
            if e % 2 == 1:
                add(shaker(), t0 + e * BEAT / 2, 0.35, 0.16)
    # campane
    for (qb, deg, octv) in MELODY.get(bar, []):
        note = 60 + PENTA[deg % 5] + 12 * (octv - 5) + (0 if octv == 5 else 0)
        add(bell(mtof(note + 12), BEAT * 2.2), t0 + qb * BEAT, 0.2, 0.34)
    if last:
        for i, m in enumerate([72, 76, 79, 83, 86]):
            add(bell(mtof(m), BAR * 1.3), t0 + i * 0.07, (i - 2) * 0.18, 0.28)
        add(piano(mtof(60), BAR * 1.6), t0, 0, 0.5)
        add(piano(mtof(67), BAR * 1.6), t0 + 0.05, 0, 0.4)
        add(piano(mtof(76), BAR * 1.6), t0 + 0.1, 0, 0.36)

# eco a quarti puntati + riverbero sintetico (copie ritardate e ammorbidite)
def echo(x, delay, fb, mix, rounds=4):
    d = int(delay * SR); out = x.copy(); cur = x
    for k in range(rounds):
        sh = np.zeros_like(x); sh[d:] = cur[:-d]; cur = lowpass(sh, 3500) * fb; out += cur * mix
    return out
for ch in (L, R):
    pass
L2 = echo(L, BEAT * 0.75, 0.55, 0.9); R2 = echo(R, BEAT * 0.75 * 1.04, 0.55, 0.9)
rev = lambda x: sum(np.concatenate([np.zeros(int(d * SR)), x[: N - int(d * SR)]]) * g for d, g in
                    [(0.031, 0.32), (0.047, 0.27), (0.067, 0.22), (0.089, 0.18), (0.121, 0.14)])
L = L2 + lowpass(rev(L2), 4200) * 0.55; R = R2 + lowpass(rev(R2), 4200) * 0.55

fi = int(0.4 * SR); fo = int(1.6 * SR)
for ch in (L, R):
    ch[:fi] *= np.linspace(0, 1, fi); ch[-fo:] *= np.linspace(1, 0, fo) ** 1.5
peak = max(np.abs(L).max(), np.abs(R).max())
g = 0.85 / peak
pcm = (np.clip(np.stack([L * g, R * g], 1), -1, 1) * 32767).astype("<i2")
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("ok", round(DUR, 3), "s")
