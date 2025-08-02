// Attend que le contenu de la page soit entièrement chargé avant d'exécuter le script
document.addEventListener('DOMContentLoaded', () => {

    // --- ÉLÉMENTS DU DOM ---
    const notebookContainer = document.getElementById('notebook-container');
    const footer = document.getElementById('footer');
    
    // Éléments du Chatbot
    const chatbotContainer = document.getElementById('chatbot-container');
    const chatbotBackdrop = document.getElementById('chatbot-backdrop');
    const openChatbotBtn = document.getElementById('open-chatbot-btn');
    const closeChatbotBtn = document.getElementById('close-chatbot-btn');
    const chatbotWindow = document.getElementById('chatbot-window');

    // --- ÉTAT DE L'APPLICATION ---
    let questCellsData = []; 
    let currentCellIndex = 0;
    let userXP = 0;

    // --- FONCTION PRINCIPALE D'INITIALISATION ---
    async function initQuestPlayer() {
        notebookContainer.innerHTML = '<p class="text-center text-slate-500">Chargement de la quête...</p>';

        const questPath = './data/quests/intro-python/demo-quest-v1.json';

        try {
            const response = await fetch(questPath);
            if (!response.ok) {
                throw new Error(`Erreur HTTP ! Statut : ${response.status}`);
            }
            const questData = await response.json();
            questCellsData = questData.questCells;
            notebookContainer.innerHTML = ''; 
            
            renderNextCell();

        } catch (error) {
            console.error("Erreur de chargement de la quête:", error);
            notebookContainer.innerHTML = '<p class="text-center text-red-500">Impossible de charger le contenu de la quête.</p>';
        }
    }

    // --- MOTEUR D'AFFICHAGE ---
    function renderNextCell() {
        if (currentCellIndex >= questCellsData.length) {
            updateProgress(); 
            footer.classList.remove('translate-y-full');
            return;
        }

        const cellData = questCellsData[currentCellIndex];
        const cellWrapper = document.createElement('div');
        cellWrapper.classList.add('quest-cell');
        cellWrapper.dataset.cellIndex = currentCellIndex;

        let cellHtml = '';

        switch (cellData.type) {
            case 'markdown':
                // MISE À JOUR : Logique pour gérer le code statique séparément
                let markdownContent = `
                    <div class="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                        <h2 class="text-lg font-bold text-slate-900 mb-4">${cellData.title || ''}</h2>
                        <div class="prose prose-slate max-w-none">
                            ${cellData.content}
                        </div>`;
                
                if (cellData.staticCode) {
                    markdownContent += `
                        <div class="mt-4 bg-slate-100 p-4 rounded-md overflow-auto">
                            <pre><code class="language-python">${cellData.staticCode}</code></pre>
                        </div>`;
                }

                markdownContent += `
                        <div class="mt-6 flex justify-end">
                            <button class="next-step-btn bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">Continuer</button>
                        </div>
                    </div>`;
                cellHtml = markdownContent;
                break;
            case 'code-py':
                cellHtml = `
                    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div class="p-6">
                            <h2 class="text-lg font-bold text-slate-900 mb-4">${cellData.title}</h2>
                            <div class="h-52 bg-brand-dark-blue text-white font-mono p-4 rounded-md overflow-auto"><pre><code>${cellData.initialCode}</code></pre></div>
                            <div class="mt-4 flex justify-end">
                                <button class="next-step-btn bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">Exécuter</button>
                            </div>
                        </div>
                        <div class="bg-slate-900 p-4 text-sm text-slate-200 font-mono"><pre>&gt; La sortie apparaîtra ici...</pre></div>
                    </div>`;
                break;
            case 'exercice-py':
                 cellHtml = `
                     <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div class="p-6">
                            <h2 class="text-lg font-bold text-slate-900 mb-2">${cellData.title}</h2>
                            <p class="text-slate-600 mb-4">${cellData.instructions}</p>
                            <div class="h-52 bg-brand-dark-blue text-white font-mono p-4 rounded-md overflow-auto"><pre><code>${cellData.initialCode}</code></pre></div>
                            <div class="mt-4 flex justify-end">
                                <button class="next-step-btn bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">Vérifier</button>
                            </div>
                        </div>
                        <div class="bg-slate-900 p-4 text-sm text-slate-200 font-mono"><pre>&gt; La sortie apparaîtra ici...</pre></div>
                    </div>`;
                break;
            case 'mcq':
                 const optionsHtml = cellData.options.map((opt) => `
                    <label class="flex items-center p-3 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input type="radio" name="mcq-${currentCellIndex}" value="${opt}" class="h-4 w-4 text-blue-600">
                        <span class="ml-3 text-slate-700">${opt}</span>
                    </label>
                `).join('');
                cellHtml = `
                    <div class="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                        <p class="text-slate-600 mb-4 font-semibold">${cellData.question}</p>
                        <div class="space-y-3">${optionsHtml}</div>
                        <div class="feedback-area mt-4 p-3 rounded-lg text-center font-semibold" style="display: none;"></div>
                        <div class="mt-4 flex justify-end">
                            <button class="check-mcq-btn bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">Vérifier</button>
                        </div>
                    </div>`;
                break;
            
            case 'rapid-mcq':
                cellHtml = `
                    <div class="flip-card">
                        <div class="flip-card-inner">
                            <!-- Face Avant : Le Quiz -->
                            <div class="flip-card-front">
                                <div class="bg-white rounded-xl shadow-sm p-6 border border-slate-200 relative">
                                    <div class="absolute top-4 right-4 font-bold text-lg text-brand-orange" id="timer-display-${currentCellIndex}">⏳ ${cellData.timeLimit}s</div>
                                    <h2 class="text-lg font-bold text-slate-900 mb-4">Quiz Rapide</h2>
                                    <div id="rapid-mcq-content-${currentCellIndex}">
                                        <!-- La question actuelle sera injectée ici -->
                                    </div>
                                </div>
                            </div>
                            <!-- Face Arrière : Le Score -->
                            <div class="flip-card-back">
                                 <div class="bg-slate-800 text-white rounded-xl shadow-xl p-6 flex flex-col items-center justify-center h-full">
                                    <h2 class="text-2xl font-bold">Score Final</h2>
                                    <p id="rapid-mcq-score-${currentCellIndex}" class="text-5xl font-extrabold text-brand-orange my-4">0/${cellData.questions.length}</p>
                                    <p id="rapid-mcq-feedback-${currentCellIndex}" class="mb-6">Félicitations !</p>
                                    <button class="next-step-btn bg-orange-500 text-white font-semibold px-6 py-2 rounded-lg hover:bg-orange-600">Continuer</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                break;

            default:
                cellHtml = `<div class="bg-white p-4 rounded-lg shadow-sm border"><p class="text-red-500">Type de cellule inconnu : ${cellData.type}</p></div>`;
        }
        
        cellWrapper.innerHTML = cellHtml;
        notebookContainer.appendChild(cellWrapper);

        if (cellData.type === 'rapid-mcq') {
            startRapidMcq(cellWrapper.querySelector('.flip-card'), cellData);
        }
        
        cellWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
        updateProgress();
    }
    
    function startRapidMcq(cardElement, cellData) {
        let currentQuestionIndex = 0;
        let score = 0;
        let timerId = null;
        const cellIndex = parseInt(cardElement.closest('.quest-cell').dataset.cellIndex, 10);

        const contentEl = cardElement.querySelector(`#rapid-mcq-content-${cellIndex}`);
        const timerEl = cardElement.querySelector(`#timer-display-${cellIndex}`);
        const flipCardInner = cardElement.querySelector('.flip-card-inner');

        function showNextQuestion() {
            clearInterval(timerId);

            if (currentQuestionIndex >= cellData.questions.length) {
                endQuiz();
                return;
            }

            const questionData = cellData.questions[currentQuestionIndex];
            let timeLeft = cellData.timeLimit;
            timerEl.textContent = `⏳ ${timeLeft}s`;

            const optionsHtml = questionData.options.map(opt => `
                <label class="flex items-center p-3 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input type="radio" name="rapid-mcq-q-${cellIndex}-${currentQuestionIndex}" value="${opt}" class="h-4 w-4 text-blue-600">
                    <span class="ml-3 text-slate-700">${opt}</span>
                </label>
            `).join('');

            contentEl.innerHTML = `
                <p class="text-slate-600 mb-4 font-semibold">${questionData.question}</p>
                <div class="space-y-3">${optionsHtml}</div>
            `;
            
            const frontFaceContent = cardElement.querySelector('.flip-card-front > div');
            flipCardInner.style.height = `${frontFaceContent.offsetHeight}px`;

            timerId = setInterval(() => {
                timeLeft--;
                timerEl.textContent = `⏳ ${timeLeft}s`;
                if (timeLeft <= 0) {
                    handleAnswer(null);
                }
            }, 1000);
        }

        function handleAnswer(selectedValue) {
            const questionData = cellData.questions[currentQuestionIndex];
            if (selectedValue && selectedValue === questionData.correctAnswer) {
                score++;
            }
            currentQuestionIndex++;
            showNextQuestion();
        }
        
        function endQuiz() {
            clearInterval(timerId);
            const scoreEl = cardElement.querySelector(`#rapid-mcq-score-${cellIndex}`);
            scoreEl.textContent = `${score}/${cellData.questions.length}`;
            userXP += score * 20; 
            updateProgress();

            const backFaceContent = cardElement.querySelector('.flip-card-back > div');
            flipCardInner.style.height = `${backFaceContent.offsetHeight}px`;
            cardElement.classList.add('is-flipped');
        }

        cardElement.addEventListener('click', (event) => {
            const radio = event.target.closest('input[type="radio"]');
            if (radio) {
                handleAnswer(radio.value);
            }
        });

        showNextQuestion();
    }

    function updateProgress() {
        const progressBar = document.getElementById('progress-bar');
        const xpCounter = document.getElementById('xp-counter');

        const totalCells = questCellsData.length;
        const completedCells = currentCellIndex;
        const percentage = totalCells > 0 ? (completedCells / totalCells) * 100 : 0;
        
        if (progressBar) progressBar.style.width = `${percentage}%`;
        if (xpCounter) xpCounter.textContent = `${userXP} XP`;
    }

    // --- GESTION DES ÉVÉNEMENTS ---
    notebookContainer.addEventListener('click', function(event) {
        if (event.target.classList.contains('next-step-btn')) {
            userXP += 10;
            currentCellIndex++;
            renderNextCell();
        } else if (event.target.classList.contains('check-mcq-btn')) {
            const cellWrapper = event.target.closest('.quest-cell');
            const cellIndex = parseInt(cellWrapper.dataset.cellIndex, 10);
            handleMcqCheck(cellWrapper, questCellsData[cellIndex]);
        }
    });

    function handleMcqCheck(cellWrapper, cellData) {
        const feedbackArea = cellWrapper.querySelector('.feedback-area');
        const selectedOption = cellWrapper.querySelector(`input[name="mcq-${currentCellIndex}"]:checked`);
        const checkButton = cellWrapper.querySelector('.check-mcq-btn');

        feedbackArea.style.display = 'block';

        if (!selectedOption) {
            feedbackArea.textContent = "Veuillez sélectionner une réponse.";
            feedbackArea.className = 'feedback-area mt-4 p-3 rounded-lg text-center font-semibold bg-yellow-100 text-yellow-800';
            return;
        }

        if (selectedOption.value === cellData.correctAnswer) {
            feedbackArea.textContent = "Correct !";
            feedbackArea.className = 'feedback-area mt-4 p-3 rounded-lg text-center font-semibold bg-green-100 text-green-800';
            
            cellWrapper.querySelectorAll('input[type="radio"]').forEach(input => input.disabled = true);
            
            checkButton.textContent = "Continuer";
            checkButton.classList.remove('check-mcq-btn');
            checkButton.classList.add('next-step-btn');
        } else {
            feedbackArea.textContent = "Incorrect. Essayez encore !";
            feedbackArea.className = 'feedback-area mt-4 p-3 rounded-lg text-center font-semibold bg-red-100 text-red-800';
        }
    }

    // --- LOGIQUE DU CHATBOT RESPONSIVE ---
    function openChatbot() {
        chatbotContainer.classList.remove('hidden');
        setTimeout(() => {
            chatbotBackdrop.classList.remove('hidden');
            chatbotWindow.classList.remove('hidden');
        }, 10);
    }

    function closeChatbot() {
        chatbotBackdrop.classList.add('hidden');
        chatbotWindow.classList.add('hidden');
        setTimeout(() => {
            chatbotContainer.classList.add('hidden');
        }, 300);
    }

    openChatbotBtn.addEventListener('click', openChatbot);
    closeChatbotBtn.addEventListener('click', closeChatbot);
    chatbotBackdrop.addEventListener('click', closeChatbot);

    // --- DÉMARRAGE DE L'APPLICATION ---
    initQuestPlayer();
});
