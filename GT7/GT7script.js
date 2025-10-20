// =========================
// 🧑‍💻 Přihlášení admina
// =========================

async function signIn() {
  console.log("[Auth] Pokus o přihlášení...");
  try {
    const result = await signInWithPopup(auth, provider);
    console.log("[Auth] Přihlášený uživatel:", result.user.email);

    if (result.user.email !== ADMIN_EMAIL) {
      alert("⚠️ Tento účet nemá administrátorská práva.");
      await signOut(auth);
    }
  } catch (e) {
    console.error("[Auth] Chyba přihlášení:", e);
    if (e.code === "auth/unauthorized-domain") {
      alert("❌ Doména není povolená v Firebase Auth.\n\nPřidej doménu webu do sekce Authentication → Settings → Authorized domains.");
    } else if (e.code === "auth/popup-blocked") {
      alert("⚠️ Prohlížeč zablokoval vyskakovací okno. Povolení pop-upů může problém vyřešit.");
    } else {
      alert("Přihlášení selhalo: " + (e.message || e));
    }
  }
}

async function signOutUser() {
  console.log("[Auth] Odhlášení...");
  await signOut(auth);
}

// ✅ Funkce vystavené pro HTML tlačítka
window.signIn = signIn;
window.signOutUser = signOutUser;

// =========================
// 🪪 Reakce na změnu stavu přihlášení
// =========================
onAuthStateChanged(auth, user => {
  console.log("[Auth] Změna stavu:", user ? user.email : "nepřihlášen");
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

// 📡 Pomocné ladění — umožní spustit přihlášení z konzole
window.debugSignIn = signIn;

onAuthStateChanged(auth, user=>{
  if(user && user.email===ADMIN_EMAIL){ userEmailSpan.textContent = user.email; btnSignIn.classList.add('hidden'); btnSignOut.classList.remove('hidden'); adminForms.classList.remove('hidden'); notAdmin.classList.add('hidden'); }
  else if(user){ userEmailSpan.textContent = user.email; btnSignIn.classList.add('hidden'); btnSignOut.classList.remove('hidden'); adminForms.classList.add('hidden'); notAdmin.classList.remove('hidden'); }
  else{ userEmailSpan.textContent = ''; btnSignIn.classList.remove('hidden'); btnSignOut.classList.add('hidden'); adminForms.classList.add('hidden'); notAdmin.classList.remove('hidden'); }
});

function loadData(){ const racesCol = collection(db,'races'); onSnapshot(racesCol, snap=>{ const races=[]; snap.forEach(d=>races.push({id:d.id, ...d.data()})); races.sort((a,b)=> new Date(a.date)-new Date(b.date)); allRaces = races; window._allRaces = allRaces; renderAll(); populateAdminRaceSelect(); }); }

function calculateLeaderboardFromRaces(races){
  const stats = {};
  races.forEach((race, idx)=>{ if(!race.results) return; for(let i=1;i<=maxPositions;i++){ const res = race.results['pos'+i]; if(!res||!res.driver) continue; const driver = res.driver; const pts = res.dns?0:(pointsForPosition[i]||0); if(!stats[driver]) stats[driver] = { driver, points:0, wins:0, podiums:0, dns:0, starts:0, pointsHistory:[] }; stats[driver].points += pts; stats[driver].starts++; stats[driver].pointsHistory.push({ raceIndex: idx, cumulative: stats[driver].points }); if(i===1) stats[driver].wins++; if(i<=3) stats[driver].podiums++; if(res.dns) stats[driver].dns++; } });
  return Object.values(stats).sort((a,b)=>b.points - a.points);
}

function calculateLeaderboardForSeason(races, year){ const filtered = races.filter(r=> r.date && new Date(r.date).getFullYear()===year); return calculateLeaderboardFromRaces(filtered); }
function calculateAllTimeStats(races){ const stats = {}; races.forEach(race=>{ if(!race.results) return; for(let i=1;i<=maxPositions;i++){ const res = race.results['pos'+i]; if(!res||!res.driver) continue; const d = res.driver; const pts = res.dns?0:(pointsForPosition[i]||0); if(!stats[d]) stats[d] = { driver:d, points:0, wins:0, starts:0 }; stats[d].points += pts; stats[d].starts++; if(i===1) stats[d].wins++; } }); return Object.values(stats).sort((a,b)=>b.points - a.points); }

function renderAll(){ const year = new Date().getFullYear(); const lb = calculateLeaderboardForSeason(allRaces, year); renderLeaderboard(lb); renderPointsChart(lb, allRaces.filter(r=>new Date(r.date).getFullYear()===year).length); renderStats(allRaces); renderPastRaces(allRaces); renderArchive(allRaces); renderHall(allRaces); }

function renderLeaderboard(leaderboard){ const minStarts = parseInt(document.getElementById('min-starts').value)||0; const search = document.getElementById('search-driver').value.toLowerCase()||''; const container = document.getElementById('leaderboard-container'); const filtered = leaderboard.filter(d=>d.starts>=minStarts && d.driver.toLowerCase().includes(search)); if(!filtered.length){ container.innerHTML = '<p class="small">Zatím žádní jezdci</p>'; return; } let html = '<table class="leaderboard-table"><thead><tr><th>#</th><th>Jezdec</th><th>Body</th><th>Výhry</th><th>Pódia</th><th>DNS</th></tr></thead><tbody>'; filtered.forEach((d,i)=> html += `<tr><td>${i+1}</td><td><a href="#" onclick="openDriverModal('${escapeHtml(d.driver)}');return false;">${escapeHtml(d.driver)}</a></td><td>${d.points}</td><td>${d.wins}</td><td>${d.podiums}</td><td>${d.dns}</td></tr>`); html += '</tbody></table>'; container.innerHTML = html; }

let mainChart = null;
function renderPointsChart(leaderboard, totalRaces){ const ctx = document.getElementById('points-chart').getContext('2d'); const datasets = leaderboard.map(d=>{ const data = []; for(let i=0;i<totalRaces;i++){ const entry = d.pointsHistory.find(p=>p.raceIndex===i); data.push(entry?entry.cumulative:(data[i-1]||0)); } return { label:d.driver, data, tension:0.2, borderWidth:2, fill:false }; }); const labels = Array.from({length: totalRaces}, (_,i)=>`Závod ${i+1}`); if(mainChart) mainChart.destroy(); mainChart = new Chart(ctx, { type:'line', data:{ labels, datasets }, options:{ responsive:true, plugins:{ legend:{ position:'top' }, title:{ display:true, text:'Vývoj bodů v sezóně' } }, scales:{ y:{ beginAtZero:true } } } }); }

function renderStats(races){ const brandWins = {}; const drivetrainWins = {}; races.forEach(r=>{ if(!r.results||!r.results.pos1) return; const car = r.results.pos1.manufacturer||'Neznámé'; const drive = r.results.pos1.drivetrain||'Neznámé'; brandWins[car]=(brandWins[car]||0)+1; drivetrainWins[drive]=(drivetrainWins[drive]||0)+1; }); const bestBrand = Object.entries(brandWins).sort((a,b)=>b[1]-a[1])[0]||[]; const bestDrive = Object.entries(drivetrainWins).sort((a,b)=>b[1]-a[1])[0]||[]; const c = document.getElementById('stats-container'); c.innerHTML = `<p>🏎️ Nejčastější vítězná značka: <strong>${escapeHtml(bestBrand[0]||'-')}</strong> — ${bestBrand[1]||0} vítězství</p><p>⚙️ Nejčastější pohon vítězů: <strong>${escapeHtml(bestDrive[0]||'-')}</strong> — ${bestDrive[1]||0} vítězství</p>`; }

function renderPastRaces(races){ const container = document.getElementById('past-races'); const year = new Date().getFullYear(); const list = races.filter(r=> new Date(r.date).getFullYear()===year); if(!list.length){ container.innerHTML = '<p class="small">Žádné závody v aktuální sezóně</p>'; return; } container.innerHTML = list.map(r=>{ const res = r.results ? `<div class="small"><strong>Výsledky:</strong><br>🥇 ${escapeHtml(r.results.pos1?.driver||'-')} (${escapeHtml((r.results.pos1?.manufacturer||'')+' '+(r.results.pos1?.model||''))}) - ${escapeHtml(r.results.pos1?.drivetrain||'')}<br>🥈 ${escapeHtml(r.results.pos2?.driver||'-')} (${escapeHtml((r.results.pos2?.manufacturer||'')+' '+(r.results.pos2?.model||''))})<br>🥉 ${escapeHtml(r.results.pos3?.driver||'-')} (${escapeHtml((r.results.pos3?.manufacturer||'')+' '+(r.results.pos3?.model||''))})</div>` : '<div class="small">Žádné výsledky</div>'; return `<div class="section"><strong>${escapeHtml(r.circuit||'Neznámý okruh')}</strong> — <span class="small">${formatDate(r.date)}</span>${res}</div>`; }).join(''); }

function renderArchive(races){ const container = document.getElementById('archive-content'); if(!races.length){ container.innerHTML = '<p class="small">Archiv je prázdný</p>'; return; } const byYear = {}; races.forEach(r=>{ const y = new Date(r.date).getFullYear(); if(!byYear[y]) byYear[y]=[]; byYear[y].push(r); }); const years = Object.keys(byYear).sort((a,b)=>b-a); container.innerHTML = years.map(y=>{ const items = byYear[y].map(r=>`<div class="fun-item"><strong>${escapeHtml(r.circuit||'')} — ${formatDate(r.date)}</strong><br>🥇 ${escapeHtml(r.results?.pos1?.driver||'-')} | 🥈 ${escapeHtml(r.results?.pos2?.driver||'-')} | 🥉 ${escapeHtml(r.results?.pos3?.driver||'-')}</div>`).join(''); return `<h3>Sezóna ${y}</h3>${items}`; }).join(''); }

function renderHall(races){ const hall = document.getElementById('hall-of-fame'); const fun = document.getElementById('fun-facts'); const alltime = calculateAllTimeStats(races); const top5 = alltime.slice(0,5); hall.innerHTML = `<h4>Top 5 all-time</h4><ol>${top5.map(p=>`<li>${escapeHtml(p.driver)} — ${p.points} b, ${p.wins} vítězství</li>`).join('')}</ol>`; const ctx = document.getElementById('hall-bar-chart').getContext('2d'); const labels = top5.map(p=>p.driver); const data = top5.map(p=>p.points); new Chart(ctx, { type:'bar', data:{ labels, datasets:[{ label:'Body', data, backgroundColor:'rgba(102,126,234,0.6)' }] }, options:{ responsive:true } }); const streaks = {}; let cur = {driver:null,count:0}; races.forEach(r=>{ if(!r.results||!r.results.pos1) return; const w = r.results.pos1.driver; if(cur.driver===w) cur.count++; else { if(cur.driver) streaks[cur.driver]=Math.max(streaks[cur.driver]||0, cur.count); cur={driver:w,count:1}; } }); if(cur.driver) streaks[cur.driver]=Math.max(streaks[cur.driver]||0, cur.count); const longest = Object.entries(streaks).sort((a,b)=>b[1]-a[1])[0]||['-',0]; fun.innerHTML = `<div class="fun-item">🔥 Nejdelší série výher: <strong>${escapeHtml(longest[0])}</strong> (${longest[1]} v řadě)</div>`; }

let driverChart = null;
window.openDriverModal = function(driverName){ const modal = document.getElementById('driver-modal'); modal.classList.remove('hidden'); document.getElementById('driver-name').textContent = driverName; const races = allRaces; const results = []; let totalPoints=0,wins=0,dns=0,starts=0,totalPos=0; const brandCount = {}; const timeline = []; races.forEach((race, idx)=>{ for(let i=1;i<=maxPositions;i++){ const r = race.results && race.results['pos'+i]; if(!r||!r.driver) continue; if(r.driver===driverName){ starts++; const pts = r.dns?0:(pointsForPosition[i]||0); totalPoints+=pts; totalPos+=i; if(i===1) wins++; if(r.dns) dns++; brandCount[r.manufacturer||'Neznámé']=(brandCount[r.manufacturer||'Neznámé']||0)+1; timeline.push({index:idx,cumulative:totalPoints}); results.push({date:race.date,circuit:race.circuit,position:i,manufacturer:r.manufacturer||'-',model:r.model||'-',drivetrain:r.drivetrain||'-',dns:!!r.dns,points:pts}); } } }); document.getElementById('driver-summary').innerHTML = `<p>🏎️ Body: <strong>${totalPoints}</strong> | Výhry: ${wins} | Starty: ${starts} | DNS: ${dns}</p><p>Prům. pozice: ${starts? (totalPos/starts).toFixed(2):'-'}</p>`; document.getElementById('driver-race-history').innerHTML = `<table class="driver-history-table"><thead><tr><th>Datum</th><th>Okruh</th><th>Pozice</th><th>Značka</th><th>Model</th><th>Pohon</th><th>DNS</th><th>Body</th></tr></thead><tbody>${results.map(r=>`<tr><td>${formatDate(r.date)}</td><td>${escapeHtml(r.circuit)}</td><td>${r.position}</td><td>${escapeHtml(r.manufacturer)}</td><td>${escapeHtml(r.model)}</td><td>${escapeHtml(r.drivetrain)}</td><td>${r.dns? '✅':'❌'}</td><td>${r.points}</td></tr>`).join('')}</tbody></table>`; const ctx = document.getElementById('driver-points-chart').getContext('2d'); if(driverChart) driverChart.destroy(); driverChart = new Chart(ctx, { type:'line', data:{ labels: timeline.map(t=>'Z'+(t.index+1)), datasets:[{ label:driverName, data:timeline.map(t=>t.cumulative), borderColor:'#667eea', fill:false }] }, options:{ responsive:true } }); };

window.closeDriverModal = function(){ document.getElementById('driver-modal').classList.add('hidden'); if(driverChart) driverChart.destroy(); };

function populateAdminRaceSelect(){ const sel = document.getElementById('select-race'); if(!sel) return; sel.innerHTML = '<option value="">Vyberte závod</option>' + allRaces.map(r=>`<option value="${r.id}">${escapeHtml(r.circuit)} - ${formatDate(r.date)}</option>`).join(''); renderPositionInputs(); }

function renderPositionInputs(){ const container = document.getElementById('positions-container'); container.innerHTML=''; for(let i=1;i<=maxPositions;i++){ const div=document.createElement('div'); div.innerHTML = `<div class="form-row"><label>${i}. Jezdec<select id="pos${i}"><option value="">-</option><option>Viki</option><option>Mára</option><option>Maty</option><option>Hardy</option><option>Ondra</option></select></label><label>Značka<input id="pos${i}_manufacturer"></label><label>Model<input id="pos${i}_model"></label><label>Pohon<input id="pos${i}_drivetrain"></label><label><input type="checkbox" id="pos${i}_dns"> DNS</label></div>`; container.appendChild(div); } }

const raceForm = document.getElementById('race-form');
raceForm.addEventListener('submit', async (e)=>{ e.preventDefault(); const editId = document.getElementById('edit-id').value; const payload = { date: document.getElementById('race-date').value, circuit: document.getElementById('circuit-name').value, cars: document.getElementById('allowed-cars').value, additionalInfo: document.getElementById('additional-info').value }; try{ if(editId) await updateDoc(doc(db,'races',editId), payload); else await addDoc(collection(db,'races'), payload); raceForm.reset(); }catch(err){ alert('Chyba: '+(err.message||err)); } });

const resultsForm = document.getElementById('results-form');
resultsForm.addEventListener('submit', async (e)=>{ e.preventDefault(); const raceId = document.getElementById('select-race').value; if(!raceId){ alert('Vyberte závod'); return; } const results = {}; for(let i=1;i<=maxPositions;i++){ results['pos'+i] = { driver: document.getElementById(`pos${i}`).value, manufacturer: document.getElementById(`pos${i}_manufacturer`).value, model: document.getElementById(`pos${i}_model`).value, drivetrain: document.getElementById(`pos${i}_drivetrain`).value, dns: document.getElementById(`pos${i}_dns`).checked }; } const youtube = document.getElementById('youtube-url').value; try{ await updateDoc(doc(db,'races',raceId), { results, youtubeUrl: youtube||null }); resultsForm.reset(); }catch(err){ alert('Chyba: '+(err.message||err)); } });

document.getElementById('search-driver').addEventListener('input', ()=> renderLeaderboard(calculateLeaderboardForSeason(allRaces, new Date().getFullYear())));
document.getElementById('min-starts').addEventListener('input', ()=> renderLeaderboard(calculateLeaderboardForSeason(allRaces, new Date().getFullYear())));

loadData();
