# Gran Turismo 7 Championship

Web pro soukromý šampionát GT7. Stránky jsou statické a jsou publikované z repozitáře GitHub Pages. Výsledky a plán závodů jsou uloženy ve Firebase Firestore.

## Důležité soubory

| Soubor / složka | Účel |
| --- | --- |
| `sezona2026.html` | Produkční stránka. Odkazy z hlavního webu vedou sem. |
| `sezona2026_admin_test.html` | Testovací kopie pro ověření změn administrace a auditu. |
| `sezona2025.html` | Archiv sezóny 2025. |
| `archive/` | Starší kopie stránek sezóny 2026. Původní adresy se do archivu přesměrují. |
| `cars.json` | Seznam vozů pro našeptávač v administraci. |
| `tracks.json` | Seznam tratí pro našeptávač v administraci. |
| `zmeny171.html` | Poznámky k aktualizaci GT7 1.71. |

## Adresy

- Produkce: `https://www.tamayo.cz/GranTurismo/sezona2026.html`
- Test: `https://www.tamayo.cz/GranTurismo/sezona2026_admin_test.html`

## Data a zabezpečení

- Firebase projekt používaný stránkou: `test-gt7`.
- Kolekce `zavody` je veřejně čitelná; zápis smí provádět jen účet správce definovaný ve Firestore Rules.
- Kolekce `audit_logs` je soukromý neměnný audit pro správce. Nové záznamy se sem ukládají i při smazání závodu.
- Konfigurace Firebase ve stránce je veřejná konfigurace klienta. Do repozitáře nikdy neukládej osobní přístupové tokeny GitHubu, privátní klíče ani hesla.

## Bezpečný postup úpravy

1. Běžné změny nejprve proveď v `sezona2026_admin_test.html`.
2. Otevři testovací adresu, přihlas se jako správce a ověř funkci na testovacím závodu.
3. Pokud je změna v pořádku, stejnou úpravu přenes do `sezona2026.html`.
4. Zkontroluj změny a nahraj je na GitHub:

   ```bash
   git status
   git add GranTurismo/
   git commit -m "Popis změny"
   git push origin main
   ```

5. Po nahrání počkej krátce na GitHub Pages a ověř produkční adresu v anonymním okně prohlížeče.

## Správa Firestore

- Pravidla měň ve Firebase Console → **Firestore Database** → **Rules**.
- Před zásahem do skutečných výsledků si vytvoř nebo exportuj zálohu dat.
- Při testování mazání vždy používej závod pojmenovaný například `TEST – smazat`, nikdy reálný závod.

## Administrace

Pouze účet správce může data upravovat. Zabezpečení vynucují Firestore Rules; skrytí formulářů v prohlížeči je jen doplněk uživatelského rozhraní.
