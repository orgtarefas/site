// teste.js - Versão independente que não precisa do script.js

// Estado global para esta página
let alertasObservador = [];
let alertasResponsavel = [];

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 teste.js - Inicializando página independente...');
    
    // 1. Verificar autenticação
    verificarAutenticacao();
    
    // 2. Configurar eventos da página
    configurarEventosTeste();
    
    // 3. Inicializar sistema de alertas básico
    inicializarAlertasBasico();
    
    console.log('✅ Página teste pronta!');
});

// Função para verificar autenticação
function verificarAutenticacao() {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    if (!usuarioLogado) {
        console.log('❌ Usuário não logado');
        alert('Você precisa estar logado! Redirecionando...');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
        return;
    }
    
    console.log('✅ Usuário logado:', usuarioLogado);
    
    // Atualizar nome no cabeçalho
    const userNameElement = document.getElementById('userName');
    if (userNameElement && usuarioLogado.nome) {
        userNameElement.textContent = usuarioLogado.nome;
    }
}

// Configurar eventos da página
function configurarEventosTeste() {
    console.log('⚙️ Configurando eventos da página teste...');
    
    // Fechar dropdowns ao clicar fora
    document.addEventListener('click', function(event) {
        const containers = document.querySelectorAll('.alerts-container');
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

// Sistema básico de alertas
function inicializarAlertasBasico() {
    console.log('🔔 Inicializando alertas básicos...');
    
    // Inicializar contadores zerados
    const contadores = [
        { id: 'observadorAlertCount', valor: 0 },
        { id: 'responsavelAlertCount', valor: 0 }
    ];
    
    contadores.forEach(contador => {
        const elemento = document.getElementById(contador.id);
        if (elemento) {
            elemento.textContent = contador.valor;
            elemento.style.display = 'none';
        }
    });
}

// ===== FUNÇÕES DOS BOTÕES DO CABEÇALHO =====

// Função para abrir alertas de observador
function abrirAlertasObservador() {
    console.log('🔔 Abrindo alertas de observador...');
    
    const container = document.getElementById('observadorAlertsContainer');
    if (!container) return;
    
    // Fechar outros dropdowns
    document.querySelectorAll('.alerts-container.show').forEach(other => {
        if (other !== container) other.classList.remove('show');
    });
    
    // Alternar este dropdown
    container.classList.toggle('show');
    
    // Mostrar conteúdo de exemplo
    const alertList = document.getElementById('observadorAlertList');
    if (alertList) {
        alertList.innerHTML = `
            <div class="alert-item unread">
                <div class="alert-item-header">
                    <div class="alert-item-title">
                        <i class="fas fa-eye"></i>
                        Sistema de Alertas Funcionando
                    </div>
                    <div class="alert-item-time">Agora mesmo</div>
                </div>
                <div class="alert-item-body">
                    Esta é uma demonstração do sistema de alertas na página teste.
                </div>
                <div class="alert-actions">
                    <button class="btn-mark-read" onclick="this.closest('.alerts-container').classList.remove('show')">
                        <i class="fas fa-check-circle"></i> Fechar
                    </button>
                </div>
            </div>
        `;
    }
}

// Função para abrir alertas de responsável
function abrirAlertasResponsavel() {
    console.log('🔔 Abrindo alertas de responsável...');
    
    const container = document.getElementById('responsavelAlertsContainer');
    if (!container) return;
    
    // Fechar outros dropdowns
    document.querySelectorAll('.alerts-container.show').forEach(other => {
        if (other !== container) other.classList.remove('show');
    });
    
    // Alternar este dropdown
    container.classList.toggle('show');
    
    // Mostrar conteúdo de exemplo
    const alertList = document.getElementById('responsavelAlertList');
    if (alertList) {
        alertList.innerHTML = `
            <div class="alert-item unread">
                <div class="alert-item-header">
                    <div class="alert-item-title">
                        <i class="fas fa-bell"></i>
                        Tarefas Pendentes
                    </div>
                    <div class="alert-item-time">5 min atrás</div>
                </div>
                <div class="alert-item-body">
                    Você tem atividades pendentes de revisão.
                </div>
                <div class="alert-actions">
                    <button class="btn-go-to-activity" onclick="window.location.href='index.html'">
                        <i class="fas fa-external-link-alt"></i> Ver na Home
                    </button>
                </div>
            </div>
        `;
    }
}

// Função logout
function logout() {
    console.log('🚪 Fazendo logout...');
    
    if (confirm('Deseja realmente sair?')) {
        localStorage.removeItem('usuarioLogado');
        window.location.href = 'login.html';
    }
}

// Função para mostrar usuário logado
function mostrarUsuario() {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    if (usuarioLogado) {
        const info = `
            INFORMAÇÕES DO USUÁRIO:
            
            👤 Nome: ${usuarioLogado.nome || 'Não informado'}
            🔑 Usuário: ${usuarioLogado.usuario}
            📧 Email: ${usuarioLogado.email || 'Não informado'}
            👥 Grupos: ${usuarioLogado.grupos ? usuarioLogado.grupos.join(', ') : 'Nenhum'}
        `;
        
        alert(info);
    } else {
        alert('Nenhum usuário logado!');
    }
}

// Exportar funções para uso no HTML
window.abrirAlertasObservador = abrirAlertasObservador;
window.abrirAlertasResponsavel = abrirAlertasResponsavel;
window.logout = logout;
window.mostrarUsuario = mostrarUsuario;

console.log('✅ teste.js - Todas funções prontas');
