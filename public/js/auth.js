// js/auth.js

import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-config.js';

// DOM-Elemente
const authContainer = document.getElementById('auth-container');
const appContent = document.getElementById('app-content');
const authError = document.getElementById('auth-error');
const authSubtitle = document.getElementById('auth-subtitle');
const loginForm = document.getElementById('login-form');
const resetForm = document.getElementById('reset-form');

// Diese Funktion wird von main.js importiert und aufgerufen
export function handleAuthState(callback) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocSnap = await getDoc(doc(db, "users", user.uid));
            if (userDocSnap.exists()) {
                authContainer.style.display = 'none';
                appContent.style.display = 'block';
                callback({ uid: user.uid, ...userDocSnap.data() });
            } else {
                console.error("Benutzer in Auth gefunden, aber nicht in der Datenbank. Melde ab.");
                await signOut(auth);
                callback(null);
            }
        } else {
            authContainer.style.display = 'flex';
            appContent.style.display = 'none';
            callback(null);
        }
    });
}

// Event-Listener für das Login-Formular
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        authError.textContent = '';
    } catch (error) {
        authError.textContent = 'Fehler: E-Mail oder Passwort ist falsch.';
        console.error("Login Error:", error);
    }
});

// Event-Listener für das Passwort-Reset-Formular
resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reset-email').value;
    authError.textContent = '';
    try {
        await sendPasswordResetEmail(auth, email);
        authError.classList.remove('text-red-400');
        authError.classList.add('text-green-400');
        authError.textContent = 'Reset-E-Mail gesendet! Prüfe dein Postfach.';
    } catch (error) {
        authError.classList.add('text-red-400');
        authError.classList.remove('text-green-400');
        authError.textContent = 'Für diese E-Mail wurde kein Konto gefunden.';
    }
});

// Funktion zum Umschalten zwischen Login- und Reset-Formular
function showForm(formToShow) {
    loginForm.style.display = 'none';
    resetForm.style.display = 'none';
    authError.textContent = '';
    authError.classList.remove('text-green-400');
    authError.classList.add('text-red-400');

    if (formToShow === 'login') {
        loginForm.style.display = 'block';
        authSubtitle.textContent = 'Bitte melde dich an.';
    } else if (formToShow === 'reset') {
        resetForm.style.display = 'block';
        authSubtitle.textContent = 'Setze dein Passwort zurück.';
    }
}

// Event-Listener für die Links zum Umschalten der Formulare
document.getElementById('show-reset').addEventListener('click', (e) => { e.preventDefault(); showForm('reset'); });
document.getElementById('show-login-from-reset').addEventListener('click', (e) => { e.preventDefault(); showForm('login'); });