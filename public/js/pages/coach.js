import { db } from '../firebase-config.js';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import {
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    collection,
    serverTimestamp,
    deleteDoc,
    writeBatch,
    setDoc,
    arrayUnion,
    where,
    query,
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function updateAwardDropdown(selectElement) {
    if (!selectElement) return;
    try {
        const now = new Date();
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const exercisesQuery = query(collection(db, "exercises"), orderBy("createdAt", "desc"));
        const dailyQuery = query(collection(db, "challenges"), where("createdAt", ">=", startOfDay));
        const weeklyQuery = query(collection(db, "weekly_challenges"), where("endDate", ">=", now));
        const monthlyQuery = query(collection(db, "monthly_challenges"), where("endDate", ">=", now));

        const [exercisesSnap, dailySnap, weeklySnap, monthlySnap] = await Promise.all([
            getDocs(exercisesQuery), getDocs(dailyQuery), getDocs(weeklyQuery), getDocs(monthlyQuery)
        ]);

        const exercises = exercisesSnap.docs.map(doc => ({ id: doc.id, type: 'exercises', ...doc.data() }));
        const daily = dailySnap.docs.map(doc => ({ id: doc.id, type: 'challenges', ...doc.data() }));
        const weekly = weeklySnap.docs.map(doc => ({ id: doc.id, type: 'weekly_challenges', ...doc.data() }));
        const monthly = monthlySnap.docs.map(doc => ({ id: doc.id, type: 'monthly_challenges', ...doc.data() }));

        const itemsForAwarding = [...exercises, ...daily, ...weekly, ...monthly];
        
        const awardOptionsHtml = `
            <option value="">Übung oder Challenge auswählen...</option>
            <optgroup label="Sonstiges">
                <option value="manual_award">Manuelle Punktevergabe</option>
            </optgroup>
            <optgroup label="Übungen">
                ${itemsForAwarding.filter(item => item.type === 'exercises').map(item =>
                    `<option value="exercises_${item.id}" data-points="${item.points}" data-name="${item.title}">${item.title}</option>`
                ).join('')}
            </optgroup>
            <optgroup label="Aktive Challenges">
                ${itemsForAwarding.filter(item => item.type !== 'exercises').map(item =>
                    `<option value="${item.type}_${item.id}" data-points="${item.points}" data-name="${item.title}">${item.title}</option>`
                ).join('')}
            </optgroup>
        `;
        selectElement.innerHTML = awardOptionsHtml;
    } catch (error) {
        console.error("Error updating dropdown:", error);
    }
}

export async function rendercoach(container, callbacks) {
    const allUsers = callbacks.getAllUsers();
    const currentUser = callbacks.getCurrentUser();
    const playerOptions = allUsers.map(u => `<option value="${u.id}">${u.name}</option>`).join('');

    container.innerHTML = `
        <div class="space-y-8">
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 class="text-xl font-bold mb-4">Übungen verwalten</h2>
                <form id="exercise-form" class="space-y-4">
                    <input type="text" id="exercise-title" placeholder="Titel der Übung" class="w-full p-3 bg-slate-700 rounded-lg" required>
                    <input type="file" id="exercise-image" accept="image/*" class="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0" required>
                    <textarea id="exercise-desc" placeholder="Beschreibung der Übung" class="w-full p-3 bg-slate-700 rounded-lg" required></textarea>
                    <input type="number" id="exercise-points" placeholder="Punkte für die Übung" class="w-full p-3 bg-slate-700 rounded-lg" required>
                    <button type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg">Übung erstellen</button>
                </form>
            </div>
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 class="text-xl font-bold mb-4">Challenge-Verwaltung</h2>
                <form id="challenge-form" class="space-y-4">
                    <select id="challenge-type" class="w-full p-3 bg-slate-700 rounded-lg"><option value="day">Tages-Challenge</option><option value="week">Wochen-Challenge</option><option value="month">Monats-Challenge</option></select>
                    <input type="text" id="challenge-title" placeholder="Titel der Challenge" class="w-full p-3 bg-slate-700 rounded-lg" required>
                    <textarea id="challenge-desc" placeholder="Beschreibung der Challenge" class="w-full p-3 bg-slate-700 rounded-lg" required></textarea>
                    <input type="number" id="challenge-points" placeholder="Punkte für Abschluss" class="w-full p-3 bg-slate-700 rounded-lg" required>
                    <button type="submit" class="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 rounded-lg">Challenge erstellen</button>
                </form>
            </div>
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 class="text-xl font-bold mb-4">Offline-Spieler hinzufügen</h2>
                <form id="offline-player-form" class="space-y-4">
                    <div class="flex gap-4"><input type="text" id="offline-firstname" placeholder="Vorname" class="w-full p-3 bg-slate-700 rounded-lg" required><input type="text" id="offline-lastname" placeholder="Nachname" class="w-full p-3 bg-slate-700 rounded-lg" required></div>
                    <button type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg">Spieler erstellen</button>
                </form>
            </div>
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 class="text-xl font-bold mb-4">Spieler verwalten</h2>
                <button id="manage-players-btn" class="w-full bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 rounded-lg">Spielerliste öffnen</button>
            </div>
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 class="text-xl font-bold mb-4">Punkte für Leistung vergeben</h2>
                <form id="points-form" class="space-y-4">
                    <select id="points-player" class="w-full p-3 bg-slate-700 rounded-lg" required>${playerOptions}</select>
                    <select id="award-item" class="w-full p-3 bg-slate-700 rounded-lg" required></select>
                    <div id="manual-reason-container" style="display: none;"><input type="text" id="manual-reason" placeholder="Begründung" class="w-full p-3 bg-slate-700 rounded-lg"></div>
                    <input type="number" id="points-amount" placeholder="Punkte" class="w-full p-3 bg-slate-700 rounded-lg" required>
                    <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg">Punkte eintragen</button>
                </form>
            </div>
        </div>
    `;

    const awardItemSelect = document.getElementById('award-item');
    updateAwardDropdown(awardItemSelect);
    
    document.getElementById('exercise-form').addEventListener('submit', (e) => handleExerciseForm(e, callbacks));
    document.getElementById('challenge-form').addEventListener('submit', (e) => handleChallengeForm(e, callbacks));
    document.getElementById('points-form').addEventListener('submit', (e) => handlePointsForm(e, currentUser, callbacks));
    document.getElementById('offline-player-form').addEventListener('submit', (e) => handleOfflinePlayerForm(e, callbacks));
    document.getElementById('manage-players-btn').addEventListener('click', () => openPlayerManagementModal(allUsers, callbacks));
    
    awardItemSelect.addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const manualReasonContainer = document.getElementById('manual-reason-container');
        const pointsAmountInput = document.getElementById('points-amount');
        if (e.target.value === 'manual_award') {
            manualReasonContainer.style.display = 'block';
            pointsAmountInput.value = '';
            pointsAmountInput.readOnly = false;
        } else {
            manualReasonContainer.style.display = 'none';
            pointsAmountInput.value = selectedOption.dataset.points || '';
            pointsAmountInput.readOnly = !!selectedOption.dataset.points;
        }
    });

    return [];
}

async function handlePointsForm(e, currentUser, callbacks) {
    e.preventDefault();
    const playerId = document.getElementById('points-player').value;
    const selectedItemValue = document.getElementById('award-item').value;
    const amount = parseInt(document.getElementById('points-amount').value);

    if (selectedItemValue === 'manual_award') {
        const reason = document.getElementById('manual-reason').value;
        if (!playerId || !reason || isNaN(amount) || amount === 0) {
            callbacks.showNotification("Bitte Spieler, Begründung und eine gültige Punktzahl (nicht 0) angeben.", "error");
            return;
        }
        const playerDocRef = doc(db, "users", playerId);
        try {
            const playerDoc = await getDoc(playerDocRef);
            if (!playerDoc.exists()) throw new Error("Spieler nicht gefunden");
            const currentPoints = playerDoc.data().points || 0;
            await updateDoc(playerDocRef, { points: currentPoints + amount });
            await addDoc(collection(db, "point_logs"), { userId: playerId, points: amount, reason, coachId: currentUser.uid, timestamp: serverTimestamp() });
            callbacks.showNotification(`${amount} Punkte für ${playerDoc.data().name} erfasst.`, 'success');
            e.target.reset();
        } catch (error) {
            callbacks.showNotification("Ein Fehler ist aufgetreten.", "error");
        }
    } else {
        if (!playerId || !selectedItemValue || isNaN(amount)) return;
        const [collectionName, docId] = selectedItemValue.split('_');
        if(!collectionName || !docId) return;
        const reason = document.querySelector(`#award-item option[value="${selectedItemValue}"]`).dataset.name;
        const playerDocRef = doc(db, "users", playerId);
        const itemDocRef = doc(db, collectionName, docId);
        try {
            const playerDoc = await getDoc(playerDocRef);
            if (!playerDoc.exists()) throw new Error("Spieler nicht gefunden");
            const currentPoints = playerDoc.data().points || 0;
            await updateDoc(playerDocRef, { points: currentPoints + amount });
            await addDoc(collection(db, "point_logs"), { userId: playerId, points: amount, reason, coachId: currentUser.uid, timestamp: serverTimestamp() });
            await updateDoc(itemDocRef, { completedBy: arrayUnion(playerId) });
            callbacks.showNotification(`Leistung für ${playerDoc.data().name} erfasst.`, 'success');
            e.target.reset();
        } catch (error) {
            callbacks.showNotification("Ein Fehler ist aufgetreten.", "error");
        }
    }
}

async function handleExerciseForm(e, callbacks) {
    e.preventDefault();
    const title = document.getElementById('exercise-title').value;
    const description = document.getElementById('exercise-desc').value;
    const points = parseInt(document.getElementById('exercise-points').value);
    const file = document.getElementById('exercise-image').files[0];
    if (!title || !description || isNaN(points) || !file) return;

    try {
        const storage = getStorage();
        const storageRef = ref(storage, `exercises/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);
        uploadTask.on('state_changed', null, 
            () => { callbacks.showNotification("Fehler beim Bildupload.", "error"); }, 
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                await addDoc(collection(db, "exercises"), { title, description, points, imageUrl: downloadURL, createdAt: serverTimestamp() });
                callbacks.showNotification("Übung erfolgreich erstellt!", "success");
                e.target.reset();
            }
        );
    } catch (error) {
        callbacks.showNotification("Ein Fehler ist aufgetreten.", "error");
    }
}

async function handleChallengeForm(e, callbacks) {
    e.preventDefault();
    const type = document.getElementById('challenge-type').value;
    const title = document.getElementById('challenge-title').value;
    const description = document.getElementById('challenge-desc').value;
    const points = parseInt(document.getElementById('challenge-points').value);
    if (!type || !title || !description || isNaN(points)) return;

    const data = { title, description, points, createdAt: serverTimestamp() };
    const collectionName = type === 'day' ? 'challenges' : `${type}ly_challenges`;
    try {
        await addDoc(collection(db, collectionName), data);
        callbacks.showNotification(`Neue ${type}-Challenge wurde erfolgreich erstellt!`, 'success');
        e.target.reset();
    } catch (error) {
        callbacks.showNotification("Fehler beim Erstellen der Challenge.", "error");
    }
}

async function handleOfflinePlayerForm(e, callbacks) {
    e.preventDefault();
    const firstname = document.getElementById('offline-firstname').value.trim();
    const lastname = document.getElementById('offline-lastname').value.trim();
    if (!firstname || !lastname) return;
    try {
        await addDoc(collection(db, "users"), {
            firstname, lastname, name: `${firstname} ${lastname}`,
            points: 0, trainingSessions: 0, badges: [],
            role: 'user', isOffline: true
        });
        callbacks.showNotification(`Spieler ${firstname} ${lastname} wurde erstellt.`, 'success');
        e.target.reset();
        callbacks.renderAllPages();
    } catch (error) {
        callbacks.showNotification("Fehler beim Erstellen des Spielers.", "error");
    }
}

// THIS IS THE FUNCTION DEFINITION THAT WAS LIKELY MISSING
function openPlayerManagementModal(users, callbacks) {
    const modal = document.getElementById('player-management-modal');
    if (!modal) {
        console.error("Player management modal not found in HTML!");
        return;
    }
    modal.style.display = 'flex';
    document.getElementById('modal-player-management-list').innerHTML = users.map(user => `
        <div class="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
            <div>
                <p class="font-semibold">${user.name}</p>
                <p class="text-xs text-gray-400">${user.email || 'Offline-Spieler'}</p>
            </div>
            <div class="flex items-center flex-wrap">
                <button data-userid="${user.id}" data-username="${user.name}" class="remove-player-btn bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Entfernen</button>
                ${user.role !== 'coach' ? `<button data-userid="${user.id}" data-username="${user.name}" class="promote-coach-btn bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg ml-2">Ernennen</button>` : `<span class="text-xs text-gray-500 ml-4 px-4">Coach</span>`}
                ${user.isOffline ? `<button data-userid="${user.id}" class="generate-link-btn bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg ml-2">Link erstellen</button>` : ''}
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.remove-player-btn').forEach(btn => btn.addEventListener('click', (e) => handleRemovePlayerClick(e, callbacks)));
    document.querySelectorAll('.promote-coach-btn').forEach(btn => btn.addEventListener('click', (e) => handlePromotePlayerClick(e, callbacks)));
    document.querySelectorAll('.generate-link-btn').forEach(btn => btn.addEventListener('click', handleGenerateLinkClick));
    document.getElementById('player-modal-close-btn').onclick = () => modal.style.display = 'none';
}

function handleGenerateLinkClick(e) {
    const userId = e.target.dataset.userid;
    const registrationLink = `${window.location.origin}/register.html?token=${userId}`;
    prompt("Registrierungs-Link für den Spieler (kopieren mit Strg+C):", registrationLink);
}

async function handleRemovePlayerClick(e, callbacks) {
    const btn = e.target;
    if (confirm(`Möchtest du ${btn.dataset.username} wirklich entfernen?`)) {
        try {
            await deleteDoc(doc(db, "users", btn.dataset.userid));
            callbacks.showNotification(`Spieler ${btn.dataset.username} wurde entfernt.`, 'success');
            document.getElementById('player-management-modal').style.display = 'none';
            callbacks.renderAllPages();
        } catch (error) {
            callbacks.showNotification(`Fehler beim Entfernen.`, 'error');
        }
    }
}

async function handlePromotePlayerClick(e, callbacks) {
    const btn = e.target;
    const userId = btn.dataset.userid;
    const userName = btn.dataset.username;
    if (confirm(`Möchtest du ${userName} wirklich zum Coach ernennen?`)) {
        try {
            await updateDoc(doc(db, "users", userId), { role: 'coach' });
            callbacks.showNotification(`${userName} ist jetzt ein Coach.`, 'success');
            document.getElementById('player-management-modal').style.display = 'none';
            callbacks.renderAllPages();
        } catch (error) {
            callbacks.showNotification("Ein Fehler ist aufgetreten.", "error");
        }
    }
}