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
    limit,
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
        console.error("Fehler beim Aktualisieren des Dropdowns:", error);
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
                    <input type="text" id="exercise-title" placeholder="Titel der Übung" class="w-full p-3 bg-slate-700 rounded-lg border border-slate-600" required>
                    <div>
                        <label for="exercise-image" class="block text-sm font-medium text-gray-300 mb-2">Bild hochladen</label>
                        <input type="file" id="exercise-image" accept="image/*" class="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer" required>
                    </div>
                    <div id="upload-progress-container" class="w-full bg-slate-700 rounded-full h-2.5" style="display: none;">
                        <div id="upload-progress-bar" class="bg-green-600 h-2.5 rounded-full" style="width: 0%"></div>
                    </div>
                    <textarea id="exercise-desc" placeholder="Beschreibung der Übung" class="w-full p-3 bg-slate-700 rounded-lg border border-slate-600" required></textarea>
                    <input type="number" id="exercise-points" placeholder="Punkte für die Übung" class="w-full p-3 bg-slate-700 rounded-lg border border-slate-600" required>
                    <button type="submit" id="exercise-submit-btn" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition">Übung erstellen</button>
                </form>
            </div>
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 class="text-xl font-bold mb-4">Challenge-Verwaltung</h2>
                <form id="challenge-form" class="space-y-4">
                    <select id="challenge-type" class="w-full p-3 bg-slate-700 rounded-lg border border-slate-600">
                        <option value="day">Tages-Challenge</option>
                        <option value="week">Wochen-Challenge</option>
                        <option value="month">Monats-Challenge</option>
                    </select>
                    <input type="text" id="challenge-title" placeholder="Titel der Challenge" class="w-full p-3 bg-slate-700 rounded-lg border border-slate-600" required>
                    <textarea id="challenge-desc" placeholder="Beschreibung der Challenge" class="w-full p-3 bg-slate-700 rounded-lg border border-slate-600" required></textarea>
                    <input type="number" id="challenge-points" placeholder="Punkte für Abschluss" class="w-full p-3 bg-slate-700 rounded-lg border border-slate-600" required>
                    <button type="submit" class="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 rounded-lg transition">Challenge erstellen</button>
                </form>
            </div>
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 class="text-xl font-bold mb-4">Offline-Spieler hinzufügen</h2>
                <form id="offline-player-form" class="space-y-4">
                    <div class="flex flex-col sm:flex-row gap-4">
                        <input type="text" id="offline-firstname" placeholder="Vorname" class="w-full p-3 bg-slate-700 rounded-lg border border-slate-600" required>
                        <input type="text" id="offline-lastname" placeholder="Nachname" class="w-full p-3 bg-slate-700 rounded-lg border border-slate-600" required>
                    </div>
                    <button type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition">Spieler erstellen</button>
                </form>
            </div>
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 class="text-xl font-bold mb-4">Trainingsanwesenheit erfassen</h2>
                <div class="flex flex-col sm:flex-row gap-4">
                    <input type="date" id="attendance-date" class="w-full sm:w-auto flex-grow p-3 bg-slate-700 rounded-lg border border-slate-600" required>
                    <button id="attendance-btn" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition">Anwesenheit eintragen</button>
                </div>
            </div>
            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 class="text-xl font-bold mb-4">Spieler verwalten</h2>
                <button id="manage-players-btn" class="w-full bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 rounded-lg transition">Spielerliste öffnen</button>
            </div>

            <div class="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 class="text-xl font-bold mb-4">Punkte für Leistung vergeben</h2>
                <form id="points-form" class="space-y-4">
                    <select id="points-player" class="w-full p-3 bg-slate-700 rounded-lg border border-slate-600" required>
                        <option value="">Spieler auswählen...</option>
                        ${playerOptions}
                    </select>
                    <select id="award-item" class="w-full p-3 bg-slate-700 rounded-lg border border-slate-600" required>
                        <option value="">Lade Übungen/Challenges...</option>
                    </select>
                    <div id="manual-reason-container" style="display: none;">
                         <input type="text" id="manual-reason" placeholder="Begründung (z.B. Turniersieg)" class="w-full p-3 bg-slate-700 rounded-lg border border-slate-600">
                    </div>
                    <input type="number" id="points-amount" placeholder="Punkte" class="w-full p-3 bg-slate-700 rounded-lg border border-slate-600" required>
                    <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition">Punkte eintragen & zuweisen</button>
                </form>
            </div>
        </div>
    `;

    const awardItemSelect = document.getElementById('award-item');
    
    const exercisesListener = onSnapshot(collection(db, "exercises"), () => updateAwardDropdown(awardItemSelect));
    const challengesListener = onSnapshot(collection(db, "challenges"), () => updateAwardDropdown(awardItemSelect));
    const weeklyChallengesListener = onSnapshot(collection(db, "weekly_challenges"), () => updateAwardDropdown(awardItemSelect));
    const monthlyChallengesListener = onSnapshot(collection(db, "monthly_challenges"), () => updateAwardDropdown(awardItemSelect));
    
    document.getElementById('exercise-form').addEventListener('submit', (e) => handleExerciseForm(e, callbacks));
    document.getElementById('challenge-form').addEventListener('submit', (e) => handleChallengeForm(e, callbacks));
    document.getElementById('points-form').addEventListener('submit', (e) => handlePointsForm(e, currentUser, callbacks));
    document.getElementById('offline-player-form').addEventListener('submit', (e) => handleOfflinePlayerForm(e, callbacks));
    document.getElementById('attendance-btn').addEventListener('click', () => {
        const dateVal = document.getElementById('attendance-date').value;
        if (dateVal) openAttendanceModal(dateVal, allUsers, callbacks);
        else callbacks.showNotification('Bitte wähle zuerst ein Datum aus.', 'error');
    });
    document.getElementById('manage-players-btn').addEventListener('click', () => openPlayerManagementModal(allUsers, callbacks));
    
    // NEU: Logik zum Ein- und Ausblenden der Felder
    awardItemSelect.addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const manualReasonContainer = document.getElementById('manual-reason-container');
        const pointsAmountInput = document.getElementById('points-amount');

        if (e.target.value === 'manual_award') {
            manualReasonContainer.style.display = 'block';
            pointsAmountInput.value = ''; // Punktefeld leeren für manuelle Eingabe
            pointsAmountInput.readOnly = false;
        } else {
            manualReasonContainer.style.display = 'none';
            pointsAmountInput.value = selectedOption.dataset.points || '';
            pointsAmountInput.readOnly = true; // Punktefeld sperren, da es vordefiniert ist
        }
    });

    return [exercisesListener, challengesListener, weeklyChallengesListener, monthlyChallengesListener];
}

async function handlePointsForm(e, currentUser, callbacks) {
    e.preventDefault();
    const playerId = document.getElementById('points-player').value;
    const selectedItemValue = document.getElementById('award-item').value;
    const amount = parseInt(document.getElementById('points-amount').value);

    // NEU: Logik in zwei Fälle aufteilen: Manuell vs. Challenge/Übung
    if (selectedItemValue === 'manual_award') {
        const reason = document.getElementById('manual-reason').value;
        if (!playerId || !reason || isNaN(amount) || amount <= 0) {
            callbacks.showNotification("Bitte Spieler, Begründung und gültige Punkte angeben.", "error");
            return;
        }
        
        const playerDocRef = doc(db, "users", playerId);
        try {
            const playerDoc = await getDoc(playerDocRef);
            if (!playerDoc.exists()) throw new Error("Spieler nicht gefunden");

            const currentPoints = playerDoc.data().points || 0;
            await updateDoc(playerDocRef, { points: currentPoints + amount });

            await addDoc(collection(db, "point_logs"), {
                userId: playerId, points: amount, reason: reason,
                coachId: currentUser.uid, timestamp: serverTimestamp()
            });

            callbacks.showNotification(`Manuell ${amount} Punkte für ${playerDoc.data().name} erfasst.`, 'success');
            document.getElementById('points-form').reset();
            document.getElementById('manual-reason-container').style.display = 'none'; // Feld wieder ausblenden

        } catch (error) {
            console.error("Fehler bei manueller Punktevergabe: ", error);
            callbacks.showNotification("Ein Fehler ist aufgetreten.", "error");
        }

    } else {
        // Dies ist die bisherige Logik für Challenges und Übungen
        if (!playerId || !selectedItemValue || isNaN(amount)) {
            callbacks.showNotification("Bitte Spieler, Item und Punkte angeben.", "error");
            return;
        }

        const [collectionName, docId] = selectedItemValue.split('_');
        if(!collectionName || !docId) {
            callbacks.showNotification("Ungültiges Item ausgewählt.", "error");
            return;
        }

        const selectedOption = document.querySelector(`#award-item option[value="${selectedItemValue}"]`);
        const reason = selectedOption.dataset.name;
        
        const playerDocRef = doc(db, "users", playerId);
        const itemDocRef = doc(db, collectionName, docId);

        try {
            const playerDoc = await getDoc(playerDocRef);
            if (!playerDoc.exists()) throw new Error("Spieler nicht gefunden");

            const currentPoints = playerDoc.data().points || 0;
            await updateDoc(playerDocRef, { points: currentPoints + amount });

            await addDoc(collection(db, "point_logs"), {
                userId: playerId, points: amount, reason: reason,
                coachId: currentUser.uid, timestamp: serverTimestamp()
            });

            await updateDoc(itemDocRef, {
                completedBy: arrayUnion(playerId)
            });

            callbacks.showNotification(`Leistung für ${playerDoc.data().name} erfasst.`, 'success');
            document.getElementById('points-form').reset();
        } catch (error) {
            console.error("Fehler bei der Punktevergabe: ", error);
            callbacks.showNotification("Ein Fehler ist aufgetreten.", "error");
        }
    }
}

// ... Der Rest der Datei (handleExerciseForm, handleChallengeForm, etc.) bleibt unverändert ...
async function handleExerciseForm(e, callbacks) {
    e.preventDefault();
    const title = document.getElementById('exercise-title').value;
    const description = document.getElementById('exercise-desc').value;
    const points = parseInt(document.getElementById('exercise-points').value);
    const fileInput = document.getElementById('exercise-image');
    const file = fileInput.files[0];

    if (!title || !description || isNaN(points) || !file) {
        callbacks.showNotification("Bitte alle Felder ausfüllen und ein Bild auswählen.", "error");
        return;
    }

    const submitBtn = document.getElementById('exercise-submit-btn');
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress-bar');
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Lade hoch...';
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';

    try {
        const storage = getStorage();
        const storageRef = ref(storage, `exercises/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                progressBar.style.width = progress + '%';
            }, 
            (error) => {
                callbacks.showNotification("Fehler beim Bildupload.", "error");
                submitBtn.disabled = false;
                submitBtn.textContent = 'Übung erstellen';
                progressContainer.style.display = 'none';
            }, 
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                await addDoc(collection(db, "exercises"), {
                    title: title,
                    description: description,
                    points: points,
                    imageUrl: downloadURL,
                    createdAt: serverTimestamp()
                });
                callbacks.showNotification("Übung erfolgreich erstellt!", "success");
                e.target.reset();
                progressContainer.style.display = 'none';
                progressBar.style.width = '0%';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Übung erstellen';
            }
        );
    } catch (error) {
        callbacks.showNotification("Ein Fehler ist aufgetreten.", "error");
        submitBtn.disabled = false;
        submitBtn.textContent = 'Übung erstellen';
        progressContainer.style.display = 'none';
    }
}

async function handleChallengeForm(e, callbacks) {
    e.preventDefault();
    const type = document.getElementById('challenge-type').value;
    const title = document.getElementById('challenge-title').value;
    const description = document.getElementById('challenge-desc').value;
    const points = parseInt(document.getElementById('challenge-points').value);

    if (!type || !title || !description || isNaN(points)) {
        callbacks.showNotification("Bitte alle Felder ausfüllen.", "error");
        return;
    }

    const now = new Date();
    let collectionName = '';
    let docId = null;
    let data = { title, description, points, createdAt: serverTimestamp() };

    switch (type) {
        case 'day':
            collectionName = 'challenges';
            break;
        case 'week':
            collectionName = 'weekly_challenges';
            const endOfWeek = new Date(now);
            const dayOfWeek = now.getDay();
            const distanceToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
            endOfWeek.setDate(now.getDate() + distanceToSunday);
            endOfWeek.setHours(23, 59, 59, 999);
            data.endDate = endOfWeek;
            const yearW = now.getFullYear();
            const weekNumber = Math.ceil((((now - new Date(yearW, 0, 1)) / 86400000) + new Date(yearW, 0, 1).getDay() + 1) / 7);
            docId = `${yearW}-${weekNumber}`;
            break;
        case 'month':
            collectionName = 'monthly_challenges';
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            endOfMonth.setHours(23, 59, 59, 999);
            data.endDate = endOfMonth;
            const yearM = now.getFullYear();
            const month = now.getMonth() + 1;
            docId = `${yearM}-${month}`;
            break;
    }

    try {
        if (docId) {
            await setDoc(doc(db, collectionName, docId), data);
        } else {
            await addDoc(collection(db, collectionName), data);
        }
        callbacks.showNotification(`Neue ${type}-Challenge wurde erfolgreich erstellt!`, 'success');
        e.target.reset();
    } catch (error) {
        console.error(`Error creating ${type} challenge:`, error);
        callbacks.showNotification("Fehler beim Erstellen der Challenge.", "error");
    }
}

async function handleOfflinePlayerForm(e, callbacks) {
    e.preventDefault();
    const firstname = document.getElementById('offline-firstname').value.trim();
    const lastname = document.getElementById('offline-lastname').value.trim();
    if (!firstname || !lastname) {
        callbacks.showNotification("Bitte Vor- und Nachnamen eingeben.", "error");
        return;
    }
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

async function openAttendanceModal(dateStr, allUsers, callbacks) {
    const modal = document.getElementById('attendance-modal');
    document.getElementById('modal-date-display').textContent = new Date(dateStr + 'T00:00:00').toLocaleString('de-DE', { dateStyle: 'full' });
    const sessionDocSnap = await getDoc(doc(db, "training_sessions", dateStr));
    const attendees = sessionDocSnap.exists() ? sessionDocSnap.data().attendees : [];
    document.getElementById('modal-player-list').innerHTML = allUsers.map(user => `
        <label class="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-700 cursor-pointer">
            <input type="checkbox" value="${user.id}" class="h-5 w-5 rounded bg-slate-600 text-indigo-500 focus:ring-indigo-600" ${attendees.includes(user.id) ? 'checked' : ''}>
            <span>${user.name}</span>
        </label>
    `).join('');
    modal.style.display = 'flex';
    document.getElementById('modal-close-btn').onclick = () => modal.style.display = 'none';
    document.getElementById('modal-save-btn').onclick = () => handleSaveAttendance(dateStr, attendees, allUsers, callbacks);
}

// coach.js

async function handleSaveAttendance(dateStr, oldAttendees, allUsers, callbacks) {
    const modal = document.getElementById('attendance-modal');
    const newAttendees = Array.from(document.querySelectorAll('#modal-player-list input:checked')).map(cb => cb.value);
    const TRAINING_POINTS = 10;
    const batch = writeBatch(db);
    
    const sessionRef = doc(db, "training_sessions", dateStr);
    batch.set(sessionRef, { attendees: newAttendees, date: dateStr });
    
    const reason = `Training am ${new Date(dateStr + 'T00:00:00').toLocaleDateString('de-DE')}`;

    allUsers.forEach(user => {
        const wasAttending = oldAttendees.includes(user.id);
        const isAttending = newAttendees.includes(user.id);
        if (isAttending === wasAttending) return;

        const userRef = doc(db, "users", user.id);
        const pointChange = isAttending ? TRAINING_POINTS : -TRAINING_POINTS;
        const sessionChange = isAttending ? 1 : -1;
        
        // Finde den aktuellen User-Datenstand, um Fehler zu vermeiden
        const currentUserData = allUsers.find(u => u.id === user.id);
        
        batch.update(userRef, { 
            points: (currentUserData.points || 0) + pointChange, 
            trainingSessions: (currentUserData.trainingSessions || 0) + sessionChange 
        });

        // NEU: Log-Eintrag für die Punkte-Historie erstellen
        if (isAttending) {
            const logRef = doc(collection(db, "point_logs")); // Neue ID generieren
            batch.set(logRef, {
                userId: user.id,
                points: TRAINING_POINTS,
                reason: reason,
                coachId: callbacks.getCurrentUser().uid,
                timestamp: serverTimestamp()
            });
        }
        // Hinweis: Für aberkannte Punkte wird bewusst kein negativer Log-Eintrag erstellt.
    });
    
    try {
        await batch.commit();
        callbacks.showNotification('Anwesenheit gespeichert!', 'success');
        modal.style.display = 'none';
        callbacks.renderAllPages(); // Lädt die App neu, um User-Daten zu aktualisieren
    } catch (error) {
        console.error("Fehler beim Speichern der Anwesenheit:", error);
        callbacks.showNotification("Fehler beim Speichern.", "error");
    }
}

function openPlayerManagementModal(users, callbacks) {
    const modal = document.getElementById('player-management-modal');
    modal.style.display = 'flex';
    document.getElementById('modal-player-management-list').innerHTML = users.map(user => `
        <div class="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
            <div>
                <p class="font-semibold">${user.name}</p>
                <p class="text-xs text-gray-400">${user.email || 'Offline-Spieler'}</p>
            </div>
            <button data-userid="${user.id}" data-username="${user.name}" class="remove-player-btn bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition">Entfernen</button>
        </div>
    `).join('');
    document.querySelectorAll('#modal-player-management-list .remove-player-btn').forEach(btn => btn.addEventListener('click', (e) => handleRemovePlayerClick(e, callbacks)));
    document.getElementById('player-modal-close-btn').onclick = () => modal.style.display = 'none';
}

let resetDeleteBtnTimeout = null;
async function handleRemovePlayerClick(e, callbacks) {
    const btn = e.target;
    if (btn.classList.contains('confirm-delete')) {
        clearTimeout(resetDeleteBtnTimeout);
        try {
            await deleteDoc(doc(db, "users", btn.dataset.userid));
            callbacks.showNotification(`Spieler ${btn.dataset.username} wurde entfernt.`, 'success');
            document.getElementById('player-management-modal').style.display = 'none';
            callbacks.renderAllPages();
        } catch (error) {
            callbacks.showNotification(`Fehler beim Entfernen.`, 'error');
        }
    } else {
        document.querySelectorAll('.confirm-delete').forEach(b => {
            b.classList.remove('confirm-delete');
            b.textContent = 'Entfernen';
        });
        btn.classList.add('confirm-delete');
        btn.textContent = 'Sicher löschen?';
        resetDeleteBtnTimeout = setTimeout(() => {
            btn.classList.remove('confirm-delete');
            btn.textContent = 'Entfernen';
        }, 4000);
    }
}