// GT7script.js — verze fix9-pro (část 1/2)
// ------------------------------------------------------------
// Importy Firebase + Chart.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto";

// ------------------------------------------------------------
// Firebase konfigurace
const firebaseConfig = {
  apiKey: "AIzaSyCkR-AyJK2vFnz0V2HTuz2b3zCaLMxbXtI",
  authDomain: "test-gt7.firebaseapp.com",
  projectId: "test-gt7",
  storageBucket: "test-gt7.firebasestorage.app",
  messagingSenderId: "928154989107",
  appId: "1:928154989107:web:20a34d0009fa75bd1ee946",
  measurementId: "G-1SG8DW1KQ9"
};

// Inicializace
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ------------------------------------------------------------
// Globální proměnné
const ADMIN_EMAIL = "viktor.tamayo@gmail.com";
let allRaces = [];
let mainChart = null;
let countdownInterval = null;

// ------------------------------------------------------------
// Pomocné funkce
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function formatDate(d){ if(!d) return '-'; const dt=new Date(d); return dt.toLocaleDateString('cs-CZ')+' '+dt.toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit'}); }
function showTab(tabName){ document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); document.querySelectorAll('.tab-content').forEach(c=>c.classList.add('hidden')); document.querySelector(`[onclick*="${tabName}"]`)?.classList.add('active'); document.getElementById(tabName)?.classList.remove('hidden'); }

// ------------------------------------------------------------
// Přihlášení admina
const btnSignIn=document.getElementById('btn-signin');
const btnSignOut=document.getElementById('btn-signout');
const adminForms=document.getElementById('admin-forms');
const userEmail=document.getElementById('user-email');
const notAdmin=document.getElementById('not-admin');

if(btnSignIn){
  btnSignIn.addEventListener('click', async()=>{
    try{ await signInWithPopup(auth, provider); }
    catch(e){ alert("Přihlášení selhalo: "+(e.message||e)); }
  });
}
if(btnSignOut) btnSignOut.addEventListener('click', ()=>signOut(auth));

onAuthStateChanged(auth, user=>{
  if(user && user.email===ADMIN_EMAIL){
    adminForms.classList.remove('hidden');
    btnSignIn.classList.add('hidden');
    btnSignOut.classList.remove('hidden');
    userEmail.textContent=user.email;
    notAdmin.classList.add('hidden');
  }else if(user){
    adminForms.classList.add('hidden');
    notAdmin.classList.remove('hidden');
    btnSignIn.classList.add('hidden');
    btnSignOut.classList.remove('hidden');
    userEmail.textContent=user.email;
  }else{
    adminForms.classList.add('hidden');
    notAdmin.classList.remove('hidden');
    btnSignIn.classList.remove('hidden');
    btnSignOut.classList.add('hidden');
    userEmail.textContent='';
  }
});

// ------------------------------------------------------------
// Firestore načítání dat
function loadData(){
  const racesCol=collection(db,'races');
  onSnapshot(racesCol,snap=>{
    const races=[];
    snap.forEach(doc=>races.push({id:doc.id,...doc.data()}));
    races.sort((a,b)=>new Date(b.date)-new Date(a.date)); // nejnovější nahoře
    allRaces=races;
    renderAll();
  });
}

// ------------------------------------------------------------
// Nadcházející závod + odpočet
function renderNextRace(){
  const container=document.getElementById('next-race-container');
  if(!allRaces.length){ container.innerHTML='<p>Žádné závody</p>'; return; }
  const upcoming=allRaces.find(r=>new Date(r.date)>new Date());
  if(!upcoming){ container.innerHTML='<p>Žádný nadcházející závod</p>'; return; }

  const date=new Date(upcoming.date);
  container.innerHTML=`
    <div class="race-card next">
      <h3>${escapeHtml(upcoming.circuit)}</h3>
      <p>Datum: <strong>${formatDate(upcoming.date)}</strong></p>
      <p><strong>Povolená auta:</strong> ${escapeHtml(upcoming.allowedCars||'-')}</p>
      <p><strong>PP limit:</strong> ${escapeHtml(upcoming.ppLimit||'-')}</p>
      <p><strong>BoP:</strong> ${escapeHtml(upcoming.bop||'-')} | <strong>Tuning:</strong> ${escapeHtml(upcoming.tuning||'-')}</p>
      <p><strong>Pneumatiky:</strong> ${escapeHtml(upcoming.tireCat||'-')} | <strong>Povinná směs:</strong> ${escapeHtml(upcoming.tireComp||'-')}</p>
      <p><strong>Kola:</strong> ${escapeHtml(upcoming.laps||'-')} | <strong>Spotřeba:</strong> ${escapeHtml(upcoming.fuel||'-')}x | <strong>Opotřebení:</strong> ${escapeHtml(upcoming.wear||'-')}x | <strong>Tankování:</strong> ${escapeHtml(upcoming.refuel||'-')} l/s</p>
      <div id="countdown"></div>
    </div>`;

  if(countdownInterval) clearInterval(countdownInterval);
  countdownInterval=setInterval(()=>{
    const now=new Date();
    const diff=date-now;
    if(diff<=0){ document.getElementById('countdown').textContent='Závod právě probíhá!'; clearInterval(countdownInterval); return; }
    const d=Math.floor(diff/(1000*60*60*24));
    const h=Math.floor((diff%(1000*60*60*24))/(1000*60*60));
    const m=Math.floor((diff%(1000*60*60))/(1000*60));
    const s=Math.floor((diff%(1000*60))/1000);
    document.getElementById('countdown').textContent=`🕒 Závod začne za: ${d} dnů ${h} h ${m} m ${s} s`;
  },1000);
}

// ------------------------------------------------------------
// Výsledky, grafy, statistiky
const pointsForPosition={1:10,2:8,3:6,4:4,5:2};
const maxPositions=5;

function calculateLeaderboard(races){
  const stats={};
  races.forEach((race,idx)=>{
    if(!race.results) return;
    for(let i=1;i<=maxPositions;i++){
      const res=race.results[`pos${i}`];
      if(!res||!res.driver) continue;
      const pts=res.dns?0:(pointsForPosition[i]||0);
      if(!stats[res.driver]) stats[res.driver]={driver:res.driver,points:0,wins:0,podiums:0,starts:0};
      stats[res.driver].points+=pts;
      stats[res.driver].starts++;
      if(i===1) stats[res.driver].wins++;
      if(i<=3) stats[res.driver].podiums++;
    }
  });
  return Object.values(stats).sort((a,b)=>b.points-a.points);
}

function renderPointsChart(lb,races){
  const ctx=document.getElementById('points-chart').getContext('2d');
  const totalRaces=races.length;
  const datasets=lb.map(d=>{
    const data=[];
    let sum=0;
    races.forEach((r,idx)=>{
      for(let i=1;i<=maxPositions;i++){
        const res=r.results?.[`pos${i}`];
        if(res?.driver===d.driver && !res.dns) sum+=(pointsForPosition[i]||0);
      }
      data.push(sum);
    });
    return {label:d.driver,data,tension:0.2,borderWidth:2,fill:false};
  });
  const labels=Array.from({length:totalRaces},(_,i)=>`Závod ${i+1}`);
  if(mainChart) mainChart.destroy();
  mainChart=new Chart(ctx,{type:'line',data:{labels,datasets},options:{responsive:true,plugins:{legend:{position:'top'},title:{display:true,text:'Vývoj bodů v sezóně'}}}});
}

function renderPastRaces(){
  const c=document.getElementById('past-races');
  const list=allRaces.filter(r=>new Date(r.date)<new Date());
  if(!list.length){ c.innerHTML='<p>Žádné odjeté závody</p>'; return; }
  c.innerHTML=list.map(r=>{
    const res=r.results?`
      <div class="small"><strong>Výsledky:</strong><br>
      🥇 ${escapeHtml(r.results.pos1?.driver||'-')}<br>
      🥈 ${escapeHtml(r.results.pos2?.driver||'-')}<br>
      🥉 ${escapeHtml(r.results.pos3?.driver||'-')}</div>`:'<div>Žádné výsledky</div>';
    const video=r.youtubeUrl?`<iframe class="youtube-preview" src="${r.youtubeUrl.replace('watch?v=','embed/').replace('youtu.be/','youtube.com/embed/')}" allowfullscreen></iframe>`:'';
    return `<div class="race-card"><strong>${escapeHtml(r.circuit)}</strong><div>${formatDate(r.date)}</div>${res}${video}</div>`;
  }).join('');
}
// GT7script.js — verze fix9-pro (část 2/2)
// ------------------------------------------------------------
// doplňkové importy (pokud je již nemáš v části 1/2, je OK je tu mít)
import { deleteDoc, getDoc, setDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ------------------------------------------------------------
// renderAll - orchestrátor renderů
function renderAll(){
  // leaderboard
  const lb = calculateLeaderboard(allRaces);
  renderLeaderboard(lb);
  // points chart (only for current season: filter by year)
  const currentYear = new Date().getFullYear();
  const seasonRaces = allRaces.filter(r => new Date(r.date).getFullYear() === currentYear);
  renderPointsChart(lb, seasonRaces);
  // past races
  renderPastRaces();
  // archive
  renderArchive();
  // hall of fame
  renderHall();
  // head2head select
  populateHead2HeadSelect();
}

// ------------------------------------------------------------
// Leaderboard render (tabulka)
function renderLeaderboard(leaderboard){
  const container = document.getElementById('leaderboard-container');
  if(!container) return;
  if(!leaderboard.length){ container.innerHTML = '<p class="small">Žádní jezdci</p>'; return; }
  let html = `<table class="leaderboard-table"><thead><tr><th>#</th><th>Jezdec</th><th>Body</th><th>Výhry</th><th>Pódia</th><th>Starty</th></tr></thead><tbody>`;
  leaderboard.forEach((d,i)=>{
    html+=`<tr><td>${i+1}</td><td>${escapeHtml(d.driver)}</td><td>${d.points}</td><td>${d.wins||0}</td><td>${d.podiums||0}</td><td>${d.starts||0}</td></tr>`;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
}

// ------------------------------------------------------------
// Archive by year
function renderArchive(){
  const container = document.getElementById('archive-content');
  if(!container) return;
  if(!allRaces.length){ container.innerHTML='<p class="small">Archiv je prázdný</p>'; return; }
  const byYear = {};
  allRaces.forEach(r=>{
    const y = new Date(r.date).getFullYear();
    if(!byYear[y]) byYear[y]=[];
    byYear[y].push(r);
  });
  const years = Object.keys(byYear).sort((a,b)=>b-a);
  container.innerHTML = years.map(y=>{
    const items = byYear[y].map(r=>`<div class="archive-item"><strong>${escapeHtml(r.circuit)}</strong> — ${formatDate(r.date)}<br>🥇 ${escapeHtml(r.results?.pos1?.driver||'-')} | 🥈 ${escapeHtml(r.results?.pos2?.driver||'-')} | 🥉 ${escapeHtml(r.results?.pos3?.driver||'-')}</div>`).join('');
    return `<h3>Sezóna ${y}</h3>${items}`;
  }).join('');
}

// ------------------------------------------------------------
// Hall of Fame + Fun Facts
function renderHall(){
  const hallEl = document.getElementById('hall-of-fame');
  const funEl = document.getElementById('fun-facts');
  if(!hallEl) return;
  const allStats = calculateLeaderboard(allRaces);
  const top5 = allStats.slice(0,5);
  hallEl.innerHTML = `<ol>${top5.map(p=>`<li>${escapeHtml(p.driver)} — ${p.points} b (${p.wins||0} vítězství)</li>`).join('')}</ol>`;

  // bar chart
  const ctx = document.getElementById('hall-bar-chart')?.getContext?.('2d');
  if(ctx){
    const labels = top5.map(p=>p.driver);
    const data = top5.map(p=>p.points);
    new Chart(ctx, { type:'bar', data:{ labels, datasets:[{ label:'Body', data }]}, options:{ responsive:true } });
  }

  // fun facts
  const brandWins = {};
  const streaks = {};
  let current = {driver:null,count:0};
  allRaces.slice().reverse().forEach(r=>{
    if(!r.results?.pos1?.driver) return;
    const w = r.results.pos1.driver;
    brandWins[r.results.pos1.manufacturer || 'Neznámé'] = (brandWins[r.results.pos1.manufacturer||'Neznámé']||0)+1;
    if(current.driver === w) current.count++; else { if(current.driver) streaks[current.driver] = Math.max(streaks[current.driver]||0, current.count); current = {driver:w,count:1}; }
  });
  if(current.driver) streaks[current.driver] = Math.max(streaks[current.driver]||0, current.count);
  const bestBrand = Object.entries(brandWins).sort((a,b)=>b[1]-a[1])[0]||['-','0'];
  const bestStreak = Object.entries(streaks).sort((a,b)=>b[1]-a[1])[0]||['-',0];
  funEl.innerHTML = `<div class="fun-item">🏁 Nejúspěšnější značka vítězů: <strong>${escapeHtml(bestBrand[0])}</strong> — ${bestBrand[1]} vítězství</div>
                     <div class="fun-item">🔥 Nejdelší série výher: <strong>${escapeHtml(bestStreak[0])}</strong> — ${bestStreak[1]} v řadě</div>`;
}

// ------------------------------------------------------------
// Head-to-Head helpers
function populateHead2HeadSelect(){
  const set = new Set();
  allRaces.forEach(r=>{
    for(let i=1;i<=maxPositions;i++){
      const d = r.results?.[`pos${i}`]?.driver;
      if(d) set.add(d);
    }
  });
  const drivers = Array.from(set).sort((a,b)=>a.localeCompare(b));
  const s1 = document.getElementById('head2head-driver1');
  const s2 = document.getElementById('head2head-driver2');
  if(!s1 || !s2) return;
  const options = `<option value="">-- vyber --</option>` + drivers.map(d=>`<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
  s1.innerHTML = options;
  s2.innerHTML = options;
}

window.compareDrivers = function(){
  const a = document.getElementById('head2head-driver1').value;
  const b = document.getElementById('head2head-driver2').value;
  const target = document.getElementById('head2head-result');
  if(!a || !b || a===b){ target.innerHTML = '<p>Vyberte dva různé jezdce.</p>'; return; }
  const stats = calculateLeaderboard(allRaces);
  const sa = stats.find(s=>s.driver===a) || {driver:a,points:0,wins:0,starts:0,podiums:0};
  const sb = stats.find(s=>s.driver===b) || {driver:b,points:0,wins:0,starts:0,podiums:0};
  // direct comparisons
  const direct = [];
  allRaces.forEach(r=>{
    if(!r.results) return;
    const pa = findPositionInRace(r,a);
    const pb = findPositionInRace(r,b);
    if(pa && pb){
      direct.push({circuit:r.circuit,date:r.date,aPos:pa.pos,bPos:pb.pos,winner: pa.pos < pb.pos ? a : (pb.pos < pa.pos ? b : 'remíza')});
    }
  });
  const aDirectWins = direct.filter(d=>d.winner===a).length;
  const bDirectWins = direct.filter(d=>d.winner===b).length;
  target.innerHTML = `<h3>${escapeHtml(a)} vs ${escapeHtml(b)}</h3>
    <p>${escapeHtml(a)} — ${sa.points} b | výhry: ${sa.wins} | starty: ${sa.starts}</p>
    <p>${escapeHtml(b)} — ${sb.points} b | výhry: ${sb.wins} | starty: ${sb.starts}</p>
    <p>Přímé souboje: ${direct.length} (A vyhrál ${aDirectWins}, B vyhrál ${bDirectWins})</p>
    <div class="direct-list">${direct.map(d=>`<div>${formatDate(d.date)} — ${escapeHtml(d.circuit)} : ${d.aPos} vs ${d.bPos} — vítěz: ${escapeHtml(d.winner)}</div>`).join('')}</div>`;
};

function findPositionInRace(race, driver){
  for(let i=1;i<=maxPositions;i++){
    const p = race.results?.[`pos${i}`];
    if(p && p.driver === driver) return {pos:i, dns:!!p.dns, manufacturer:p.manufacturer, model:p.model};
  }
  return null;
}

// ------------------------------------------------------------
// Profil: ukládání (jednoduché) - uložíme podle email->id (tebe poté upravíme)
async function saveProfile(){
  const user = auth.currentUser;
  if(!user){ alert('Nejste přihlášen'); return; }
  const name = document.getElementById('edit-name')?.value || user.displayName || user.email;
  const team = document.getElementById('edit-team')?.value || '';
  const docId = user.email.replace(/\./g,'_');
  await setDoc(doc(db,'profiles',docId), { name, team, updatedAt:new Date() }, { merge:true });
  alert('Profil uložen');
}

// ------------------------------------------------------------
// Admin: úprava / mazání závodu
window.editRace = async function(id){
  try{
    const snap = await getDoc(doc(db,'races',id));
    if(!snap.exists()){ alert('Závod nenalezen'); return; }
    const r = snap.data();
    document.getElementById('edit-id').value = id;
    document.getElementById('race-date').value = r.date || '';
    document.getElementById('circuit-name').value = r.circuit || '';
    document.getElementById('allowed-cars').value = r.allowedCars || '';
    document.getElementById('pp-limit').value = r.ppLimit || '';
    document.getElementById('bop').value = r.bop || 'Vypnuto';
    document.getElementById('tuning').value = r.tuning || 'Zakázán';
    document.getElementById('tire-cat').value = r.tireCat || 'Komfortní';
    document.getElementById('tire-comp').value = r.tireComp || 'Bez povinné směsi';
    document.getElementById('laps').value = r.laps || '';
    document.getElementById('fuel').value = r.fuel || 1;
    document.getElementById('wear').value = r.wear || 1;
    document.getElementById('refuel').value = r.refuel || 0;
    // scroll to admin
    showTab('admin');
    window.scrollTo({top:0,behavior:'smooth'});
  }catch(e){ console.error(e); alert('Chyba: '+(e.message||e)); }
};

window.deleteRace = async function(id){
  if(!confirm('Opravdu smazat tento závod?')) return;
  try{
    await deleteDoc(doc(db,'races',id));
    alert('Smazáno');
  }catch(e){ console.error(e); alert('Chyba: '+(e.message||e)); }
};

// Form submit for add/update race
const raceForm = document.getElementById('race-form');
if(raceForm){
  raceForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const payload = {
      date: document.getElementById('race-date').value,
      circuit: document.getElementById('circuit-name').value,
      allowedCars: document.getElementById('allowed-cars').value,
      ppLimit: document.getElementById('pp-limit').value,
      bop: document.getElementById('bop').value,
      tuning: document.getElementById('tuning').value,
      tireCat: document.getElementById('tire-cat').value,
      tireComp: document.getElementById('tire-comp').value,
      laps: Number(document.getElementById('laps').value || 0),
      fuel: Number(document.getElementById('fuel').value || 1),
      wear: Number(document.getElementById('wear').value || 1),
      refuel: Number(document.getElementById('refuel').value || 0)
    };
    try{
      if(id){
        await updateDoc(doc(db,'races',id), payload);
        alert('Závod upraven');
      } else {
        await addDoc(collection(db,'races'), payload);
        alert('Závod přidán');
      }
      raceForm.reset();
      document.getElementById('edit-id').value='';
      // refresh handled by onSnapshot
    }catch(e){ console.error(e); alert('Chyba při ukládání: '+(e.message||e)); }
  });
}

// ------------------------------------------------------------
// Init
loadData();
// zobrazení next race (renderNextRace se volá v loadData přes renderAll)
console.log('GT7 script loaded (part 2)');
