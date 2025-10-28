# ahosovidaho.github.io

## Jak zobrazit soubor `startpage.html`

Pokud potřebuješ zkopírovat čistý HTML kód bez diff značek (`+`/`-`), otevři samotný soubor místo diff náhledu:

1. **V terminálu** spusť například `cat startpage.html` nebo `less startpage.html`. Obsah se vypíše bez prefixů.
2. **V editoru** otevři soubor pomocí `nano startpage.html`, `vim startpage.html` nebo libovolného GUI editoru.
3. **Aktuální verzi z Gitu** dostaneš rovnou příkazem `git show startpage.html > /tmp/startpage.html`, který uloží HTML bez diff prefixů do `/tmp/startpage.html`.
4. **Konkrétní revizi** můžeš vypsat i ve tvaru `git show <revize>:startpage.html > /tmp/startpage.html` a soubor pak běžně otevřít.
5. **V GitHub webovém rozhraní** klikni na soubor `startpage.html` v seznamu souborů repozitáře (ne v diffu). Nad kódem najdeš tlačítka „Raw“, „Blame“ apod. Klikni na **Raw** a zobrazí se čistý HTML bez `+` nebo `-`, který můžeš rovnou kopírovat.

Takto uvidíš plný obsah `startpage.html` bez diff zvýraznění a můžeš jej pohodlně kopírovat.
