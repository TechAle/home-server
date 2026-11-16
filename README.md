# home-server

Monorepo con due progetti:

| Cartella | Stack | Descrizione |
|---|---|---|
| `client/` | React Native 0.79 (bare, TypeScript) | App per Android, iOS e macOS |
| `server/` | Python + Flask | API e servizi (AniList, info macchina, ecc.) |

## Prerequisiti

- Node.js >= 18 e Yarn
- Xcode + CocoaPods (iOS/macOS)
- Android SDK con `ANDROID_HOME` impostato
- Python 3 con `pip`

## Server

```sh
cd server
python3 -m pip install -r requirements.txt

# Solo la prima volta: crea il file dei segreti e compilalo
cp .env.example .env

python3 flaskMain.py   # oppure la run configuration "Server: Flask"
```

Il server parte su `http://127.0.0.1:5000` con debug/reload attivo.

### Variabili d'ambiente (`.env`)

I segreti **non** sono nel repository. `server/.env.example` è il modello
versionato; `server/.env` è ignorato da git.

| Variabile | Dove si trova |
|---|---|
| `ANILIST_CLIENT_SECRET` | <https://anilist.co/settings/developer> (si può rigenerare) |
| `ANILIST_ACCESS_TOKEN` | Flusso OAuth (`AnilistManager.auth()`); dura circa un anno |

Se una variabile manca, il server si ferma subito con un messaggio esplicito
che indica di copiare `.env.example` in `.env`.

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
