(function(){
  const WORKER = 'https://ucg-heartbeat.m88wqgcdpd.workers.dev';

  const SERVICES = [
    { id:'gateway',   label:'Gateway (veřejná)',  token:'blablablaBlaBlablAbLalalalablueBlaBadeeeeeBlueisthewindowandBlueistheWorldyabadabadooooo' },
    { id:'ha',        label:'Home Assistant',     token:'ha-ucg-v1' },
    { id:'nextcloud', label:'Nextcloud',          token:'nc-ucg-v1' },
    { id:'plex',      label:'Plex server',        token:'plex-ucg-v1' },
    { id:'portainer', label:'Portainer (Docker)', token:'portainer-ucg-v1' },
  ];

  const NETBOX_ID = 'netBox';
  const STORE = Object.create(null); // poslední známé stavy {id:{state,hint}}

  function box(){ return document.getElementById(NETBOX_ID); }

  function ensureRow(id, label){
    const b = box(); if(!b) return null;
    let row = document.getElementById('svc-'+id);
    if (!row){
      row = document.createElement('div');
      row.id = 'svc-'+id;
      row.className = 'svc-row ucg';
      row.innerHTML = `
        <div class="svc-left"><span class="dot"></span><strong>${label}</strong></div>
        <span class="svc-hint">Načítám…</span>
      `;
      b.appendChild(row);
    }
    // Obnov poslední známý stav (když nás někdo přepsal)
    const st = STORE[id];
    if (st){
      const dot = row.querySelector('.dot');
      const hintEl = row.querySelector('.svc-hint');
      if (dot) dot.className = 'dot ' + st.state;
      if (hintEl) hintEl.textContent = st.hint;
    }
    return row;
  }

  function ensureAll(){ SERVICES.forEach(s => ensureRow(s.id, s.label)); }

  function setRow(id, state, hint){
    STORE[id] = { state, hint };
    const row = ensureRow(id, SERVICES.find(s=>s.id===id)?.label || id);
    if (!row) return;
    const dot = row.querySelector('.dot');
    const hintEl = row.querySelector('.svc-hint');
    if (dot) dot.className = 'dot ' + state; // ok | bad | warn
    if (hintEl) hintEl.textContent = hint;
    hintEl.title = hint;
  }

  // Jemný úklid: odstraní jen starý červený řádek „Gateway nedostupná“
  // a samostatný element s textem „Další testy přeskočeny.“
  function cleanupLegacy(){
    const b = box(); if(!b) return;
    b.querySelectorAll('.svc-row').forEach(r=>{
      if (r.id && r.id.startsWith('svc-')) return; // naše nechej
      const strong = r.querySelector('.svc-left strong');
      const dotBad = r.querySelector('.dot.bad');
      if (dotBad && strong && /gateway/i.test(strong.textContent||'')) r.remove();
    });
    Array.from(b.children).forEach(el=>{
      if (el.id && el.id.startsWith('svc-')) return;
      const t = (el.textContent||'').trim();
      if (t === 'Další testy přeskočeny.' || t === 'Další testy přeskočeny') el.remove();
    });
  }

  async function refreshOne(svc){
    try{
      const u = new URL(WORKER + '/status');
      u.searchParams.set('token', svc.token);
      const r = await fetch(u.toString(), { cache:'no-store' });
      const j = await r.json();
      if (j && j.online){
        const t = j.last_seen ? new Date(j.last_seen) : null;
        const when = t ? t.toLocaleTimeString('cs-CZ', {hour:'2-digit', minute:'2-digit', second:'2-digit'}) : 'n/a';
        setRow(svc.id, 'ok', `online · poslední beat ${when} · age ${j.age_sec}s`);
      } else {
        setRow(svc.id, 'bad', 'offline · žádný beat ≤ 90 s');
      }
    } catch(e){
      setRow(svc.id, 'warn', 'heartbeat nedostupný');
    }
  }

  function refreshAll(){ SERVICES.forEach(refreshOne); }

  function start(){
    ensureAll();
    cleanupLegacy();
    refreshAll();
    // aktualizace jednou za minutu
    setInterval(refreshAll, 60_000);

    // Sleduj jen #netBox a debouncuj – žádný subtree/characterData
    const b = box();
    if (b){
      let scheduled = false;
      const obs = new MutationObserver(()=>{
        if (scheduled) return;
        scheduled = true;
        setTimeout(()=>{
          scheduled = false;
          ensureAll();
          cleanupLegacy();
        }, 80);
      });
      obs.observe(b, { childList:true });
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start, { once:true });
  } else {
    start();
  }
})();
