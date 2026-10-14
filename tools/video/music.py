"""Musichetta originale per il video di Reticolo: 15 s esatti, 128 BPM, 8 battute, sintetizzata da zero.
Composizione e suoni sono generati da questo script, quindi non c'e' nessun brano o campione di terzi:
niente copyright da gestire. Uso: python3 music.py out.wav"""
import sys
import numpy as np

SR = 44100
BPM = 128
BEAT = 60 / BPM
BAR = BEAT * 4              # 1.875 s
DUR = BAR * 8               # 15.0 s
N = int(SR * DUR)
rng = np.random.default_rng(7)

L = np.zeros(N)
R = np.zeros(N)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def add(sig, t0, pan=0.0, gain=1.0):
    i = int(t0 * SR)
    if i >= N:
        return
    seg = sig[: N - i]
    L[i:i + len(seg)] += seg * gain * (1 - max(0, pan))
    R[i:i + len(seg)] += seg * gain * (1 + min(0, pan))


def env(n, a=0.005, d=0.1, s=0.0, r=0.05):
    t = np.arange(n) / SR
    e = np.ones(n)
    ai = int(a * SR)
    e[:ai] = np.linspace(0, 1, ai, endpoint=False) if ai else e[:ai]
    di = int(d * SR)
    dec = np.linspace(1, s, di) if di else np.array([])
    e[ai:ai + di] = dec[: max(0, n - ai)]
    e[ai + di:] = s
    ri = min(int(r * SR), n)
    e[n - ri:] *= np.linspace(1, 0, ri)
    return e


def lowpass(x, cutoff):
    a = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for k in range(len(x)):
        acc += a * (x[k] - acc)
        y[k] = acc
    return y


def osc(freq, n, kind="saw"):
    t = np.arange(n) / SR
    ph = (freq * t) % 1.0
    if kind == "saw":
        return 2 * ph - 1
    if kind == "square":
        return np.where(ph < 0.5, 1.0, -1.0)
    if kind == "tri":
        return 4 * np.abs(ph - 0.5) - 1
    return np.sin(2 * np.pi * ph)


def kick():
    n = int(0.28 * SR)
    t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 11) * 1.0


def snare():
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    noise = noise - lowpass(noise, 1500)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)
    return (noise * np.exp(-t * 20) * 0.7 + tone * 0.4)


def clap():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    noise = lowpass(noise, 6000) - lowpass(noise, 900)
    e = np.exp(-t * 18)
    for off in (0.0, 0.012, 0.024):
        e = e + np.where(t > off, np.exp(-(t - off) * 60), 0) * 0.6
    return noise * e * 0.5


def hat(open_=False):
    n = int((0.22 if open_ else 0.05) * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    noise = noise - lowpass(noise, 7000)
    return noise * np.exp(-t * (14 if open_ else 80)) * 0.35


def pluck(freq, dur, bright=3500):
    n = int(dur * SR)
    s = osc(freq, n, "saw") * 0.6 + osc(freq * 1.005, n, "square") * 0.25
    s = lowpass(s, bright)
    return s * env(n, 0.003, 0.12, 0.25, 0.04)


def bass_note(freq, dur):
    n = int(dur * SR)
    s = osc(freq, n, "saw") * 0.6 + osc(freq / 2, n, "sin") * 0.7
    s = lowpass(s, 520)
    return s * env(n, 0.004, 0.08, 0.7, 0.03)


def stab(freqs, dur):
    n = int(dur * SR)
    s = sum(osc(f, n, "saw") + osc(f * 1.007, n, "saw") for f in freqs) / (2 * len(freqs))
    s = lowpass(s, 2400)
    return s * env(n, 0.004, 0.09, 0.0, 0.03)


def pad(freqs, dur):
    n = int(dur * SR)
    s = sum(osc(f, n, "tri") for f in freqs) / len(freqs)
    s = lowpass(s, 1400)
    return s * env(n, 0.25, 0.2, 0.8, 0.35) * 0.5


# Do maggiore, giro pop: C G Am F | C G F C
CH = [
    (36, [60, 64, 67]),   # C
    (43, [59, 62, 67]),   # G (rivolto)
    (45, [60, 64, 69]),   # Am
    (41, [60, 65, 69]),   # F
    (36, [60, 64, 67]),   # C
    (43, [59, 62, 67]),   # G
    (41, [60, 65, 69]),   # F
    (36, [60, 64, 67, 72]),   # C finale
]
PENTA = [0, 2, 4, 7, 9]

for bar, (root, tones) in enumerate(CH):
    t0 = bar * BAR
    last = bar == 7
    # pad lungo
    add(pad([mtof(m - 12) for m in tones], BAR * (2 if last else 1.02)), t0, 0.0, 0.5)
    # cassa: sempre, tranne la battuta 0 (entra a meta') e finale
    for b in range(4):
        tb = t0 + b * BEAT
        if last and b > 0:
            continue
        if bar == 0 and b < 2:
            continue
        add(kick(), tb, 0, 0.95)
    # clap/snare su 2 e 4
    if bar >= 1 and not last:
        for b in (1, 3):
            add(clap(), t0 + b * BEAT, 0.1, 0.8)
            add(snare(), t0 + b * BEAT, -0.1, 0.35)
    # hi-hat a ottavi + open hat sui controtempi
    if bar >= 1 and not last:
        for e in range(8):
            add(hat(False), t0 + e * BEAT / 2, 0.3, 0.8 if e % 2 == 0 else 0.5)
        for b in range(4):
            add(hat(True), t0 + b * BEAT + BEAT / 2, -0.3, 0.55)
    # basso a ottavi saltellanti
    if bar >= 1 and not last:
        for e in range(8):
            m = root + (12 if e % 4 == 3 else 0)
            add(bass_note(mtof(m), BEAT / 2 * 0.9), t0 + e * BEAT / 2, 0, 0.7)
    elif last:
        add(bass_note(mtof(root), BAR * 1.4), t0, 0, 0.8)
    # accordi in levare (stab) dalla battuta 1
    if bar >= 1 and not last:
        for b in range(4):
            add(stab([mtof(m) for m in tones], BEAT * 0.4), t0 + b * BEAT + BEAT / 2, 0.15, 0.4)
    # arpeggio a sedicesimi: dalla battuta 2, piu' fitto verso la fine
    if bar >= 2 and not last:
        k = 0
        for s in range(16):
            if bar < 4 and s % 2 == 1:
                continue
            note = tones[(k * 2 + (s // 4)) % len(tones)] + (12 if (s // 4) % 2 else 0) + (12 if bar >= 5 else 0)
            add(pluck(mtof(note + 12), BEAT / 4 * 1.6), t0 + s * BEAT / 4, -0.2 if s % 2 else 0.2, 0.32)
            k += 1
    # melodia scintillante pentatonica in battute 4-6 (ottavi)
    if 3 <= bar <= 6:
        pat = [0, 2, 4, 2, 3, 4, 2, 1] if bar % 2 else [4, 3, 2, 1, 2, 3, 4, 4]
        for e in range(8):
            note = 72 + PENTA[pat[e] % 5] + (0 if bar < 5 else 5)
            add(pluck(mtof(note), BEAT * 0.45, 4800), t0 + e * BEAT / 2, 0.0, 0.34)
    # finale: nota alta di chiusura
    if last:
        for i, m in enumerate([72, 76, 79, 84]):
            add(pluck(mtof(m), BAR * 1.1, 5000), t0 + i * 0.02, (i - 1.5) * 0.2, 0.3)

# riser in bianco prima dell'ultima battuta (la musica "prende fiato" prima del finale)
n = int(BAR * 0.9 * SR)
t = np.arange(n) / SR
noise = rng.standard_normal(n)
riser = (noise - lowpass(noise, 2000)) * np.linspace(0, 1, n) ** 2 * 0.22
add(riser, 7 * BAR - BAR * 0.9, 0, 1.0)
# colpo di tamburo finale e cassa
add(kick(), 7 * BAR, 0, 1.0)

# sidechain leggero: abbassa tutto per un attimo sui colpi di cassa
sc = np.ones(N)
for bar in range(8):
    for b in range(4):
        if bar == 0 and b < 2:
            continue
        if bar == 7 and b > 0:
            continue
        i = int((bar * BAR + b * BEAT) * SR)
        m = min(int(0.12 * SR), N - i)
        sc[i:i + m] *= np.linspace(0.62, 1.0, m)
L *= sc
R *= sc

# fade in/out
fi = int(0.05 * SR)
fo = int(0.9 * SR)
L[:fi] *= np.linspace(0, 1, fi)
R[:fi] *= np.linspace(0, 1, fi)
L[-fo:] *= np.linspace(1, 0, fo)
R[-fo:] *= np.linspace(1, 0, fo)

peak = max(np.abs(L).max(), np.abs(R).max())
g = 0.89 / peak  # circa -1 dBFS
out = np.stack([L * g, R * g], axis=1)
pcm = (np.clip(out, -1, 1) * 32767).astype("<i2")

import wave
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("ok", round(DUR, 3), "s, picco", round(float(np.abs(out).max()), 3))
