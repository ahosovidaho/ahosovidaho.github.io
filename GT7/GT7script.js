// GT7script.js (opravené)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, getDocs, setDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { Chart } from "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/+esm";

/* =========================
   KONFIGURACE FIREBASE
========================= */
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
const maxPositions = 10;

let allRaces = [];
let allProfiles = [];
let unsubRaces = null;
let unsubProfiles = null;
let countdownInterval = null;
let pointsChart = null;

/* =========================
   UŽITEČNÉ FUNKCE
========================= */
function escapeHtml(s) {
  if (s === 0) return '0';
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
function formatDateISOtoLocal(d) {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' });
}

/* =========================
   AUTH: bezpečně (kontroluju elementy)
========================= */
const btnSignIn = document.getElementById('btn-signin');
const btnSignOut = document.getElementById('btn-signout');
const userEmailSpan = document.getElementById('user-email');
const adminForms = document.getElementById('admin-forms');
const notAdmin = document.getElementById('not-admin');

if (btnSignIn) btnSignIn.addEventListener('click', () => signIn());
if (btnSignOut) btnSignOut.addEventListener('click', () => signOutUser());

async function signIn() {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    alert('Přihlášení selhalo: ' + (e.message || e));
  }
}
async function signOutUser() {
  await signOut(auth);
}

// ZDE: kontrola existence elementů před jejich použitím
onAuthStateChanged(auth, async (user) => {
  try {
    if (user) {
      if (userEmailSpan) userEmailSpan.textContent = user.email || '';
      if (btnSignIn) btnSignIn.classList.add('hidden');
      if (btnSignOut) btnSignOut.classList.remove('hidden');
      if (adminForms && ADMINS.includes(user.email)) adminForms.classList.remove('hidden');
      if (notAdmin && ADMINS.includes(user.email)) notAdmin.classList.add('hidden');
      if (adminForms && !ADMINS.includes(user.email)) adminForms.classList.add('hidden');
      if (notAdmin && !ADMINS.includes(user.email)) notAdmin.classList.remove('hidden');
      if (!ADMINS.includes(user.email)) await loadUserProfile(user.email);
    } else {
      if (userEmailSpan) userEmailSpan.textContent = '';
      if (btnSignIn) btnSignIn.classList.remove('hidden');
      if (btnSignOut) btnSignOut.classList.add('hidden');
      if (adminForms) adminForms.classList.add('hidden');
      if (notAdmin) notAdmin.classList.remove('hidden');
    }
  } catch (e) {
    console.error("Chyba v onAuthStateChanged handleru:", e);
  }
});

/* =========================
   DATA – NAČÍTÁNÍ A SUBSCRIBE s unsubscribe + error handling
========================= */
function loadData() {
  if (unsubRaces) unsubRaces();
  if (unsubProfiles) unsubProfiles();

  // onSnapshot má nyní error handler (třetí argument)
  unsubRaces = onSnapshot(
    collection(db, 'races'),
    snap => {
      const races = [];
      snap.forEach(d => races.push({ id: d.id, ...d.data() }));
      races.sort((a, b) => new Date(b.date) - new Date(a.date));
      allRaces = races;
      renderAll();
      renderUpcomingRace();
      populateAdminRaceSelect();
      populateH2HSeasons();
    },
    err => {
      console.error("Firestore (races) snapshot error:", err);
      const container = document.getElementById('upcoming-container') || document.getElementById('raceList') || document.getElementById('leaderboard-container');
      if (container) container.innerHTML = `<p class="error">⚠️ Nelze načíst data z Firestore: ${escapeHtml(err.code || err.message || String(err))}</p>`;
    }
  );

  unsubProfiles = onSnapshot(
    collection(db, 'profiles'),
    snap => {
      const profiles = [];
      snap.forEach(d => profiles.push({ id: d.id, ...d.data() }));
      allProfiles = profiles;
    },
    err => {
      console.error("Firestore (profiles) snapshot error:", err);
    }
  );
}

/* =========================
   NADCHÁZEJÍCÍ ZÁVOD
========================= */
function renderUpcomingRace() {
  const container = document.getElementById('upcoming-container');
  if (!container) return;
  const now = new Date();
  const upcoming = allRaces
    .filter(r => new Date(r.date) > now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  if (!upcoming) {
    container.innerHTML = `<div class="upcoming-section"><p>Žádný nadcházející závod není naplánován.</p></div>`;
    clearInterval(countdownInterval);
    return;
  }

  const allowed = escapeHtml(upcoming.allowedCars || '-');
  const tyreInfo = `${escapeHtml(upcoming.tyreCategory || '-')}${upcoming.mandatoryCompound ? ' — ' + escapeHtml(upcoming.mandatoryCompound) : ''}`;
  container.innerHTML = `
    <div class="upcoming-section">
      <h2>Nadcházející závod: ${escapeHtml(upcoming.circuit)}</h2>
      <p id="upcoming-race-details">
        🏁 ${formatDateISOtoLocal(upcoming.date)}<br>
        🚗 Povolená auta: ${allowed}<br>
        ⚖️ BoP: ${upcoming.bop ? 'Zapnuto' : 'Vypnuto'} | 🛠️ Tuning: ${upcoming.tuning ? 'Povolen' : 'Zakázán'}<br>
        🛞 Pneumatiky: ${tyreInfo}<br>
        ⛽ Spotřeba ×${escapeHtml(upcoming.fuelMult || 1)} | ⏳ Tankování: ${escapeHtml(upcoming.refuelSpeed || 0)} l/s
      </p>
      <p id="countdown">—</p>
    </div>
  `;
  startCountdown(new Date(upcoming.date));
}

function startCountdown(targetDate) {
  const countdown = document.getElementById('countdown');
  clearInterval(countdownInterval);
  if (!countdown) return;
  countdownInterval = setInterval(() => {
    const now = Date.now();
    const diff = targetDate.getTime() - now;
    if (diff <= 0) {
      clearInterval(countdownInterval);
      countdown.textContent = "Závod právě probíhá!";
      return;
    }
    const days = Math.floor(diff / (1000*60*60*24));
    const hours = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
    const minutes = Math.floor((diff % (1000*60*60)) / (1000*60));
    const seconds = Math.floor((diff % (1000*60)) / 1000);
    countdown.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }, 1000);
}

/* =========================
   STATISTIKY
========================= */
function calculateLeaderboardFromRaces(races, season = 'all') {
  const stats = {};
  const filtered = (season === 'all') ? races : races.filter(r => Number(r.season) === Number(season));
  filtered.forEach((race, raceIdx) => {
    if (!Array.isArray(race.results)) return;
    race.results.forEach(res => {
      if (!res || !res.driver) return;
      const driver = res.driver;
      const pos = Number(res.pos) || 0;
      const pts = typeof res.pts === 'number' ? res.pts : (pointsForPosition[pos] || 0);
      if (!stats[driver]) stats[driver] = { driver, points: 0, wins: 0, podiums: 0, dns: 0, starts: 0, pointsHistory: [] };
      stats[driver].points += pts;
      stats[driver].starts++;
      stats[driver].pointsHistory.push({ raceIndex: raceIdx, cumulative: stats[driver].points });
      if (pos === 1) stats[driver].wins++;
      if (pos <= 3 && pos > 0) stats[driver].podiums++;
      if (res.dns) stats[driver].dns++;
    });
  });
  return Object.values(stats).sort((a, b) => b.points - a.points);
}

/* =========================
   RENDER LEADERBOARD, PAST RACES, PROFILE
========================= */
function renderLeaderboard(season = 'all') {
  const container = document.getElementById('leaderboard-container');
  if (!container) return;
  const stats = calculateLeaderboardFromRaces(allRaces, season);
  if (!stats.length) {
    container.innerHTML = '<p>Žádná data pro leaderboard.</p>';
    return;
  }
  const rows = stats.map((s, idx) => `
    <tr>
      <td>${idx+1}</td>
      <td>${escapeHtml(s.driver)}</td>
      <td>${s.points}</td>
      <td>${s.starts}</td>
      <td>${s.wins}</td>
      <td>${s.podiums}</td>
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

function renderPastRaces() {
  const container = document.getElementById('past-races');
  if (!container) return;
  if (!allRaces.length) {
    container.innerHTML = '<p>Žádné závody.</p>';
    return;
  }
  const past = allRaces.filter(r => new Date(r.date) <= new Date()).sort((a,b)=> new Date(b.date)-new Date(a.date));
  const items = past.map(r => {
    const resultsHtml = (Array.isArray(r.results) && r.results.length)
      ? '<ol>' + r.results.map(rr => `<li>${escapeHtml(rr.driver)} — ${escapeHtml(rr.time||'')}</li>`).join('') + '</ol>'
      : '<em>Výsledky zatím nejsou</em>';
    return `<div class="race-item"><h4>${escapeHtml(r.circuit)} — ${formatDateISOtoLocal(r.date)}</h4>${resultsHtml}</div>`;
  }).join('');
  container.innerHTML = items;
}

function renderProfileView(email) {
  const docId = email.replace(/\./g, '_');
  const profile = allProfiles.find(p => p.id === docId);
  if (!profile) return;
  const elName = document.getElementById('profile-name');
  const elEmail = document.getElementById('profile-email');
  const elBio = document.getElementById('profile-bio');
  if (elName) elName.textContent = profile.name || profile.nick || email;
  if (elEmail) elEmail.textContent = email;
  if (elBio) elBio.textContent = profile.bio || '';
  // Quick stats
  const stats = calculateLeaderboardFromRaces(allRaces);
  const me = stats.find(s => s.driver === (profile.nick || profile.name));
  const profileView = document.getElementById('profile-view');
  if (me && profileView) {
    const summary = document.createElement('div');
    summary.className = 'small';
    summary.innerHTML = `Body: ${me.points} • Starty: ${me.starts} • Výhry: ${me.wins}`;
    profileView.appendChild(summary);
  }
}

/* Chart */
function renderPointsChart(stats) {
  const ctx = document.getElementById('points-chart');
  if (!ctx) return;
  if (pointsChart) {
    try { pointsChart.destroy(); } catch(e){/* ignore */ }
    pointsChart = null;
  }
  const labels = stats.map(s => s.driver);
  const data = stats.map(s => s.points);
  try {
    pointsChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Body', data, backgroundColor: labels.map(()=> '#d93025') }] },
      options: { responsive: true, maintainAspectRatio: false }
    });
  } catch(e) {
    console.error("Chart render error:", e);
  }
}

/* =========================
   H2H (Head-to-Head)
========================= */
function compareDriversSimple(a, b, season = 'all') {
  if (!a || !b || a === b) return null;
  const stats = calculateLeaderboardFromRaces(allRaces, season);
  const sA = stats.find(s => s.driver === a) || {points:0, wins:0};
  const sB = stats.find(s => s.driver === b) || {points:0, wins:0};
  return { a: sA, b: sB };
}

document.getElementById('h2h-run')?.addEventListener('click', () => {
  const a = document.getElementById('h2h-a')?.value.trim();
  const b = document.getElementById('h2h-b')?.value.trim();
  const season = document.getElementById('h2h-season')?.value || 'all';
  const resultEl = document.getElementById('h2h-result');
  if (!a || !b || a === b) {
    if (resultEl) resultEl.innerHTML = '<p>Vyber dva různé jezdce.</p>'; return;
  }
  const res = compareDriversSimple(a, b, season);
  if (!res) { if (resultEl) resultEl.innerHTML = '<p>Chyba při porovnání.</p>'; return; }
  const winner = res.a.points > res.b.points ? a : (res.b.points > res.a.points ? b : 'Remíza');
  if (resultEl) resultEl.innerHTML = `
    <p><strong>${escapeHtml(a)}</strong>: ${res.a.points} b | ${res.a.wins} vítězství<br>
       <strong>${escapeHtml(b)}</strong>: ${res.b.points} b | ${res.b.wins} vítězství</p>
    <p>Výsledek: <strong>${escapeHtml(winner)}</strong></p>
  `;
});

/* =========================
   ADMIN: ukládání závodů a výsledků
========================= */
window.resetRaceForm = function(){
  document.getElementById('race-form')?.reset();
};
window.resetResultsForm = function(){
  document.getElementById('results-form')?.reset();
  const posCont = document.getElementById('positions-container');
  if (posCont) posCont.innerHTML = '';
};

async function saveRaceFromForm(e) {
  e.preventDefault();
  const id = document.getElementById('edit-id')?.value;
  const date = document.getElementById('race-date')?.value;
  const circuit = document.getElementById('circuit-name')?.value.trim();
  if (!date || !circuit) { alert('Datum a okruh jsou povinné'); return; }
  const payload = {
    date,
    circuit,
    allowedCars: document.getElementById('allowed-cars')?.value.trim(),
    ppLimit: document.getElementById('pp-limit')?.value || null,
    bop: document.getElementById('bop-enabled')?.value === 'true',
    tuning: document.getElementById('tuning-allowed')?.value === 'true',
    tyreCategory: document.getElementById('tire-category')?.value,
    mandatoryCompound: document.getElementById('mandatory-compound')?.value,
    laps: Number(document.getElementById('laps')?.value) || 0,
    fuelMult: Number(document.getElementById('fuel-consumption')?.value) || 1,
    tyreWearMult: Number(document.getElementById('tire-wear')?.value) || 1,
    refuelSpeed: Number(document.getElementById('refuel-speed')?.value) || 0,
    youtubeUrl: document.getElementById('youtube-url')?.value || '',
    season: Number(document.getElementById('race-date')?.value ? new Date(document.getElementById('race-date').value).getFullYear() : new Date().getFullYear())
  };
  try {
    if (id) {
      await updateDoc(doc(db, 'races', id), payload);
      alert('Závod upraven ✅');
    } else {
      await addDoc(collection(db,'races'), payload);
      alert('Závod vytvořen ✅');
    }
  } catch (e) {
    console.error("Chyba při ukládání závodu:", e);
    alert('Nepodařilo se uložit závod: ' + (e.message || e));
  }
  resetRaceForm();
}

async function saveResultsFromForm(e) {
  e.preventDefault();
  const raceId = document.getElementById('select-race')?.value;
  if (!raceId) { alert('Vyber závod'); return; }
  const container = document.getElementById('positions-container');
  const entries = Array.from(container?.querySelectorAll('.position-row') || []).map(r => {
    const pos = Number(r.querySelector('.pos')?.value);
    const driver = r.querySelector('.driver')?.value.trim();
    const time = r.querySelector('.time')?.value.trim();
    const dns = r.querySelector('.dns')?.checked;
    const pts = dns ? 0 : (pointsForPosition[pos] || 0);
    return { pos, driver, time, dns, pts };
  }).filter(e => e.driver);
  if (!entries.length) { alert('Žádné vyplněné výsledky'); return; }
  try {
    await updateDoc(doc(db, 'races', raceId), { results: entries }, { merge: true });
    alert('Výsledky uloženy ✅');
  } catch (e) {
    console.error("Chyba při ukládání výsledků:", e);
    alert('Nepodařilo se uložit výsledky: ' + (e.message || e));
  }
  resetResultsForm();
}

document.getElementById('race-form')?.addEventListener('submit', saveRaceFromForm);
document.getElementById('results-form')?.addEventListener('submit', saveResultsFromForm);

/* utility pro admin UI: vytvoření polí pro výsledky */
function populateAdminRaceSelect() {
  const sel = document.getElementById('select-race');
  const list = document.getElementById('admin-race-list');
  if (!sel && !list) return;
  if (sel) sel.innerHTML = '<option value="">-- vyber --</option>';
  if (list) list.innerHTML = '';
  allRaces.forEach(r => {
    if (sel) {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = `${r.circuit} — ${formatDateISOtoLocal(r.date)}`;
      sel.appendChild(opt);
    }
    if (list) {
      const li = document.createElement('div');
      li.innerHTML = `<strong>${escapeHtml(r.circuit)}</strong> — ${formatDateISOtoLocal(r.date)}`;
      list.appendChild(li);
    }
  });
}

/* když admin vybere závod, vytvoříme řádky pro pozice */
document.getElementById('select-race')?.addEventListener('change', (e) => {
  const id = e.target.value;
  const container = document.getElementById('positions-container');
  if (!container) return;
  container.innerHTML = '';
  if (!id) return;
  const rows = 8;
  for (let i=1;i<=rows;i++){
    const div = document.createElement('div');
    div.className = 'position-row';
    div.innerHTML = `
      <label>Pořadí <input class="pos" type="number" value="${i}" min="1" max="${rows}"></label>
      <label>Jezdec <input class="driver" type="text" placeholder="nick"></label>
      <label>Čas <input class="time" type="text" placeholder="mm:ss.xxx"></label>
      <label>DNS <input class="dns" type="checkbox"></label>
    `;
    container.appendChild(div);
  }
});

/* =========================
   UI: pomocné funkce
========================= */
function renderAll() {
  const seasonSelect = document.getElementById('season-select');
  const selectedSeason = seasonSelect?.value || 'all';
  renderLeaderboard(selectedSeason);
  renderPastRaces();
}

/* naplnit H2H volbu sezón */
function populateH2HSeasons(){
  const sel = document.getElementById('h2h-season');
  if (!sel) return;
  const seasons = Array.from(new Set(allRaces.map(r => r.season).filter(Boolean))).sort();
  sel.innerHTML = '<option value="all">All-time</option>' + seasons.map(s => `<option value="${s}">${s}</option>`).join('');
}

/* =========================
   PROFIL: load & save
========================= */
async function loadUserProfile(email) {
  const docId = email.replace(/\./g, '_');
  const profile = allProfiles.find(p => p.id === docId);
  if (profile) {
    const elName = document.getElementById('profile-name');
    const elTeam = document.getElementById('profile-team');
    const elEmail = document.getElementById('profile-email');
    const elBio = document.getElementById('profile-bio');
    if (elName) elName.textContent = profile.name || profile.nick || email;
    if (elTeam) elTeam.textContent = profile.team || '';
    if (elEmail) elEmail.textContent = email;
    if (elBio) elBio.textContent = profile.bio || '';
  } else {
    if (document.getElementById('profile-nick')) document.getElementById('profile-nick').value = email.split('@')[0];
    if (document.getElementById('profile-team')) document.getElementById('profile-team').value = '';
    if (document.getElementById('profile-bio-input')) document.getElementById('profile-bio-input').value = '';
  }
  renderProfileView(email);
}

document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) { alert('Musíte být přihlášen'); return; }
  const name = document.getElementById('profile-nick')?.value.trim();
  const team = document.getElementById('profile-team')?.value.trim();
  const bio = document.getElementById('profile-bio-input')?.value.trim();
  const preferred = document.getElementById('profile-preferred')?.value.trim();
  const docId = user.email.replace(/\./g, '_');
  try {
    await setDoc(doc(db,'profiles', docId), { name, team, bio, preferred }, { merge: true });
    alert('Profil uložen ✅');
  } catch (e) {
    console.error("Chyba při ukládání profilu:", e);
    alert('Nepodařilo se uložit profil: ' + (e.message || e));
  }
});

/* =========================
   Init
========================= */
loadData();
console.log("✅ GT7script.js načteno");

// Unsubscribe při zavření stránky
window.addEventListener('beforeunload', () => {
  if (unsubRaces) unsubRaces();
  if (unsubProfiles) unsubProfiles();
  clearInterval(countdownInterval);
});
