// js/auth.js

import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc, getDoc, collection, query, where, getDocs, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-config.js';

const authError = document.getElementById('auth-error');
const authSubtitle = document.getElementById('auth-subtitle');
const passwordLoginForm = document.getElementById('password-login-form');
const emailLinkForm = document.getElementById('email-link-form');
const resetForm = document.getElementById('reset-form');

const actionCodeSettings = {
    url: window.location.href,
    handleCodeInApp: true
};

async function handleIncomingSignInLink() {
    if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
            email = window.prompt('Bitte gib deine E-Mail-Adresse zur Bestätigung erneut ein:');
        }
        try {
            await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
        } catch (error) {
            console.error("Fehler beim Anmelden mit E-Mail-Link:", error);
            authError.textContent = 'Der Anmelde-Link ist ungültig oder abgelaufen.';
        }
    }
}
handleIncomingSignInLink();

export function handleAuthState(callback) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            let userDoc;
            const docRefById = doc(db, "users", user.uid);
            const docSnapById = await getDoc(docRefById);
            if (docSnapById.exists()) {
                userDoc = docSnapById;
            } else {
                const q = query(collection(db, "users"), where("uid", "==", user.uid), limit(1));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) userDoc = querySnapshot.docs[0];
            }

            if (userDoc) {
                const finalUserData = { id: userDoc.id, ...userDoc.data(), uid: user.uid };
                callback(finalUserData);
            } else {
                console.error("Benutzer in Auth gefunden, aber nicht in der Datenbank. Melde ab.");
                await signOut(auth);
                callback(null);
            }
        } else {
            callback(null);
        }
    });
}

emailLinkForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email-link-input').value;
    try {
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        window.localStorage.setItem('emailForSignIn', email);
        authError.classList.remove('text-red-400');
        authError.classList.add('text-green-400');
        authError.textContent = `Anmelde-Link an ${email} gesendet. Prüfe dein Postfach!`;
    } catch (error) {
        console.error("Fehler beim Senden des Links:", error);
        authError.textContent = 'Fehler beim Senden des Links.';
    }
});

passwordLoginForm.addEventListener('submit', async (e) => {
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

function showForm(formToShow) {
    passwordLoginForm.style.display = 'none';
    emailLinkForm.style.display = 'none';
    resetForm.style.display = 'none';
    document.getElementById('show-password-login').style.display = 'inline';
    document.getElementById('show-email-link-login').style.display = 'inline';
    document.getElementById('password-reset-link-container').style.display = 'none';
    document.getElementById('or-divider').style.display = 'none';
    
    authError.textContent = '';
    authError.classList.remove('text-green-400');
    authError.classList.add('text-red-400');

    if (formToShow === 'password') {
        passwordLoginForm.style.display = 'block';
        document.getElementById('show-password-login').style.display = 'none';
        document.getElementById('password-reset-link-container').style.display = 'block';
        authSubtitle.textContent = 'Melde dich mit deinem Passwort an.';
    } else if (formToShow === 'emailLink') {
        emailLinkForm.style.display = 'block';
        document.getElementById('show-email-link-login').style.display = 'none';
        document.getElementById('or-divider').style.display = 'inline';
        authSubtitle.textContent = 'Erhalte einen Anmelde-Link per E-Mail.';
    } else if (formToShow === 'reset') {
        resetForm.style.display = 'block';
        document.getElementById('show-password-login').style.display = 'none';
        document.getElementById('show-email-link-login').style.display = 'none';
        authSubtitle.textContent = 'Setze dein Passwort zurück.';
    }
}

document.getElementById('show-password-login').addEventListener('click', (e) => { e.preventDefault(); showForm('password'); });
document.getElementById('show-email-link-login').addEventListener('click', (e) => { e.preventDefault(); showForm('emailLink'); });
document.getElementById('show-reset').addEventListener('click', (e) => { e.preventDefault(); showForm('reset'); });
document.getElementById('show-login-from-reset').addEventListener('click', (e) => { e.preventDefault(); showForm('password'); });

showForm('emailLink');