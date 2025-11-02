(function(){
  const WORKER = 'https://ucg-heartbeat.m88wqgcdpd.workers.dev';

  const SERVICES = [
    { id:'gateway',    label:'Gateway (veřejná)', token:'blablablaBlaBlablAbLalalalablueBlaBadeeeeeBlueisthewindowandBlueistheWorldyabadabadooooo' },
    { id:'ha',         label:'Home Assistant',    token:'ha-ucg-v1' },
    { id:'nextcloud',  label:'Nextcloud',         token:'nc-ucg-v1' },
    { id:'plex',       label:'Plex server',       token:'plex-ucg-v1' },
    { id:'portainer',  label:'Portainer (Docker)',token:'portainer-ucg-v1' },
  ];

  const NETBOX_ID = 'netBox';
  const BAD_PHRASES = ['Gateway nedostupná', 'Další testy přeskočeny'];
  const STATE = Object.create(null); // { [id]: { state:'ok|bad|warn', hint:string } }

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

    // obnov poslední známý stav (když stránka řádek přepsala)
    const st = STATE[id];
    if (st){
      const dot = row.querySelector('.dot');
      const hintEl = row.querySelector('.svc-hint');
      if (dot) dot.className = 'dot ' + st.state;
      if (hintEl) hintEl.textContent = st.hint;
    }
    return row;
  }

  function ensureAll(){ SERVICES.forEach(s=>ensureRow(s.id, s.label)); }

  function setRow(id, state, hint){
    STATE[id] = { state, hint };
    const row = ensureRow(id, SERVICES.find(s=>s.id===id)?.label || id);
    if(!row) return;
    const dot = row.querySelector('.dot');
    const hintEl = row.querySelector('.svc-hint');
    if (dot) dot.className = 'dot ' + state;   // ok | bad | warn
    if (hintEl) hintEl.textContent = hint;
  }

  function cleanupLegacy(){
    const box = $('#'+NETBOX_ID);
    if(!box) return;

    // smaž staré hlášky/červené gateway řádky
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
      const r = await fetch(u.toString(), { cache:'no-store' });
      const j = await r.json();
      if (j && j.online){
        const t = j.last_seen ? new Date(j.last_seen) : null;
        const when = t ? t.toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) : 'n/a';
        setRow(svc.id, 'ok', `online · poslední beat ${when} · age ${j.age_sec}s`);
      } else {
        setRow(svc.id, 'bad', 'offline · žádný beat ≤ 90 s');
      }
    } catch(e){
      setRow(svc.id, 'warn', 'heartbeat nedostupný');
    } finally {
      cleanupLegacy();
    }
  }

  function refreshAll(){ SERVICES.forEach(refreshOne); }

  function attachObservers(){
    // 1) sleduj celé body -> když se #netBox přepíše/obnoví, hned vrať naše řádky a poslední stav
    const bodyObs = new MutationObserver(()=>{ ensureAll(); });
    bodyObs.observe(document.body, { childList:true, subtree:true });

    // 2) pravidelná „pojistka“ – každé 2 s znovu zajisti řádky + stav
    setInterval(ensureAll, 2000);
  }

  function init(){
    ensureAll();           // hned přidej řádky
    refreshAll();          // načti stav
    setInterval(refreshAll, 60_000); // aktualizuj každou minutu
    attachObservers();     // hlídej přepisy stránky
    [200, 800, 2000].forEach(d => setTimeout(()=>{ ensureAll(); cleanupLegacy(); }, d));
  }

  init();
})();
