/* GT7script.js — opravená kompletní verze (používá window.Chart)
   2025-10-22
*/

console.log("✅ GT7script.js načteno (module)");

// ===== Firebase imports (moduly) =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, setDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

/* ===== Firebase config (použij tvůj config z projektu) ===== */
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

const ADMINS = ["viktor.tamayo@gmail.com"];
const pointsForPosition = {1:10, 2:8, 3:6, 4:4, 5:2};
let allRaces = [];
let allProfiles = [];
let unsubRaces = null;
let unsubProfiles = null;
let countdownInterval = null;
let pointsChart = null;

/* ===== small helpers ===== */
function escapeHtml(s) {
  if (s === 0) return '0';
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function formatDateISOtoLocal(d){
  if(!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' });
}

/* ===== Auth UI bindings (safe: check elements exist) ===== */
const btnSignIn = document.getElementById('btn-signin');
const btnSignOut = document.getElementById('btn-signout');
const userEmailSpan = document.getElementById('user-email');
const adminForms = document.getElementById('admin-forms');
const notAdmin = document.getElementById('not-admin');

if (btnSignIn) btnSignIn.addEventListener('click', async () => {
  try { await signInWithPopup(auth, provider); } catch(e){ alert('Přihlášení selhalo: ' + (e.message||e)); }
});
if (btnSignOut) btnSignOut.addEventListener('click', async () => { try { await signOut(auth); } catch(e){ console.error(e); } });

onAuthStateChanged(auth, async (user) => {
  // bezpečné nastavení UI (kontrola existence elementů)
  if (userEmailSpan) userEmailSpan.textContent = user?.email || '';
  if (btnSignIn) btnSignIn.classList.toggle('hidden', !!user);
  if (btnSignOut) btnSignOut.classList.toggle('hidden', !user);
  if (adminForms) adminForms.classList.toggle('hidden', !(user && ADMINS.includes(user.email)));
  if (notAdmin) notAdmin.classList.toggle('hidden', (user && ADMINS.includes(user.email)));

  // load profile for non-admin logged users (if any)
  if (user && !ADMINS.includes(user.email)) {
    await loadUserProfile(user.email).catch(e=>console.error(e));
  }

  // (re)start listeners when auth state changes
  loadData();
});

/* ===== Data subscriptions with onError handlers ===== */
function loadData(){
  // unsubscribe previous
  if (unsubRaces) unsubRaces();
  if (unsubProfiles) unsubProfiles();

  // races
  unsubRaces = onSnapshot(
    collection(db, 'races'),
    snap => {
      const races = [];
      snap.forEach(d => races.push({ id: d.id, ...d.data() }));
      races.sort((a,b)=> new Date(b.date) - new Date(a.date));
      allRaces = races;
      renderAll();
      renderUpcomingRace();
      populateAdminRaceSelect();
      populateH2HSeasons();
    },
    err => {
      console.error("Firestore (races) snapshot error:", err);
      const container = document.getElementById('raceList') || document.getElementById('leaderboard-container');
      if (container) container.innerHTML = `<p class="error">⚠️ Nelze načíst závody: ${escapeHtml(err.code || err.message || String(err))}</p>`;
    }
  );

  // profiles (may be restricted)
  unsubProfiles = onSnapshot(
    collection(db, 'profiles'),
    snap => {
      const profiles = [];
      snap.forEach(d => profiles.push({ id: d.id, ...d.data() }));
      allProfiles = profiles;
    },
    err => {
      console.error("Firestore (profiles) snapshot error:", err);
      // profile data optional — UI doesn't break, just show warning in console/UI
      const profileView = document.getElementById('profile-view');
      if (profileView) profileView.innerHTML = `<p class="error">⚠️ Nelze načíst profily: ${escapeHtml(err.code || err.message || String(err))}</p>`;
    }
  );
}

/* ===== Upcoming race + countdown ===== */
function renderUpcomingRace(){
  const container = document.getElementById('upcoming-container');
  if (!container) return;
  const now = new Date();
  const upcoming = allRaces.filter(r => new Date(r.date) > now).sort((a,b)=> new Date(a.date) - new Date(b.date))[0];
  if (!upcoming) {
    container.innerHTML = `<div class="upcoming-section"><p>Žádný nadcházející závod není naplánován.</p></div>`;
    clearInterval(countdownInterval);
    return;
  }
  const allowed = escapeHtml(upcoming.allowedCars || '-');
  container.innerHTML = `
    <div class="upcoming-section">
      <h3>Nadcházející závod: ${escapeHtml(upcoming.circuit)}</h3>
      <p>🕒 ${formatDateISOtoLocal(upcoming.date)} • Povolená auta: ${allowed}</p>
      <p id="countdown">—</p>
    </div>
  `;
  startCountdown(new Date(upcoming.date));
}
function startCountdown(targetDate){
  const countdown = document.getElementById('countdown');
  clearInterval(countdownInterval);
  if (!countdown) return;
  countdownInterval = setInterval(()=>{
    const now = Date.now();
    const diff = targetDate.getTime() - now;
    if (diff <= 0) { clearInterval(countdownInterval); countdown.textContent = "Závod právě probíhá!"; return; }
    const days = Math.floor(diff / (1000*60*60*24));
    const hours = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
    const minutes = Math.floor((diff % (1000*60*60)) / (1000*60));
    const seconds = Math.floor((diff % (1000*60)) / 1000);
    countdown.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }, 1000);
}

/* ===== Leaderboard calculation from races (results array) ===== */
function calculateLeaderboardFromRaces(races, season = 'all'){
  const stats = {};
  const filtered = (season === 'all') ? races : races.filter(r => Number(r.season) === Number(season));
  filtered.forEach((race, raceIdx) => {
    if (!Array.isArray(race.results)) return;
    race.results.forEach(res => {
      if (!res || !res.driver) return;
      const driver = res.driver;
      const pos = Number(res.pos) || 0;
      const pts = typeof res.pts === 'number' ? res.pts : (pointsForPosition[pos] || 0);
      if (!stats[driver]) stats[driver] = { driver, points:0, wins:0, podiums:0, dns:0, starts:0, pointsHistory:[] };
      stats[driver].points += pts;
      stats[driver].starts++;
      stats[driver].pointsHistory.push({ raceIndex: raceIdx, cumulative: stats[driver].points });
      if (pos === 1) stats[driver].wins++;
      if (pos <= 3 && pos > 0) stats[driver].podiums++;
      if (res.dns) stats[driver].dns++;
    });
  });
  return Object.values(stats).sort((a,b)=> b.points - a.points);
}

/* ===== Render leaderboard (table) ===== */
function renderLeaderboard(season = 'all'){
  const container = document.getElementById('leaderboard-container');
  if (!container) return;
  const stats = calculateLeaderboardFromRaces(allRaces, season);
  if (!stats.length) { container.innerHTML = '<p>Žádná data pro leaderboard.</p>'; return; }
  const rows = stats.map((s, idx) => `
    <tr>
      <td>${idx+1}</td><td>${escapeHtml(s.driver)}</td><td>${s.points}</td><td>${s.starts}</td><td>${s.wins}</td><td>${s.podiums}</td>
    </tr>
  `).join('');
  container.innerHTML = `
    <table class="leaderboard-table">
      <thead><tr><th>#</th><th>Jezdec</th><th>Body</th><th>Starty</th><th>Výhry</th><th>Podia</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  renderPointsChart(stats);
}

/* ===== Past races render ===== */
function renderPastRaces(){
  const container = document.getElementById('past-races');
  if (!container) return;
  if (!allRaces.length) { container.innerHTML = '<p>Žádné závody.</p>'; return; }
  const past = allRaces.filter(r => new Date(r.date) <= new Date()).sort((a,b)=> new Date(b.date)-new Date(a.date));
  const items = past.map(r => {
    const resultsHtml = (Array.isArray(r.results) && r.results.length)
      ? '<ol>' + r.results.map(rr => `<li>${escapeHtml(rr.driver)} — ${escapeHtml(rr.time||'')}</li>`).join('') + '</ol>'
      : '<em>Výsledky zatím nejsou</em>';
    return `<div class="race-item"><h4>${escapeHtml(r.circuit)} — ${formatDateISOtoLocal(r.date)}</h4>${resultsHtml}</div>`;
  }).join('');
  container.innerHTML = items;
}

/* ===== Chart rendering (uses window.Chart registered in HTML) ===== */
function renderPointsChart(stats){
  const canvas = document.getElementById('points-chart');
  if (!canvas) return;
  // build labels & data
  const labels = stats.map(s => s.driver);
  const data = stats.map(s => s.points);
  // destroy previous chart if exists
  try { if (pointsChart) pointsChart.destroy(); } catch(e){}
  // Chart may be on window (registered by HTML small module)
  const ChartClass = window.Chart;
  if (!ChartClass) { console.error("Chart.js nebyl nalezen (window.Chart)"); return; }
  try {
    pointsChart = new ChartClass(canvas.getContext('2d'), {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Body', data, backgroundColor: labels.map(()=> '#d93025') }] },
      options: { responsive:true, maintainAspectRatio:false }
    });
  } catch(e){
    console.error("Chart render error:", e);
  }
}

/* ===== H2H simple ===== */
function compareDriversSimple(a,b,season='all'){
  if (!a || !b || a===b) return null;
  const stats = calculateLeaderboardFromRaces(allRaces, season);
  const sA = stats.find(s => s.driver === a) || {points:0,wins:0};
  const sB = stats.find(s => s.driver === b) || {points:0,wins:0};
  return { a: sA, b: sB };
}

document.getElementById('h2h-run')?.addEventListener('click', () => {
  const a = document.getElementById('h2h-a')?.value.trim();
  const b = document.getElementById('h2h-b')?.value.trim();
  const season = document.getElementById('h2h-season')?.value || 'all';
  const resultEl = document.getElementById('h2h-result');
  if (!a || !b || a===b) { if (resultEl) resultEl.innerHTML = '<p>Vyber dva různé jezdce.</p>'; return; }
  const res = compareDriversSimple(a,b,season);
  if (!res) { if (resultEl) resultEl.innerHTML = '<p>Chyba při porovnání.</p>'; return; }
  const winner = res.a.points > res.b.points ? a : (res.b.points > res.a.points ? b : 'Remíza');
  if (resultEl) resultEl.innerHTML = `<p><strong>${escapeHtml(a)}</strong>: ${res.a.points} b • ${res.a.wins} vítězství<br><strong>${escapeHtml(b)}</strong>: ${res.b.points} b • ${res.b.wins} vítězství</p><p>Výsledek: <strong>${escapeHtml(winner)}</strong></p>`;
});

/* ===== Admin save handlers (safe) ===== */
window.resetRaceForm = function(){ document.getElementById('race-form')?.reset(); };
window.resetResultsForm = function(){ document.getElementById('results-form')?.reset(); if (document.getElementById('positions-container')) document.getElementById('positions-container').innerHTML = ''; };

document.getElementById('race-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('edit-id')?.value;
  const date = document.getElementById('race-date')?.value;
  const circuit = document.getElementById('circuit-name')?.value?.trim();
  if (!date || !circuit) { alert('Datum a okruh jsou povinné'); return; }
  const payload = {
    date,
    circuit,
    allowedCars: document.getElementById('allowed-cars')?.value?.trim(),
    season: Number(date ? new Date(date).getFullYear() : new Date().getFullYear())
  };
  try {
    if (id) {
      await updateDoc(doc(db,'races',id), payload);
      alert('Závod upraven ✅');
    } else {
      await addDoc(collection(db,'races'), payload);
      alert('Závod vytvořen ✅');
    }
  } catch(e){
    console.error("Chyba při ukládání závodu:", e);
    alert('Nepodařilo se uložit závod: ' + (e.message||e));
  }
});

/* results form handler */
document.getElementById('results-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const raceId = document.getElementById('select-race')?.value;
  if (!raceId) { alert('Vyber závod'); return; }
  const container = document.getElementById('positions-container');
  const entries = Array.from(container?.querySelectorAll('.position-row') || []).map(r => {
    const pos = Number(r.querySelector('.pos')?.value);
    const driver = r.querySelector('.driver')?.value?.trim();
    const time = r.querySelector('.time')?.value?.trim();
    const dns = r.querySelector('.dns')?.checked;
    const pts = dns ? 0 : (pointsForPosition[pos] || 0);
    return { pos, driver, time, dns, pts };
  }).filter(e => e.driver);
  if (!entries.length) { alert('Žádné vyplněné výsledky'); return; }
  try {
    await updateDoc(doc(db,'races',raceId), { results: entries }, { merge: true });
    alert('Výsledky uloženy ✅');
  } catch(e){
    console.error("Chyba při ukládání výsledků:", e);
    alert('Nepodařilo se uložit výsledky: ' + (e.message||e));
  }
});

/* utility populate admin select/list */
function populateAdminRaceSelect(){
  const sel = document.getElementById('select-race');
  const list = document.getElementById('admin-race-list');
  if (!sel && !list) return;
  if (sel) sel.innerHTML = '<option value="">-- vyber --</option>';
  if (list) list.innerHTML = '';
  allRaces.forEach(r => {
    if (sel) {
      const opt = document.createElement('option'); opt.value = r.id; opt.textContent = `${r.circuit} — ${formatDateISOtoLocal(r.date)}`; sel.appendChild(opt);
    }
    if (list) {
      const li = document.createElement('div'); li.innerHTML = `<strong>${escapeHtml(r.circuit)}</strong> — ${formatDateISOtoLocal(r.date)}`; list.appendChild(li);
    }
  });
}

document.getElementById('select-race')?.addEventListener('change', (e) => {
  const id = e.target.value;
  const container = document.getElementById('positions-container');
  if (!container) return;
  container.innerHTML = '';
  if (!id) return;
  const rows = 8;
  for (let i=1;i<=rows;i++){
    const div = document.createElement('div'); div.className = 'position-row';
    div.innerHTML = `<label>Pořadí <input class="pos" type="number" value="${i}" min="1" max="${rows}"></label>
      <label>Jezdec <input class="driver" type="text" placeholder="nick"></label>
      <label>Čas <input class="time" type="text" placeholder="mm:ss.xxx"></label>
      <label>DNS <input class="dns" type="checkbox"></label>`;
    container.appendChild(div);
  }
});

/* render helpers */
function renderAll(){
  const seasonSelect = document.getElementById('season-select');
  const selectedSeason = seasonSelect?.value || 'all';
  renderLeaderboard(selectedSeason);
  renderPastRaces();
}
function populateH2HSeasons(){
  const sel = document.getElementById('h2h-season');
  if (!sel) return;
  const seasons = Array.from(new Set(allRaces.map(r => r.season).filter(Boolean))).sort();
  sel.innerHTML = '<option value="all">All-time</option>' + seasons.map(s => `<option value="${s}">${s}</option>`).join('');
}

/* profile load/save */
async function loadUserProfile(email){
  const docId = email.replace(/\./g,'_');
  const profile = allProfiles.find(p => p.id === docId);
  if (profile) {
    if (document.getElementById('profile-name')) document.getElementById('profile-name').textContent = profile.name || profile.nick || email;
    if (document.getElementById('profile-email')) document.getElementById('profile-email').textContent = email;
    if (document.getElementById('profile-team')) document.getElementById('profile-team').textContent = profile.team || '';
    if (document.getElementById('profile-bio')) document.getElementById('profile-bio').textContent = profile.bio || '';
  } else {
    if (document.getElementById('profile-nick')) document.getElementById('profile-nick').value = email.split('@')[0];
  }
  renderProfileView(email);
}

document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) { alert('Musíte být přihlášen'); return; }
  const name = document.getElementById('profile-nick')?.value.trim();
  const team = document.getElementById('profile-team-input')?.value.trim();
  const bio = document.getElementById('profile-bio-input')?.value.trim();
  const preferred = document.getElementById('profile-preferred')?.value.trim();
  const docId = user.email.replace(/\./g,'_');
  try {
    await setDoc(doc(db,'profiles',docId), { name, team, bio, preferred }, { merge: true });
    alert('Profil uložen ✅');
  } catch(e){
    console.error("Chyba při ukládání profilu:", e);
    alert('Nepodařilo se uložit profil: ' + (e.message||e));
  }
});

/* profile view helper */
function renderProfileView(email){
  const docId = email.replace(/\./g,'_');
  const profile = allProfiles.find(p => p.id === docId);
  const elName = document.getElementById('profile-name');
  const elEmail = document.getElementById('profile-email');
  const elBio = document.getElementById('profile-bio');
  if (profile) {
    if (elName) elName.textContent = profile.name || profile.nick || email;
    if (elEmail) elEmail.textContent = email;
    if (elBio) elBio.textContent = profile.bio || '';
  }
}

/* init */
loadData();
console.log("✅ GT7script.js init done");

// unsubscribe on page unload
window.addEventListener('beforeunload', () => { if (unsubRaces) unsubRaces(); if (unsubProfiles) unsubProfiles(); clearInterval(countdownInterval); });
