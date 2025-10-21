
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
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
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const ADMIN_EMAIL = "viktor.tamayo@gmail.com";

window.showTab = function(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.getElementById(tabName).classList.add('active');
};

function renderPastRaces(races) {
  const container = document.getElementById('past-races');
  container.innerHTML = races.map(race => {
    const resultsHtml = race.results
      ? `<div class="small"><strong>Výsledky:</strong><br>
        🥇 ${race.results.pos1?.driver || '-'}<br>
        🥈 ${race.results.pos2?.driver || '-'}<br>
        🥉 ${race.results.pos3?.driver || '-'}
        </div>`
      : '<div class="small">Žádné výsledky</div>';
    const videoHtml = race.youtubeUrl
      ? `<iframe class="youtube-preview" src="${race.youtubeUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}" allowfullscreen></iframe>`
      : '<div class="small">🎥 Video zatím není k dispozici.</div>';
    return `<div class="section"><strong>${race.circuit}</strong><br>${resultsHtml}${videoHtml}</div>`;
  }).join('');
}
