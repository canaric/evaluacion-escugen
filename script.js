// Variables globales
const currentQuestions = [];
let currentQuestionIndex = 0;
const userAnswers = [];
let examStartTime = null;
let timerInterval = null;
const timeLimit = 45 * 60; // 45 minutos en segundos
let timeRemaining = timeLimit;

// Elementos del DOM
const welcomeSection = document.getElementById("welcomeSection");
const examSection = document.getElementById("examSection");
const resultsSection = document.getElementById("resultsSection");
const reviewSection = document.getElementById("reviewSection");
const startExamBtn = document.getElementById("startExam");
const questionContainer = document.getElementById("questionContainer");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const timerElement = document.getElementById("timer");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const backToResultsBtn = document.getElementById("backToResults");

// Event listeners
document.addEventListener("DOMContentLoaded", function() {
    startExamBtn.addEventListener("click", iniciarExamen);
    prevBtn.addEventListener("click", previousQuestion);
    nextBtn.addEventListener("click", nextQuestion);
    submitBtn.addEventListener("click", submitExam);
    
    // Event listeners para los botones de resultados
    document.getElementById("reviewBtn").addEventListener("click", reviewAnswers);
    document.getElementById("retryBtn").addEventListener("click", retryExam);
    document.getElementById("certificateBtn").addEventListener("click", downloadCertificate);
    backToResultsBtn.addEventListener("click", () => {
        reviewSection.style.display = "none";
        resultsSection.style.display = "block";
    });
});

function iniciarExamen() {
    // Validar información del usuario
    const name = document.getElementById("studentName").value.trim();
    const id = document.getElementById("studentId").value.trim();
    const userType = document.getElementById("userType").value;
    
    if (!name || !id || !userType) {
        alert("Por favor, complete toda la información requerida antes de comenzar.");
        return;
    }
    
    // Guardar información del usuario
    sessionStorage.setItem("userName", name);
    sessionStorage.setItem("userId", id);
    sessionStorage.setItem("userType", userType);
    
    // Obtener preguntas aleatorias
    currentQuestions.length = 0;
    currentQuestions.push(...getRandomQuestions(25));
    userAnswers.length = 0;
    userAnswers.push(...new Array(currentQuestions.length).fill(null));
    currentQuestionIndex = 0;
    
    // Inicializar examen
    examStartTime = new Date();
    timeRemaining = timeLimit;
    
    // Cambiar a la sección del examen
    welcomeSection.style.display = "none";
    examSection.style.display = "block";
    
    // Mostrar primera pregunta
    displayQuestion();
    startTimer();
    updateProgress();
}

function displayQuestion() {
    const question = currentQuestions[currentQuestionIndex];
    
    questionContainer.innerHTML = `
        <div class="question">
            <div class="question-header">
                <span class="question-number">Pregunta ${currentQuestionIndex + 1}</span>
                <span class="question-category">${question.category}</span>
            </div>
            <div class="question-text">${question.question}</div>
            <div class="options">
                ${question.options.map((option, index) => `
                    <label class="option ${userAnswers[currentQuestionIndex] === index ? "selected" : ""}" 
                           onclick="selectOption(${index})">
                        <input type="radio" name="question${currentQuestionIndex}" value="${index}" 
                               ${userAnswers[currentQuestionIndex] === index ? "checked" : ""}>
                        <span class="option-text">${option}</span>
                    </label>
                `).join("")}
            </div>
        </div>
    `;
    
    updateNavigationButtons();
}

function selectOption(optionIndex) {
    userAnswers[currentQuestionIndex] = optionIndex;
    
    // Actualizar visualmente la selección
    const options = document.querySelectorAll(".option");
    options.forEach((option, index) => {
        option.classList.toggle("selected", index === optionIndex);
    });
    
    // Guardar progreso
    saveProgress();
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
        updateProgress();
    }
}

function nextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
        updateProgress();
    }
}

function updateNavigationButtons() {
    prevBtn.disabled = currentQuestionIndex === 0;
    
    if (currentQuestionIndex === currentQuestions.length - 1) {
        nextBtn.style.display = "none";
        submitBtn.style.display = "flex";
    } else {
        nextBtn.style.display = "flex";
        submitBtn.style.display = "none";
    }
}

function updateProgress() {
    const progress = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `Pregunta ${currentQuestionIndex + 1} de ${currentQuestions.length}`;
    document.querySelector(".progress-bar").setAttribute("aria-valuenow", currentQuestionIndex + 1);
}

function startTimer() {
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        // Advertencia cuando quedan 5 minutos
        if (timeRemaining === 5 * 60) {
            timerElement.classList.add("timer-warning");
        }
        
        // Tiempo agotado
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            submitExam();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    timerElement.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function saveProgress() {
    const progress = {
        questions: currentQuestions,
        answers: userAnswers,
        currentIndex: currentQuestionIndex,
        startTime: examStartTime,
        timeRemaining: timeRemaining
    };
    sessionStorage.setItem("examProgress", JSON.stringify(progress));
}

function submitExam() {
    // Verificar que todas las preguntas estén respondidas
    const unanswered = userAnswers.findIndex(answer => answer === null);
    if (unanswered !== -1) {
        const confirmSubmit = window.confirm(
            `Hay ${userAnswers.filter(a => a === null).length} pregunta(s) sin responder. ` +
            "¿Está seguro de que desea enviar el examen?"
        );
        if (!confirmSubmit) return;
    }
    
    clearInterval(timerInterval);
    
    // Calcular resultados
    const results = calculateResults();
    
    // Guardar resultados
    sessionStorage.setItem("examResults", JSON.stringify(results));
    
    // Mostrar resultados
    displayResults(results);
}

function calculateResults() {
    const endTime = new Date();
    const timeUsed = Math.floor((endTime - examStartTime) / 1000);
    
    let correctCount = 0;
    const detailedResults = [];
    
    currentQuestions.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const isCorrect = userAnswer === question.correct;
        
        if (isCorrect) correctCount++;
        
        detailedResults.push({
            question: question.question,
            category: question.category,
            userAnswer: userAnswer !== null ? question.options[userAnswer] : "Sin responder",
            correctAnswer: question.options[question.correct],
            isCorrect: isCorrect,
            explanation: question.explanation
        });
    });
    
    const percentage = Math.round((correctCount / currentQuestions.length) * 100);
    const passed = percentage >= 70;
    
    return {
        correctCount,
        totalQuestions: currentQuestions.length,
        percentage,
        passed,
        timeUsed,
        detailedResults,
        userName: sessionStorage.getItem("userName"),
        userId: sessionStorage.getItem("userId"),
        userType: sessionStorage.getItem("userType"),
        completionDate: new Date().toLocaleString("es-ES")
    };
}

function displayResults(results) {
    examSection.style.display = "none";
    resultsSection.style.display = "block";
    reviewSection.style.display = "none";
    
    // Icono y mensaje según el resultado
    const resultIcon = document.getElementById("resultIcon");
    const resultTitle = document.getElementById("resultTitle");
    const resultMessage = document.getElementById("resultMessage");
    const examStatusElement = document.getElementById("examStatus");
    
    if (results.passed) {
        resultIcon.className = "fas fa-check-circle success";
        resultTitle.textContent = "¡Felicitaciones! Examen Aprobado";
        resultMessage.textContent = "Ha demostrado un buen conocimiento en seguridad de la información.";
        examStatusElement.textContent = "Aprobado";
        examStatusElement.style.color = "var(--success-color)";
        document.getElementById("certificateBtn").style.display = "flex";
    } else {
        resultIcon.className = "fas fa-times-circle danger";
        resultTitle.textContent = "Examen No Aprobado";
        resultMessage.textContent = "Necesita reforzar sus conocimientos en seguridad de la información.";
        examStatusElement.textContent = "No Aprobado";
        examStatusElement.style.color = "var(--error-color)";
        document.getElementById("certificateBtn").style.display = "none";
    }
    
    // Actualizar puntuación
    document.getElementById("scorePercentage").textContent = `${results.percentage}%`;
    document.getElementById("correctAnswers").textContent = `${results.correctCount}/${results.totalQuestions}`;
    
    const minutes = Math.floor(results.timeUsed / 60);
    const seconds = results.timeUsed % 60;
    document.getElementById("timeUsed").textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    
    // Actualizar círculo de progreso
    const scoreCircle = document.querySelector(".score-circle");
    const angle = (results.percentage / 100) * 360;
    scoreCircle.style.background = `conic-gradient(var(--primary-color) ${angle}deg, var(--bg-tertiary) ${angle}deg)`;
    
    // Generar recomendaciones
    const recommendationsElement = document.getElementById("recommendations");
    if (recommendationsElement) {
        generateRecommendations(results);
    }
}

function generateRecommendations(results) {
    const recommendations = document.getElementById("recommendations");
    const weakAreas = getWeakAreas(results.detailedResults);
    
    let recommendationHTML = "<h4><i class=\"fas fa-lightbulb\"></i> Recomendaciones para Mejorar:</h4><ul>";
    
    if (results.percentage < 70) {
        recommendationHTML += "<li>Revisar todos los contenidos del seminario de seguridad</li>";
        recommendationHTML += "<li>Practicar con ejercicios adicionales de ciberseguridad</li>";
    }
    
    if (weakAreas.length > 0) {
        recommendationHTML += `<li>Reforzar conocimientos en: ${weakAreas.join(", ")}</li>`;
    }
    
    recommendationHTML += "<li>Mantenerse actualizado con las últimas amenazas de seguridad</li>";
    recommendationHTML += "<li>Aplicar las mejores prácticas en su trabajo diario</li>";
    recommendationHTML += "</ul>";
    
    recommendations.innerHTML = recommendationHTML;
}

function getWeakAreas(detailedResults) {
    const categoryStats = {};
    
    detailedResults.forEach(result => {
        if (!categoryStats[result.category]) {
            categoryStats[result.category] = { correct: 0, total: 0 };
        }
        categoryStats[result.category].total++;
        if (result.isCorrect) {
            categoryStats[result.category].correct++;
        }
    });
    
    const weakAreas = [];
    Object.entries(categoryStats).forEach(([category, stats]) => {
        const percentage = (stats.correct / stats.total) * 100;
        if (percentage < 60) {
            weakAreas.push(category);
        }
    });
    
    return weakAreas;
}

function reviewAnswers() {
    const results = JSON.parse(sessionStorage.getItem("examResults"));
    if (!results) return;
    
    resultsSection.style.display = "none";
    reviewSection.style.display = "block";

    const reviewContainer = document.getElementById("reviewContainer");
    let reviewHTML = "";
    
    results.detailedResults.forEach((result, index) => {
        const statusClass = result.isCorrect ? "correct" : "incorrect";
        const statusIcon = result.isCorrect ? "check-circle" : "times-circle";
        
        reviewHTML += `
            <div class="review-item ${statusClass}">
                <div class="review-header">
                    <strong>Pregunta ${index + 1}</strong>
                    <span class="review-category">${result.category}</span>
                </div>
                <p class="review-question">${result.question}</p>
                <div class="review-answer user-answer ${statusClass}">
                    <strong>Su respuesta:</strong> 
                    <i class="fas fa-${statusIcon}"></i> ${result.userAnswer}
                </div>
                ${!result.isCorrect ? `
                    <div class="review-answer correct-answer">
                        <strong>Respuesta correcta:</strong> 
                        <i class="fas fa-check-circle"></i> ${result.correctAnswer}
                    </div>
                ` : ""}
                <div class="review-explanation">
                    <strong>Explicación:</strong> ${result.explanation}
                </div>
            </div>
        `;
    });
    
    reviewContainer.innerHTML = reviewHTML;
}

function retryExam() {
    if (confirm("¿Está seguro de que desea reiniciar el examen? Se perderá todo el progreso actual.")) {
        // Limpiar datos del examen
        sessionStorage.removeItem("examProgress");
        sessionStorage.removeItem("examResults");
        
        // Resetear variables
        currentQuestions.length = 0;
        currentQuestionIndex = 0;
        userAnswers.length = 0;
        examStartTime = null;
        timeRemaining = timeLimit;
        
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        // Volver a la pantalla de bienvenida
        resultsSection.style.display = "none";
        examSection.style.display = "none";
        reviewSection.style.display = "none";
        welcomeSection.style.display = "block";
        
        // Limpiar timer warning
        timerElement.classList.remove("timer-warning");
        updateTimerDisplay();
    }
}

function downloadCertificate() {
    const results = JSON.parse(sessionStorage.getItem("examResults"));
    if (!results || !results.passed) return;
    
    const date = new Date();
    const optionsDate = { day: "numeric", month: "long", year: "numeric" };
    const formattedDate = date.toLocaleDateString("es-ES", optionsDate);
    const completionDateText = `Ciudad de Buenos Aires, ${formattedDate}`;

    const userName = results.userName || "[Nombre del Participante]";
    const userId = results.userId || "[DNI del Participante]";

    // Generar QR Code
    const qrData = `Certificado: Seminario El lado oculto de la Seguridad de la Información\nParticipante: ${userName}\nDNI: ${userId}\nFecha: ${completionDateText}\nPorcentaje: ${results.percentage}%`;
    
    const qrCodeContainer = document.createElement("div");
    qrCodeContainer.id = "qrcode";
    qrCodeContainer.style.width = "128px";
    qrCodeContainer.style.height = "128px";
    qrCodeContainer.style.margin = "20px auto";

    const qrcode = new QRCodeStyling({
        width: 128,
        height: 128,
        type: "svg",
        data: qrData,
        dotsOptions: {
            color: "#000000",
            type: "rounded"
        },
        backgroundOptions: {
            color: "#ffffff"
        },
        cornersSquareOptions: {
            color: "#000000",
            type: "square"
        },
        cornersDotOptions: {
            color: "#000000",
            type: "square"
        }
    });

    // Render QR code to a temporary div to get SVG
    qrcode.append(qrCodeContainer);

    // Wait for QR code to render (it's async)
    setTimeout(() => {
        const qrSvg = qrCodeContainer.querySelector("svg").outerHTML;
        qrCodeContainer.remove();

        const certificateHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Certificado de Participación</title>
                <style>
                    @page { size: A4; margin: 0; }
                    body { margin: 0; padding: 20px; font-family: 'Times New Roman', serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); color: white; }
                    .certificate { width: 100%; max-width: 800px; margin: 0 auto; text-align: center; position: relative; }
                    .header { margin-bottom: 30px; }
                    .logo { width: 80px; height: 80px; margin: 0 20px; }
                    .title { font-size: 28px; font-weight: bold; margin: 20px 0; color: #00ff41; }
                    .subtitle { font-size: 18px; margin: 10px 0; }
                    .content { margin: 40px 0; }
                    .participant-name { font-size: 32px; font-weight: bold; margin: 20px 0; color: #00ff41; text-decoration: underline; }
                    .text { font-size: 16px; line-height: 1.6; margin: 15px 0; }
                    .signatures { display: flex; justify-content: space-around; margin-top: 60px; }
                    .signature-block { text-align: center; }
                    .signature-line { width: 200px; height: 1px; background: white; margin: 0 auto 10px; }
                    .signature-name { font-size: 14px; font-weight: bold; margin: 5px 0; }
                    .signature-title { font-size: 12px; margin: 0; }
                    .qr-code-container { position: absolute; top: 20px; right: 20px; }
                </style>
            </head>
            <body>
                <div class="certificate">
                    <div class="header">
                        <div style="display: flex; justify-content: center; align-items: center;">
                            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiMwMGZmNDEiLz4KPHN2ZyB4PSIyMCIgeT0iMjAiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIj4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjMWExYTJlIi8+Cjwvc3ZnPgo8L3N2Zz4KPC9zdmc+" class="logo" alt="Gendarmería Logo">
                            <div>
                                <h1 class="title">CERTIFICADO DE PARTICIPACIÓN</h1>
                                <p class="subtitle">Seminario "El lado oculto de la Seguridad de la Información"</p>
                            </div>
                            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiMwMGZmNDEiLz4KPHN2ZyB4PSIxNSIgeT0iMTUiIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIj4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTQuMDkgOC4yNkwyMSA5TDE0LjA5IDE1Ljc0TDEyIDIyTDkuOTEgMTUuNzRMMyA5TDkuOTEgOC4yNkwxMiAyWiIgZmlsbD0iIzFhMWEyZSIvPgo8L3N2Zz4KPC9zdmc+Cjwvc3ZnPg==" class="logo" alt="IUGNA Logo">
                        </div>
                        <p class="text">Escuela de Gendarmería Nacional "Grl Don Martín Miguel de Güemes"</p>
                        <p class="text">Instituto Universitario de Gendarmería Nacional Argentina (IUGNA)</p>
                    </div>
                    <div class="content">
                        <p class="text">Se certifica que</p>
                        <p class="participant-name">${userName}</p>
                        <p class="text">DNI: ${userId}</p>
                        <p class="text">ha participado exitosamente del seminario "El lado oculto de la Seguridad de la Información" y ha aprobado la evaluación correspondiente con una calificación de <strong>${results.percentage}%</strong>.</p>
                        <p class="text">Se extiende el presente certificado en ${completionDateText}.</p>
                    </div>
                    <div class="signatures">
                        <div class="signature-block">
                            <div class="signature-line"></div>
                            <p class="signature-name">Comandante General (R) D. Juan Carlos Rodríguez</p>
                            <p class="signature-title">Rector del IUGNA</p>
                        </div>
                        <div class="signature-block">
                            <div class="signature-line"></div>
                            <p class="signature-name">Comandante Mayor D. Sergio José Ledesma</p>
                            <p class="signature-title">Director de la Escuela de Gendarmería Nacional</p>
                        </div>
                    </div>
                    <div class="qr-code-container">
                        ${qrSvg}
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const certificateWindow = window.open("", "_blank", "width=800,height=1131,scrollbars=yes");
        certificateWindow.document.write(certificateHTML);
        certificateWindow.document.close();
        certificateWindow.print();
    }, 500);
}

// Función auxiliar para obtener preguntas aleatorias
function getRandomQuestions(num) {
    if (!questionBank || questionBank.length === 0) {
        console.error("questionBank no está disponible");
        return [];
    }
    
    // Crear una copia del array para no modificar el original
    const shuffled = [...questionBank];
    
    // Algoritmo Fisher-Yates para mezclar el array
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Retornar el número solicitado de preguntas
    return shuffled.slice(0, Math.min(num, shuffled.length));
}
