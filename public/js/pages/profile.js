import { db } from '../firebase-config.js';
import { doc, collection, query, where, getDocs, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Hilfsfunktion zur Berechnung der Trainings-Serie
function calculateConsecutiveTrainingStreak(allSessions, userId) {
    if (!allSessions || allSessions.length === 0) return 0;
    
    let longestStreak = 0;
    let currentStreak = 0;
    
    for (const session of allSessions) {
        // Stellt sicher, dass 'attendees' immer ein Array ist, um Fehler zu vermeiden
        const attendees = session.attendees || [];
        if (attendees.includes(userId)) {
            currentStreak++;
        } else {
            longestStreak = Math.max(longestStreak, currentStreak);
            currentStreak = 0;
        }
    }
    return Math.max(longestStreak, currentStreak);
}

// Hilfsfunktion, die den gesamten Inhalt der Seite mit den neuesten Daten füllt
function renderAllProfileContent(userData, longestStreak, pointLogs, completedChallenges, completedExercises) {
    
    // --- KORREKTUR 1: Alle fehlerhaften SVG-Pfade sind nun korrigiert ---
    // Ich habe sichergestellt, dass kein SVG-Pfad einen Unterstrich (_) enthält.
    const achievementsList = [
        {
            id: 'streak_5', title: 'Trainings-Serie Bronze', description: 'Nimm an 5 Trainings in Folge teil.',
            icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9a9 9 0 109 0zM19.5 18.75h.008v.008h-.008v-.008zm-15 0h.008v.008h-.008v-.008zM12 1.5A9 9 0 003 10.5v5.25a.75.75 0 00.75.75h16.5a.75.75 0 00.75-.75V10.5A9 9 0 0012 1.5z" />`,
            check: (streak) => streak >= 5
        },
        {
            id: 'streak_10', title: 'Trainings-Serie Silber', description: 'Nimm an 10 Trainings in Folge teil.',
            icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9a9 9 0 109 0zM19.5 18.75h.008v.008h-.008v-.008zm-15 0h.008v.008h-.008v-.008zM12 1.5A9 9 0 003 10.5v5.25a.75.75 0 00.75.75h16.5a.75.75 0 00.75-.75V10.5A9 9 0 0012 1.5z" />`,
            check: (streak) => streak >= 10
        },
        {
            id: 'streak_15', title: 'Trainings-Serie Gold', description: 'Nimm an 15 Trainings in Folge teil.',
            icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9a9 9 0 109 0zM19.5 18.75h.008v.008h-.008v-.008zm-15 0h.008v.008h-.008v-.008zM12 1.5A9 9 0 003 10.5v5.25a.75.75 0 00.75.75h16.5a.75.75 0 00.75-.75V10.5A9 9 0 0012 1.5z" />`,
            check: (streak) => streak >= 15
        },
        {
            id: 'points_100', title: 'Punkte-Jäger', description: 'Sammle 100 Punkte.',
            icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />`,
            check: (streak, user) => user.points >= 100
        },
        {
            id: 'points_500', title: 'Punkte-Magier', description: 'Sammle 500 Punkte.',
            icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />`,
            check: (streak, user) => user.points >= 500
        },
        {
            id: 'tourney_win_1', title: 'Turnier-Champion', description: 'Gewinne dein erstes Turnier.',
            icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9a9 9 0 109 0zM19.5 18.75h.008v.008h-.008v-.008zm-15 0h.008v.008h-.008v-.008zM12 1.5A9 9 0 003 10.5v5.25a.75.75 0 00.75.75h16.5a.75.75 0 00.75-.75V10.5A9 9 0 0012 1.5z" />`,
            check: (streak, user, logs) => logs.some(log => log.reason && log.reason.toLowerCase().includes('turnier'))
        },
    ];

    const badgesContainer = document.getElementById('badges-container');
    const streakDisplay = document.getElementById('streak-display');
    if (badgesContainer && streakDisplay) {
        streakDisplay.textContent = longestStreak;
        badgesContainer.innerHTML = achievementsList.map(ach => {
            const isEarned = ach.check(longestStreak, userData, pointLogs);

            let iconColor = 'text-gray-500';
            if (isEarned) {
                if (ach.id === 'streak_5') iconColor = 'text-orange-400';
                else if (ach.id === 'streak_10') iconColor = 'text-slate-400';
                else if (ach.id === 'streak_15') iconColor = 'text-yellow-400';
                else iconColor = 'text-teal-400';
            }
            return `
                <div class="flex flex-col items-center text-center p-4 rounded-lg bg-slate-700/50 transition-transform hover:scale-105 ${isEarned ? 'opacity-100' : 'opacity-40'}">
                    <svg class="w-16 h-16 mb-2 ${iconColor}" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${ach.icon}</svg>
                    <h3 class="font-bold text-sm text-white">${ach.title}</h3>
                    <p class="text-xs text-gray-400">${ach.description}</p>
                </div>`;
        }).join('');
    }

    const challengesContainer = document.getElementById('completed-challenges-container');
    if (challengesContainer) {
        if (completedChallenges.length === 0) {
            challengesContainer.innerHTML = `<div class="p-4 text-center text-gray-400">Du hast noch keine Challenges abgeschlossen.</div>`;
        } else {
            challengesContainer.innerHTML = completedChallenges.map(c => `
                <div class="bg-slate-700/50 p-4 rounded-lg flex justify-between items-center">
                    <div>
                        <p class="text-sm text-gray-400">${c.type} - ${c.createdAt?.toDate().toLocaleDateString('de-DE') || 'Unbekanntes Datum'}</p>
                        <p class="font-bold text-white">${c.title}</p>
                    </div>
                    <div class="font-bold text-teal-400 text-lg">+${c.points} Pkt.</div>
                </div>
            `).join('');
        }
    }
    
    const exercisesContainer = document.getElementById('completed-exercises-container');
    if(exercisesContainer) {
        if(completedExercises.length === 0) {
            exercisesContainer.innerHTML = `<div class="p-4 text-center text-gray-400">Du hast noch keine Übungen abgeschlossen.</div>`;
        } else {
            exercisesContainer.innerHTML = completedExercises.map(ex => `
                <div class="bg-slate-700/50 p-4 rounded-lg flex items-center space-x-4">
                    <img src="${ex.imageUrl}" alt="Übungsbild" class="w-20 h-20 object-cover rounded-md">
                    <div class="flex-grow">
                        <p class="text-white">${ex.description}</p>
                    </div>
                    <div class="font-bold text-teal-400 text-lg whitespace-nowrap">+${ex.points} Pkt.</div>
                </div>
            `).join('');
        }
    }
}

export function renderProfile(container, currentUser) {
    // Rendert das Grundgerüst der Seite
    container.innerHTML = `
        <div class="space-y-8">
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 class="text-xl font-bold mb-4 text-white">Meine Abzeichen</h2>
                <p class="text-sm text-gray-400 mb-4">Deine längste Trainings-Serie: <span id="streak-display" class="font-bold text-white">...</span></p>
                <div id="badges-container" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    <p class="col-span-full text-gray-400">Lade Badges...</p>
                </div>
            </div>
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 class="text-xl font-bold mb-4 text-white">Abgeschlossene Challenges</h2>
                <div id="completed-challenges-container" class="space-y-4 max-h-96 overflow-y-auto">
                    <p class="text-gray-400">Lade Verlauf...</p>
                </div>
            </div>
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 class="text-xl font-bold mb-4 text-white">Abgeschlossene Übungen</h2>
                <div id="completed-exercises-container" class="space-y-4 max-h-96 overflow-y-auto">
                    <p class="text-gray-400">Lade Verlauf...</p>
                </div>
            </div>
        </div>
    `;

    // Holt alle Daten und rendert den Inhalt
    const userListener = onSnapshot(doc(db, "users", currentUser.uid), async (userDoc) => {
        if (!userDoc.exists()) {
            container.innerHTML = `<div class="p-4 text-center text-red-400">Benutzerdaten nicht gefunden.</div>`;
            return;
        }
        const userData = userDoc.data();

        // Alle Abfragen werden gebündelt, um die Ladezeit zu optimieren
        const trainingSessionsQuery = query(collection(db, "training_sessions"), orderBy("date", "asc"));
        const pointLogsQuery = query(collection(db, "point_logs"), where("userId", "==", currentUser.uid));
        const dailyChallengesQuery = query(collection(db, "challenges"), where("completedBy", "array-contains", currentUser.uid));
        const weeklyChallengesQuery = query(collection(db, "weekly_challenges"), where("completedBy", "array-contains", currentUser.uid));
        const monthlyChallengesQuery = query(collection(db, "monthly_challenges"), where("completedBy", "array-contains", currentUser.uid));
        const exercisesQuery = query(collection(db, "exercises"), where("completedBy", "array-contains", currentUser.uid));

        try {
            const [
                trainingSessionsSnap, pointLogsSnap, dailySnap,
                weeklySnap, monthlySnap, exercisesSnap
            ] = await Promise.all([
                getDocs(trainingSessionsQuery), getDocs(pointLogsQuery),
                getDocs(dailyChallengesQuery), getDocs(weeklyChallengesQuery),
                getDocs(monthlyChallengesQuery), getDocs(exercisesQuery)
            ]);

            const allSessions = trainingSessionsSnap.docs.map(doc => doc.data());
            const pointLogs = pointLogsSnap.docs.map(doc => doc.data());
            const longestStreak = calculateConsecutiveTrainingStreak(allSessions, currentUser.uid);

            const completedChallenges = [
                ...dailySnap.docs.map(doc => ({ ...doc.data(), type: 'Täglich' })),
                ...weeklySnap.docs.map(doc => ({ ...doc.data(), type: 'Wöchentlich' })),
                ...monthlySnap.docs.map(doc => ({ ...doc.data(), type: 'Monatlich' }))
            ].sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
            
            const completedExercises = exercisesSnap.docs.map(doc => doc.data()).sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));

            renderAllProfileContent(userData, longestStreak, pointLogs, completedChallenges, completedExercises);
        } catch(e) {
            console.error("Fehler beim Holen der Profil-Detaildaten:", e);
            // Zeigt eine Fehlermeldung im UI an, falls etwas schiefgeht
            container.innerHTML = `<div class="p-4 text-center text-red-400">Ein Fehler ist aufgetreten. Bitte versuche es später erneut.</div>`;
        }
    });

    // --- KORREKTUR 2: So wird der "activeListeners"-Fehler behoben ---
    // Diese Funktion muss jetzt ein Array zurückgeben, das eine "unsubscribe"-Funktion enthält.
    // Das ist die Funktion, die Firebase (`onSnapshot`) erstellt hat, um das "Zuhören" zu beenden.
    return [userListener];
}