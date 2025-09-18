import { db } from '../firebase-config.js';
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function renderLeaderboard(container, currentUser) {
    container.innerHTML = `
        <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 class="text-xl font-bold mb-4">Saison-Rangliste (Live)</h2>
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead>
                        <tr class="border-b border-slate-700">
                            <th class="p-3">Rang</th>
                            <th class="p-3">Name</th>
                            <th class="p-3 text-right">Punkte</th>
                        </tr>
                    </thead>
                    <tbody id="leaderboard-body">
                        <tr><td colspan="3" class="p-3 text-center text-gray-400">Lade Rangliste...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    const q = query(collection(db, "users"), orderBy("points", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const users = querySnapshot.docs.map((doc, index) => ({
            id: doc.id,
            rank: index + 1,
            ...doc.data()
        }));

        const leaderboardBody = document.getElementById('leaderboard-body');
        if (leaderboardBody) {
            leaderboardBody.innerHTML = users.map(player => {
                const isCurrentUser = (player.id === currentUser.uid);
                const rowClass = isCurrentUser ? 'bg-indigo-600 font-bold' : '';
                return `
                    <tr class="${rowClass}">
                        <td class="p-3 font-semibold">${player.rank}.</td>
                        <td class="p-3">${player.name}</td>
                        <td class="p-3 text-right font-semibold">${player.points}</td>
                    </tr>
                `;
            }).join('');
        }
    });

    return [unsubscribe];
}