/* GT7_firestore_seed.js
   Spusť v prohlížeči (přihlášený do Firebase projektu) pro nahrání testovacích dat.
   Varianta A – každý závod má results jako pole..
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
    {
      date: "2025-07-10T20:00:00",
      circuit: "Red Bull Ring",
      season: 2025,
      allowedCars: "Gr.4, Gr.3",
      results: [
        { pos: 1, driver: "Viki", time: "18:12.345", pts: 10 },
        { pos: 2, driver: "Hardy", time: "18:22.100", pts: 8 },
        { pos: 3, driver: "Maty", time: "18:30.500", pts: 6 }
      ]
    },
    {
      date: "2025-07-25T19:30:00",
      circuit: "Daytona - road circuit",
      season: 2025,
      allowedCars: "Gr.4",
      results: [
        { pos: 1, driver: "Viki", time: "21:10.234", pts: 10 },
        { pos: 2, driver: "Maty", time: "21:18.001", pts: 8 },
        { pos: 3, driver: "Hardy", time: "21:30.444", pts: 6 }
      ]
    },
    {
      date: "2025-08-01T20:00:00",
      circuit: "Monza",
      season: 2025,
      allowedCars: "Gr.3",
      results: [
        { pos: 1, driver: "Hardy", time: "14:02.001", pts: 10 },
        { pos: 2, driver: "Viki", time: "14:05.120", pts: 8 },
        { pos: 3, driver: "Maty", time: "14:10.010", pts: 6 }
      ]
    },
    {
      date: "2025-08-11T20:00:00",
      circuit: "Dragon Trail",
      season: 2025,
      allowedCars: "Gr.4",
      results: [
        { pos: 1, driver: "Viki", time: "17:40.000", pts: 10 },
        { pos: 2, driver: "Maty", time: "17:47.500", pts: 8 },
        { pos: 3, driver: "Hardy", time: "17:55.333", pts: 6 }
      ]
    },
    {
      date: "2025-08-18T20:00:00",
      circuit: "Suzuka",
      season: 2025,
      allowedCars: "Gr.3",
      results: [
        { pos: 1, driver: "Viki", time: "22:02.123", pts: 10 },
        { pos: 2, driver: "Maty", time: "22:10.456", pts: 8 },
        { pos: 3, driver: "Hardy", time: "22:20.789", pts: 6 }
      ]
    },
    {
      date: "2025-10-15T19:00:00",
      circuit: "Brands Hatch",
      season: 2025,
      allowedCars: "Gr.4",
      results: [
        { pos: 1, driver: "Maty", time: "16:55.555", pts: 10 },
        { pos: 2, driver: "Viki", time: "17:01.010", pts: 8 },
        { pos: 3, driver: "Hardy", time: "17:10.111", pts: 6 }
      ]
    },
    {
      date: "2025-10-20T19:30:00",
      circuit: "Le Mans 24h",
      season: 2025,
      allowedCars: "Gr.1 (ne VGT)",
      results: [
        { pos: 1, driver: "Viki", time: "120:00.000", pts: 10 },
        { pos: 2, driver: "Hardy", time: "121:05.222", pts: 8 },
        { pos: 3, driver: "Maty", time: "122:10.333", pts: 6 }
      ]
    }
  ];

  for (const race of races) {
    await addDoc(collection(db, "races"), race);
  }
  alert("✅ Testovací data byla úspěšně nahrána do Firestore (kolekce 'races').");
})();
