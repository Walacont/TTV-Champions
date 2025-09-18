import { db } from '../firebase-config.js';
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function openExerciseModal(exercise) {
    const modal = document.getElementById('exercise-modal');
    if (!modal) return;

    document.getElementById('modal-exercise-image').src = exercise.imageUrl;
    document.getElementById('modal-exercise-desc').textContent = exercise.description;
    document.getElementById('modal-exercise-points').textContent = `+${exercise.points} Punkte`;

    modal.style.display = 'flex';
}

export function renderExercises(container) {
    container.innerHTML = `
        <div>
            <h1 class="text-3xl font-bold mb-6 text-white">Übungskatalog</h1>
            <div id="exercises-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="col-span-full text-center p-8 text-gray-400">Lade Übungen...</div>
            </div>
        </div>
    `;
    
    // Richte den Close-Button nur einmal ein
    const modal = document.getElementById('exercise-modal');
    const closeBtn = document.getElementById('exercise-modal-close-btn');
    if (modal && closeBtn) {
        closeBtn.onclick = () => { modal.style.display = 'none'; };
        modal.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
    }

    const q = query(collection(db, "exercises"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const exercisesGrid = document.getElementById('exercises-grid');
        if (!exercisesGrid) return;

        if (querySnapshot.empty) {
            exercisesGrid.innerHTML = `
                <div class="col-span-full text-center p-8 bg-slate-800 rounded-lg">
                    <h2 class="text-xl font-bold mb-2">Keine Übungen gefunden</h2>
                    <p class="text-gray-400">Der Trainer hat noch keine Übungen erstellt.</p>
                </div>`;
            return;
        }

        const exercisesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        exercisesGrid.innerHTML = exercisesData.map(exercise => {
            return `
                <div class="bg-slate-800 rounded-lg shadow-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all" data-exercise-id="${exercise.id}">
                    <img src="${exercise.imageUrl}" alt="Übungsbild" class="w-full h-48 object-cover">
                    <div class="p-6">
                        <p class="text-gray-300 mb-4 line-clamp-3">${exercise.description}</p>
                        <div class="text-right text-lg font-bold text-teal-400">+${exercise.points} Punkte</div>
                    </div>
                </div>
            `;
        }).join('');

        document.querySelectorAll('[data-exercise-id]').forEach(card => {
            card.addEventListener('click', () => {
                const exerciseId = card.dataset.exerciseId;
                const exercise = exercisesData.find(ex => ex.id === exerciseId);
                if (exercise) openExerciseModal(exercise);
            });
        });
    });

    return [unsubscribe];
}