// Variables globales
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let examStartTime = null;
let timerInterval = null;
let timeLimit = 45 * 60; // 45 minutos en segundos
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
    startExamBtn.addEventListener("click", startExam);
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

function startExam() {
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
    currentQuestions = getRandomQuestions(25);
    userAnswers = new Array(currentQuestions.length).fill(null);
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
            // announceToScreenReader("Quedan 5 minutos para finalizar el examen.");
        }
        
        // Tiempo agotado
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            // announceToScreenReader("Tiempo agotado. El examen se enviará automáticamente.");
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
    reviewSection.style.display = "none"; // Asegurarse de que la sección de revisión esté oculta
    
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
    
    // Generar recomendaciones (si existe el elemento)
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
        currentQuestions = [];
        currentQuestionIndex = 0;
        userAnswers = [];
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
        updateTimerDisplay(); // Resetear el display del timer
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
        image: "",
        dotsOptions: {
            color: "#000000",
            type: "square"
        },
        backgroundOptions: {
            color: "#ffffff",
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
    setTimeout(async () => {
        const qrSvg = qrCodeContainer.querySelector("svg").outerHTML;
        qrCodeContainer.remove();

        const certificateHTML = `
function downloadCertificate() {
    const results = JSON.parse(sessionStorage.getItem("examResults"));
    if (!results || !results.passed) return;
    
    const date = new Date();
    const optionsDate = { day: "numeric", month: "long", year: "numeric" };
    const formattedDate = date.toLocaleDateString("es-ES", optionsDate);
    const completionDateText = `Ciudad de Buenos Aires, ${formattedDate}`;

    const userName = results.userName || "[Nombre del Participante]";
    const userId = results.userId || "[DNI del Participante]";

    // Generar QR Code con información del participante
    const qrData = `Certificado: Seminario El lado oculto de la Seguridad de la Información\nParticipante: ${userName}\nDNI: ${userId}\nFecha: ${completionDateText}\nCalificación: ${results.percentage}%\nVálido - IUGNA 2025`;
    
    const qrCodeContainer = document.createElement("div");
    qrCodeContainer.id = "qrcode";
    qrCodeContainer.style.width = "120px";
    qrCodeContainer.style.height = "120px";
    qrCodeContainer.style.margin = "0";

    const qrcode = new QRCodeStyling({
        width: 120,
        height: 120,
        type: "svg",
        data: qrData,
        image: "",
        dotsOptions: {
            color: "#000000",
            type: "square"
        },
        backgroundOptions: {
            color: "#ffffff",
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

    // Wait for QR code to render (it\'s async)
    setTimeout(async () => {
        const qrSvg = qrCodeContainer.querySelector("svg").outerHTML;
        qrCodeContainer.remove();

        const certificateHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Certificado de Aprobación - IUGNA</title>
                <style>
                    @page {
                        size: A4 landscape;
                        margin: 0;
                    }
                    body {
                        font-family: \'Times New Roman\', serif;
                        margin: 0;
                        padding: 0;
                        background: linear-gradient(135deg, #a8c8ec 0%, #7fb3d3 50%, #5b9bd5 100%);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                    }
                    .certificate-container {
                        width: 297mm;
                        height: 210mm;
                        background: linear-gradient(135deg, #a8c8ec 0%, #7fb3d3 50%, #5b9bd5 100%);
                        position: relative;
                        box-shadow: 0 0 30px rgba(0, 0, 0, 0.2);
                    }
                    .outer-border {
                        position: absolute;
                        top: 8mm;
                        left: 8mm;
                        right: 8mm;
                        bottom: 8mm;
                        border: 2px solid #4a90e2;
                        background: transparent;
                    }
                    .inner-border {
                        position: absolute;
                        top: 12mm;
                        left: 12mm;
                        right: 12mm;
                        bottom: 12mm;
                        border: 1px solid #4a90e2;
                        background: transparent;
                    }
                    .content-area {
                        position: absolute;
                        top: 20mm;
                        left: 20mm;
                        right: 20mm;
                        bottom: 20mm;
                        background: rgba(255, 255, 255, 0.95);
                        border-radius: 5px;
                        padding: 15mm;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                    }
                    .header-section {
                        text-align: center;
                        margin-bottom: 10mm;
                    }
                    .republica-text {
                        font-size: 14px;
                        color: #333;
                        margin-bottom: 8px;
                        letter-spacing: 2px;
                        font-weight: bold;
                    }
                    .escudo-nacional {
                        width: 30px;
                        height: 30px;
                        margin: 0 auto 10px;
                        background: #333;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: bold;
                        font-size: 12px;
                    }
                    .logos-section {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 15mm;
                        padding: 0 10mm;
                    }
                    .logo {
                        width: 60px;
                        height: 45px;
                        background-size: contain;
                        background-repeat: no-repeat;
                        background-position: center;
                        border: 1px solid #ddd;
                        border-radius: 3px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 10px;
                        color: #666;
                        text-align: center;
                    }
                    .logo-gendarmeria {
                        background-color: #006633;
                        color: white;
                        font-weight: bold;
                    }
                    .logo-escuela {
                        background-color: #004d99;
                        color: white;
                        font-weight: bold;
                    }
                    .logo-iugna {
                        background-color: #009966;
                        color: white;
                        font-weight: bold;
                    }
                    .certificate-title {
                        font-size: 42px;
                        font-weight: bold;
                        color: #8B4513;
                        text-align: center;
                        margin: 15mm 0;
                        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
                        letter-spacing: 4px;
                    }
                    .certificate-body {
                        text-align: center;
                        font-size: 18px;
                        line-height: 2;
                        color: #333;
                        margin: 20mm 0;
                        padding: 0 20mm;
                        flex-grow: 1;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                    }
                    .participant-name {
                        font-size: 22px;
                        font-weight: bold;
                        color: #000;
                        margin: 8px 0;
                        text-decoration: underline;
                        text-transform: uppercase;
                    }
                    .course-title {
                        font-weight: bold;
                        font-style: italic;
                        color: #004d99;
                    }
                    .qualification {
                        font-weight: bold;
                        color: #006633;
                        font-size: 20px;
                    }
                    .qr-section {
                        position: absolute;
                        bottom: 15mm;
                        left: 15mm;
                        width: 120px;
                        height: 120px;
                    }
                    .date-location {
                        position: absolute;
                        bottom: 15mm;
                        right: 20mm;
                        font-size: 14px;
                        color: #333;
                        text-align: right;
                    }
                    .signature-section {
                        position: absolute;
                        bottom: 15mm;
                        right: 50mm;
                        left: 150mm;
                        text-align: center;
                    }
                    .signature-line {
                        border-top: 1px solid #333;
                        width: 150px;
                        margin: 30px auto 8px;
                    }
                    .signature-name {
                        font-weight: bold;
                        font-size: 12px;
                        margin-bottom: 3px;
                    }
                    .signature-title {
                        font-size: 10px;
                        color: #666;
                        line-height: 1.2;
                    }
                </style>
            </head>
            <body>
                <div class="certificate-container">
                    <div class="outer-border"></div>
                    <div class="inner-border"></div>
                    
                    <div class="content-area">
                        <div class="header-section">
                            <div class="republica-text">REPÚBLICA ARGENTINA</div>
                            <div class="escudo-nacional">🇦🇷</div>
                        </div>
                        
                        <div class="logos-section">
                            <div class="logo logo-gendarmeria">GENDARMERÍA<br>NACIONAL</div>
                            <div class="logo logo-escuela">ESCUELA<br>SUPERIOR</div>
                            <div class="logo logo-iugna">IUGNA</div>
                        </div>
                        
                        <div class="certificate-title">CERTIFICADO</div>
                        
                        <div class="certificate-body">
                            <div>
                                Por cuanto <span class="participant-name">${userName}</span>, DNI: ${userId} ha aprobado el Seminario 
                                <span class="course-title">"EL LADO OSCURO DE LA WEB"</span>, impartido por la Escuela de Gendarmeria Nacional “Grl Don Martin Miguel de Guemes” en el marco del Plan Anual de Capacitación del Instituto Universitario de Gendarmería Nacional, llevado a cabo desde el 21 de agosto del año 2025; se extiende el presente certificado que así lo acredita.
                            </div>
                        </div>
                    </div>
                    
                    <div class="qr-section">
                        ${qrSvg}
                    </div>
                    
                    <div class="signature-section">
                        <div class="signature-line"></div>
                        <div class="signature-name">RECTOR BERNARDO RAGGIO</div>
                        <div class="signature-title">COMANDANTE MAYOR - DIRECTOR<br>ESCUELA SUPERIOR DE GENDARMERÍA</div>
                    </div>
                    
                    <div class="date-location">${completionDateText}</div>
                </div>
            </body>
            </html>
        `;

        // Crear un iframe oculto para generar el PDF
        const iframe = document.createElement(\'iframe\');
        iframe.style.position = \'absolute\';
        iframe.style.left = \'-9999px\';
        iframe.style.width = \'297mm\';
        iframe.style.height = \'210mm\';
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(certificateHTML);
        iframeDoc.close();

        // Esperar a que se cargue el contenido
        setTimeout(() => {
            iframe.contentWindow.print();
            
            // Remover el iframe después de un tiempo
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }, 1000);

    }, 500);
}
                <title>Certificado de Aprobación - IUGNA</title>
                <style>
                    body {
                        font-family: 'Times New Roman', serif;
                        margin: 0;
                        padding: 0;
                        background-color: #f0f0f0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                    }
                    .certificate-container {
                        width: 210mm; /* A4 width */
                        height: 297mm; /* A4 height */
                        padding: 20mm;
                        border: 10px solid #003366;
                        box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
                        background-color: #ffffff;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                        position: relative;
                        overflow: hidden;
                    }
                    .watermark {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        font-size: 150pt;
                        color: rgba(0, 51, 102, 0.05);
                        font-weight: bold;
                        pointer-events: none;
                        white-space: nowrap;
                        z-index: 0;
                    }
                    .header-logos {
                        display: flex;
                        justify-content: space-between;
                        width: 100%;
                        margin-bottom: 20px;
                        align-items: center;
                        z-index: 1;
                    }
                    .header-logos img {
                        max-height: 80px;
                        width: auto;
                    }
                    .header-logos .logo-left {
                        margin-right: auto; /* Push to left */
                    }
                    .header-logos .logo-right {
                        margin-left: auto; /* Push to right */
                    }
                    h1 {
                        font-size: 28pt;
                        color: #003366;
                        margin-bottom: 10mm;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        z-index: 1;
                    }
                    .subtitle {
                        font-size: 16pt;
                        color: #333333;
                        margin-bottom: 5mm;
                        z-index: 1;
                    }
                    .body-text {
                        font-size: 14pt;
                        line-height: 1.6;
                        margin-bottom: 15mm;
                        color: #555555;
                        max-width: 80%;
                        z-index: 1;
                    }
                    .participant-name {
                        font-size: 20pt;
                        font-weight: bold;
                        color: #003366;
                        margin-bottom: 5mm;
                        text-transform: uppercase;
                        z-index: 1;
                    }
                    .id-info {
                        font-size: 12pt;
                        color: #777777;
                        margin-bottom: 15mm;
                        z-index: 1;
                    }
                    .date-location {
                        font-size: 12pt;
                        color: #777777;
                        margin-bottom: 20mm;
                        z-index: 1;
                    }
                    .signatures-container {
                        display: flex;
                        justify-content: space-around;
                        width: 100%;
                        margin-top: auto; /* Push to bottom */
                        z-index: 1;
                    }
                    .signature-block {
                        text-align: center;
                        width: 30%;
                    }
                    .signature-line {
                        border-top: 1px solid #000000;
                        margin-top: 30px;
                        margin-bottom: 5px;
                    }
                    .signature-name {
                        font-size: 10pt;
                        font-weight: bold;
                        color: #333333;
                    }
                    .signature-title {
                        font-size: 9pt;
                        color: #555555;
                    }
                    .qr-code-container {
                        margin-top: 20px;
                        z-index: 1;
                    }
                    @media print {
                        body {
                            background-color: #ffffff;
                        }
                        .certificate-container {
                            border: none;
                            box-shadow: none;
                            width: 210mm;
                            height: 297mm;
                            padding: 10mm;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="certificate-container">
                    <div class="watermark">CERTIFICADO</div>
                    <div class="header-logos">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Escudo_de_la_Gendarmer%C3%ADa_Nacional_Argentina.svg/1200px-Escudo_de_la_Gendarmer%C3%ADa_Nacional_Argentina.svg.png" alt="Logo Gendarmería" class="logo-left">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Escudo_IUGNA.png/640px-Escudo_IUGNA.png" alt="Logo IUGNA" class="logo-right">
                    </div>
                    <div class="subtitle">Escuela de Gendarmería Nacional "Grl Don Martín Miguel de Güemes"</div>
                    <h1 class="main-title">Seminario El lado oculto de la Seguridad de la Información</h1>
                    <p class="body-text">
                        Se otorga el presente certificado a:
                    </p>
                    <p class="participant-name">${userName}</p>
                    <p class="id-info">DNI: ${userId}</p>
                    <p class="body-text">
                        Por haber participado y aprobado la evaluación del seminario "El lado oculto de la Seguridad de la Información", demostrando un compromiso con la actualización y el fortalecimiento de sus conocimientos en ciberseguridad.
                    </p>
                    <p class="date-location">${completionDateText}</p>
                    
                    <div class="signatures-container">
                        <div class="signature-block">
                            <div class="signature-line"></div>
                            <p class="signature-name">Mg. Ing. Ricardo Alcides Canaveri</p>
                            <p class="signature-title">Director de Carrera de Seguridad Informática</p>
                        </div>
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
    }, 500); // Give some time for QR code to render
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

// announceToScreenReader function (from index_mejorado.html, if needed in script.js)
// function announceToScreenReader(message) { ... }

