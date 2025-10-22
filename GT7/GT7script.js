// ============================================================
// GT7script.js — verze fix9-pro (kompletní funkční varianta)
// ============================================================

// Import Firebase moduly
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, 
  deleteDoc, getDoc, setDoc, getDocs 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";


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

// Inicializace Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const ADMIN_EMAIL = "viktor.tamayo@gmail.com";

let allRaces = [];
const maxPositions = 5;

// ------------------------------------------------------------
// Helpery
function escapeHtml(str){ return str ? str.replace(/[&<>"']/g, m=>({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[m])) : ""; }
function formatDate(dateStr){ return new Date(dateStr).toLocaleDateString('cs-CZ', { day:'2-digit', month:'2-digit', year:'numeric' }); }

// ------------------------------------------------------------
// Přepínání záložek
window.showTab = function(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  const el = document.getElementById(tabName);
  if(el) el.classList.add('active');
};

// ------------------------------------------------------------
// Načítání dat
function loadData(){
  onSnapshot(collection(db,'races'),(snapshot)=>{
    allRaces = snapshot.docs.map(d=>({id:d.id,...d.data()}));
    allRaces.sort((a,b)=> new Date(b.date)-new Date(a.date)); // nejnovější nahoře
    renderAll();
  });
}

// ------------------------------------------------------------
// Výpočet leaderboardu
function calculateLeaderboard(races){
  const pointsMap = {1:10,2:8,3:6,4:4,5:2};
  const drivers = {};
  races.forEach(r=>{
    if(!r.results) return;
    for(let i=1;i<=maxPositions;i++){
      const pos = r.results[`pos${i}`];
      if(pos && pos.driver){
        const d = pos.driver;
        if(!drivers[d]) drivers[d]={driver:d,points:0,wins:0,podiums:0,starts:0};
        drivers[d].points += pointsMap[i]||0;
        drivers[d].starts++;
        if(i===1) drivers[d].wins++;
        if(i<=3) drivers[d].podiums++;
      }
    }
  });
  return Object.values(drivers).sort((a,b)=>b.points-a.points);
}

// ------------------------------------------------------------
// Zobrazení nejbližšího závodu s odpočtem
function renderNextRace(){
  const nextEl = document.getElementById('next-race');
  if(!nextEl) return;
  const upcoming = allRaces.filter(r=> new Date(r.date) > new Date()).sort((a,b)=> new Date(a.date)-new Date(b.date))[0];
  if(!upcoming){ nextEl.innerHTML = '<p>Žádný nadcházející závod</p>'; return; }

  nextEl.innerHTML = `
    <h3>${escapeHtml(upcoming.circuit)}</h3>
    <p><strong>Datum:</strong> ${formatDate(upcoming.date)}</p>
    <p><strong>Povolená auta:</strong> ${escapeHtml(upcoming.allowedCars || '-')}</p>
    <p><strong>PP limit:</strong> ${upcoming.ppLimit || '-'}</p>
    <p><strong>BoP:</strong> ${escapeHtml(upcoming.bop || '-')}, <strong>Tuning:</strong> ${escapeHtml(upcoming.tuning || '-')}</p>
    <p><strong>Pneumatiky:</strong> ${escapeHtml(upcoming.tireCat || '-')} (${escapeHtml(upcoming.tireComp || '-')})</p>
    <p><strong>Kol:</strong> ${upcoming.laps || '-'}, <strong>Palivo x:</strong> ${upcoming.fuel || '-'}, <strong>Opotřebení x:</strong> ${upcoming.wear || '-'}</p>
    <p><strong>Tankování:</strong> ${upcoming.refuel || '-'} l/s</p>
    <div id="countdown"></div>
  `;
  startCountdown(upcoming.date);
}

// ------------------------------------------------------------
// Odpočet
function startCountdown(targetDate){
  const cd = document.getElementById('countdown');
  if(!cd) return;
  const target = new Date(targetDate).getTime();
  clearInterval(window._cdInterval);
  window._cdInterval = setInterval(()=>{
    const now = new Date().getTime();
    const diff = target - now;
    if(diff <= 0){ cd.innerHTML = "🏁 Závod právě probíhá nebo skončil!"; clearInterval(window._cdInterval); return; }
    const d = Math.floor(diff/(1000*60*60*24));
    const h = Math.floor((diff%(1000*60*60*24))/(1000*60*60));
    const m = Math.floor((diff%(1000*60*60))/(1000*60));
    const s = Math.floor((diff%(1000*60))/1000);
    cd.innerHTML = `Start za: ${d}d ${h}h ${m}m ${s}s`;
  },1000);
}

// ------------------------------------------------------------
// Zobrazení minulých závodů
function renderPastRaces(){
  const container = document.getElementById('past-races');
  if(!container) return;
  const past = allRaces.filter(r=> new Date(r.date) <= new Date());
  if(!past.length){ container.innerHTML='<p>Žádné výsledky</p>'; return; }
  container.innerHTML = past.map(r=>{
    const resultsHtml = r.results
      ? `<div class="small"><strong>Výsledky:</strong><br>
         🥇 ${escapeHtml(r.results.pos1?.driver||'-')}<br>
         🥈 ${escapeHtml(r.results.pos2?.driver||'-')}<br>
         🥉 ${escapeHtml(r.results.pos3?.driver||'-')}</div>`
      : '<div class="small">Žádné výsledky</div>';
    const videoHtml = r.youtubeUrl
      ? `<iframe class="youtube-preview" src="${r.youtubeUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}" allowfullscreen></iframe>`
      : '';
    return `<div class="section"><strong>${escapeHtml(r.circuit)}</strong> — ${formatDate(r.date)}<br>${resultsHtml}${videoHtml}</div>`;
  }).join('');
}

// ------------------------------------------------------------
// Render všech částí
function renderAll(){
  renderNextRace();
  const lb = calculateLeaderboard(allRaces);
  renderLeaderboard(lb);
  renderPastRaces();
  renderArchive();
  renderHall();
  populateHead2HeadSelect();
}

// ------------------------------------------------------------
// Leaderboard tabulka
function renderLeaderboard(leaderboard){
  const container = document.getElementById('leaderboard-container');
  if(!container) return;
  if(!leaderboard.length){ container.innerHTML = '<p>Žádní jezdci</p>'; return; }
  let html = `<table class="leaderboard-table"><thead><tr><th>#</th><th>Jezdec</th><th>Body</th><th>Výhry</th><th>Pódia</th><th>Starty</th></tr></thead><tbody>`;
  leaderboard.forEach((d,i)=>{
    html+=`<tr><td>${i+1}</td><td>${escapeHtml(d.driver)}</td><td>${d.points}</td><td>${d.wins}</td><td>${d.podiums}</td><td>${d.starts}</td></tr>`;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
}

// ------------------------------------------------------------
// Archiv
function renderArchive(){
  const container = document.getElementById('archive-content');
  if(!container) return;
  if(!allRaces.length){ container.innerHTML='<p>Archiv je prázdný</p>'; return; }
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
  const stats = calculateLeaderboard(allRaces);
  const top5 = stats.slice(0,5);
  hallEl.innerHTML = `<ol>${top5.map(p=>`<li>${escapeHtml(p.driver)} — ${p.points} b (${p.wins} vítězství)</li>`).join('')}</ol>`;
  const ctx = document.getElementById('hall-bar-chart')?.getContext?.('2d');
  if(ctx){
    new Chart(ctx,{type:'bar',data:{labels:top5.map(p=>p.driver),datasets:[{label:'Body',data:top5.map(p=>p.points)}]},options:{responsive:true}});
  }
  const brandWins = {}; const streaks={}; let current={driver:null,count:0};
  allRaces.slice().reverse().forEach(r=>{
    if(!r.results?.pos1?.driver) return;
    const w = r.results.pos1.driver;
    brandWins[r.results.pos1.manufacturer||'Neznámé']=(brandWins[r.results.pos1.manufacturer||'Neznámé']||0)+1;
    if(current.driver===w) current.count++; else { if(current.driver) streaks[current.driver]=Math.max(streaks[current.driver]||0,current.count); current={driver:w,count:1}; }
  });
  if(current.driver) streaks[current.driver]=Math.max(streaks[current.driver]||0,current.count);
  const bestBrand=Object.entries(brandWins).sort((a,b)=>b[1]-a[1])[0]||['-','0'];
  const bestStreak=Object.entries(streaks).sort((a,b)=>b[1]-a[1])[0]||['-',0];
  funEl.innerHTML=`<div>🏁 Nejúspěšnější značka: <strong>${escapeHtml(bestBrand[0])}</strong> (${bestBrand[1]} vítězství)</div>
  <div>🔥 Nejdelší série výher: <strong>${escapeHtml(bestStreak[0])}</strong> (${bestStreak[1]} v řadě)</div>`;
}

// ------------------------------------------------------------
// Head-to-Head
function populateHead2HeadSelect(){
  const set=new Set();
  allRaces.forEach(r=>{for(let i=1;i<=maxPositions;i++){const d=r.results?.[`pos${i}`]?.driver;if(d)set.add(d);}});
  const drivers=Array.from(set).sort((a,b)=>a.localeCompare(b));
  const s1=document.getElementById('head2head-driver1');
  const s2=document.getElementById('head2head-driver2');
  if(!s1||!s2)return;
  const opts='<option value="">-- vyber --</option>'+drivers.map(d=>`<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
  s1.innerHTML=opts; s2.innerHTML=opts;
}

window.compareDrivers=function(){
  const a=document.getElementById('head2head-driver1').value;
  const b=document.getElementById('head2head-driver2').value;
  const target=document.getElementById('head2head-result');
  if(!a||!b||a===b){target.innerHTML='<p>Vyberte dva různé jezdce.</p>';return;}
  const stats=calculateLeaderboard(allRaces);
  const sa=stats.find(s=>s.driver===a)||{driver:a,points:0,wins:0,starts:0,podiums:0};
  const sb=stats.find(s=>s.driver===b)||{driver:b,points:0,wins:0,starts:0,podiums:0};
  const direct=[];
  allRaces.forEach(r=>{
    if(!r.results)return;
    const pa=findPositionInRace(r,a); const pb=findPositionInRace(r,b);
    if(pa&&pb)direct.push({circuit:r.circuit,date:r.date,aPos:pa.pos,bPos:pb.pos,winner:pa.pos<pb.pos?a:(pb.pos<pa.pos?b:'remíza')});
  });
  const aWins=direct.filter(d=>d.winner===a).length;
  const bWins=direct.filter(d=>d.winner===b).length;
  target.innerHTML=`<h3>${escapeHtml(a)} vs ${escapeHtml(b)}</h3>
  <p>${a}: ${sa.points}b (${sa.wins}V / ${sa.starts} startů)</p>
  <p>${b}: ${sb.points}b (${sb.wins}V / ${sb.starts} startů)</p>
  <p>Přímé souboje: ${direct.length} (${aWins}:${bWins})</p>`;
};

function findPositionInRace(race,driver){
  for(let i=1;i<=maxPositions;i++){const p=race.results?.[`pos${i}`];if(p&&p.driver===driver)return{pos:i};}
  return null;
}

// ------------------------------------------------------------
// Admin formulář
const raceForm=document.getElementById('race-form');
if(raceForm){
  raceForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const id=document.getElementById('edit-id').value;
    const payload={
      date:document.getElementById('race-date').value,
      circuit:document.getElementById('circuit-name').value,
      allowedCars:document.getElementById('allowed-cars').value,
      ppLimit:document.getElementById('pp-limit').value,
      bop:document.getElementById('bop').value,
      tuning:document.getElementById('tuning').value,
      tireCat:document.getElementById('tire-cat').value,
      tireComp:document.getElementById('tire-comp').value,
      laps:Number(document.getElementById('laps').value||0),
      fuel:Number(document.getElementById('fuel').value||1),
      wear:Number(document.getElementById('wear').value||1),
      refuel:Number(document.getElementById('refuel').value||0)
    };
    try{
      if(id) await updateDoc(doc(db,'races',id),payload);
      else await addDoc(collection(db,'races'),payload);
      alert('Závod uložen');
      raceForm.reset();
    }catch(e){alert('Chyba při ukládání: '+e.message);}
  });
}

// ------------------------------------------------------------
loadData();
console.log("✅ GT7script.js načteno a běží správně.");
