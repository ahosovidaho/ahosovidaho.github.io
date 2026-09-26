# Konzervativní delegování na lokální Ollama modely

Tento repozitář může pro rutinní, read-only pomocné úlohy používat lokální Ollama modely. Účelem je snížit spotřebu cloudových tokenů, aniž by byla ohrožena kvalita, bezpečnost nebo kontrola nad změnami.

## Používané modely

### `granite4.2:8b`

Primární lokální model pro:

- extrakci významových informací z již zúženého výřezu,
- klasifikaci,
- sumarizaci,
- normalizaci dat,
- strukturované JSON transformace vyžadující interpretaci (jinak použij `jq`),
- kontrolu a porovnání dlouhých textů,
- identifikaci relevantních částí HTML, JavaScriptu a CSS,
- jednoduché read-only analýzy logů a dat.

### `qwen3.5:9b`

Používej pouze pro:

- jednoduchou izolovanou analýzu kódu,
- vysvětlení malé části kódu,
- návrhy jednoduchých lokálních transformací,
- druhý názor na malý, přesně vymezený coding problém.

## Základní pravidla

1. Lokální modely jsou pouze pomocníci pro read-only analýzu a přípravu podkladů.
2. Výstup lokálního modelu je vždy návrh, nikdy autoritativní rozhodnutí.
3. Lokální model nesmí sám:
   - upravovat produkční HTML, JavaScript ani CSS,
   - měnit Firebase konfiguraci,
   - spouštět `GT7_firestore_seed.js`,
   - provádět zápisy do Firestore nebo Firebase,
   - vytvářet Git commit,
   - provádět Git push,
   - mergovat změny,
   - upravovat GitHub Actions,
   - provádět síťové nebo bezpečnostně citlivé změny.
4. Lokální modely nikdy nedostávají secrets, access tokeny, API klíče ani jiné citlivé údaje.
5. Cílem lokální delegace je snížit spotřebu cloudových tokenů na rutinních úlohách, nikoli přesunout důležité rozhodování z hlavního Codex modelu.

## Povinnosti hlavního Codex modelu

Hlavní Codex model musí vždy převzít:

- architektonická rozhodnutí,
- bezpečnostní rozhodnutí,
- změny ovlivňující produkci,
- změny více souborů s nejasnými závislostmi,
- práci s autentizací, tokeny nebo credentials,
- nejasné nebo konfliktní požadavky,
- situace, kdy výstup lokálního modelu působí nejistě nebo nekonzistentně,
- finální kontrolu a verifikaci výsledku.

Pokud lokální model navrhne změnu kódu, hlavní Codex model ji musí nezávisle ověřit před jakoukoli editací.

Pokud existuje více podobných, starých nebo testovacích souborů, hlavní Codex model musí nejdřív ověřit správný cílový soubor a nesmí spoléhat pouze na lokální model.

## Princip směrování úloh

**Prefer deterministic local tools first.**

Při každé běžné úloze rozhodni routing automaticky; uživatele se neptej, zda použít Ollamu. Pokud by režie delegace byla vyšší než očekávaná úspora cloudových tokenů, Ollamu nepoužívej.

1. Pokud lze úlohu spolehlivě vyřešit deterministickým lokálním nástrojem bez LLM, použij nejprve tento nástroj. Platí to zejména pro vyhledání URL, přesné hledání řetězců, deduplikaci, řazení, počítání výskytů, jednoduché filtrování, čtení Git diffu a hledání souborů. Vhodnými nástroji jsou například `rg`, `grep`, `find`, `sort`, `uniq`, `jq`, `git`, `sed`, `awk` a jiné deterministické read-only nástroje.
2. Nečti velké množství souborů hlavním cloudovým modelem, pokud je lze nejprve lokálně zúžit. Preferuj tok: repozitář → deterministické filtrování → malý relevantní výřez → případně Ollama → kompaktní výsledek → hlavní Codex model. Lokálnímu LLM předávej jen minimum informací nutných pro subtask.
3. Pokud po deterministickém filtrování zbývá malá, read-only a snadno ověřitelná úloha vyžadující sémantické porozumění, klasifikaci významu, sumarizaci nebo interpretaci, můžeš ji automaticky delegovat na Ollamu. Výstup vyžádej stručný a pokud možno strukturovaný.
4. Použij `granite4.2:8b` pro sumarizaci, významovou klasifikaci, porovnání podobných textů, normalizaci, extrakci významových informací, posouzení relevance a vytvoření krátkého strukturovaného podkladu.
5. Použij `qwen3.5:9b` pouze pro malou a izolovanou read-only analýzu kódu, vysvětlení malé funkce nebo úseku kódu, porovnání dvou krátkých implementací nebo určení pravděpodobného významu konkrétního kódu.
6. Hlavní Codex model použij pro rozhodnutí, co skutečně změnit, komplexní reasoning, architekturu, debugging přes více komponent, editace souborů, změny s vedlejšími účinky, bezpečnost, autentizaci, Firebase/Firestore, GitHub Actions, produkční konfiguraci a finální verifikaci.

Cílem není maximalizovat používání Ollamy, ale minimalizovat celkovou spotřebu cloudových tokenů při zachování spolehlivosti.

## Selhání a ověřování lokální delegace

- Pokud Ollama vrátí prázdný výstup, selže, timeoutuje nebo vrátí zjevně chybný či nekonzistentní výsledek, neopakuj slepě stejný požadavek ani nevytvářej dlouhé retry smyčky. Pokračuj hlavním Codex modelem nebo deterministickým nástrojem podle povahy úlohy.
- Výsledky Ollamy ověřuj cíleně, nikoli kompletním zopakováním celé delegované práce. Pokud například označí konkrétní soubor nebo funkci jako relevantní, ověř jen tento závěr pomocí `rg`, `git`, README nebo přečtením malého relevantního výřezu.
- Nesmí vzniknout postup „Ollama provede práci → Codex znovu přečte úplně všechno od začátku“.

## Transparentnost

Na konci každé větší úlohy přidej stručnou sekci:

```text
Cost routing:
- deterministic tools: ano/ne
- local Ollama: model nebo ne
- cloud Codex: k čemu byl použit
```

Nevypisuj interní reasoning; stačí stručně uvést, co bylo kam směrováno.

## Rozhodovací pravidlo

Použij `granite4.2:8b`, pokud je úloha převážně:

- extraction,
- classification,
- summarization,
- normalization,
- repetitive comparison,
- structured transformation.

Použij `qwen3.5:9b`, pokud je úloha:

- malá,
- izolovaná,
- coding-related,
- read-only,
- snadno ověřitelná.

Jinak úlohu ponech hlavnímu Codex modelu.
