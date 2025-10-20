import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

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

// Přihlášení a odhlášení
async function signIn() {
  console.log('[Auth] signIn() called');
  try {
    const result = await signInWithPopup(auth, provider);
    console.log('[Auth] signed in as', result.user.email);
  } catch (e) {
    console.error('[Auth] signIn error', e);
    alert('Přihlášení selhalo: ' + (e.message || e));
  }
}

async function signOutUser() {
  console.log('[Auth] signOut() called');
  try {
    await signOut(auth);
  } catch (e) {
    console.error('[Auth] signOut error', e);
  }
}

// ✅ Exponování funkcí do globálního prostoru
window.signIn = signIn;
window.signOutUser = signOutUser;

// UI změny při změně auth stavu
const btnSignIn = document.getElementById('btn-signin');
const btnSignOut = document.getElementById('btn-signout');
const userEmailSpan = document.getElementById('user-email');
const adminForms = document.getElementById('admin-forms');
const notAdmin = document.getElementById('not-admin');

onAuthStateChanged(auth, user => {
  console.log('[Auth] state changed:', user ? user.email : 'odhlášen');
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
  } else {
    userEmailSpan.textContent = '';
    btnSignIn.classList.remove('hidden');
    btnSignOut.classList.add('hidden');
    adminForms.classList.add('hidden');
    notAdmin.classList.remove('hidden');
  }
});

// Načtení dat z Firestore
function loadData() {
  try {
    const racesCol = collection(db, 'races');
    onSnapshot(racesCol, snap => {
      const races = [];
      snap.forEach(d => races.push({ id: d.id, ...d.data() }));
      races.sort((a, b) => new Date(a.date) - new Date(b.date));
      console.log('[Firestore] races loaded', races);
    });
  } catch (e) {
    console.error('loadData error', e);
  }
}

// ✅ Chart.js nyní přes globální objekt Chart
function testChart() {
  const ctx = document.getElementById('points-chart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Z1', 'Z2', 'Z3'],
      datasets: [{
        label: 'Ukázka',
        data: [10, 15, 20],
        borderColor: '#667eea'
      }]
    }
  });
}

loadData();
testChart();
