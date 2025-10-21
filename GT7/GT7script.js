import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCkR-AyJK2vFnz0V2HTuz2b3zCaLMxbXtI",
  authDomain: "test-gt7.firebaseapp.com",
  projectId: "test-gt7",
  storageBucket: "test-gt7.firebasestorage.app",
  messagingSenderId: "928154989107",
  appId: "1:928154989107:web:20a34d0009fa75bd1ee946",
  measurementId: "G-1SG8DW1KQ9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const ADMIN_EMAIL = "viktor.tamayo@gmail.com";
const pointsForPosition = {1:10,2:8,3:6,4:4,5:2};
const maxPositions = 5;

let allRaces = [];
window._allRaces = allRaces;

function escapeHtml(s){ if(s===0) return '0'; if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function formatDate(d){ if(!d) return '-'; const dt = new Date(d); return dt.toLocaleDateString('cs-CZ') + (dt.toTimeString().split(' ')[0] ? ' ' + dt.toTimeString().split(' ')[0].slice(0,5) : ''); }

async function signIn(){
  try{
    await signInWithPopup(auth, provider);
  }catch(e){
    console.error('signIn', e);
    alert('Přihlášení selhalo: '+(e.message||e));
  }
}
async function signOutUser(){ try{ await signOut(auth); }catch(e){ console.error('signOut',e); } }
window.signIn = signIn; window.signOutUser = signOutUser;

const btnSignIn = document.getElementById('btn-signin');
const btnSignOut = document.getElementById('btn-signout');
const userEmailSpan = document.getElementById('user-email');
const adminForms = document.getElementById('admin-forms');
const notAdmin = document.getElementById('not-admin');

onAuthStateChanged(auth, user=>{
  if(user && user.email===ADMIN_EMAIL){
    userEmailSpan.textContent = user.email;
    btnSignIn.classList.add('hidden'); btnSignOut.classList.remove('hidden');
    adminForms.classList.remove('hidden'); notAdmin.classList.add('hidden');
  } else if(user){
    userEmailSpan.textContent = user.email;
    btnSignIn.classList.add('hidden'); btnSignOut.classList.remove('hidden');
    adminForms.classList.add('hidden'); notAdmin.classList.remove('hidden');
  } else {
    userEmailSpan.textContent = '';
    btnSignIn.classList.remove('hidden'); btnSignOut.classList.add('hidden');
    adminForms.classList.add('hidden'); notAdmin.classList.remove('hidden');
  }
});

function loadData(){
  try{
    const racesCol = collection(db,'races');
    onSnapshot(racesCol, snap=>{
      const races=[];
      snap.forEach(d=>races.push({id:d.id,...d.data()}));
      races.sort((a,b)=> new Date(a.date)-new Date(b.date));
      allRaces = races; window._allRaces = allRaces;
      renderAll();
      populateAdminRaceSelect();
      populateSeasons();
      renderNextRace();
    });
  }catch(e){ console.error('loadData',e); }
}

function calculateLeaderboardFromRaces(races){
  const stats={};
  races.forEach((race,idx)=>{
    if(!race.results) return;
    for(let i=1;i<=maxPositions;i++){
      const res = race.results['pos'+i];
      if(!res||!res.driver) continue;
      const driver = res.driver;
      const pts = res.dns?0:(pointsForPosition[i]||0);
      if(!stats[driver]) stats[driver]={driver,points:0,wins:0,podiums:0,dns:0,starts:0,pointsHistory:[]};
      stats[driver].points += pts;
      stats[driver].starts++;
      stats[driver].pointsHistory.push({raceIndex: idx, cumulative: stats[driver].points});
      if(i===1) stats[driver].wins++;
      if(i<=3) stats[driver].podiums++;
      if(res.dns) stats[driver].dns++;
    }
  });
  return Object.values(stats).sort((a,b)=>b.points-a.points);
}

function calculateLeaderboardForSeason(races, year){ const filtered = races.filter(r=> r.date && new Date(r.date).getFullYear()===year); return calculateLeaderboardFromRaces(filtered); }
function calculateAllTimeStats(races){ const stats={}; races.forEach(race=>{ if(!race.results) return; for(let i=1;i<=maxPositions;i++){ const res = race.results['pos'+i]; if(!res||!res.driver) continue; const d=res.driver; const pts=res.dns?0:(pointsForPosition[i]||0); if(!stats[d]) stats[d]={driver:d,points:0,wins:0,starts:0}; stats[d].points+=pts; stats[d].starts++; if(i===1) stats[d].wins++; } }); return Object.values(stats).sort((a,b)=>b.points-a.points); }

function renderAll(){
  const selectedYear = parseInt(document.getElementById('season-select').value)||new Date().getFullYear();
  const lb = calculateLeaderboardForSeason(allRaces, selectedYear);
  renderLeaderboard(lb);
  renderPointsChart(lb, allRaces.filter(r=> new Date(r.date).getFullYear()===selectedYear).length);
  renderStats(allRaces);
  renderPastRaces(allRaces, selectedYear);
  renderArchive(allRaces);
  renderHall(allRaces);
}

function renderLeaderboard(leaderboard){
  const minStarts = parseInt(document.getElementById('min-starts').value)||0;
  const search = document.getElementById('search-driver').value.toLowerCase()||'';
  const container = document.getElementById('leaderboard-container');
  const filtered = leaderboard.filter(d=>d.starts>=minStarts && d.driver.toLowerCase().includes(search));
  if(!filtered.length){ container.innerHTML = '<p class="small">Zatím žádní jezdci</p>'; return; }
  let html = '<table class="leaderboard-table"><thead><tr><th>#</th><th>Jezdec</th><th>Body</th><th>Výhry</th><th>Pódia</th><th>DNS</th></tr></thead><tbody>';
  filtered.forEach((d,i)=> html += `<tr><td>${i+1}</td><td><a href="#" onclick="openDriverModal('${escapeHtml(d.driver)}');return false;">${escapeHtml(d.driver)}</a></td><td>${d.points}</td><td>${d.wins}</td><td>${d.podiums}</td><td>${d.dns}</td></tr>`);
  html += '</tbody></table>';
  container.innerHTML = html;
}

let mainChart = null;
function renderPointsChart(leaderboard, totalRaces){
  const ctx = document.getElementById('points-chart').getContext('2d');
  const datasets = leaderboard.map(d=>{ const data=[]; for(let i=0;i<totalRaces;i++){ const entry = d.pointsHistory.find(p=>p.raceIndex===i); data.push(entry?entry.cumulative:(data[i-1]||0)); } return { label:d.driver, data, tension:0.2, borderWidth:2, fill:false }; });
  const labels = Array.from({length: totalRaces}, (_,i)=>`Závod ${i+1}`);
  if(mainChart) mainChart.destroy();
  // Chart is available as global Chart (UMD loaded in HTML)
  mainChart = new Chart(ctx, { type:'line', data:{ labels, datasets }, options:{ responsive:true, plugins:{ legend:{ position:'top' }, title:{ display:true, text:'Vývoj bodů v sezóně' } }, scales:{ y:{ beginAtZero:true } } } });
}

function renderStats(races){
  const brandWins={}; const drivetrainWins={};
  races.forEach(r=>{ if(!r.results||!r.results.pos1) return; const car=r.results.pos1.manufacturer||'Neznámé'; const drive=r.results.pos1.drivetrain||'Neznámé'; brandWins[car]=(brandWins[car]||0)+1; drivetrainWins[drive]=(drivetrainWins[drive]||0)+1; });
  const bestBrand = Object.entries(brandWins).sort((a,b)=>b[1]-a[1])[0]||[]; const bestDrive = Object.entries(drivetrainWins).sort((a,b)=>b[1]-a[1])[0]||[];
  const c = document.getElementById('stats-container');
  c.innerHTML = `<p>🏎️ Nejčastější vítězná značka: <strong>${escapeHtml(bestBrand[0]||'-')}</strong> — ${bestBrand[1]||0} vítězství</p><p>⚙️ Nejčastější pohon vítězů: <strong>${escapeHtml(bestDrive[0]||'-')}</strong> — ${bestDrive[1]||0} vítězství</p>`;
}

function renderPastRaces(races, year){
  const container = document.getElementById('past-races');
  const list = races.filter(r=> new Date(r.date).getFullYear()===year);
  if(!list.length){ container.innerHTML = '<p class="small">Žádné závody v aktuální sezóně</p>'; return; }
  container.innerHTML = list.map(r=>{ 
    let resultsHtml='';
    if(r.results){
      for(let i=1;i<=maxPositions;i++){
        const res = r.results['pos'+i];
        if(!res||!res.driver) continue;
        const driver = escapeHtml(res.driver);
        const manufacturer = escapeHtml(res.manufacturer||'');
        const model = escapeHtml(res.model||'');
        const drivetrain = escapeHtml(res.drivetrain||'');
        const dns = res.dns ? 'DNS' : (drivetrain?` - ${drivetrain}`:'');
        const medal = ['🥇','🥈','🥉','🏅','🏅'][i-1]||'';
        resultsHtml += `${medal} ${driver} (${manufacturer}${model? ' '+model:''}) ${dns}<br>`;
      }
    } else {
      resultsHtml = '<div class="small">Žádné výsledky</div>';
    }
    const videoHtml = r.youtubeUrl ? `<iframe class="youtube-preview" src="${toEmbedUrl(r.youtubeUrl)}" allowfullscreen></iframe>` : '<div class="small">🎥 Video zatím není k dispozici.</div>';
    return `<div class="section"><strong>${escapeHtml(r.circuit||'Neznámý okruh')}</strong> — <span class="small">${formatDate(r.date)}</span><div class="small"><strong>Výsledky:</strong><br>${resultsHtml}</div>${videoHtml}</div>`;
  }).join('');
}

function toEmbedUrl(url){
  if(!url) return '';
  try{
    const u = new URL(url, window.location.href);
    if(u.hostname.includes('youtu.be')){
      return 'https://www.youtube.com/embed/' + u.pathname.slice(1);
    }
    if(u.hostname.includes('youtube.com') || u.hostname.includes('www.youtube.com')){
      return 'https://www.youtube.com/embed/' + u.searchParams.get('v');
    }
    return url;
  }catch(e){ return url; }
}

function renderArchive(races){
  const container = document.getElementById('archive-content');
  if(!races.length){ container.innerHTML = '<p class="small">Archiv je prázdný</p>'; return; }
  const byYear = {};
  races.forEach(r=>{ const y = new Date(r.date).getFullYear(); if(!byYear[y]) byYear[y]=[]; byYear[y].push(r); });
  const years = Object.keys(byYear).sort((a,b)=>b-a);
  container.innerHTML = years.map(y=>{ const items = byYear[y].map(r=>`<div class="fun-item"><strong>${escapeHtml(r.circuit||'')} — ${formatDate(r.date)}</strong><br>🥇 ${escapeHtml(r.results?.pos1?.driver||'-')} | 🥈 ${escapeHtml(r.results?.pos2?.driver||'-')} | 🥉 ${escapeHtml(r.results?.pos3?.driver||'-')}</div>`).join(''); return `<h3>Sezóna ${y}</h3>${items}`; }).join('');
}

function renderHall(races){
  const hall = document.getElementById('hall-of-fame');
  const fun = document.getElementById('fun-facts');
  const alltime = calculateAllTimeStats(races);
  const top5 = alltime.slice(0,5);
  hall.innerHTML = `<h4>Top 5 all-time</h4><ol>${top5.map(p=>`<li>${escapeHtml(p.driver)} — ${p.points} b, ${p.wins} vítězství</li>`).join('')}</ol>`;
  const ctx = document.getElementById('hall-bar-chart').getContext('2d');
  const labels = top5.map(p=>p.driver); const data = top5.map(p=>p.points);
  new Chart(ctx, { type:'bar', data:{ labels, datasets:[{ label:'Body', data, backgroundColor:'rgba(102,126,234,0.6)' }] }, options:{ responsive:true } });
  const streaks = {}; let cur={driver:null,count:0};
  races.forEach(r=>{ if(!r.results||!r.results.pos1) return; const w = r.results.pos1.driver; if(cur.driver===w) cur.count++; else { if(cur.driver) streaks[cur.driver]=Math.max(streaks[cur.driver]||0, cur.count); cur={driver:w,count:1}; } });
  if(cur.driver) streaks[cur.driver]=Math.max(streaks[cur.driver]||0, cur.count);
  const longest = Object.entries(streaks).sort((a,b)=>b[1]-a[1])[0]||['-',0];
  fun.innerHTML = `<div class="fun-item">🔥 Nejdelší série výher: <strong>${escapeHtml(longest[0])}</strong> (${longest[1]} v řadě)</div>`;
}

let driverChart = null;
window.openDriverModal = function(driverName){
  const modal = document.getElementById('driver-modal'); modal.classList.remove('hidden');
  document.getElementById('driver-name').textContent = driverName;
  const races = allRaces;
  const results=[]; let totalPoints=0,wins=0,dns=0,starts=0,totalPos=0; const timeline=[];
  races.forEach((race, idx)=>{ for(let i=1;i<=maxPositions;i++){ const r = race.results && race.results['pos'+i]; if(!r||!r.driver) continue; if(r.driver===driverName){ starts++; const pts = r.dns?0:(pointsForPosition[i]||0); totalPoints+=pts; totalPos+=i; if(i===1) wins++; if(r.dns) dns++; timeline.push({index:idx,cumulative:totalPoints}); results.push({date:race.date,circuit:race.circuit,position:i,manufacturer:r.manufacturer||'-',model:r.model||'-',drivetrain:r.drivetrain||'-',dns:!!r.dns,points:pts}); } } });
  document.getElementById('driver-summary').innerHTML = `<p>🏎️ Body: <strong>${totalPoints}</strong> | Výhry: ${wins} | Starty: ${starts} | DNS: ${dns}</p><p>Prům. pozice: ${starts? (totalPos/starts).toFixed(2):'-'}</p>`;
  document.getElementById('driver-race-history').innerHTML = `<table class="driver-history-table"><thead><tr><th>Datum</th><th>Okruh</th><th>Pozice</th><th>Značka</th><th>Model</th><th>Pohon</th><th>DNS</th><th>Body</th></tr></thead><tbody>${results.map(r=>`<tr><td>${formatDate(r.date)}</td><td>${escapeHtml(r.circuit)}</td><td>${r.position}</td><td>${escapeHtml(r.manufacturer)}</td><td>${escapeHtml(r.model)}</td><td>${escapeHtml(r.drivetrain)}</td><td>${r.dns? '✅':'❌'}</td><td>${r.points}</td></tr>`).join('')}</tbody></table>`;
  const ctx = document.getElementById('driver-points-chart').getContext('2d'); if(driverChart) driverChart.destroy();
  driverChart = new Chart(ctx, { type:'line', data:{ labels: timeline.map(t=>'Z'+(t.index+1)), datasets:[{ label:driverName, data:timeline.map(t=>t.cumulative), borderColor:'#667eea', fill:false }] }, options:{ responsive:true } });
};

window.closeDriverModal = function(){ document.getElementById('driver-modal').classList.add('hidden'); if(driverChart) driverChart.destroy(); };

function populateSeasons(){
  const sel = document.getElementById('season-select'); if(!sel) return;
  const years = Array.from(new Set(allRaces.map(r=> new Date(r.date).getFullYear()))).sort((a,b)=>b-a);
  const current = new Date().getFullYear();
  const options = [current, ...years.filter(y=>y!==current)];
  sel.innerHTML = options.map(y=>`<option value="${y}" ${y===current?'selected':''}>${y}</option>`).join('');
  sel.addEventListener('change', ()=> renderAll());
}

function populateAdminRaceSelect(){
  const sel = document.getElementById('select-race'); if(!sel) return;
  sel.innerHTML = '<option value="">Vyberte závod</option>' + allRaces.map(r=>`<option value="${r.id}">${escapeHtml(r.circuit)} - ${formatDate(r.date)}</option>`).join('');
  renderPositionInputs();
  renderAdminRaceList();
}

function renderPositionInputs(){
  const container = document.getElementById('positions-container'); container.innerHTML='';
  for(let i=1;i<=maxPositions;i++){
    const div = document.createElement('div');
    div.innerHTML = `<div class="form-row"><label>${i}. Jezdec<select id="pos${i}"><option value="">-</option><option>Viki</option><option>Mára</option><option>Maty</option><option>Hardy</option><option>Ondra</option></select></label><label>Značka<input id="pos${i}_manufacturer"></label><label>Model<input id="pos${i}_model"></label><label>Pohon<input id="pos${i}_drivetrain"></label><label><input type="checkbox" id="pos${i}_dns"> DNS</label></div>`;
    container.appendChild(div);
  }
}

function renderAdminRaceList(){
  const list = document.getElementById('admin-race-list'); if(!list) return;
  list.innerHTML = allRaces.map(r=>`<div class="admin-row"><div><strong>${escapeHtml(r.circuit)}</strong><div class="small">${formatDate(r.date)}</div></div><div style="display:flex;gap:8px"><button class="btn" onclick="editRace('${r.id}')">✏️ Uprav</button><button class="btn secondary" onclick="deleteRace('${r.id}')">🗑️ Smaž</button></div></div>`).join('');
}

async function addRaceToFirestore(race){ await addDoc(collection(db,'races'), race); }
async function updateRaceInFirestore(id,payload){ await updateDoc(doc(db,'races',id), payload); }
async function deleteRaceFromFirestore(id){ await deleteDoc(doc(db,'races',id)); }

function editRace(id){
  const r = allRaces.find(x=>x.id===id); if(!r) return;
  document.getElementById('edit-id').value = id;
  // populate fields (including new ones)
  document.getElementById('race-date').value = r.date||'';
  document.getElementById('circuit-name').value = r.circuit||'';
  document.getElementById('allowed-cars').value = r.cars||'';
  document.getElementById('pp-limit').value = r.ppLimit||'';
  document.getElementById('bop-enabled').value = String(!!r.bopEnabled);
  document.getElementById('tuning-allowed').value = String(!!r.tuningAllowed);
  document.getElementById('tire-category').value = r.tireCategory||'Komfortní';
  document.getElementById('mandatory-compound').value = r.mandatoryCompound||'Bez povinné';
  document.getElementById('laps').value = r.laps||10;
  document.getElementById('fuel-consumption').value = r.fuelConsumption||1;
  document.getElementById('tire-wear').value = r.tireWear||1;
  document.getElementById('refuel-speed').value = r.refuelSpeed||5;
  window.scrollTo({top:0,behavior:'smooth'});
}

function resetRaceForm(){ document.getElementById('edit-id').value=''; document.getElementById('race-form').reset(); }
function resetResultsForm(){ document.getElementById('results-form').reset(); }

document.addEventListener('DOMContentLoaded', ()=>{
  const raceForm = document.getElementById('race-form');
  raceForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const editId = document.getElementById('edit-id').value;
    const payload = {
      date: document.getElementById('race-date').value,
      circuit: document.getElementById('circuit-name').value,
      cars: document.getElementById('allowed-cars').value,
      ppLimit: Number(document.getElementById('pp-limit').value) || null,
      bopEnabled: document.getElementById('bop-enabled').value==='true',
      tuningAllowed: document.getElementById('tuning-allowed').value==='true',
      tireCategory: document.getElementById('tire-category').value,
      mandatoryCompound: document.getElementById('mandatory-compound').value,
      laps: Number(document.getElementById('laps').value)||0,
      fuelConsumption: Number(document.getElementById('fuel-consumption').value)||1,
      tireWear: Number(document.getElementById('tire-wear').value)||1,
      refuelSpeed: Number(document.getElementById('refuel-speed').value)||5,
      cars: document.getElementById('allowed-cars').value,
      additionalInfo: document.getElementById('additional-info').value
    };
    try{ if(editId) await updateRaceInFirestore(editId,payload); else await addRaceToFirestore(payload); resetRaceForm(); }catch(err){ alert('Chyba při ukládání závodu: '+(err.message||err)); }
  });

  const resultsForm = document.getElementById('results-form');
  resultsForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const raceId = document.getElementById('select-race').value; if(!raceId){ alert('Vyberte závod'); return; }
    const results={};
    for(let i=1;i<=maxPositions;i++){ results['pos'+i] = { driver: document.getElementById(`pos${i}`).value, manufacturer: document.getElementById(`pos${i}_manufacturer`).value, model: document.getElementById(`pos${i}_model`).value, drivetrain: document.getElementById(`pos${i}_drivetrain`).value, dns: document.getElementById(`pos${i}_dns`).checked }; }
    const youtube = document.getElementById('youtube-url').value;
    try{ await updateRaceInFirestore(raceId,{ results, youtubeUrl: youtube||null }); resetResultsForm(); }catch(err){ alert('Chyba při ukládání výsledků: '+(err.message||err)); }
  });

  document.getElementById('search-driver').addEventListener('input', ()=> renderAll());
  document.getElementById('min-starts').addEventListener('input', ()=> renderAll());
  document.getElementById('season-select').addEventListener('change', ()=> renderAll());
});

let upcomingInterval = null;

function renderNextRace(){
  const container = document.getElementById('upcoming-container');
  if(!container) return;
  // find next upcoming race (date > now)
  const now = new Date();
  const future = allRaces.filter(r=> r.date && new Date(r.date) > now);
  if(!future.length){ container.innerHTML = ''; return; }
  future.sort((a,b)=> new Date(a.date) - new Date(b.date));
  const next = future[0];
  // build html
  const dateDisplay = formatDate(next.date);
  const specs = [];
  if(next.cars) specs.push(['Auta', next.cars]);
  if(next.ppLimit) specs.push(['PP limit', next.ppLimit]);
  specs.push(['BoP', next.bopEnabled ? 'Ano' : 'Ne']);
  specs.push(['Tuning', next.tuningAllowed ? 'Ano' : 'Ne']);
  specs.push(['Pneumatiky', next.tireCategory || '—']);
  specs.push(['Povinná směs', next.mandatoryCompound || 'Bez povinné']);
  specs.push(['Kol', next.laps || '-']);
  specs.push(['Spotřeba', 'x' + (next.fuelConsumption||1)]);
  specs.push(['Opotřebení', 'x' + (next.tireWear||1)]);
  specs.push(['Tankování', (next.refuelSpeed||5) + ' l/s']);
  let specsHtml = specs.map(s=>`<div class="spec"><strong>${escapeHtml(s[0])}:</strong> ${escapeHtml(String(s[1]))}</div>`).join('');

  container.innerHTML = `<div class="upcoming"><div class="meta"><h3>Nadcházející závod: ${escapeHtml(next.circuit||'Neznámý okruh')}</h3><div class="small">${dateDisplay}</div><div class="countdown" id="upcoming-countdown">⏳ Načítám odpočet...</div><div class="specs">${specsHtml}</div></div><div class="video">${ next.youtubeUrl ? `<iframe class="youtube-preview" src="${toEmbedUrl(next.youtubeUrl)}" allowfullscreen></iframe>` : ''}</div></div>`;

  // clear previous interval
  if(upcomingInterval) clearInterval(upcomingInterval);
  upcomingInterval = setInterval(()=>{
    const now = new Date();
    const target = new Date(next.date);
    const diff = target - now;
    const el = document.getElementById('upcoming-countdown');
    if(!el) return;
    if(diff <= 0){ el.textContent = '🔥 Závod právě probíhá!'; clearInterval(upcomingInterval); return; }
    const days = Math.floor(diff / (1000*60*60*24));
    const hours = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
    const minutes = Math.floor((diff % (1000*60*60)) / (1000*60));
    const seconds = Math.floor((diff % (1000*60)) / 1000);
    el.textContent = `⏳ Start za: ${days} d ${hours} h ${minutes} m ${seconds} s`;
  }, 1000);
}

// initial load
loadData();
