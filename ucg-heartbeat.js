(function(){
  const WORKER = 'https://ucg-heartbeat.m88wqgcdpd.workers.dev';
  const TOKEN  = 'blablablaBlaBlablAbLalalalablueBlaBadeeeeeBlueisthewindowandBlueistheWorldyabadabadooooo';

  const NETBOX_ID = 'netBox';
  const ROW_ID = 'ucg-heartbeat';

  function $(sel, root=document){ return root.querySelector(sel); }

  function ensureRow(){
    const box = $('#'+NETBOX_ID);
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

  // Uklidíme starý "Gateway nedostupná" a "Další testy přeskočeny." (ponecháme zelené řádky)
  function cleanupLegacy(){
    const box = $('#'+NETBOX_ID);
    if(!box) return;

    // smaž červený gateway řádek (kromě našeho)
    box.querySelectorAll('.svc-row').forEach(r=>{
      if (r.id === ROW_ID) return;
      const strong = r.querySelector('.svc-left strong');
      const dotBad = r.querySelector('.dot.bad');
      if (strong && /gateway/i.test((strong.textContent||'')) && dotBad){
        r.remove();
      }
    });

    // smaž i samostatnou hlášku "Další testy přeskočeny."
    [...box.querySelectorAll('.svc-row, .small, span, div')].forEach(el=>{
      if (el.closest('#'+ROW_ID)) return;
      const t = (el.textContent||'').trim();
      if (t === 'Další testy přeskočeny.' || t.includes('Další testy přeskočeny')){
        el.remove();
      }
    });
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
    } finally {
      // po každém běhu vyčisti rušivé řádky (Firefox/Safari)
      cleanupLegacy();
    }
  }

  function attachObserver(){
    const box = $('#'+NETBOX_ID);
    if(!box) return;
    // pozoruj přepisování boxu – kdykoli se změní, vrátíme náš řádek a uklidíme
    const ro = new MutationObserver(() => { ensureRow(); cleanupLegacy(); });
    ro.observe(box, { childList:true, subtree:true, characterData:true });
  }

  function init(){
    ensureRow(); cleanupLegacy(); refresh();
    setInterval(refresh, 60_000);
    if (document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', attachObserver, {once:true});
    } else {
      attachObserver();
    }
  }

  init();
})();
