(function(){
  const WORKER = 'https://ucg-heartbeat.m88wqgcdpd.workers.dev';

  // Po kolika minutách offline se má zobrazit upozornění (a žlutá tečka)
  const OFFLINE_WARN_MIN = 5;

  const SERVICES = [
    { id:'gateway',   label:'Gateway (veřejná)',  token:'blablablaBlaBlablAbLalalalablueBlaBadeeeeeBlueisthewindowandBlueistheWorldyabadabadooooo' },
    { id:'ha',        label:'Home Assistant',     token:'ha-ucg-v1' },
    { id:'nextcloud', label:'Nextcloud',          token:'nc-ucg-v1' },
    { id:'plex',      label:'Plex server',        token:'plex-ucg-v1' },
    { id:'portainer', label:'Portainer (Docker)', token:'portainer-ucg-v1' },
  ];

  const NETBOX_ID = 'netBox';
  const STORE = Object.create(null); // poslední známé stavy {id:{state,hint}}
  let ALERTS = [];                   // naplní se službami offline > OFFLINE_WARN_MIN

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
    // Obnov poslední známý stav (pokud nás někdo přepsal)
    const st = STORE[id];
    if (st){
      const dot = row.querySelector('.dot');
      const hintEl = row.querySelector('.svc-hint');
      if (dot) dot.className = 'dot ' + st.state;
      if (hintEl) { hintEl.textContent = st.hint; hintEl.title = st.hint; }
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
    if (hintEl) { hintEl.textContent = hint; hintEl.title = hint; }
  }

  // Jemný úklid starých gateway řádků (jen když tam opravdu jsou)
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

  // Upozornění nahoře v boxu (oranžový text) – sumarizace delších výpadků
  function updateAlertBanner(){
    const b = box(); if(!b) return;
    let el = document.getElementById('ucg-alert');
    if (!el){
      el = document.createElement('div');
      el.id = 'ucg-alert';
      el.className = 'svc-hint';
      el.style.cssText = 'margin-top:6px;text-align:right;color:var(--warn)';
      // dej na začátek boxu (pod případné "Gateway OK / Internet OK")
      b.prepend(el);
    }
    if (ALERTS.length){
      el.textContent = 'Upozornění: ' + ALERTS.join(' · ');
      el.style.display = '';
    } else {
      el.textContent = '';
      el.style.display = 'none';
    }
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
        // offline – pokud víme stáří posledního beatu, ukaž minuty/sekundy
        const age = (j && typeof j.age_sec === 'number') ? j.age_sec : null;
        const mins = age!=null ? Math.floor(age/60) : null;
        const hint = (mins!=null)
          ? (mins > 0 ? `offline · ${mins} min` : `offline · ${age}s`)
          : 'offline';
        const warn = mins!=null && mins >= OFFLINE_WARN_MIN;
        setRow(svc.id, warn ? 'warn' : 'bad', hint);
        if (warn){
          const label = SERVICES.find(s=>s.id===svc.id)?.label || svc.id;
          ALERTS.push(`${label} ${mins} min`);
        }
      }
    } catch(_e){
      setRow(svc.id, 'warn', 'heartbeat nedostupný');
    }
  }

  async function refreshAll(){
    ALERTS = [];
    await Promise.all(SERVICES.map(refreshOne));
    updateAlertBanner();
  }

  function start(){
    ensureAll();
    cleanupLegacy();
    refreshAll();                 // první načtení
    setInterval(refreshAll, 60_000);

    // Sleduj jen #netBox a po změně jemně obnov řádky + banner
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
          updateAlertBanner();
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
