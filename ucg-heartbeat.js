(function(){
  const WORKER = 'https://ucg-heartbeat.m88wqgcdpd.workers.dev';
  const TOKEN  = 'blablablaBlaBlablAbLalalalablueBlaBadeeeeeBlueisthewindowandBlueistheWorldyabadabadooooo';

  const NETBOX_ID = 'netBox';
  const ROW_ID = 'ucg-heartbeat';
  const BAD_PHRASES = ['Gateway nedostupná', 'Další testy přeskočeny'];

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

  // Tvrdý úklid: odstraní červený "Gateway nedostupná" i samotný text "Další testy přeskočeny"
  function cleanupLegacy(){
    const box = $('#'+NETBOX_ID);
    if(!box) return;

    // 1) Smaž prvky, jejichž text přesně odpovídá
    box.querySelectorAll('*').forEach(el=>{
      if (el.id === ROW_ID) return;
      const t = (el.textContent || '').trim();
      for (const p of BAD_PHRASES){
        if (t === p || t === p + '.') { el.remove(); return; }
      }
    });

    // 2) Smaž i holé textové uzly obsahující fráze
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT, null);
    const toKill = [];
    let n;
    while ((n = walker.nextNode())){
      const txt = n.textContent || '';
      if (BAD_PHRASES.some(p => txt.includes(p))) toKill.push(n);
    }
    toKill.forEach(n=>{
      // když v uzlu není nic jiného, rovnou ho zruš
      const cleaned = n.textContent
        .replace('Další testy přeskočeny.', '')
        .replace('Další testy přeskočeny', '')
        .replace('Gateway nedostupná', '')
        .trim();
      if (cleaned) n.textContent = cleaned;
      else if (n.parentNode) n.parentNode.removeChild(n);
    });

    // 3) Smaž řádek se .dot.bad a textem "Gateway" (kromě našeho)
    box.querySelectorAll('.svc-row').forEach(r=>{
      if (r.id === ROW_ID) return;
      const strong = r.querySelector('.svc-left strong');
      const dotBad = r.querySelector('.dot.bad');
      if (dotBad && strong && /gateway/i.test(strong.textContent || '')) r.remove();
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
      // po každém běhu vyčisti rušivé fragmenty
      cleanupLegacy();
    }
  }

  function attachObserver(){
    const box = $('#'+NETBOX_ID);
    if(!box) return;
    // Kdykoli se box přepíše, vrátíme náš řádek a znovu uklidíme
    const ro = new MutationObserver(() => { ensureRow(); cleanupLegacy(); });
    ro.observe(box, { childList:true, subtree:true, characterData:true });
  }

  function init(){
    ensureRow();
    refresh();
    setInterval(refresh, 60_000);
    if (document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', attachObserver, { once:true });
    } else {
      attachObserver();
    }
    // pár opožděných úklidů pro jistotu (Firefox/Safari)
    [100, 400, 1200].forEach(d => setTimeout(cleanupLegacy, d));
  }

  init();
})();
