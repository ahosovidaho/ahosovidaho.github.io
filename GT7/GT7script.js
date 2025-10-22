/* ===========================
   GT7script.js (opraveno)
   =========================== */

console.log("✅ GT7script.js načteno");

// ====== Firebase inicializace ======
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import {
  getFirestore,
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// --- Firebase konfigurace ---
const firebaseConfig = {
  apiKey: "TVŮJ_API_KEY",
  authDomain: "TVŮJ_PROJEKT.firebaseapp.com",
  projectId: "TVŮJ_PROJEKT",
  storageBucket: "TVŮJ_PROJEKT.appspot.com",
  messagingSenderId: "TVŮJ_MSG_ID",
  appId: "TVŮJ_APP_ID"
};

// --- Inicializace ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ====== Registrace Chart.js komponent ======
if (typeof Chart !== "undefined") {
  try {
    Chart.register(
      ...Object.values(Chart.registry.controllers),
      ...Object.values(Chart.registry.elements),
      ...Object.values(Chart.registry.scales),
      ...Object.values(Chart.registry.plugins)
    );
    console.log("✅ Chart.js komponenty zaregistrovány");
  } catch (e) {
    console.warn("⚠️ Chart.js registrace přeskočena:", e.message);
  }
} else {
  console.warn("⚠️ Chart.js není načten – grafy nebudou vykresleny.");
}

// ====== Změna stavu přihlášení ======
onAuthStateChanged(auth, (user) => {
  const usernameDisplay = document.getElementById("usernameDisplay");

  if (usernameDisplay) {
    usernameDisplay.textContent = user?.displayName || "Neznámý uživatel";
  } else {
    console.warn("⚠️ Element #usernameDisplay nebyl nalezen v DOMu.");
  }

  if (user) {
    console.log(`👤 Přihlášen: ${user.email}`);
    loadData();
  } else {
    console.log("👤 Uživatel není přihlášen.");
  }
});

// ====== Funkce pro načtení dat z Firestore ======
async function loadData() {
  try {
    const profilesRef = collection(db, "profiles");

    onSnapshot(
      profilesRef,
      (snapshot) => {
        console.log(`✅ Data načtena (${snapshot.size} dokumentů)`);
        const profiles = snapshot.docs.map((doc) => doc.data());
        renderAll(profiles);
      },
      (error) => {
        console.error("❌ Firestore (profiles) snapshot error:", error);
        if (error.code === "permission-denied") {
          alert("⚠️ Chybí oprávnění k čtení dat z Firestore.\nZkontroluj Firebase security rules.");
        }
      }
    );
  } catch (err) {
    console.error("❌ Chyba při načítání dat:", err);
  }
}

// ====== Hlavní renderer ======
function renderAll(profiles) {
  try {
    renderLeaderboard(profiles);
    renderPointsChart(profiles);
  } catch (err) {
    console.error("❌ Chyba při renderování:", err);
  }
}

// ====== Render žebříčku ======
function renderLeaderboard(profiles) {
  const leaderboard = document.getElementById("leaderboard");
  if (!leaderboard) {
    console.warn("⚠️ #leaderboard element nebyl nalezen – přeskočeno.");
    return;
  }

  leaderboard.innerHTML = "";

  profiles.sort((a, b) => (b.points || 0) - (a.points || 0));

  profiles.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "leaderboard-row";
    row.innerHTML = `
      <span class="position">#${i + 1}</span>
      <span class="name">${p.name || "Neznámý"}</span>
      <span class="points">${p.points ?? 0}</span>
    `;
    leaderboard.appendChild(row);
  });

  console.log("✅ Žebříček vykreslen.");
}

// ====== Render grafu ======
function renderPointsChart(profiles) {
  const canvas = document.getElementById("pointsChart");
  if (!canvas) {
    console.warn("⚠️ #pointsChart element nebyl nalezen – přeskočeno.");
    return;
  }

  const ctx = canvas.getContext("2d");
  const data = {
    labels: profiles.map((p) => p.name || "Neznámý"),
    values: profiles.map((p) => p.points ?? 0)
  };

  try {
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.labels,
        datasets: [{
          label: "Body",
          data: data.values,
          backgroundColor: "rgba(75, 192, 192, 0.5)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: "GT7 Body podle uživatele"
          },
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
    console.log("✅ Graf vykreslen.");
  } catch (err) {
    console.error("❌ Chart render error:", err);
  }
}
