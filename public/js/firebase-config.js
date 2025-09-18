// Importiere die notwendigen Firebase-Funktionen
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// WICHTIG: Ersetze diese Platzhalter mit deinen echten Firebase-Projektdaten
const firebaseConfig = {
    apiKey: "AIzaSyAC16_hKIZl6WKMN49yFltfPGGjnvXtD-U",
    authDomain: "bachelorarbeit-81ccc.firebaseapp.com",
    projectId: "bachelorarbeit-81ccc",
    storageBucket: "bachelorarbeit-81ccc.firebasestorage.app",
    messagingSenderId: "549898146178",
    appId: "1:549898146178:web:b4194a4c30f3862e163f9b",
    measurementId: "G-XT81ZXZE2R"
};


// Initialisiere die Firebase-App
const app = initializeApp(firebaseConfig);

// Erstelle und exportiere die Dienste, damit andere Dateien sie verwenden können
export const auth = getAuth(app);
export const db = getFirestore(app);