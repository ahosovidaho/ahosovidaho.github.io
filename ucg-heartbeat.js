(function(){
  const WORKER = 'https://ucg-heartbeat.m88wqgcdpd.workers.dev';
  const TOKEN  = 'blablablaBlaBlablAbLalalalablueBlaBadeeeeeBlueisthewindowandBlueistheWorldyabadabadooooo';
  const row = document.getElementById('ucg-heartbeat');
  if(!row){ return; }

  function setRow(state, hint){
    const dot = row.querySelector('.dot'); if (dot) dot.className = 'dot ' + state; // ok|bad|warn
    const hintEl = row.querySelector('.svc-hint'); if (hintEl) hintEl.textContent = hint;
  }

  async function refresh(){
    try{
      const u = new URL(WORKER + '/status'); u.searchParams.set('token', TOKEN);
      const r = await fetch(u.toString(), { cache:'no-store' });
      const j = await r.json();
      if (j.online){
        const t = j.last_seen ? new Date(j.last_seen) : null;
        const when = t ? t.toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) : 'n/a';
        setRow('ok', 'online · poslední beat ' + when + ' · age ' + j.age_sec + 's');
      } else {
        setRow('bad', 'offline · žádný beat ≤ 90 s');
      }
    } catch(e){
      setRow('warn', 'heartbeat nedostupný');
    }
  }

  refresh();
  setInterval(refresh, 60000);
})();
