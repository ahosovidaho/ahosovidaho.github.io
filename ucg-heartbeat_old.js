(function(){
  const WORKER = 'https://ucg-heartbeat.m88wqgcdpd.workers.dev';

  // služby pod sebou ve widgetu – ponecháváme jen Gateway + Plex
  const SERVICES = [
    { id:'gateway', label:'Gateway (veřejná)', token:'blablablaBlaBlablAbLalalalablueBlaBadeeeeeBlueisthewindowandBlueistheWorldyabadabadooooo' },
    { id:'plex',    label:'Plex server',       token:'plex-ucg-v1' },
  ];

  const NETBOX_ID = 'netBox';
  const BAD_PHRASES = ['Gateway nedostupná', 'Další testy přeskočeny'];

  function $(sel, root=document){ return root.querySelector(sel); }

  function ensureRow(id, label){
    const box = $('#'+NETBOX_ID);
    if(!box) return null;

    let row = $('#svc-'+id);
    if (!row){
      row = document.createElement('div');
      row.id = 'svc-'+id;
      row.className = 'svc-row';
      row.innerHTML = `
        <div class="svc-left"><span class="dot"></span><strong>${label}</strong></div>
        <span class="svc-hint">Načítám…</span>
      `;
      box.appendChild(row);
    }
    return row;
  }

  function setRow(id, state, hint){
    const row = ensureRow(id, SERVICES.find(s=>s.id===id)?.label || id);
    if(!row) return;
    const dot = row.querySelector('.dot');
    const hintEl = row.querySelector('.svc-hint');
    if (dot) dot.className = 'dot ' + state; // ok | bad | warn | block
    if (hintEl) hintEl.textContent = hint;
  }

  function cleanupLegacy(){
    const box = $('#'+NETBOX_ID);
    if(!box) return;

    // zruš červené "Gateway nedostupná" a textové uzly "Další testy…"
    box.querySelectorAll('*').forEach(el=>{
      const t = (el.textContent||'').trim();
      if (BAD_PHRASES.includes(t)) el.remove();
    });
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT, null);
    const kill = [];
    for (let n=walker.nextNode(); n; n=walker.nextNode()){
      const txt = n.textContent||'';
      if (BAD_PHRASES.some(p => txt.includes(p))) kill.push(n);
    }
    kill.forEach(n=>{
      const cleaned = (n.textContent||'')
        .replace('Další testy přeskočeny.', '')
        .replace('Další testy přeskočeny', '')
        .replace('Gateway nedostupná', '')
        .trim();
      if (cleaned) n.textContent = cleaned;
      else if (n.parentNode) n.parentNode.removeChild(n);
    });
  }

  async function refreshOne(svc){
    try{
      const u = new URL(WORKER + '/status');
      u.searchParams.set('token', svc.token);
      // volitelně: prodloužené TTL na 20 min – backend může respektovat
      u.searchParams.set('ttl','1200');

      const r = await fetch(u.toString(), { cache:'no-store' });
      const j = await r.json();
      if (j && j.online){
        const t = j.last_seen ? new Date(j.last_seen) : null;
        const when = t ? t.toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) : 'n/a';
        const age = (j.age_sec!=null) ? ` · age ${j.age_sec}s` : '';
        setRow(svc.id, 'ok', `online · poslední beat ${when}${age}`);
      } else {
        // pokus o čitelné „offline“ – pokud backend posílá age
        const age = (j && j.age_sec!=null) ? ` · ${Math.floor(j.age_sec/60)} min` : '';
        setRow(svc.id, 'bad', `offline${age}`);
      }
    } catch(e){
      setRow(svc.id, 'warn', 'heartbeat nedostupný');
    } finally {
      cleanupLegacy();
    }
  }

  function attachObserver(){
    const box = $('#'+NETBOX_ID);
    if(!box) return;
    const ro = new MutationObserver(() => { SERVICES.forEach(s=>ensureRow(s.id, s.label)); cleanupLegacy(); });
    ro.observe(box, { childList:true, subtree:true, characterData:true });
  }

  function init(){
    SERVICES.forEach(s=>ensureRow(s.id, s.label));
    SERVICES.forEach(refreshOne);
    setInterval(()=>SERVICES.forEach(refreshOne), 60_000);
    if (document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', attachObserver, { once:true });
    } else {
      attachObserver();
    }
    [100, 400, 1200].forEach(d => setTimeout(cleanupLegacy, d));
  }

  init();
})();
