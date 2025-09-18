import { collection, query, orderBy, limit, where, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from '../firebase-config.js';

// Funktion zum Öffnen des Verlaufs-Modals
async function openHistoryModal(currentUser) {
    const modal = document.getElementById('history-modal');
    const historyList = document.getElementById('modal-history-list');
    const closeBtn = document.getElementById('history-modal-close-btn');
    if (!modal || !historyList || !closeBtn) return;

    // Ladezustand anzeigen
    historyList.innerHTML = `<p class="text-gray-400">Lade vollständigen Verlauf...</p>`;
    modal.style.display = 'flex';
    closeBtn.onclick = () => { modal.style.display = 'none'; };

    // Daten einmalig abrufen (ohne Limit)
    const fullHistoryQuery = query(
        collection(db, "point_logs"),
        where("userId", "==", currentUser.uid),
        orderBy("timestamp", "desc")
    );

    try {
        const snapshot = await getDocs(fullHistoryQuery);
        if (snapshot.empty) {
            historyList.innerHTML = `<p class="text-gray-400">Noch keine Einträge vorhanden.</p>`;
            return;
        }

        historyList.innerHTML = snapshot.docs.map(doc => {
            const log = doc.data();
            const date = log.timestamp?.toDate().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            
            const isNegative = log.points < 0;
            const pointsClass = isNegative ? 'text-red-500' : 'text-teal-400';
            const pointsSign = isNegative ? '' : '+';

            return `
                <div class="bg-slate-700/50 p-3 rounded-lg flex justify-between items-center text-sm">
                    <div>
                        <p class="font-semibold text-white">${log.reason}</p>
                        <p class="text-gray-400">${date}</p>
                    </div>
                    <div class="font-bold ${pointsClass} text-base whitespace-nowrap">${pointsSign}${log.points} Pkt.</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error("Fehler beim Laden der vollen Historie:", error);
        historyList.innerHTML = `<p class="text-red-400">Fehler beim Laden des Verlaufs.</p>`;
    }
}

function startCountdown(elementId, endDate) {
    const countdownElement = document.getElementById(elementId);
    if (!countdownElement) return;
    const intervalId = `interval_${elementId}`;

    if (window[intervalId]) {
        clearInterval(window[intervalId]);
    }

    window[intervalId] = setInterval(() => {
        const now = new Date().getTime();
        const distance = endDate - now;

        if (distance < 0) {
            clearInterval(window[intervalId]);
            countdownElement.innerHTML = "Challenge beendet";
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        let output = "";
        if (days > 0) output += `${days}T `;
        if (hours > 0 || days > 0) output += `${hours}h `;
        output += `${minutes}m ${seconds}s`;

        countdownElement.innerHTML = output;
    }, 1000);
}

function getEndOfDay() {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return end.getTime();
}

export function renderDashboard(container, currentUser) {
    container.innerHTML = `
        <div class="space-y-8">
            <div class="grid md:grid-cols-3 gap-6" id="dashboard-stats"></div>
            <div id="challenges-container" class="space-y-8"></div>
            
            <div id="history-card" class="bg-slate-800 p-6 rounded-lg shadow-lg cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all">
                <h2 class="text-xl font-bold mb-4 text-white">Letzte Aktivitäten</h2>
                <div id="history-list" class="space-y-4">
                    <p class="text-gray-400">Lade Verlauf...</p>
                </div>
                <p id="history-hint" class="text-center text-xs text-gray-500 mt-4" style="display: none;">Klicken, um die ganze Historie zu sehen</p>
            </div>
        </div>
    `;

    const usersListener = onSnapshot(query(collection(db, "users"), orderBy("points", "desc")), (snapshot) => {
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const me = users.find(u => u.id === currentUser.uid);
        let nextTargetHtml = '';
        const myIndex = users.findIndex(u => u.id === currentUser.uid);

        if (myIndex > 0) {
            const personInFront = users[myIndex - 1];
            const pointsNeeded = personInFront.points - (me.points || 0);
            nextTargetHtml = `
                <div class="bg-slate-800 p-6 rounded-lg shadow-lg text-center">
                    <div class="text-gray-400 text-sm font-semibold">Nächstes Ziel 🎯</div>
                    <div class="text-2xl font-bold text-white my-1 truncate">${personInFront.name}</div>
                    <div class="text-teal-400 font-semibold">${pointsNeeded} Pkt. fehlen</div>
                </div>
            `;
        } else if (myIndex === 0) {
            nextTargetHtml = `
                <div class="bg-slate-800 p-6 rounded-lg shadow-lg text-center flex flex-col justify-center">
                    <div class="text-yellow-400 text-5xl">🏆</div>
                    <div class="text-lg font-bold text-white mt-2">Du bist an der Spitze!</div>
                </div>
            `;
        }
        
        const statsContainer = document.getElementById('dashboard-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="bg-slate-800 p-6 rounded-lg shadow-lg text-center">
                    <div class="text-gray-400 text-sm font-semibold">Deine Punkte</div>
                    <div class="text-4xl font-bold text-white my-2">${me ? me.points : 0}</div>
                </div>
                ${nextTargetHtml}
                <div class="bg-slate-800 p-6 rounded-lg shadow-lg text-center">
                    <div class="text-gray-400 text-sm font-semibold">Trainingseinheiten</div>
                    <div class="text-4xl font-bold text-white my-2">${me ? me.trainingSessions : 0}</div>
                </div>
            `;
        }
    });

    const renderAllChallenges = async () => {
        const challengesContainer = document.getElementById('challenges-container');
        if (!challengesContainer) return;

        const now = new Date();
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const dailyQuery = query(collection(db, "challenges"), where("createdAt", ">=", startOfDay), limit(1));
        const weeklyQuery = query(collection(db, "weekly_challenges"), where("endDate", ">=", now), orderBy("endDate"), limit(1));
        const monthlyQuery = query(collection(db, "monthly_challenges"), where("endDate", ">=", now), orderBy("endDate"), limit(1));
        
        const [dailySnap, weeklySnap, monthlySnap] = await Promise.all([
            getDocs(dailyQuery),
            getDocs(weeklyQuery),
            getDocs(monthlyQuery)
        ]);

        let html = '';
        let monthlyChallengeEndDate, weeklyChallengeEndDate, dailyChallengeExists;

        if(!monthlySnap.empty) {
            const challenge = monthlySnap.docs[0].data();
            monthlyChallengeEndDate = challenge.endDate.toDate().getTime();
            html += `<div class="bg-emerald-900/50 border border-emerald-700 p-6 rounded-lg shadow-lg">
                         <div class="flex justify-between items-start">
                            <div>
                                <h2 class="text-xl font-bold mb-2 text-emerald-300">Challenge des Monats</h2>
                                <h3 class="text-2xl font-semibold text-white mb-2">${challenge.title}</h3>
                            </div>
                            <div id="monthly-countdown" class="text-lg font-bold text-gray-300 bg-slate-900/50 px-3 py-1 rounded-md"></div>
                        </div>
                        <p class="text-gray-300 mb-4">${challenge.description}</p>
                        <div class="text-right text-lg font-bold text-teal-400">+${challenge.points} Punkte</div>
                    </div>`;
        }
        if(!weeklySnap.empty) {
            const challenge = weeklySnap.docs[0].data();
            weeklyChallengeEndDate = challenge.endDate.toDate().getTime();
            html += `<div class="bg-purple-900/50 border border-purple-700 p-6 rounded-lg shadow-lg">
                         <div class="flex justify-between items-start">
                            <div>
                                <h2 class="text-xl font-bold mb-2 text-purple-300">Challenge der Woche</h2>
                                <h3 class="text-2xl font-semibold text-white mb-2">${challenge.title}</h3>
                            </div>
                            <div id="weekly-countdown" class="text-lg font-bold text-gray-300 bg-slate-900/50 px-3 py-1 rounded-md"></div>
                        </div>
                        <p class="text-gray-300 mb-4">${challenge.description}</p>
                        <div class="text-right text-lg font-bold text-teal-400">+${challenge.points} Punkte</div>
                    </div>`;
        }
        if(!dailySnap.empty) {
            dailyChallengeExists = true;
            const challenge = dailySnap.docs[0].data();
            html += `<div class="bg-indigo-900/50 border border-indigo-700 p-6 rounded-lg shadow-lg">
                        <div class="flex justify-between items-start">
                            <div>
                                <h2 class="text-xl font-bold mb-2 text-indigo-300">Challenge des Tages</h2>
                                <h3 class="text-2xl font-semibold text-white mb-2">${challenge.title}</h3>
                            </div>
                            <div id="daily-countdown" class="text-lg font-bold text-gray-300 bg-slate-900/50 px-3 py-1 rounded-md"></div>
                        </div>
                        <p class="text-gray-300 mb-4">${challenge.description}</p>
                        <div class="text-right text-lg font-bold text-teal-400">+${challenge.points} Punkte</div>
                    </div>`;
        }
        challengesContainer.innerHTML = html;

        if (dailyChallengeExists) startCountdown('daily-countdown', getEndOfDay());
        if (weeklyChallengeEndDate) startCountdown('weekly-countdown', weeklyChallengeEndDate);
        if (monthlyChallengeEndDate) startCountdown('monthly-countdown', monthlyChallengeEndDate);
    };

    const challengesListener = onSnapshot(collection(db, "challenges"), renderAllChallenges);
    const weeklyChallengesListener = onSnapshot(collection(db, "weekly_challenges"), renderAllChallenges);
    const monthlyChallengesListener = onSnapshot(collection(db, "monthly_challenges"), renderAllChallenges);
    
    // GEÄNDERT: limit(3) für die Vorschau
    const historyQuery = query(
        collection(db, "point_logs"), 
        where("userId", "==", currentUser.uid), 
        orderBy("timestamp", "desc"),
        limit(3)
    );
    const historyListener = onSnapshot(historyQuery, (snapshot) => {
        const historyList = document.getElementById('history-list');
        const historyHint = document.getElementById('history-hint');
        if (!historyList || !historyHint) return;

        if (snapshot.empty) {
            historyList.innerHTML = `<p class="text-gray-400">Noch keine Einträge vorhanden.</p>`;
            historyHint.style.display = 'none';
            return;
        }

        historyHint.style.display = 'block';
        historyList.innerHTML = snapshot.docs.map(doc => {
            const log = doc.data();
            const date = log.timestamp?.toDate().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
            
            const isNegative = log.points < 0;
            const pointsClass = isNegative ? 'text-red-500' : 'text-teal-400';
            const pointsSign = isNegative ? '' : '+';

            return `
                <div class="bg-slate-700/50 p-3 rounded-lg flex justify-between items-center text-sm">
                    <div>
                        <p class="font-semibold text-white">${log.reason}</p>
                        <p class="text-gray-400">${date}</p>
                    </div>
                    <div class="font-bold ${pointsClass} text-base whitespace-nowrap">${pointsSign}${log.points} Pkt.</div>
                </div>
            `;
        }).join('');
    });

    setTimeout(() => {
        const historyCard = document.getElementById('history-card');
        if (historyCard) {
            historyCard.addEventListener('click', () => openHistoryModal(currentUser));
        }
    }, 0);

    renderAllChallenges();
    return [usersListener, challengesListener, weeklyChallengesListener, monthlyChallengesListener, historyListener];
}