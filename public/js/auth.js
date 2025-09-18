import {
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-config.js';

// DOM-Elemente
const authContainer = document.getElementById('auth-container');
const appContent = document.getElementById('app-content');
const authError = document.getElementById('auth-error');
const authSubtitle = document.getElementById('auth-subtitle');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const resetForm = document.getElementById('reset-form');

async function initializeSessionForUser(user) {
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        const currentUser = { uid: user.uid, ...userDocSnap.data() };
        authContainer.style.display = 'none';
        appContent.style.display = 'block';
        return currentUser;
    }
    await signOut(auth);
    return null;
}

export function handleAuthState(callback) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const currentUser = await initializeSessionForUser(user);
            callback(currentUser);
        } else {
            authContainer.style.display = 'flex';
            appContent.style.display = 'none';
            callback(null);
        }
    });
}

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

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstname = document.getElementById('register-firstname').value.trim();
    const lastname = document.getElementById('register-lastname').value.trim();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const name = `${firstname} ${lastname}`;

    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef,
            where("firstname", "==", firstname),
            where("lastname", "==", lastname),
            where("isOffline", "==", true)
        );
        const querySnapshot = await getDocs(q);

        let offlineUserDoc = null;
        if (!querySnapshot.empty) {
            offlineUserDoc = querySnapshot.docs[0];
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: name });

        if (offlineUserDoc) {
            const offlineUserData = offlineUserDoc.data();
            const offlineUserDocId = offlineUserDoc.id;
            await setDoc(doc(db, "users", user.uid), {
                ...offlineUserData,
                firstname: firstname,
                lastname: lastname,
                name: name,
                email: email,
                isOffline: false,
                uid: user.uid
            });
            await deleteDoc(doc(db, "users", offlineUserDocId));
        } else {
            await setDoc(doc(db, "users", user.uid), {
                firstname: firstname,
                lastname: lastname,
                name: name,
                email: email,
                points: 0,
                trainingSessions: 0,
                badges: [],
                role: 'user',
                isOffline: false,
                uid: user.uid
            });
        }
    } catch (error) {
        console.error("Register Error:", error.code, error.message);
        switch (error.code) {
            case 'auth/email-already-in-use': authError.textContent = 'Diese E-Mail wird bereits verwendet.'; break;
            case 'auth/weak-password': authError.textContent = 'Passwort zu schwach (mind. 6 Zeichen).'; break;
            case 'auth/invalid-email': authError.textContent = 'Bitte gib eine gültige E-Mail-Adresse ein.'; break;
            default: authError.textContent = 'Ein unbekannter Fehler ist aufgetreten.'; break;
        }
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
        console.error("Password Reset Error:", error.code);
        switch (error.code) {
            case 'auth/user-not-found': authError.textContent = 'Für diese E-Mail wurde kein Konto gefunden.'; break;
            case 'auth/invalid-email': authError.textContent = 'Bitte gib eine gültige E-Mail-Adresse ein.'; break;
            default: authError.textContent = 'Ein Fehler ist aufgetreten.'; break;
        }
    }
});

document.getElementById('logout-button').addEventListener('click', () => signOut(auth));

function showForm(formToShow) {
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    resetForm.style.display = 'none';
    authError.textContent = '';
    authError.classList.remove('text-green-400');
    authError.classList.add('text-red-400');
    if (formToShow === 'login') { loginForm.style.display = 'block'; authSubtitle.textContent = 'Bitte melde dich an.'; }
    else if (formToShow === 'register') { registerForm.style.display = 'block'; authSubtitle.textContent = 'Erstelle ein neues Konto.'; }
    else if (formToShow === 'reset') { resetForm.style.display = 'block'; authSubtitle.textContent = 'Setze dein Passwort zurück.'; }
}
document.getElementById('show-register').addEventListener('click', (e) => { e.preventDefault(); showForm('register'); });
document.getElementById('show-login').addEventListener('click', (e) => { e.preventDefault(); showForm('login'); });
document.getElementById('show-reset').addEventListener('click', (e) => { e.preventDefault(); showForm('reset'); });
document.getElementById('show-login-from-reset').addEventListener('click', (e) => { e.preventDefault(); showForm('login'); });