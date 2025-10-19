let data = {
    currentSeason: {
        name: "Sezóna 2025",
        races: [],
        standings: []
    },
    archive: []
};

// Automatické přepínání tmavého/světlého motivu
function setThemeByTime() {
    const hour = new Date().getHours();
    if (hour >= 18 || hour < 6) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

setThemeByTime();

// Načtení dat
async function loadData() {
    try {
        const response = await fetch('data.json');
        if (response.ok) {
            data = await response.json();
        }
    } catch (e) {
        console.log('Data soubor nenalezen, používám prázdná data');
    }
    renderAll();
}

function renderAll() {
    renderStandings();
    renderRaces();
    renderArchive();
    renderRaceSelect();
    renderCountdown();
    renderPointsChart();
}

function renderStandings() {
    const tbody = document.getElementById('standings-body');
    const standings = calculateStandings();
    
    tbody.innerHTML = standings.map(s => `
        <tr>
            <td>${s.driver}</td>
            <td class="position-1">${s.first}</td>
            <td class="position-2">${s.second}</td>
            <td class="position-3">${s.third}</td>
            <td><strong>${s.points}</strong></td>
        </tr>
    `).join('');
}

function calculateStandings() {
    const drivers = ['Viki', 'Mára', 'Maty', 'Hardy', 'Ondra'];
    const standings = drivers.map(driver => ({
        driver,
        first: 0,
        second: 0,
        third: 0,
        points: 0
    }));

    data.currentSeason.races.forEach(race => {
        if (race.results) {
            const first = typeof race.results.first === 'string' ? race.results.first : race.results.first?.driver;
            const second = typeof race.results.second === 'string' ? race.results.second : race.results.second?.driver;
            const third = typeof race.results.third === 'string' ? race.results.third : race.results.third?.driver;
            
            const result = standings.find(s => s.driver === first);
            if (result) {
                result.first++;
                result.points += 8;
            }
            const result2 = standings.find(s => s.driver === second);
            if (result2) {
                result2.second++;
                result2.points += 5;
            }
            const result3 = standings.find(s => s.driver === third);
            if (result3) {
                result3.third++;
                result3.points += 3;
            }
        }
    });

    return standings.sort((a, b) => b.points - a.points);
}

function renderCountdown() {
    const today = new Date();
    const upcoming = data.currentSeason.races.filter(r => new Date(r.date) >= today && !r.results);
    
    const container = document.getElementById('countdown-container');
    
    if (upcoming.length === 0) {
        container.innerHTML = '';
        return;
    }

    const nextRace = upcoming[0];
    const raceDate = new Date(nextRace.date);
    
    if (!container.querySelector('.countdown-box')) {
        container.innerHTML = `
            <div class="countdown-box animate-in">
                <div class="countdown-title">⏱️ Další závod za:</div>
                <div class="countdown-timer" id="countdown-timer"></div>
                <div class="countdown-race">${nextRace.circuit}</div>
            </div>
        `;
    }
    
    function updateCountdown() {
        const now = new Date();
        const diff = raceDate - now;
        
        if (diff < 0) {
            container.innerHTML = '';
            return;
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        const timerElement = document.getElementById('countdown-timer');
        if (timerElement) {
            timerElement.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

function renderPointsChart() {
    const races = data.currentSeason.races.filter(r => r.results);
    if (races.length === 0) {
        document.getElementById('points-chart').innerHTML = '<p style="color: #86868b; text-align: center; padding: 40px;">Zatím žádné dokončené závody</p>';
        return;
    }

    const drivers = ['Viki', 'Mára', 'Maty', 'Hardy', 'Ondra'];
    const chartData = [];
    const driverPoints = {};
    
    drivers.forEach(d => driverPoints[d] = 0);
    
    races.forEach((race, index) => {
        const first = typeof race.results.first === 'string' ? race.results.first : race.results.first?.driver;
        const second = typeof race.results.second === 'string' ? race.results.second : race.results.second?.driver;
        const third = typeof race.results.third === 'string' ? race.results.third : race.results.third?.driver;
        
        if (first) driverPoints[first] += 8;
        if (second) driverPoints[second] += 5;
        if (third) driverPoints[third] += 3;
        
        const dataPoint = {
            name: race.circuit.substring(0, 15),
            race: index + 1
        };
        
        drivers.forEach(d => {
            dataPoint[d] = driverPoints[d];
        });
        
        chartData.push(dataPoint);
    });

    const chartContainer = document.getElementById('points-chart');
    chartContainer.innerHTML = '<canvas id="chart-canvas" style="max-height: 400px; width: 100%;"></canvas>';
    
    setTimeout(() => {
        const canvas = document.getElementById('chart-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = chartContainer.clientWidth;
        const height = 400;
        canvas.width = width;
        canvas.height = height;
        
        const colors = {
            'Viki': '#667eea',
            'Mára': '#f093fb',
            'Maty': '#4facfe',
            'Hardy': '#43e97b',
            'Ondra': '#fa709a'
        };
        
        const padding = 60;
        const graphWidth = width - padding * 2;
        const graphHeight = height - padding * 2;
        const maxPoints = Math.max(...drivers.map(d => driverPoints[d])) + 5;
        
        ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#2d2d2f' : 'white';
        ctx.fillRect(0, 0, width, height);
        
        ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#4d4d4f' : '#d2d2d7';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (graphHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
            
            ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#98989d' : '#86868b';
            ctx.font = '12px -apple-system';
            ctx.textAlign = 'right';
            ctx.fillText(Math.round(maxPoints - (maxPoints / 5) * i), padding - 10, y + 4);
        }
        
        drivers.forEach(driver => {
            if (driverPoints[driver] === 0) return;
            
            ctx.strokeStyle = colors[driver];
            ctx.lineWidth = 3;
            ctx.beginPath();
            
            chartData.forEach((point, index) => {
                const x = padding + (graphWidth / Math.max(chartData.length - 1, 1)) * index;
                const y = padding + graphHeight - (point[driver] / maxPoints) * graphHeight;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
            
            chartData.forEach((point, index) => {
                const x = padding + (graphWidth / Math.max(chartData.length - 1, 1)) * index;
                const y = padding + graphHeight - (point[driver] / maxPoints) * graphHeight;
                
                ctx.fillStyle = colors[driver];
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fill();
            });
        });
        
        const legendY = height - 20;
        let legendX = padding;
        ctx.font = '14px -apple-system';
        drivers.forEach(driver => {
            if (driverPoints[driver] === 0) return;
            
            ctx.fillStyle = colors[driver];
            ctx.fillRect(legendX, legendY, 15, 15);
            
            ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#f5f5f7' : '#1d1d1f';
            ctx.textAlign = 'left';
            ctx.fillText(driver, legendX + 20, legendY + 12);
            
            legendX += 100;
        });
    }, 100);
}

function getYouTubeEmbedUrl(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
}

function renderRaceCard(race) {
    const resultsHtml = race.results ? (() => {
        const first = typeof race.results.first === 'string' ? race.results.first : race.results.first?.driver;
        const second = typeof race.results.second === 'string' ? race.results.second : race.results.second?.driver;
        const third = typeof race.results.third === 'string' ? race.results.third : race.results.third?.driver;
        
        const firstCar = race.results.first?.manufacturer || race.results.first?.drivetrain ? 
            ` (${[race.results.first?.manufacturer, race.results.first?.drivetrain].filter(Boolean).join(' ')})` : '';
        const secondCar = race.results.second?.manufacturer || race.results.second?.drivetrain ? 
            ` (${[race.results.second?.manufacturer, race.results.second?.drivetrain].filter(Boolean).join(' ')})` : '';
        const thirdCar = race.results.third?.manufacturer || race.results.third?.drivetrain ? 
            ` (${[race.results.third?.manufacturer, race.results.third?.drivetrain].filter(Boolean).join(' ')})` : '';
        
        return `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e5e7;">
                <strong>Výsledky:</strong><br>
                🥇 ${first}${firstCar}<br>
                🥈 ${second}${secondCar}<br>
                🥉 ${third}${thirdCar}
            </div>
        `;
    })() : '';

    const youtubeUrl = race.youtubeUrl ? getYouTubeEmbedUrl(race.youtubeUrl) : null;
    const videoHtml = youtubeUrl ? `
        <div style="margin-top: 15px;">
            <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
                <iframe 
                    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
                    src="${youtubeUrl}" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>
            </div>
        </div>
    ` : '';

    return `
        <div class="race-card">
            <div class="race-header">
                <div class="race-title">${race.circuit}</div>
                <div class="race-date">${formatDate(race.date)}</div>
            </div>
            <div class="race-details">
                <div class="detail-item">
                    <div class="detail-label">Vozidla</div>
                    <div class="detail-value">${race.cars}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Index výkonu</div>
                    <div class="detail-value">${race.performanceIndex || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Tuning</div>
                    <div class="detail-value">${race.tuning}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Pneumatiky</div>
                    <div class="detail-value">${race.tires}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Počet kol</div>
                    <div class="detail-value">${race.laps}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Opotřebení pneumatik</div>
                    <div class="detail-value">${race.tireWear}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Spotřeba paliva</div>
                    <div class="detail-value">${race.fuelConsumption}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Rychlost doplňování</div>
                    <div class="detail-value">${race.refuelSpeed}</div>
                </div>
            </div>
            ${race.additionalInfo ? `<div style="margin-top: 15px; color: #86868b; font-size: 0.95em;">${race.additionalInfo}</div>` : ''}
            ${resultsHtml}
            ${videoHtml}
        </div>
    `;
}

function renderRaces() {
    const today = new Date();
    const upcoming = data.currentSeason.races.filter(r => new Date(r.date) >= today && !r.results);
    const past = data.currentSeason.races.filter(r => new Date(r.date) < today || r.results);
    
    past.sort((a, b) => new Date(b.date) - new Date(a.date));

    document.getElementById('upcoming-races').innerHTML = upcoming.length ? 
        upcoming.map(renderRaceCard).join('') : 
        '<p style="color: #86868b;">Žádné nadcházející závody</p>';

    document.getElementById('past-races').innerHTML = past.length ? 
        past.map(renderRaceCard).join('') : 
        '<p style="color: #86868b;">Zatím žádné proběhlé závody</p>';
}

function clearFilters() {
    document.getElementById('filter-manufacturer').value = '';
    document.getElementById('filter-drivetrain').value = '';
    document.getElementById('filter-circuit').value = '';
    renderRaces();
}

function applyFilters() {
    const manufacturer = document.getElementById('filter-manufacturer').value.toLowerCase();
    const drivetrain = document.getElementById('filter-drivetrain').value.toLowerCase();
    const circuit = document.getElementById('filter-circuit').value.toLowerCase();
    
    const today = new Date();
    let past = data.currentSeason.races.filter(r => new Date(r.date) < today || r.results);
    
    if (manufacturer) {
        past = past.filter(r => {
            if (!r.results) return false;
            const first = r.results.first?.manufacturer || '';
            const second = r.results.second?.manufacturer || '';
            const third = r.results.third?.manufacturer || '';
            return first.toLowerCase().includes(manufacturer) || 
                   second.toLowerCase().includes(manufacturer) || 
                   third.toLowerCase().includes(manufacturer);
        });
    }
    
    if (drivetrain) {
        past = past.filter(r => {
            if (!r.results) return false;
            const first = r.results.first?.drivetrain || '';
            const second = r.results.second?.drivetrain || '';
            const third = r.results.third?.drivetrain || '';
            return first.toLowerCase().includes(drivetrain) || 
                   second.toLowerCase().includes(drivetrain) || 
                   third.toLowerCase().includes(drivetrain);
        });
    }
    
    if (circuit) {
        past = past.filter(r => r.circuit.toLowerCase().includes(circuit));
    }
    
    past.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    document.getElementById('past-races').innerHTML = past.length ? 
        past.map(renderRaceCard).join('') : 
        '<p style="color: #86868b;">Žádné závody neodpovídají filtru</p>';
}

document.addEventListener('DOMContentLoaded', () => {
    ['filter-manufacturer', 'filter-drivetrain', 'filter-circuit'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', applyFilters);
        }
    });
});

function renderArchive() {
    const content = document.getElementById('archive-content');
    content.innerHTML = data.archive.length ? 
        data.archive.map(season => `
            <div class="section" style="background: #fafafa;">
                <h3>${season.name}</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Jezdec</th>
                            <th>Body</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${season.standings.map(s => `
                            <tr>
                                <td>${s.driver}</td>
                                <td><strong>${s.points}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `).join('') : 
        '<p style="color: #86868b;">Zatím žádné archivované sezóny</p>';
}

function renderRaceSelect() {
    const select = document.getElementById('select-race');
    const races = data.currentSeason.races.filter(r => !r.results);
    select.innerHTML = '<option value="">Vyberte závod</option>' + 
        races.map((r, i) => `<option value="${i}">${r.circuit} - ${formatDate(r.date)}</option>`).join('');
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
}

function showTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('[id$="-tab"]').forEach(t => t.classList.add('hidden'));
    
    event.target.classList.add('active');
    document.getElementById(tab + '-tab').classList.remove('hidden');
}

document.getElementById('race-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const race = {
        date: document.getElementById('race-date').value,
        circuit: document.getElementById('circuit-name').value,
        cars: document.getElementById('allowed-cars').value,
        performanceIndex: document.getElementById('performance-index').value,
        tuning: document.getElementById('tuning').value,
        tires: document.getElementById('tires').value,
        laps: document.getElementById('laps').value,
        tireWear: document.getElementById('tire-wear').value,
        fuelConsumption: document.getElementById('fuel-consumption').value,
        refuelSpeed: document.getElementById('refuel-speed').value,
        additionalInfo: document.getElementById('additional-info').value
    };

    data.currentSeason.races.push(race);
    data.currentSeason.races.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    alert('Závod přidán! Zkopírujte JSON níže a uložte do data.json');
    document.getElementById('json-output-container').innerHTML = 
        `<div class="json-output">${JSON.stringify(data, null, 2)}</div>`;
    
    e.target.reset();
    renderAll();
});

document.getElementById('results-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const raceIndex = document.getElementById('select-race').value;
    const race = data.currentSeason.races.filter(r => !r.results)[raceIndex];
    
    race.results = {
        first: {
            driver: document.getElementById('pos1-driver').value,
            manufacturer: document.getElementById('pos1-manufacturer').value,
            drivetrain: document.getElementById('pos1-drivetrain').value
        },
        second: {
            driver: document.getElementById('pos2-driver').value,
            manufacturer: document.getElementById('pos2-manufacturer').value,
            drivetrain: document.getElementById('pos2-drivetrain').value
        },
        third: {
            driver: document.getElementById('pos3-driver').value,
            manufacturer: document.getElementById('pos3-manufacturer').value,
            drivetrain: document.getElementById('pos3-drivetrain').value
        }
    };

    const youtubeUrl = document.getElementById('youtube-url').value;
    if (youtubeUrl) {
        race.youtubeUrl = youtubeUrl;
    }

    alert('Výsledky přidány! Zkopírujte JSON níže a uložte do data.json');
    document.getElementById('json-output-container').innerHTML = 
        `<div class="json-output">${JSON.stringify(data, null, 2)}</div>`;
    
    e.target.reset();
    renderAll();
});

loadData();
