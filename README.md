# home-server

Monorepo con due progetti:

| Cartella | Stack | Descrizione |
|---|---|---|
| `client/` | React Native 0.79 (bare, TypeScript) | App per Android, iOS e macOS |
| `server/` | Node.js + TypeScript (Express) | API e servizi (AniList, info macchina, ecc.) |

## Prerequisiti

- Node.js >= 22 (npm per il server, Yarn per il client)
- Xcode + CocoaPods (iOS/macOS)
- Android SDK con `ANDROID_HOME` impostato

## Server

```sh
cd server
npm install
npm run build

# Solo la prima volta: crea il file dei segreti e compilalo
cp .env.example .env

npm start   # oppure la run configuration "Server: Node"
```

Il server parte su `http://127.0.0.1:5000`. Per il reload automatico usa `npm run dev`.

### Variabili d'ambiente (`.env`)

I segreti **non** sono nel repository. `server/.env.example` è il modello
versionato; `server/.env` è ignorato da git.

| Variabile | Dove si trova |
|---|---|
| `ANILIST_CLIENT_SECRET` | <https://anilist.co/settings/developer> (si può rigenerare) |
| `ANILIST_ACCESS_TOKEN` | Flusso OAuth AniList (authorization code); dura circa un anno |
| `REGISTRATION_KEY` | Una stringa lunga a tua scelta: serve per registrare un utente (vuota = registrazione disattivata) |

Il server crea `server/data/home-server.db` al primo avvio (ignorato da git).
I token di sessione sono salvati solo come hash; il client tiene la chiave
nelle proprie cache e la invia come `Authorization: Bearer`.

Se il token manca, il server parte comunque: `/get_anime` risponde `503` con un
messaggio che indica di copiare `.env.example` in `.env`.

Le impostazioni non segrete (URL API, client ID, redirect URI) restano in
`server/configuration.json`.

> **Nota sicurezza:** client secret e access token erano già presenti nella
> storia git. Vanno considerati compromessi: rigenera il secret e revoca il
> token su AniList.

## Client

```sh
cd client
yarn install

# La prima volta, o dopo un cambio di dipendenze native:
(cd ios   && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install)
(cd macos && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install)
```

Avvio:

| Piattaforma | Comando | Run configuration |
|---|---|---|
| Android | `yarn android` | `Client: Android` |
| iOS | `yarn ios` | `Client: iOS` |
| macOS | `yarn macos` | `Client: macOS` |
| Metro (bundler) | `yarn start` | `Client: Metro` |

Le run configuration sono in `.run/` e vengono caricate automaticamente da
WebStorm. Con Metro attivo le modifiche JS/TS si aggiornano da sole
(Fast Refresh); le modifiche native richiedono un rebuild.

Se l'app era già aperta quando Metro è cambiato, chiudila con `Cmd+Q` e
rilancia: un normale Run riattiva solo la finestra esistente.
