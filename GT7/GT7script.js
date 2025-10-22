import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { Chart } from "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/+esm";

console.log("✅ GT7script.js načteno");

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyD-...",
  authDomain: "test-gt7.firebaseapp.com",
  projectId: "test-gt7",
  storageBucket: "test-gt7.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Inicializace
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ⚙️ 1️⃣ Sleduj přihlášení uživatele
onAuthStateChanged(auth, (user) => {
  const userNameEl = document.getElementById("user-name");
  if (user && userNameEl) {
    userNameEl.textContent = user.displayName || "Anonymní řidič";
  } else if (userNameEl) {
    userNameEl.textContent = "Nepřihlášen";
  }
});

// ⚙️ 2️⃣ Načti data závodů z Firestore
async function loadData() {
  console.log("📡 Načítám data z Firestore...");
  const raceListEl = document.getElementById("race-list");
  if (!raceListEl) return;

  try {
    const racesCol = collection(db, "races");
    onSnapshot(racesCol, (snapshot) => {
      raceListEl.innerHTML = "";
      const raceNames = [];
      const racePoints = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        raceListEl.innerHTML += `<div class="race">
          <strong>${data.name}</strong> — ${data.date} — Body: ${data.points}
        </div>`;
        raceNames.push(data.name);
        racePoints.push(data.points);
      });

      renderChart(raceNames, racePoints);
    });
  } catch (error) {
    console.error("❌ Chyba při načítání dat:", error);
    if (raceListEl) {
      raceListEl.innerHTML = `<p class="error">⚠️ Nepodařilo se načíst data (pravděpodobně chybí oprávnění Firestore).</p>`;
    }
  }
}

// ⚙️ 3️⃣ Vykreslení grafu
function renderChart(labels, dataPoints) {
  const ctx = document.getElementById("resultsChart");
  if (!ctx) return;

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Body za závod",
        data: dataPoints,
        backgroundColor: "#e63946",
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: "Výsledky závodů" }
      }
    }
  });
}

// Spusť načítání dat
loadData();
