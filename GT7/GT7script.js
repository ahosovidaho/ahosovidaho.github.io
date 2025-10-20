// GT7script.js - Hlavní logika aplikace
// Obsahuje leaderboard, statistiky, archiv, hall of fame a modal jezdců

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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

const pointsForPosition = { 1: 10, 2: 8, 3: 6, 4: 4, 5: 2 };
const maxPositions = 5;

function showTab(tab, evt) {
  // zruší aktivní třídu ze všech tlačítek
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

  // přidá aktivní třídu na aktuální tlačítko
  if (evt && evt.target) {
    evt.target.classList.add('active');
  } else {
    // fallback - najde tlačítko podle atributu onclick
    const btn = document.querySelector(`.tab[onclick*="${tab}"]`);
    if (btn) btn.classList.add('active');
  }

  // schová všechny záložky
  document.querySelectorAll('[id$="-tab"]').forEach(t => t.classList.add('hidden'));

  // zobrazí vybranou záložku
  const activeTab = document.getElementById(tab + '-tab');
  if (activeTab) activeTab.classList.remove('hidden');
}

function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function formatDate(d){ if(!d) return '-'; const dt=new Date(d); return dt.toLocaleDateString('cs-CZ'); }

function calculateLeaderboard(races) {
  const stats = {};
  races.forEach((race, idx) => {
    if (!race.results) return;
    for (let i=1;i<=maxPositions;i++){
      const res = race.results[`pos${i}`];
      if (!res || !res.driver) continue;
      const driver = res.driver;
      const pts = res.dns ? 0 : (pointsForPosition[i] || 0);
      if (!stats[driver]) stats[driver] = { driver, points: 0, wins: 0, podiums: 0, dns: 0, starts: 0, pointsHistory: [] };
      stats[driver].points += pts;
      stats[driver].starts++;
      stats[driver].pointsHistory.push({ raceIndex: idx, cumulative: stats[driver].points });
      if (i===1) stats[driver].wins++;
      if (i<=3) stats[driver].podiums++;
      if (res.dns) stats[driver].dns++;
    }
  });
  return Object.values(stats).sort((a,b)=>b.points - a.points);
}

function renderLeaderboard(leaderboard) {
  const minStarts = parseInt(document.getElementById('min-starts').value) || 0;
  const search = document.getElementById('search-driver').value.toLowerCase();
  const c = document.getElementById('leaderboard-container');
  let filtered = leaderboard.filter(d=>d.starts>=minStarts && d.driver.toLowerCase().includes(search));
  if (!filtered.length) { c.innerHTML = '<p class="small">Žádní jezdci</p>'; return; }
  let html = `<table class="leaderboard-table"><thead><tr><th>#</th><th>Jezdec</th><th>Body</th><th>Výhry</th><th>Pódia</th><th>DNS</th></tr></thead><tbody>`;
  filtered.forEach((d, idx)=>{
    html+=`<tr>
      <td>${idx+1}</td>
      <td><a href="#" onclick="openDriverModal('${escapeHtml(d.driver)}')">${escapeHtml(d.driver)}</a></td>
      <td>${d.points}</td>
      <td>${d.wins}</td>
      <td>${d.podiums}</td>
      <td>${d.dns}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  c.innerHTML = html;
}

function loadData(){
  const racesCol = collection(db,'races');
  onSnapshot(racesCol,snap=>{
    const races=[];
    snap.forEach(doc=>races.push({id:doc.id,...doc.data()}));
    races.sort((a,b)=>new Date(a.date)-new Date(b.date));
    window._allRaces = races;
    renderAll(races);
  });
}

function renderAll(races){
  const lb = calculateLeaderboard(races);
  renderLeaderboard(lb);
}

document.addEventListener('DOMContentLoaded',()=>{
  loadData();
  document.getElementById('min-starts').addEventListener('input',()=>renderLeaderboard(calculateLeaderboard(window._allRaces||[])));
  document.getElementById('search-driver').addEventListener('input',()=>renderLeaderboard(calculateLeaderboard(window._allRaces||[])));
});

window.openDriverModal = function(driver){ alert("Zde bude modal pro "+driver); };
window.closeDriverModal = function(){ document.getElementById('driver-modal').classList.add('hidden'); };
