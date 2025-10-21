/* GT7_firestore_seed.js
   Open this file in browser while logged into your Firebase project (and allowed origin).
   It will push sample races to 'races' collection.
*/
(async function(){
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
  const { getFirestore, collection, addDoc } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');

  const firebaseConfig = {
    apiKey: "AIzaSyCkR-AyJK2vFnz0V2HTuz2b3zCaLMxbXtI",
    authDomain: "test-gt7.firebaseapp.com",
    projectId: "test-gt7",
    storageBucket: "test-gt7.firebasestorage.app",
    messagingSenderId: "928154989107",
    appId: "1:928154989107:web:20a34d0009fa75bd1ee946"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const races = [
    { date: "2025-07-10", circuit: "Red Bull Ring", results: { pos1:{driver:"Viki"}, pos2:{driver:"Hardy"}, pos3:{driver:"Maty"} } },
    { date: "2025-07-25", circuit: "Daytona - road circuit", results: { pos1:{driver:"Viki"}, pos2:{driver:"Maty"}, pos3:{driver:"Hardy"} } },
    { date: "2025-08-01", circuit: "Monza", results: { pos1:{driver:"Hardy"}, pos2:{driver:"Viki"}, pos3:{driver:"Maty"} } },
    { date: "2025-08-11", circuit: "Dragon Trail", results: { pos1:{driver:"Viki"}, pos2:{driver:"Maty"}, pos3:{driver:"Hardy"} } },
    { date: "2025-08-18", circuit: "Suzuka", results: { pos1:{driver:"Viki"}, pos2:{driver:"Maty"}, pos3:{driver:"Hardy"} } },
    { date: "2025-10-15", circuit: "Brands Hatch", results: { pos1:{driver:"Maty"}, pos2:{driver:"Viki"}, pos3:{driver:"Hardy"} } },
    { date: "2025-10-20", circuit: "LeMans", results: { pos1:{driver:"Viki"}, pos2:{driver:"Hardy"}, pos3:{driver:"Maty"} } }
  ];

  for(const r of races){
    await addDoc(collection(db,'races'), r);
  }
  alert('✅ Testovací data nahrána do Firestore (collection "races")');
})();
