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
