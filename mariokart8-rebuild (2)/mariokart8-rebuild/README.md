# MK8 Web local rebuild

## Required: use `node serve.mjs` (not plain http.server)

Plain `python -m http.server` does **not** provide `/romfs/` → error:
`no game files served at ...`

`serve.mjs` serves the site **and** proxies `/romfs/` from mariokart8.online (caches in `romfs-cache/`).

```bash
cd mariokart8-rebuild
node serve.mjs
```

Windows: double-click `serve.cmd`

Then open: **http://127.0.0.1:8080/?sw=0&clear=1**  
Hard refresh: Ctrl+Shift+R

Need Node: https://nodejs.org (LTS).

## If you already had the "no game files" error

1. Stop the old server (Ctrl+C)
2. Start **`node serve.mjs`** (not python)
3. Hard refresh the page

## Official site

https://mariokart8.online/ — no local server needed.
