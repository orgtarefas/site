// teste.js - Sistema ultra simplificado

console.log('🚀 teste.js - Sistema simplificado inicializando...');

// Estado local
const estado = {
    usuario: null,
    paginaPronta: false
};

// Inicialização
setTimeout(function() {
    console.log('📋 Iniciando página teste...');
    
    // 1. Verificar usuário
    const usuarioData = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (usuarioData) {
        estado.usuario = usuarioData;
        console.log('✅ Usuário:', usuarioData.nome);
        
        // Atualizar interface
        const userNameElement = document.getElementById('userName');
        if (userNameElement) userNameElement.textContent = usuarioData.nome;
        
        const displayUserElement = document.getElementById('displayUserName');
        if (displayUserElement) displayUserElement.textContent = usuarioData.nome || usuarioData.usuario;
    }
    
    // 2. Mostrar conteúdo
    mostrarConteudo();
    
    // 3. Configurar eventos
    configurarEventos();
    
    estado.paginaPronta = true;
    console.log('✅ Página teste pronta');
}, 1000);

// Mostrar conteúdo
function mostrarConteudo() {
    const loading = document.getElementById('loadingScreen');
    const content = document.getElementById('mainContent');
    
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';
    
    atualizarStatus('Sistema carregado');
}

// Configurar eventos
function configurarEventos() {
    // Fechar dropdowns ao clicar fora
    document.addEventListener('click', function(event) {
        const containers = document.querySelectorAll('.alerts-container.show');
        let cliqueDentro = false;
        
        containers.forEach(container => {
            if (container.contains(event.target)) {
                cliqueDentro = true;
            }
        });
        
        if (!cliqueDentro) {
            containers.forEach(container => {
                container.classList.remove('show');
            });
        }
    });
}

// ===== FUNÇÕES DO CABEÇALHO =====

function abrirAlertasObservadorTeste() {
    console.log('👁️ Alertas de observador');
    const container = document.getElementById('observadorAlertsContainer');
    if (container) container.classList.toggle('show');
    atualizarStatus('Alertas de observador abertos');
}

function abrirAlertasResponsavelTeste() {
    console.log('🔔 Alertas de responsável');
    const container = document.getElementById('responsavelAlertsContainer');
    if (container) container.classList.toggle('show');
    atualizarStatus('Alertas de responsável abertos');
}

function logoutTeste() {
    if (confirm('Deseja sair do sistema?')) {
        localStorage.removeItem('usuarioLogado');
        window.location.href = 'login.html';
    }
}

// ===== FUNÇÕES DA PÁGINA =====

function mostrarInfoUsuario() {
    if (!estado.usuario) {
        alert('Usuário não logado!');
        return;
    }
    
    alert(`Usuário: ${estado.usuario.nome}\nLogin: ${estado.usuario.usuario}`);
    atualizarStatus('Informações exibidas');
}

function verificarStatusSistema() {
    const status = {
        usuario: !!estado.usuario,
        pagina: estado.paginaPronta,
        hora: new Date().toLocaleTimeString()
    };
    
    alert(`Status:\nUsuário: ${status.usuario ? 'OK' : 'FALHA'}\nPágina: ${status.pagina ? 'OK' : 'FALHA'}\nHora: ${status.hora}`);
    atualizarStatus('Status verificado');
}

function testarAlertas() {
    const contador = document.getElementById('observadorAlertCount');
    if (contador) {
        contador.textContent = '1';
        contador.style.display = 'flex';
    }
    atualizarStatus('Alerta de teste criado');
    alert('✅ Alerta de teste criado!');
}

// ===== FUNÇÕES AUXILIARES =====

function atualizarStatus(mensagem) {
    const elemento = document.getElementById('alertStatus');
    if (elemento) {
        elemento.textContent = mensagem;
        elemento.className = 'status-indicator active';
        setTimeout(() => elemento.className = 'status-indicator', 2000);
    }
}

// Exportar funções
window.abrirAlertasObservadorTeste = abrirAlertasObservadorTeste;
window.abrirAlertasResponsavelTeste = abrirAlertasResponsavelTeste;
window.logoutTeste = logoutTeste;
window.mostrarInfoUsuario = mostrarInfoUsuario;
window.verificarStatusSistema = verificarStatusSistema;
window.testarAlertas = testarAlertas;

console.log('✅ teste.js - Sistema pronto para uso');
