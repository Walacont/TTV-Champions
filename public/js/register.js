// js/register.js

import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-config.js';

const subtitle = document.getElementById('register-subtitle');
const errorDisplay = document.getElementById('register-error');
const registerForm = document.getElementById('register-form');
let registrationToken = null;

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
        subtitle.textContent = 'Fehler.';
        errorDisplay.textContent = 'Die Spielerdaten konnten nicht geladen werden.';
    }
}

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const submitButton = e.target.querySelector('button[type="submit"]');

    submitButton.disabled = true;
    submitButton.textContent = 'Wird aktiviert...';

    try {
        const offlineUserDocRef = doc(db, "users", registrationToken);
        const offlineUserDocSnap = await getDoc(offlineUserDocRef);
        const offlineUserData = offlineUserDocSnap.data();

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: offlineUserData.name });

        const batch = writeBatch(db);
        const newUserDocRef = doc(db, "users", user.uid);
        
        batch.set(newUserDocRef, { 
            ...offlineUserData, 
            email, 
            uid: user.uid, 
            isOffline: false
        });
        batch.delete(offlineUserDocRef);
        await batch.commit();

        subtitle.textContent = 'Aktivierung erfolgreich!';
        registerForm.style.display = 'none';
        errorDisplay.textContent = 'Du wirst zur App weitergeleitet...';
        errorDisplay.classList.remove('text-red-400');
        errorDisplay.classList.add('text-green-400');

        // *** HIER IST DIE LÖSUNG: Nach 2 Sekunden zur Hauptseite weiterleiten ***
        setTimeout(() => {
            window.location.href = '/'; // Leitet zur Startseite (index.html)
        }, 2000);

    } catch (error) {
        console.error("Token Register Error:", error);
        errorDisplay.textContent = 'Fehler bei der Konto-Aktivierung.';
        submitButton.disabled = false;
        submitButton.textContent = 'Konto aktivieren';
    }
});

handlePageLoad();