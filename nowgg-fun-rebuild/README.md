# nowgg.fun rebuild

Static front-end that routes game launches through the `*.ip.<your-domain>` proxy.

## Local

```bash
npm install
npm start
# http://localhost:3000
```

Or without Node:

```bash
https://73.ip.imoggedeveryonemewing.up.railway.app/apps/a/19900/b.exampleurl
```

When opened on localhost or a Railway-generated `*.up.railway.app` domain, app launches use the live `*.ip.nowgg.fun` proxy. The local Python server only serves this front-end; it does not provide the proxy itself.

## Deploy on Railway

### Option A — GitHub (recommended)

1. Create a GitHub repo and push this folder as the root:
   ```bash
   cd nowgg-fun-rebuild
   git init
   git add .
   git commit -m "nowgg.fun rebuild"
   git branch -M main
   git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
   git push -u origin main
   ```
2. Go to [railway.com/new](https://railway.com/new)
3. **Deploy from GitHub repo** → select the repo
4. Wait for build/deploy
5. Service → **Settings** → **Networking** → **Generate Domain**
6. Open `https://your-app.up.railway.app`

### Option B — CLI (no GitHub)

```bash
# install CLI: https://docs.railway.com/guides/cli
npm i -g @railway/cli
railway login
cd nowgg-fun-rebuild
railway init
railway up
railway domain
```

### Notes

- Uses Express to serve static files and listen on `process.env.PORT` (required by Railway)
- No env vars needed
- Custom domain: Settings → Networking → Custom Domain

## Bring your own domain (BYOD)

After deploying and connecting a custom domain (for example, `ngg.frogiee.one`), add these DNS A records with your DNS provider, both pointing to `69.164.251.212`:

- `ngg.frogiee.one` — the normal hostname where you open the site
- `*.ip.ngg.frogiee.one` — the wildcard hostname used for game launches

Replace `ngg.frogiee.one` with your own custom domain. Open the launcher at the normal hostname; it derives the wildcard launch hostname from that domain automatically.
