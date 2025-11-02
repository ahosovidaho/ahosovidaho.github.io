(function(){
  const WORKER = 'https://ucg-heartbeat.m88wqgcdpd.workers.dev';
  const TOKEN  = 'blablablaBlaBlablAbLalalalablueBlaBadeeeeeBlueisthewindowandBlueistheWorldyabadabadooooo';

  const NETBOX_ID = 'netBox';
  const ROW_ID = 'ucg-heartbeat';

  function ensureRow(){
    const box = document.getElementById(NETBOX_ID);
    if(!box) return null;

    let row = document.getElementById(ROW_ID);
    if (!row){
      row = document.createElement('div');
      row.id = ROW_ID;
      row.className = 'svc-row';
      row.innerHTML = `
        <div class="svc-left"><span class="dot"></span><strong>Gateway (veřejná)</strong></div>
        <span class="svc-hint">Načítám…</span>
      `;
      // vlož na začátek boxu (ať je první)
      box.insertBefore(row, box.firstChild || null);
    }
    return row;
  }

  function setRow(state, hint){
    const row = ensureRow();
    if(!row) return;
    const dot = row.querySelector('.dot');
    const hintEl = row.querySelector('.svc-hint');
    if (dot) dot.className = 'dot ' + state; // ok | bad | warn
    if (hintEl) hintEl.textContent = hint;
  }

  async function refresh(){
    try{
      const u = new URL(WORKER + '/status');
      u.searchParams.set('token', TOKEN);
      const r = await fetch(u.toString(), { cache:'no-store' });
      const j = await r.json();
      if (j.online){
        const t = j.last_seen ? new Date(j.last_seen) : null;
        const when = t ? t.toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) : 'n/a';
        setRow('ok', `online · poslední beat ${when} · age ${j.age_sec}s`);
      } else {
        setRow('bad', 'offline · žádný beat ≤ 90 s');
      }
    } catch(e){
      setRow('warn', 'heartbeat nedostupný');
    }
  }

  // 1) hned teď
  ensureRow();
  refresh();

  // 2) každou minutu
  setInterval(refresh, 60_000);

  // 3) kdykoli stránka přepíše #netBox, znovu ten náš řádek vložíme nahoru
  const ro = new MutationObserver(() => {
    ensureRow(); // zajistí přítomnost řádku i po přepsání
  });
  window.addEventListener('DOMContentLoaded', () => {
    const box = document.getElementById(NETBOX_ID);
    if (box) ro.observe(box, { childList:true, subtree:false });
  });
})();
