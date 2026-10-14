# Ricerca layout, versione 1.4.0

Obiettivo: trovare layout e griglie utili a chi lavora in editoria, brand, web e UI, packaging, poster e social, che Reticolo non aveva ancora. Metodo: ricerche web per area, poi scelta in base a tre criteri: serve davvero su un artboard, si descrive con geometria esatta, ha una fonte riconoscibile.

> **Limiti della ricerca.** In questo ambiente potevo leggere solo i risultati dei motori di ricerca, non le pagine intere. Le proporzioni vengono dai riassunti e dalla convergenza di più fonti. Dove una misura è una regola pratica e non uno standard, è segnalato qui sotto. Verifica sempre con le specifiche ufficiali prima di una consegna.

## Aggiunto

| Layout | Cosa disegna | Natura |
|---|---|---|
| Doppia pagina | Due blocchi del canone di Van de Graaf specchiati: margine interno 1/9, esterno 2/9, alto H/9, basso 2H/9, dorso forte, diagonali di pagina | Metodo storico (canone), proporzioni standard del metodo |
| Gutenberg | Quattro zone, diagonale di lettura dall'alto a sinistra al basso a destra | Modello di lettura, schematico |
| Lettura a Z | Percorso a 4 punti per pagine con poco testo | Modello di lettura, schematico |
| Lettura a F | Due barre orizzontali e un gambo a sinistra, per pagine di testo | Ricerca di eye tracking (Nielsen Norman Group), schematico |
| Lista + dettaglio | 1/3 + 2/3 con gutter | Layout canonico Material 3, proporzione indicativa |
| Pannello di supporto | 2/3 + 1/3 con gutter | Layout canonico Material 3, proporzione indicativa |
| App shell | Barra laterale W/6, barra superiore H/14, contenuto | Schema comune, valori scelti da me |
| Vesica piscis | Due cerchi con i centri a distanza r, assi, due triangoli equilateri | Costruzione geometrica |
| Cerchi triangolare / quadrato | Reticolo di cerchi di raggio pari al passo, ritagliati sul riquadro | Costruzione geometrica |
| Icona Android adaptive | Canvas 108, area visibile 72, area sicura circolare 66 | Valori diffusi nelle guide Android |
| Pieghe | Bifold, trifold a Z, lettera a C, gate fold, 4 ante | Come colonne con rapporti, vedi sotto |

## Pieghe: cosa è esatto e cosa no

Le pieghe sono preset di colonne con gutter 0 e rapporti: 97 / 100 / 100 per la lettera a C (l'anta che si ripiega dentro è più stretta di circa 2-3 mm perché lo spessore della carta non la faccia gonfiare), 1 / 2 / 1 per il gate fold. I millimetri reali dipendono dalla carta e dalla tipografia: usa i rapporti come punto di partenza e chiedi il fustellato allo stampatore.

## Escluso, e perché

- **Griglia iOS e app icon Apple**: le specifiche cambiano a ogni versione di sistema e il template ufficiale è il riferimento giusto.
- **Roll fold**: le misure cambiano per grammatura e numero di ante, nessun valore affidabile trovato.
- **Griglia gerarchica e griglia a compartimenti**: senza un caso d'uso chiaro sono solo moduli, già coperti dal tab Modulare.
- **Zone sicure di altre piattaforme**: cambiano troppo spesso per essere inserite come se fossero stabili.

## Fonti consultate

Riassunti dei motori di ricerca su: canone di Van de Graaf e doppia pagina, diagramma di Gutenberg e lettura a Z e F, layout canonici di Material 3 (lista-dettaglio, pannello di supporto), icone adaptive Android, pieghe di brochure, vesica piscis e griglie di cerchi per loghi. Le pagine non sono state lette per intero.


---

# Layout web e bento responsivo, versione 1.5.0

Seconda ricerca: layout per il web e un bento in cui scegli la misura di ogni blocco. Come la prima, si basa solo sui riassunti dei motori di ricerca, non su pagine lette per intero.

## Come funziona la responsività in Reticolo

Una griglia disegnata su un artboard è statica, quindi la responsività è codificata così: **la larghezza dell'artboard decide la versione**. Con "Tutti gli artboard", un artboard desktop, uno tablet e uno mobile ricevono ciascuno la propria disposizione, calcolata dalle stesse misure che hai dato.

| Larghezza artboard | Classe | Colonne del bento |
|---|---|---|
| sotto 600 | compact (mobile) | 4 |
| da 600 a 839 | medium (tablet) | 8 |
| da 840 | expanded (desktop) | 12 |

Soglie 600 e 840 e colonne 4 / 8 / 12: [window size classes di Material 3](https://developer.android.com/develop/ui/compose/layouts/adaptive/window-size-classes) per le soglie; il numero di colonne per classe viene da guide che seguono Material (non dalla specifica ufficiale, che non ho letto). Le soglie sono fisse nel motore (`BP_MEDIUM`, `BP_EXPANDED`).

## Bento responsivo

- Ogni blocco si scrive `LxA`: larghezza in colonne (su 12) e altezza in righe. Esempio: `6x4 3x2 3x2 6x2`.
- Su tablet e mobile la larghezza si **scala in proporzione** (arrotondata, minimo 1 colonna). Per una misura esatta si aggiunge `/tablet/mobile`: `4x2/4/2` vale 4 su 12, 4 su 8 e 2 su 4.
- I blocchi si dispongono **in ordine nel primo spazio libero**, come `grid-auto-flow: dense` in CSS. L'ordine visivo può quindi differire dall'ordine di scrittura: è lo stesso compromesso di accessibilità che segnalano le guide CSS.
- **Altezza riga 0** adatta le righe all'artboard. Con un valore fisso, i blocchi che non entrano non vengono disegnati.
- Il bento predefinito è costruito perché a 12, 8 e 4 colonne non resti nessun buco. Con misure tue, specie in proporzione, possono restare spazi vuoti: si correggono con gli override per tablet e mobile.

Scelte confermate dalle guide trovate: almeno tre stati (desktop, tablet, mobile); su mobile, controllo esplicito di larghezze e ordine invece di impilare tutto; altezza di riga fissa che ritaglia il contenuto su mobile, da cui l'opzione "adatta".

## Altri layout web aggiunti

Tutti seguono le stesse classi di larghezza.

| Layout | Expanded | Medium | Compact |
|---|---|---|---|
| Card auto-fit | colonne = quante ne entrano con la larghezza minima scelta (come `repeat(auto-fit, minmax(...))`) | idem | idem |
| Holy grail | header, tre colonne, footer | header, navigazione + contenuto, striscia laterale, footer | tutto impilato |
| Hero + 4 card | hero + 4 card in riga | hero + 2 x 2 | hero + 4 impilate |
| Schermo diviso | 7 / 5 | 7 / 5 | 60 / 40 impilato |
| Dashboard | sidebar, barra, 4 KPI, grafico 2/3 + lista 1/3, tabella | sidebar ridotta a barra | senza sidebar, KPI 2 x 2 |

Le proporzioni interne (altezza header, larghezza sidebar, ecc.) sono valori scelti da me come punto di partenza, non standard.

## Non incluso

- **Masonry**: altezze dipendenti dal contenuto, non descrivibili con blocchi di misura nota.
- **Breakpoint personalizzati**: per ora fissi. Se ti servono (per esempio Tailwind 640 / 768 / 1024 / 1280) si possono rendere modificabili.
- **Esportazione del codice CSS**: fuori dallo scopo di un pannello di griglie, ma il bento è già descritto in termini di colonne, righe e span.

Fonti consultate: guide su bento grid e CSS Grid (breakpoint, span per classe, `grid-auto-flow: dense`, `minmax(0, 1fr)`, altezza di riga su mobile), pattern di layout CSS (holy grail, sidebar, card `auto-fit`), documentazione Android sulle window size classes.
