# Předávací protokol – 28. 9. 2026

Souhrn změn webu `www.tamayo.cz` (repo `ahosovidaho/ahosovidaho.github.io`) provedených 28. 9. 2026
v session Claude Code. Určeno pro Codex a další agenty, kteří na změny navazují.

> Složka `_docs/` začíná podtržítkem, Jekyll ji proto **nepublikuje** na web. Soubor je jen v repozitáři.

---

## 1. Jak web funguje (ověřeno)

| Co | Skutečnost |
|---|---|
| Hosting `www.tamayo.cz` | **GitHub Pages**, klasický build z větve `main` (`pages-build-deployment`, `jekyll-build-pages v1.0.13` = Jekyll 3.10, Liquid 4) |
| Jekyll | aktivní (není `.nojekyll`); theme `pages-themes/cayman` přes `remote_theme` |
| Firebase Hosting | **z repa odstraněno** (28. 9. 2026): složka `poplatky/`, `firebase.json` a workflow `.github/workflows/firebase-hosting-deploy.yml`. Workflow nasazoval do Firebase projektu s ID `ct-vyzva` – **to je živý projekt uživatele (zobrazovaný název `verejnopravne-cz`)**, viz sekce 5. Repo nemá žádné GitHub Actions workflow; web staví jen GitHub Pages. |
| Hlavní stránka | `index.html` (soubor `index.md` byl mrtvý – smazán) |
| Složky s `_` | Jekyll je nepublikuje (`_data`, `_includes`, `_docs`) |
| URL bez přípony | `https://www.tamayo.cz/vttv` funguje stejně jako `/vttv.html` (ověřeno uživatelem) |

**Pracovní postup, který uživatel používá:** agent pracuje na větvi → PR do `main` → **sloučení dělá uživatel sám** → agent zkontroluje, že `pages build and deployment` doběhl zeleně.

---

## 2. Sloučené PR (chronologicky)

| PR | Obsah |
|---|---|
| #3 | VTTV: opravy chyb, přístupnost, lazy loading, SEO; **přesun videí do `_data/videos.yml`** a Jekyll šablona |
| #4 | VTTV: **nový design** (tmavý Apple-like, akcent `#FF3B30`), filtry, deep linky, sdílení |
| #5 | `sitemap.xml` lastmod; **úklid 25 nepoužívaných souborů**; `noindex` na 2 stránkách |
| #6 | VTTV: **data videí podle YouTube** + pole `uploaded` |
| #7 | VTTV: **obrázek pro sdílení** `assets/vttv-og.png`; karta VTTV na hlavní stránce bez `target="_blank"` |
| #8 | tento předávací protokol + odkaz v `AGENTS.md` |
| #9 | smazání staré složky `GT7/` + aktualizace protokolu |
| #10 | smazání nepoužívané složky `poplatky/`, `firebase.json` a Firebase workflow |

---

## 3. VTTV stránka (`vttv.html`) – architektura

### Soubory
- **`_data/videos.yml`** – jediný zdroj dat (68 položek: 64 videí + 4 playlisty). Návod je v hlavičce souboru.
- **`vttv.html`** – Jekyll šablona (`layout: null`), generuje karty, filtry, JSON-LD. **Karty se nepíšou ručně do HTML.**
- **`assets/vttv-og.png`** – Open Graph obrázek 1200×630.

### Datový formát (`_data/videos.yml`)
```yaml
- youtube: "rpiZP8cnFi4"          # nebo playlist: "PL…" (pak bez youtube)
  title: "Citroën C3 Aircross Electric 2025"
  date: 2025-10-12                 # rok = rok NATOČENÍ; určuje filtr roků a zobrazené datum
  uploaded: 2025-08-24             # volitelné – jen když se YouTube nahrání liší rokem od date
  short: "Krátký popis na kartu."  # když chybí, použije se description
  description: "Delší popis do okna s přehrávačem."   # když chybí, použije se short
  tags: ["citroën", "c3", "test", "recenze", "2025"]
  thumb: hq                        # volitelné – když YouTube nemá maxres/sd náhled
```

**Pravidla dat (domluvená s uživatelem):**
- Pořadí na webu = **pořadí v souboru** (nahoře nejnovější). Šablona **záměrně neřadí** – Liquid `sort` není stabilní u stejných dat.
- `date` = datum zveřejnění na YouTube, **pokud je ve stejném roce jako natočení**. Pokud bylo video nahráno až v dalším roce, `date` drží rok natočení a skutečné datum je v `uploaded` (aktuálně: Toyota Yaris 2024, Toyota Prius 2024, Mitsubishi ASX 2018, Mitsubishi Outlander 2018).
- JSON-LD `uploadDate` = `uploaded` nebo `date`.
- **Názvy karet (`title`) neměnit** podle YouTube; zejména **nepřidávat značku pořadu „Světem SUV s Martinem Prokopem"** (výslovné přání uživatele).
- Data 64 videí byla ověřena přes `yt-dlp` (`upload_date`) 28. 9. 2026 – všechna videa jsou veřejně dostupná.

### Funkce stránky
- Nahoře „Nejnovější" = **první položka** v `videos.yml`.
- Lišta (sticky): hledání bez diakritiky (`normalize('NFD')`), filtr roků (Liquid `group_by_exp`), řazení nejnovější/nejstarší (přes `data-index`).
- Přehrávač v modalu přes `youtube-nocookie.com`, playlisty přes `embed/videoseries?list=`.
- **Deep link:** `vttv.html#<youtubeID>` nebo `#<playlistID>` otevře video; hash se nastavuje při otevření a maže při zavření.
- Tlačítko **Sdílet**: `navigator.share`, jinak kopie do schránky.
- Náhledy: karty `sddefault`, hero `maxresdefault`; fallback řetězec → `hqdefault` → grafická náhrada (YouTube vrací pro chybějící náhled šedý obrázek 120×90, proto kontrola `naturalWidth <= 120`).
- Přístupnost: karty `role="button"`, `tabindex="0"`, Enter/mezerník; focus trap v modalu, návrat fokusu.
- Ikony jsou inline SVG `<symbol>` (Font Awesome odstraněn).
- JSON-LD `ItemList` + `VideoObject` (jen videa, ne playlisty).

### Známé otevřené body obsahu
- **54 popisů je šablonovitých** („Test… Testujeme… Jak si vede…?"). Plán: stáhnout originální popisy přes `yt-dlp`, navrhnout nové, **schválí uživatel** (obsah pod jeho jménem – neměnit bez schválení).
- Hyundai Ioniq (`7_qhbw8IJVM`) má provizorní popis „Test Hyundai Ioniq." – čeká na text od uživatele.

---

## 4. Úklid (PR #5) – co bylo smazáno a proč

Na žádný soubor nic neodkazovalo (ověřeno `rg` přes repo, `sw.js`, `manifest.webmanifest` **a konfiguraci Homepage na `home.tamayo.cz`**).

- Domácí infrastruktura zbytečně publikovaná: `ucg-heartbeat.js`, `ucg-heartbeat_.js`, `ucg-heartbeat_old.js`, `startpage_test.html`, `startpage_test_ct24.html`, `startpage_test_ct24_ct24fix.html`
- Stará administrace / formuláře nad ostrými Firestore projekty: `GT7/sezona2025_testGPT.html`, `poplatky/index_old.html`, `poplatky/index_old_old.html`, `poplatky/index_old_old_old.html`, `poplatky/index_podpisy_old.html`
- Duplicity a mrtvé: `test.html` (stará kopie VTTV), `index.md`, `GranTurismo/test`, `GT7/GT7script_old.js`, `GT7/GT7sezona2025_old.html`, `GT7/GT7style_old.css`, `GT7/data_old.json`, `GT7/data_old_old.json`, `GT7/sezona2025_old.html`, `GT7/sezona2025_old_old.html`
- Obrázky: `ios-glass-dark_old.jpg`, `ios-glass-light_old.jpg`, `poplatky/bgr_clean_old.png`, `poplatky/share-image_old.png`

**`noindex, nofollow` přidán:** `startpage.html` (osobní PWA, zůstává funkční) a `GranTurismo/sezona2026_admin_test.html`.

**Záměrně ponecháno:** `GranTurismo/archive/`, `GranTurismo/sezona2026_.html`.

**Dodatek (PR #9):** smazána celá složka `GT7/` – stará sezóna 2025 před `GranTurismo/`.
Firestore verze (`GT7sezona2025.html`, `GT7script.js`, `GT7style.css`, `GT7_firestore_seed.js`) četla kolekci `races`,
kterou Firestore Rules zakazují (stránka byla prázdná); statický prototyp (`sezona2025.html`, `script.js`, `styles.css`,
`data.json`) nahradila `GranTurismo/sezona2025.html`. Na nic z toho neodkazoval web ani Homepage. Obnova: revert PR nebo historie gitu.

---

## 5. Bezpečnostní poznámky (bez tajných hodnot)

- **`startpage.html`** je stále veřejná a obsahuje adresu Cloudflare Workeru a tokeny pro stav domácích služeb + 1 privátní IP. Návrh (neschváleno): přesunout na domácí server. Tokeny zůstávají v historii gitu – uživatel má ověřit, co Worker s tokenem umožňuje, případně je rotovat.
- **GT7:** `sezona2026_admin_test.html` používá **stejný Firebase projekt (`test-gt7`) jako ostrá `sezona2026.html`** – „test" zapisuje do ostrých dat.
- **Firestore Rules `test-gt7` ověřeny 28. 9. 2026** (nejsou v repu, jen ve Firebase Console): výchozí zákaz všeho; `zavody` veřejné čtení, zápis jen správce (ověřený e-mail); `zavody/{id}/audit` a `audit_logs` jen přidávání správcem, nikdy úprava/mazání. Stránky v `GranTurismo/` používají pouze `zavody`, `audit`, `audit_logs`. Volitelná vylepšení (neprovedeno): kontrola UID místo e-mailu, validace polí při zápisu.
- **Firebase Web API klíče** v HTML jsou veřejné identifikátory (ne tajemství); ochranu dělají Firestore Rules.
- Agent **nesmí** zapisovat do Firestore (viz `AGENTS.md`). `GT7_firestore_seed.js` byl smazán spolu se složkou `GT7/`.
- **Projekt „poplatky" / veřejnoprávní média – NEZASAHOVAT:** živý projekt uživatele běží **mimo GitHub** (webhosting Forpsi)
  a používá Firebase projekt s **ID `ct-vyzva`** (zobrazovaný název **`verejnopravne-cz`** – je to **tentýž projekt**, potvrzeno uživatelem).
  Z tohoto repa byl se souhlasem uživatele odstraněn pouze nepoužívaný pozůstatek (složka `poplatky/`, `firebase.json`,
  workflow, který ji nasazoval na Firebase Hosting projektu `ct-vyzva`). Firestore ani Auth tohoto projektu se to netýká.
  **Ve Firebase projektu `ct-vyzva` nic nemazat ani nevypínat** (projekt, Hosting, servisní účty) – dřívější doporučení v tomto smyslu
  bylo chybné a je odvoláno. Jediná bezpečná domácí úloha: nepoužívaný GitHub secret `FIREBASE_SERVICE_ACCOUNT` lze smazat (volitelné).

---

## 6. Mimo repozitář (domácí server uživatele – jen pro kontext)

Homepage (`home.tamayo.cz`, Docker kontejner `homepage` na Mac mini M4):
- odkaz na Playlisty změněn na `https://`,
- widget Nextcloud přepnut z uživatelského jména/hesla na **serverinfo token** (`NC-Token`); staré heslo aplikace „Homepage" v Nextcloudu odvoláno,
- **otevřené (odloženo uživatelem):** rotace tokenu (hodnota byla omylem vidět na screenshotu) a smazání záloh `services.yaml.bak-*`.

Tyto věci agent nemá jak ověřit z cloudu – řeší je uživatel ručně.

---

## 7. Ověřování změn (jak to dělat)

### Lokální build jako GitHub Pages
Plný build s `github-pages` gemem v sandboxu padá na `jekyll-github-metadata` (volá GitHub API). Pro ověření stačí Jekyll 3.10.0 + theme bez metadata pluginu:
```bash
# Gemfile (mimo repo): jekyll 3.10.0, kramdown-parser-gfm, jekyll-theme-cayman 0.2.0, jekyll-seo-tag 2.8.0
# override.yml:  remote_theme: null   plugins: [jekyll-seo-tag]
bundle exec jekyll build --source <repo> --destination <out> --config <repo>/_config.yml,override.yml
```
Kontroly po buildu: v `vttv.html` nesmí zůstat `{{` / `{%`; počet `class="video-card"` = počet položek v `videos.yml`; JSON-LD musí projít `json.loads`.

### Náhled větve
`raw.githack.com` zobrazí soubor z větve, ale **nezpracuje Liquid**. Pro náhled šablony se sestavená stránka dočasně ukládala do `_preview/vttv.html` (Jekyll ji nepublikuje) a **před sloučením se maže**.

### Po sloučení
- zkontrolovat běh `pages build and deployment` na `main`,
- při změně OG obrázku obnovit cache: LinkedIn Post Inspector, Facebook Sharing Debugger.

---

## 8. Otevřené úkoly (stav ke konci dne)

| Úkol | Stav |
|---|---|
| Indexování `vttv.html` v Google Search Console | připomínka nastavena na 29. 9. 2026 8:52 (dělá uživatel) |
| Popisy videí z YouTube | odloženo – vyžaduje schválení uživatele |
| Popis a případně datum natočení Hyundai Ioniq | čeká na uživatele |
| Rotace Nextcloud tokenu + smazání `services.yaml.bak-*` | odloženo uživatelem |
| Firestore Rules `test-gt7` | ✅ ověřeno 28. 9. (viz sekce 5) |
| `poplatky/`, `firebase.json`, workflow | ✅ smazáno z repa. Firebase projekt `ct-vyzva` (= `verejnopravne-cz`) **nechat beze změny**; volitelně smazat jen GitHub secret `FIREBASE_SERVICE_ACCOUNT` |
| Cloudflare Worker `ucg-heartbeat` – rozsah tokenů | ověří uživatel |
| Analytika Umami na domácím serveru | nápad na později |
