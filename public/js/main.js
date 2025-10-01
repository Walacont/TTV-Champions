// js/main.js

import { db, auth } from './firebase-config.js';
import { handleAuthState } from './auth.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { renderDashboard } from './pages/dashboard.js';
import { renderProfile } from './pages/profile.js';
import { renderLeaderboard } from './pages/leaderboard.js';
import { rendercoach } from './pages/coach.js';
import { renderExercises } from './pages/exercises.js';

let currentUser = null;
let allUsers = [];
let activeListeners = [];
let currentPageId = 'dashboard';
const navContainer = document.getElementById('main-nav');
const pageContainer = document.getElementById('page-container');
const authContainer = document.getElementById('auth-container'); // <-- NEW
const appContent = document.getElementById('app-content');       // <-- NEW

function showNotification(message, type = 'success') {
    const notificationBar = document.getElementById('notification-bar');
    notificationBar.textContent = message;
    notificationBar.className = `p-4 mb-4 rounded-lg text-white font-semibold ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
    notificationBar.classList.remove('hidden');
    setTimeout(() => { notificationBar.classList.add('hidden'); }, 4000);
}

async function fetchAllUsers() {
    const usersCol = collection(db, "users");
    const userSnapshot = await getDocs(usersCol);
    allUsers = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    allUsers.sort((a, b) => a.name.localeCompare(b.name));
}

function createCallbacks() {
    return {
        getAllUsers: () => allUsers,
        getCurrentUser: () => currentUser,
        showNotification: showNotification,
        renderAllPages: () => showPage(currentPageId, true)
    };
}

async function showPage(pageId, forceDataRefresh = false) {
    if (!currentUser) return;
    currentPageId = pageId;

    if (Array.isArray(activeListeners)) {
        activeListeners.forEach(unsubscribe => unsubscribe());
    }
    activeListeners = [];

    document.querySelectorAll('#main-nav .nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`#main-nav .nav-link[data-page="${pageId}"]`);
    if (activeLink) activeLink.classList.add('active');

    pageContainer.innerHTML = '<div class="text-center p-8 text-gray-400">Lade Inhalt...</div>';

    if (forceDataRefresh) {
        await fetchAllUsers();
    }
    
    const callbacks = createCallbacks();

    switch (pageId) {
        case 'dashboard':
            activeListeners = renderDashboard(pageContainer, currentUser, allUsers);
            break;
        case 'profile':
            activeListeners = renderProfile(pageContainer, currentUser);
            break;
        case 'leaderboard':
            if (currentUser.role === 'coach'){
            const rankedUsers = [...allUsers].sort((a, b) => b.points - a.points);
            activeListeners = renderLeaderboard(pageContainer, rankedUsers);
            break;
            }
        case 'exercises':
            activeListeners = renderExercises(pageContainer);
            break;
        case 'coach':
            if (currentUser.role === 'coach') {
                activeListeners = await rendercoach(pageContainer, callbacks);
            }
            break;
    }
}

async function initializeAppUI() {
    if (!currentUser) return;

    // This line is now safe because appContent is guaranteed to be visible
    document.getElementById('user-name-display').textContent = currentUser.name;
    
    let navHTML = `
        <button data-page="dashboard" class="nav-link px-4 py-2 rounded-md font-semibold">Dashboard</button>
        <button data-page="profile" class="nav-link px-4 py-2 rounded-md font-semibold">Meine Erfolge</button>
        <button data-page="exercises" class="nav-link px-4 py-2 rounded-md font-semibold">Übungen</button>
    `;

    if (currentUser.role === 'coach') {
        navHTML += `
            <button data-page="leaderboard" class="nav-link px-4 py-2 rounded-md font-semibold">Rangliste</button>
            <button data-page="coach" class="nav-link px-4 py-2 rounded-md font-semibold">Coach Panel</button>
        `;
    }
    
    navContainer.innerHTML = navHTML;
    
    navContainer.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showPage(link.dataset.page);
        });
    });

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => signOut(auth));
    }

    await fetchAllUsers();
    showPage('dashboard');
}

handleAuthState(async (userFromAuth) => {
    // --- THIS IS THE NEW LOGIC FOR PAGE VISIBILITY ---
    if (userFromAuth) {
        authContainer.style.display = 'none';
        appContent.style.display = 'block';
        
        currentUser = userFromAuth;
        await initializeAppUI();
    } else {
        authContainer.style.display = 'flex';
        appContent.style.display = 'none';

        currentUser = null;
        if (Array.isArray(activeListeners)) {
            activeListeners.forEach(unsubscribe => unsubscribe());
        }
        activeListeners = [];
        navContainer.innerHTML = '';
        pageContainer.innerHTML = '';
    }
});