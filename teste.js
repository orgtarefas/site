// teste.js - Configuração específica da página teste

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 teste.js - Iniciando página de teste...');
    
    // 1. Verificar autenticação
    const usuarioLogado = verificarAutenticacao();
    if (!usuarioLogado) return;
    
    // 2. Inicializar página
    inicializarPaginaTeste(usuarioLogado);
});

// Função para verificar autenticação
function verificarAutenticacao() {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    if (!usuarioLogado) {
        console.log('❌ Usuário não logado, redirecionando para login...');
        window.location.href = 'login.html';
        return null;
    }
    
    console.log('✅ Usuário logado:', usuarioLogado.nome);
    return usuarioLogado;
}

// Função para inicializar a página
function inicializarPaginaTeste(usuarioLogado) {
    console.log('⚙️ Inicializando página teste...');
    
    // Atualizar nome do usuário apenas se o elemento existir
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = usuarioLogado.nome;
    }
    
    // Atualizar displayUserName apenas se o elemento existir
    const displayUserElement = document.getElementById('displayUserName');
    if (displayUserElement) {
        displayUserElement.textContent = usuarioLogado.nome || usuarioLogado.usuario;
    }
    
    // Configurar eventos
    configurarEventosTeste();
    
    // Mostrar conteúdo após breve delay
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        const mainContent = document.getElementById('mainContent');
        
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';
        
        console.log('✅ Página teste carregada');
    }, 800);
}

// Configurar eventos da página
function configurarEventosTeste() {
    console.log('🔧 Configurando eventos da página teste...');
    
    // Configurar botão de informações do usuário
    const btnInfoUsuario = document.querySelector('.btn-teste');
    if (btnInfoUsuario) {
        btnInfoUsuario.addEventListener('click', mostrarInfoUsuario);
    }
    
    // Configurar fechamento de dropdowns ao clicar fora
    document.addEventListener('click', function(event) {
        const containers = document.querySelectorAll('.alerts-container.show');
        let cliqueDentroAlerta = false;
        
        containers.forEach(container => {
            if (container.contains(event.target)) {
                cliqueDentroAlerta = true;
            }
        });
        
        if (!cliqueDentroAlerta) {
            containers.forEach(container => {
                container.classList.remove('show');
            });
        }
    });
    
    // Verificar se funções do script.js estão disponíveis
    verificarDisponibilidadeFuncoes();
}

// Verificar se funções do script.js estão disponíveis
function verificarDisponibilidadeFuncoes() {
    const funcoesNecessarias = [
        'abrirAlertasObservador',
        'abrirAlertasResponsavel', 
        'verificarAlertas',
        'logout'
    ];
    
    let todasDisponiveis = true;
    
    funcoesNecessarias.forEach(funcao => {
        if (typeof window[funcao] !== 'function') {
            console.warn(`⚠️ Função ${funcao} não está disponível`);
            todasDisponiveis = false;
        }
    });
    
    if (todasDisponiveis) {
        console.log('✅ Todas funções do script.js disponíveis');
        
        // Iniciar verificação periódica de alertas
        setTimeout(() => {
            if (typeof window.verificarAlertas === 'function') {
                window.verificarAlertas();
            }
        }, 2000);
    } else {
        console.log('⚠️ Algumas funções não estão disponíveis, usando fallback');
        inicializarFallbackAlertas();
    }
}

// Sistema fallback para alertas
function inicializarFallbackAlertas() {
    console.log('🔄 Inicializando sistema fallback de alertas');
    
    // Configurar contadores zerados
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

// Função para mostrar informações do usuário
function mostrarInfoUsuario() {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    if (!usuarioLogado) {
        alert('Usuário não está logado!');
        return;
    }
    
    const mensagem = `
        👤 Nome: ${usuarioLogado.nome || 'Não informado'}
        🔑 Usuário: ${usuarioLogado.usuario}
        📧 Email: ${usuarioLogado.email || 'Não informado'}
        👥 Grupos: ${usuarioLogado.grupos ? usuarioLogado.grupos.length : 0}
        
        ℹ️ Dados armazenados no localStorage.
    `;
    
    // Criar ou atualizar mensagem na página
    const card = document.querySelector('.teste-card:nth-child(2)');
    if (card) {
        // Remover mensagem anterior se existir
        const mensagemAnterior = card.querySelector('.user-info-message');
        if (mensagemAnterior) {
            mensagemAnterior.remove();
        }
        
        // Criar nova mensagem
        const infoDiv = document.createElement('div');
        infoDiv.className = 'user-info-message';
        infoDiv.innerHTML = `
            <div style="
                background: #e3f2fd;
                border-left: 4px solid #1976d2;
                padding: 12px 15px;
                border-radius: 6px;
                margin-top: 15px;
                font-size: 14px;
                line-height: 1.5;
            ">
                <div style="font-weight: 600; color: #1976d2; margin-bottom: 5px;">
                    <i class="fas fa-user-circle"></i> Informações do Usuário
                </div>
                <div style="color: #333;">
                    <strong>Usuário:</strong> ${usuarioLogado.usuario}<br>
                    <strong>Grupos:</strong> ${usuarioLogado.grupos ? usuarioLogado.grupos.length : 0}
                </div>
            </div>
        `;
        
        card.appendChild(infoDiv);
        
        // Remover após 5 segundos
        setTimeout(() => {
            if (infoDiv.parentElement) {
                infoDiv.remove();
            }
        }, 5000);
    }
}

console.log('✅ teste.js carregado');
