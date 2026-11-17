# Mockup — Home Server UI

Prototipo visivo (solo design/UX) dell'interfaccia di gestione del home server.
Nessun backend: i dati sono simulati e le azioni mostrano dialog e toast finti.

## Avvio

```sh
cd mockup
python3 -m http.server 4173
```

Poi apri <http://127.0.0.1:4173>.

In alternativa è sufficiente aprire `index.html` nel browser.

**Password di prova:** `12345`

## Cosa include

- **Login giorno/notte**: cielo animato Vanta con stelle in tema scuro, cielo chiaro in tema chiaro
- **Dashboard** con lo stato dei servizi: Raspberry Pi, AniList, File Server, Media, Backup
- **Dettaglio servizio con tab**: All / sezioni specifiche
- **Raspberry Pi**: metriche live, grafico CPU, soglia ventola, toggle, riavvio/spegnimento
- **AniList**: sincronizzazione, token, intervallo, notifiche
- **File Server**: spazio, volumi, creazione/rimozione condivisioni
- **Media**: galleria con ricerca, filtri, paginazione ed empty state
- **Backup**: pianificazione, retention, esecuzione con progress bar
- **Dialog riusabile** con stati loading → successo / errore
- **Tema chiaro/scuro** della home e del login (sole → luna), salvato in `localStorage`
- **Nuvole-particella** animate nel tema chiaro (home e login): dimensioni, velocità e profondità diverse
- **Responsive**: drawer laterale con hamburger sotto i 900 px

## Dipendenze esterne

Caricate da CDN, servono solo connessione a internet:

- [Vanta.js](https://www.vantajs.com/) + Three.js per lo sfondo del login
- [picsum.photos](https://picsum.photos) per le immagini di esempio della galleria

Se Vanta non è raggiungibile, il login usa un cielo stellato CSS di fallback.

## File

| File | Contenuto |
|---|---|
| `index.html` | struttura delle schermate |
| `styles.css` | design system, tema chiaro/scuro, componenti |
| `app.js` | dati simulati, navigazione, tab, modali, galleria |

## Nota

Questo mockup è la specifica visiva dell'app React Native in `client/`:
schermate, componenti, stati e tema vanno poi replicati lì.
