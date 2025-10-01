// js/register.js

import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-config.js';

const subtitle = document.getElementById('register-subtitle');
const errorDisplay = document.getElementById('register-error');
const registerForm = document.getElementById('register-form');
let registrationToken = null;

/**
 * Diese Funktion wird beim Laden der Seite ausgeführt.
 * Sie liest das Token aus der URL und lädt die Daten des Offline-Spielers.
 */
async function handlePageLoad() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) {
        subtitle.textContent = 'Ungültiger Link.';
        errorDisplay.textContent = 'Kein Registrierungs-Token gefunden.';
        return;
    }
    registrationToken = token;
    
    try {
        const userDocRef = doc(db, "users", token);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && userDocSnap.data().isOffline === true) {
            const userData = userDocSnap.data();
            subtitle.textContent = `Willkommen, ${userData.name}! Vervollständige dein Konto.`;
            registerForm.style.display = 'block';
        } else {
            subtitle.textContent = 'Link ungültig.';
            errorDisplay.textContent = 'Dieser Link ist ungültig oder wurde bereits verwendet.';
        }
    } catch (error) {
        console.error("Fehler beim Laden der Spielerdaten:", error);
        subtitle.textContent = 'Fehler.';
        errorDisplay.textContent = 'Die Spielerdaten konnten nicht geladen werden.';
    }
}

/**
 * Dieser Event-Listener wird ausgeführt, wenn das Registrierungsformular abgeschickt wird.
 * Er erstellt den Auth-Benutzer und aktualisiert das bestehende Firestore-Dokument.
 */
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const submitButton = e.target.querySelector('button[type="submit"]');

    submitButton.disabled = true;
    submitButton.textContent = 'Wird aktiviert...';

    try {
        // Schritt 1: Erstelle den Benutzer in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Hole die ursprünglichen Daten des Offline-Spielers
        const offlineUserDocRef = doc(db, "users", registrationToken);
        const offlineUserDocSnap = await getDoc(offlineUserDocRef);
        const offlineUserData = offlineUserDocSnap.data();
        
        // Aktualisiere den Anzeigenamen im Auth-Profil
        await updateProfile(user, { displayName: offlineUserData.name });

        // Schritt 2: Aktualisiere das bestehende Firestore-Dokument
        // Dies wird von deiner `update`-Sicherheitsregel erlaubt.
        await updateDoc(offlineUserDocRef, {
            email: email,
            uid: user.uid,       // Speichere die neue, echte Auth-UID
            isOffline: false   // Schalte den Account auf "online"
        });
        
        // Erfolgsmeldung und Weiterleitung
        subtitle.textContent = 'Aktivierung erfolgreich!';
        registerForm.style.display = 'none';
        errorDisplay.textContent = 'Du wirst zur App weitergeleitet...';
        errorDisplay.classList.remove('text-red-400');
        errorDisplay.classList.add('text-green-400');

        setTimeout(() => {
            window.location.href = '/'; // Leitet zur Startseite (index.html)
        }, 2000);

    } catch (error) {
        console.error("Token Register Error:", error);
        let errorMessage = 'Fehler bei der Konto-Aktivierung.';
        if (error.code === 'auth/weak-password') {
            errorMessage = 'Das Passwort muss mindestens 6 Zeichen lang sein.';
        } else if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Diese E-Mail-Adresse wird bereits verwendet.';
        }
        errorDisplay.textContent = errorMessage;
        submitButton.disabled = false;
        submitButton.textContent = 'Konto aktivieren';
    }
});

// Starte den Prozess, wenn die Seite geladen wird
handlePageLoad();