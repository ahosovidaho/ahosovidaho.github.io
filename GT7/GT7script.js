import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, getDocs, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto";

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
const ADMIN_EMAIL = "viktor.tamayo@gmail.com";

const pointsForPosition = {1:10, 2:8, 3:6, 4:4, 5:2};
const maxPositions = 5;

let allRaces = [];
let allProfiles = [];
let countdownInterval = null;

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
function formatDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' });
}

/* =========================
   AUTENTIZACE
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

onAuthStateChanged(auth, async (user) => {
  if (user && user.email === ADMIN_EMAIL) {
    userEmailSpan.textContent = user.email;
    btnSignIn.classList.add('hidden');
    btnSignOut.classList.remove('hidden');
    adminForms.classList.remove('hidden');
    notAdmin.classList.add('hidden');
  } else if (user) {
    userEmailSpan.textContent = user.email;
    btnSignIn.classList.add('hidden');
    btnSignOut.classList.remove('hidden');
    adminForms.classList.add('hidden');
    notAdmin.classList.remove('hidden');
    await loadUserProfile(user.email);
  } else {
    userEmailSpan.textContent = '';
    btnSignIn.classList.remove('hidden');
    btnSignOut.classList.add('hidden');
    adminForms.classList.add('hidden');
    notAdmin.classList.remove('hidden');
  }
});

/* =========================
   ZÁVODY – NAČÍTÁNÍ A RENDER
========================= */
function loadData() {
  onSnapshot(collection(db, 'races'), snap => {
    const races = [];
    snap.forEach(d => races.push({ id: d.id, ...d.data() }));
    // seřazení od nejnovějších
    races.sort((a, b) => new Date(b.date) - new Date(a.date));
    allRaces = races;
    renderAll();
    renderUpcomingRace();
  });
  onSnapshot(collection(db, 'profiles'), snap => {
    const profiles = [];
    snap.forEach(d => profiles.push({ id: d.id, ...d.data() }));
    allProfiles = profiles;
  });
}

/* =========================
   NADCHÁZEJÍCÍ ZÁVOD
========================= */
function renderUpcomingRace() {
  const container = document.getElementById('upcoming-race');
  if (!container) return;
  const now = new Date();
  const upcoming = allRaces
    .filter(r => new Date(r.date) > now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  if (!upcoming) {
    container.innerHTML = `<p>Žádný nadcházející závod není naplánován.</p>`;
    return;
  }

  container.innerHTML = `
    <h2>Nadcházející závod: ${escapeHtml(upcoming.circuit)}</h2>
    <p id="upcoming-race-details">
      🏁 ${formatDate(upcoming.date)}<br>
      🚗 Povolená auta: ${escapeHtml(upcoming.allowedCars || '-') }<br>
      ⚖️ BoP: ${upcoming.bop ? 'Zapnuto' : 'Vypnuto'} | 🛠️ Tuning: ${upcoming.tuning ? 'Povolen' : 'Zakázán'}<br>
      🧰 PP limit: ${escapeHtml(upcoming.ppLimit || '-')} | Pneumatiky: ${escapeHtml(upcoming.tyreCategory || '-')}, ${escapeHtml(upcoming.tyreCompound || '-')}<br>
      ⛽ Palivo x${upcoming.fuelMult || 1} | 🛞 Opotřebení x${upcoming.tyreWearMult || 1} | ⏳ Tankování: ${upcoming.refuelSpeed || 0} l/s
    </p>
    <p id="countdown"></p>
  `;
  startCountdown(new Date(upcoming.date));
}

function startCountdown(targetDate) {
  const countdown = document.getElementById('countdown');
  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    const now = new Date().getTime();
    const diff = targetDate - now;

    if (diff <= 0) {
      clearInterval(countdownInterval);
      countdown.textContent = "Závod právě probíhá!";
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    countdown.textContent = `${days} d ${hours} h ${minutes} m ${seconds} s`;
  }, 1000);
}

/* =========================
   HEAD TO HEAD
========================= */
window.compareDrivers = function() {
  const d1 = document.getElementById('head2head-driver1').value;
  const d2 = document.getElementById('head2head-driver2').value;
  const resultEl = document.getElementById('head2head-result');

  if (!d1 || !d2 || d1 === d2) {
    resultEl.innerHTML = `<p>Vyberte dva různé jezdce.</p>`;
    return;
  }

  const stats = calculateLeaderboardFromRaces(allRaces);
  const s1 = stats.find(s => s.driver === d1);
  const s2 = stats.find(s => s.driver === d2);

  if (!s1 || !s2) {
    resultEl.innerHTML = `<p>Chybí data pro vybraného jezdce.</p>`;
    return;
  }

  const winner = s1.points > s2.points ? d1 : d2;
  const loser = s1.points > s2.points ? d2 : d1;

  resultEl.innerHTML = `
    <p><strong>${escapeHtml(d1)}</strong>: ${s1.points} b | ${s1.wins} vítězství<br>
       <strong>${escapeHtml(d2)}</strong>: ${s2.points} b | ${s2.wins} vítězství</p>
    <p><span class="win">${escapeHtml(winner)}</span> 🏆 vs <span class="lose">${escapeHtml(loser)}</span></p>
  `;
};

/* =========================
   PROFIL JEZDCE
========================= */
async function loadUserProfile(email) {
  const docId = email.replace(/\./g, '_');
  const profile = allProfiles.find(p => p.id === docId);
  if (profile) {
    document.getElementById('profile-name').textContent = profile.name || email;
    document.getElementById('profile-team').textContent = profile.team || '';
  }
}

window.saveProfile = async function() {
  const user = auth.currentUser;
  if (!user) return;
  const name = document.getElementById('edit-name').value;
  const team = document.getElementById('edit-team').value;
  const docId = user.email.replace(/\./g, '_');
  await setDoc(doc(db, 'profiles', docId), { name, team }, { merge: true });
  alert('Profil uložen ✅');
};

/* =========================
   VÝPOČET STATISTIK
========================= */
function calculateLeaderboardFromRaces(races) {
  const stats = {};
  races.forEach((race, idx) => {
    if (!race.results) return;
    for (let i = 1; i <= maxPositions; i++) {
      const res = race.results['pos' + i];
      if (!res || !res.driver) continue;
      const driver = res.driver;
      const pts = res.dns ? 0 : (pointsForPosition[i] || 0);
      if (!stats[driver]) stats[driver] = { driver, points: 0, wins: 0, podiums: 0, dns: 0, starts: 0, pointsHistory: [] };
      stats[driver].points += pts;
      stats[driver].starts++;
      stats[driver].pointsHistory.push({ raceIndex: idx, cumulative: stats[driver].points });
      if (i === 1) stats[driver].wins++;
      if (i <= 3) stats[driver].podiums++;
      if (res.dns) stats[driver].dns++;
    }
  });
  return Object.values(stats).sort((a, b) => b.points - a.points);
}

/* =========================
   RENDER VŠEHO
========================= */
function renderAll() {
  // existující render leaderboardu, archivů, statistik apod.
  // Tady by zůstaly funkce renderLeaderboard, renderPastRaces, renderHall apod.
  // které už máme z předchozích verzí fixu
}

/* =========================
   INIT
========================= */
loadData();
console.log("✅ GT7script.js načteno");
