# 🚀 Nasazení na Render.com (ZDARMA!)

## Co to je

Render.com = free hosting pro tvůj ExifTool server
- **750 hodin/měsíc ZDARMA** (stačí)
- **Žádná kreditka na free tieru**
- Podporuje Docker + ExifTool

## Nasazení (3 kliky)

### 1️⃣ Vytvoř GitHub repo

```bash
cd /Users/perignon/Desktop/mori-team-app

# Init git (pokud ještě není)
git init
git add .
git commit -m "Add ExifTool spoofer"

# Push na GitHub
gh repo create mori-team-app --private --source=. --remote=origin --push
```

### 2️⃣ Deploy na Render.com

1. Jdi na: **https://render.com**
2. Klikni **"Get Started for Free"**
3. Přihlaš se přes GitHub
4. Klikni **"New +"** → **"Web Service"**
5. Vyber tvůj repo: **mori-team-app**
6. Render automaticky najde `render.yaml` a nastaví vše!
7. Klikni **"Create Web Service"**

### 3️⃣ Zkopíruj URL

Po deployi dostaneš URL typu:
```
https://mori-spoofer.onrender.com
```

## Nastav Cloudflare

Teď řekni Cloudflare, kam má proxovat:

### Možnost A: Environment Variable (doporučeno)

1. Jdi na: https://dash.cloudflare.com
2. Pages → **mori-team-app** → Settings → Environment variables
3. Přidej:
   ```
   EXIFTOOL_SPOOFER_URL = https://mori-spoofer.onrender.com/spoof-video
   ```

### Možnost B: Hardcode do kódu

Uprav `functions/spoof-video.js`:
```javascript
const EXIFTOOL_URL = context.env.EXIFTOOL_SPOOFER_URL ||
  'https://mori-spoofer.onrender.com/spoof-video'; // <-- TVOJE URL
```

## Deploy Cloudflare

```bash
npm run deploy
```

## ✅ Hotovo!

Frontend: **https://assexp.pages.dev/admin.html**
- Nahraj video
- Vyber iPhone + město
- Stáhni spoofnuté video
- **iPhone vidí metadata!** 🎉

## Důležité

- **Render free tier**: Po 15 minutách nečinnosti service "usne"
- První request po probuzení trvá ~30 sekund
- Další requesty jsou rychlé (~2 sekundy)
- **Řešení**: Ping service každých 10 minut (Cloudflare Cron Worker)

## Troubleshooting

### Render build failed
- Zkontroluj že máš `Dockerfile` a `render.yaml` v root složce
- Zkontroluj že `exiftool-server.js` existuje

### Cloudflare nemůže volat Render
- Zkontroluj URL v environment variables
- Zkontroluj Render logs: https://dashboard.render.com

### Video není spoofnuté
- Otevři Render logs a hledej chyby
- Otestuj přímo Render URL s curl:
  ```bash
  curl -X POST -F "video=@test.mov" -F "city=Prague" -F "device=iPhone 16 Pro" \
    https://mori-spoofer.onrender.com/spoof-video > output.mov
  ```
