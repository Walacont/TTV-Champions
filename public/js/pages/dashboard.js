import { collection, query, orderBy, limit, where, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from '../firebase-config.js';

function startCountdown(elementId, endDate) {
    const countdownElement = document.getElementById(elementId);
    if (!countdownElement) return;
    const intervalId = `interval_${elementId}`;

    // Stoppe einen eventuell bereits laufenden Timer für dieses Element
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
            <div class="grid md:grid-cols-3 gap-6" id="dashboard-stats">
                </div>
            <div id="challenges-container" class="space-y-8">
                </div>
        </div>
    `;

    // Listener für Benutzerdaten (Punkte, Rang, etc.)
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

    renderAllChallenges();

    return [usersListener, challengesListener, weeklyChallengesListener, monthlyChallengesListener];
}