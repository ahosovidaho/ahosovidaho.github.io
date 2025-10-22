import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto";

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

// Přepínání záložek
window.showTab = function(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.getElementById(tabName).classList.add('active');
};

// Načtení závodů
onSnapshot(collection(db, 'races'), (snapshot) => {
  const races = [];
  snapshot.forEach(doc => races.push({ id: doc.id, ...doc.data() }));

  renderUpcomingRace(races);
  renderPastRaces(races);
  renderAdminRaceList(races);
});

// ✨ Nadcházející závod + odpočet
function renderUpcomingRace(races) {
  const upcomingBox = document.getElementById('upcoming-race-info');
  const countdownEl = document.getElementById('countdown');
  const now = new Date();
  const futureRaces = races.filter(r => r.date && new Date(r.date) > now);
  if (!futureRaces.length) {
    upcomingBox.textContent = "Žádný závod zatím není naplánován";
    countdownEl.textContent = "";
    return;
  }
  futureRaces.sort((a, b) => new Date(a.date) - new Date(b.date));
  const next = futureRaces[0];
  upcomingBox.innerHTML = `
    <strong>${next.circuit}</strong><br>
    ${new Date(next.date).toLocaleString('cs-CZ')}<br>
    Auta: ${next.allowedCars || '-'}<br>
    PP limit: ${next.ppLimit || '-'}<br>
    BoP: ${next.bop || '-'}, Tuning: ${next.tuning || '-'}<br>
    Pneumatiky: ${next.tyreCategory || '-'} (${next.tyreCompound || 'bez povinné směsi'})<br>
    Kol: ${next.laps || '-'} | Palivo x${next.fuel || 1} | Opotřebení x${next.tyreWear || 1} | Tankování ${next.refuel || 0} l/s
  `;

  function updateCountdown() {
    const diff = new Date(next.date) - new Date();
    if (diff <= 0) {
      countdownEl.textContent = "Závod právě probíhá nebo skončil!";
      return;
    }
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);
    countdownEl.textContent = `${d} d ${h} h ${m} m ${s} s`;
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

// 📊 Zobrazení odjetých závodů
function renderPastRaces(races) {
  const container = document.getElementById('past-races');
  const now = new Date();
  const past = races.filter(r => r.date && new Date(r.date) <= now);
  past.sort((a, b) => new Date(b.date) - new Date(a.date));
  container.innerHTML = past.map(r => `
    <div class="section">
      <strong>${r.circuit}</strong><br>
      ${new Date(r.date).toLocaleString('cs-CZ')}
      <div class="small">
        <strong>Výsledky:</strong><br>
        🥇 ${r.results?.pos1?.driver || '-'}<br>
        🥈 ${r.results?.pos2?.driver || '-'}<br>
        🥉 ${r.results?.pos3?.driver || '-'}
      </div>
    </div>
  `).join('');
}

// 🛠️ Admin správa závodů (úprava a mazání)
function renderAdminRaceList(races) {
  const container = document.getElementById('admin-race-list');
  races.sort((a, b) => new Date(b.date) - new Date(a.date));
  container.innerHTML = races.map(r => `
    <div class="section">
      <strong>${r.circuit}</strong><br>
      ${new Date(r.date).toLocaleString('cs-CZ')}
      <div class="admin-actions">
        <button onclick="editRace('${r.id}')">✏ Upravit</button>
        <button onclick="deleteRace('${r.id}')">🗑 Smazat</button>
      </div>
    </div>
  `).join('');
}

// ✏ Úprava závodu
window.editRace = async function (id) {
  const ref = doc(db, 'races', id);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return alert('Závod nenalezen.');
  const r = snapshot.data();
  document.getElementById('race-id').value = id;
  document.getElementById('race-date').value = r.date;
  document.getElementById('circuit-name').value = r.circuit;
  document.getElementById('allowed-cars').value = r.allowedCars || '';
  document.getElementById('pp-limit').value = r.ppLimit || '';
  document.getElementById('bop').value = r.bop || 'Vypnuto';
  document.getElementById('tuning').value = r.tuning || 'Zakázán';
  document.getElementById('tyre-category').value = r.tyreCategory || 'Komfortní';
  document.getElementById('tyre-compound').value = r.tyreCompound || 'Bez povinné směsi';
  document.getElementById('laps').value = r.laps || '';
  document.getElementById('fuel').value = r.fuel || '';
  document.getElementById('tyre-wear').value = r.tyreWear || '';
  document.getElementById('refuel').value = r.refuel || '';
};

// 🗑 Smazání závodu
window.deleteRace = async function (id) {
  if (!confirm('Opravdu smazat tento závod?')) return;
  await deleteDoc(doc(db, 'races', id));
};

// ✍️ Uložení nového nebo upraveného závodu
document.getElementById('race-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('race-id').value;
  const data = {
    date: document.getElementById('race-date').value,
    circuit: document.getElementById('circuit-name').value,
    allowedCars: document.getElementById('allowed-cars').value,
    ppLimit: document.getElementById('pp-limit').value,
    bop: document.getElementById('bop').value,
    tuning: document.getElementById('tuning').value,
    tyreCategory: document.getElementById('tyre-category').value,
    tyreCompound: document.getElementById('tyre-compound').value,
    laps: document.getElementById('laps').value,
    fuel: document.getElementById('fuel').value,
    tyreWear: document.getElementById('tyre-wear').value,
    refuel: document.getElementById('refuel').value
  };

  try {
    if (id) {
      await updateDoc(doc(db, 'races', id), data);
      alert('Závod byl upraven ✅');
    } else {
      await addDoc(collection(db, 'races'), data);
      alert('Závod byl uložen ✅');
    }
    e.target.reset();
    document.getElementById('race-id').value = '';
  } catch (err) {
    console.error(err);
    alert('Chyba při ukládání závodu: ' + err.message);
  }
});
