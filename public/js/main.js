import { db } from './firebase-config.js';
import { handleAuthState } from './auth.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Importiere alle Seiten-Renderer
import { renderDashboard } from './pages/dashboard.js';
import { renderProfile } from './pages/profile.js';
import { renderLeaderboard } from './pages/leaderboard.js';
import { rendercoach } from './pages/coach.js';
import { renderExercises } from './pages/exercises.js';

// Globaler Zustand der App
let currentUser = null;
let allUsers = [];
let activeListeners = [];
let currentPageId = 'dashboard'; // Behält die aktuelle Seite im Auge

// DOM-Elemente
const navContainer = document.getElementById('main-nav');
const pageContainer = document.getElementById('page-container');

// --- UI-Hilfsfunktionen ---
function showNotification(message, type = 'success') {
    const notificationBar = document.getElementById('notification-bar');
    notificationBar.textContent = message;
    notificationBar.className = `p-4 mb-4 rounded-lg text-white font-semibold ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
    notificationBar.classList.remove('hidden');
    setTimeout(() => { notificationBar.classList.add('hidden'); }, 4000);
}

// --- Daten- und Render-Logik ---
async function fetchUsers() {
    const usersCol = collection(db, "users");
    const userSnapshot = await getDocs(usersCol);
    let users = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    users.sort((a, b) => b.points - a.points);
    return users.map((player, index) => ({...player, rank: index + 1 }));
}

async function showPage(pageId) {
    if (!currentUser) return;
    currentPageId = pageId; // Die aktuelle Seite speichern

    // Sicherheitsabfrage, um den Fehler zu verhindern
    if (Array.isArray(activeListeners)) {
        activeListeners.forEach(unsubscribe => unsubscribe());
    }
    activeListeners = [];

    document.querySelectorAll('#main-nav .nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`#main-nav .nav-link[data-page="${pageId}"]`);
    if (activeLink) activeLink.classList.add('active');

    pageContainer.innerHTML = '<div class="text-center p-8 text-gray-400">Lade Inhalt...</div>';

    switch (pageId) {
        case 'dashboard':
            activeListeners = renderDashboard(pageContainer, currentUser);
            break;
        case 'profile':
            activeListeners = renderProfile(pageContainer, currentUser);
            break;
        case 'leaderboard':
            if (currentUser.role === 'coach') {
                activeListeners = renderLeaderboard(pageContainer, currentUser);
            }
            break;
        case 'exercises':
            activeListeners = renderExercises(pageContainer);
            break;
        case 'coach':
            if (currentUser.role === 'coach') {
                const callbacks = {
                    showNotification: showNotification,
                    renderAllPages: () => showPage(currentPageId), 
                    getCurrentUser: () => currentUser,
                    getAllUsers: () => allUsers
                };
                // KORREKTUR: Wir warten auf das Ergebnis der async Funktion.
                activeListeners = await rendercoach(pageContainer, callbacks);
            }
            break;
    }
}

// Macht die showPage Funktion global verfügbar, falls sie von außerhalb aufgerufen wird
window.showPage = showPage;

async function initializeAppUI() {
    if (!currentUser) return;
    document.getElementById('user-name-display').textContent = currentUser.name;
    
    let navHTML = `
        <button data-page="dashboard" class="nav-link px-4 py-2 rounded-md font-semibold">Dashboard</button>
        <button data-page="profile" class="nav-link px-4 py-2 rounded-md font-semibold">Meine Erfolge</button>
    `;
    if (currentUser.role === 'coach') {
        navHTML += `<button data-page="leaderboard" class="nav-link px-4 py-2 rounded-md font-semibold">Rangliste</button>`;
    }
    navHTML += `<button data-page="exercises" class="nav-link px-4 py-2 rounded-md font-semibold">Übungen</button>`;
    if (currentUser.role === 'coach') {
        navHTML += `<button data-page="coach" class="nav-link px-4 py-2 rounded-md font-semibold">Coach</button>`;
    }
    navContainer.innerHTML = navHTML;
    
    navContainer.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (!link.disabled) showPage(link.dataset.page);
        });
    });

    allUsers = await fetchUsers();
    showPage('dashboard'); // Startseite anzeigen
}

handleAuthState(async (user) => {
    currentUser = user;
    if (currentUser) {
        await initializeAppUI();
    } else {
        // Sicherheitsabfrage auch hier für den Logout
        if (Array.isArray(activeListeners)) {
            activeListeners.forEach(unsubscribe => unsubscribe());
        }
        activeListeners = [];
        navContainer.innerHTML = '';
        pageContainer.innerHTML = '';
    }
});