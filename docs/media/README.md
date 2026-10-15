# Video di presentazione (Reticolo 2.0)

Due versioni: **15 s** con musica ritmata (`reticolo-2.0-update.mp4`) e **20 s** con musica delicata da spot (`reticolo-2.0-spot-20s.mp4`, stessa regia a tempi dilatati, tono più morbido, slogan finale "Your grid. One click.").

- `reticolo-2.0-update.mp4`: 15 s, 1920 x 1080, 30 fps, con audio.
- `reticolo-2.0-poster.jpg`: fotogramma di copertina.
- `reticolo-2.0-spot-20s.mp4`: 20 s, 1920 x 1080, 30 fps, con audio. Copertina: `reticolo-2.0-spot-20s-poster.jpg`.

**Musica.** Le tracce sono originali: sono sintetizzate da zero con `tools/video/music.py` (15 s: 128 BPM, 8 battute, Do maggiore) e `tools/video/music20.py` (20 s: 96 BPM, 8 battute, piano, campane e pad con eco), senza campioni né brani di terzi, quindi non ci sono diritti di terzi da gestire. Per rigenerarla: `python3 tools/video/music.py musica.wav` (o `music20.py`) (serve numpy).

**Immagini.** Le griglie mostrate sono quelle vere calcolate da `js/engine.js`. Le icone Ai, Ps, Id e Figma sono disegnate a mano in forma semplificata a scopo illustrativo: Adobe, Illustrator, Photoshop, InDesign e Figma sono marchi dei rispettivi proprietari, e Reticolo è un progetto indipendente, non affiliato né approvato da Adobe o Figma. Il simbolo "Built with Claude" è un'icona generica a raggiera, non il logo ufficiale.
