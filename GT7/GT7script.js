import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js";

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
const pointsForPosition = {1:10,2:8,3:6,4:4,5:2};
const maxPositions = 5;

let allRaces = [];
window._allRaces = allRaces;

function escapeHtml(s){ if(s===0) return '0'; if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function formatDate(d){ if(!d) return '-'; const dt = new Date(d); return dt.toLocaleDateString('cs-CZ'); }

const btnSignIn = document.getElementById('btn-signin');
const btnSignOut = document.getElementById('btn-signout');
const userEmailSpan = document.getElementById('user-email');
const adminForms = document.getElementById('admin-forms');
const notAdmin = document.getElementById('not-admin');

// Sign in/out with robust error handling and exposed to window
async function signIn(){
  console.log('[Auth] signIn() called');
  try{
    const result = await signInWithPopup(auth, provider);
    console.log('[Auth] signed in as', result.user.email);
    if(result.user.email !== ADMIN_EMAIL){
      alert('Tento účet není povolen jako admin.');
      await signOut(auth);
    }
  }catch(e){
    console.error('[Auth] signIn error', e);
    if(e && e.code === 'auth/unauthorized-domain'){
      alert('Doména není povolená v Firebase Auth. Přidej doménu v Authentication → Settings → Authorized domains.');
    } else if(e && e.code === 'auth/popup-blocked'){
      alert('Prohlížeč zablokoval vyskakovací okno. Povolení pop-upů může problém vyřešit.');
    } else {
      alert('Přihlášení selhalo: ' + (e && e.message ? e.message : e));
    }
  }
}

async function signOutUser(){
  console.log('[Auth] signOut() called');
  try{ await signOut(auth); } catch(e){ console.error('[Auth] signOut error', e); }
}

// expose functions to window so inline onclick works
window.signIn = signIn;
window.signOutUser = signOutUser;
window.debugSignIn = signIn;

// auth state handling
onAuthStateChanged(auth, user=>{
  console.log('[Auth] state changed:', user ? user.email : 'signed out');
  if(user && user.email === ADMIN_EMAIL){
    if(userEmailSpan) userEmailSpan.textContent = user.email;
    if(btnSignIn) btnSignIn.classList.add('hidden');
    if(btnSignOut) btnSignOut.classList.remove('hidden');
    if(adminForms) adminForms.classList.remove('hidden');
    if(notAdmin) notAdmin.classList.add('hidden');
  } else if(user){
    if(userEmailSpan) userEmailSpan.textContent = user.email;
    if(btnSignIn) btnSignIn.classList.add('hidden');
    if(btnSignOut) btnSignOut.classList.remove('hidden');
    if(adminForms) adminForms.classList.add('hidden');
    if(notAdmin) notAdmin.classList.remove('hidden');
  } else {
    if(userEmailSpan) userEmailSpan.textContent = '';
    if(btnSignIn) btnSignIn.classList.remove('hidden');
    if(btnSignOut) btnSignOut.classList.add('hidden');
    if(adminForms) adminForms.classList.add('hidden');
    if(notAdmin) notAdmin.classList.remove('hidden');
  }
});

// minimal data load to avoid breaking
function loadData(){
  try{
    const racesCol = collection(db,'races');
    onSnapshot(racesCol, snap=>{
      const races=[];
      snap.forEach(d=>races.push({id:d.id, ...d.data()}));
      races.sort((a,b)=> new Date(a.date)-new Date(b.date));
      allRaces = races;
      window._allRaces = allRaces;
      // attempt to call optional renderAll if present
      if(typeof renderAll === 'function') renderAll();
    });
  }catch(e){
    console.error('loadData error', e);
  }
}

loadData();
