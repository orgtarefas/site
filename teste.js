// teste.js - Configuração específica da página teste
// Todas as funções do cabeçalho já estão disponíveis via script.js

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 teste.js - Iniciando página de teste...');
    
    // 1. Verificar se script.js carregou corretamente
    verificarScriptJS();
    
    // 2. Inicializar página teste
    inicializarPaginaTeste();
});

// Verificar se script.js carregou corretamente
function verificarScriptJS() {
    console.log('🔍 Verificando funções do script.js...');
    
    // Lista de funções essenciais que devem estar disponíveis
    const funcoesEssenciais = [
        'abrirAlertasObservador',
        'abrirAlertasResponsavel',
        'logout',
        'verificarAlertas',
        'atualizarContadoresAlertas'
    ];
    
    let todasDisponiveis = true;
    
    funcoesEssenciais.forEach(funcao => {
        if (typeof window[funcao] !== 'function') {
            console.error(`❌ ${funcao} não está disponível`);
            todasDisponiveis = false;
        }
    });
    
    if (todasDisponiveis) {
        console.log('✅ Todas funções do script.js disponíveis');
        return true;
    } else {
        console.error('❌ script.js não carregou corretamente');
        mostrarErro('Erro ao carregar sistema. Recarregue a página.');
        return false;
    }
}

// Inicializar página teste
function inicializarPaginaTeste() {
    console.log('⚙️ Inicializando página teste...');
    
    // 1. Verificar autenticação
    const usuarioLogado = verificarAutenticacao();
    if (!usuarioLogado) return;
    
    // 2. Atualizar interface com dados do usuário
    atualizarInterfaceUsuario(usuarioLogado);
    
    // 3. Configurar eventos específicos da página
    configurarEventosTeste();
    
    // 4. Iniciar verificação de alertas
    iniciarVerificacaoAlertas();
    
    // 5. Mostrar conteúdo da página
    mostrarConteudoPagina();
    
    console.log('✅ Página teste inicializada');
}

// Verificar autenticação
function verificarAutenticacao() {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    if (!usuarioLogado) {
        console.log('❌ Usuário não logado, redirecionando...');
        window.location.href = 'login.html';
        return null;
    }
    
    console.log('👤 Usuário logado:', usuarioLogado.nome);
    return usuarioLogado;
}

// Atualizar interface com dados do usuário
function atualizarInterfaceUsuario(usuarioLogado) {
    // Atualizar nome no cabeçalho (o script.js já faz isso, mas garantimos)
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = usuarioLogado.nome;
    }
    
    // Atualizar nome no conteúdo da página
    const displayUserElement = document.getElementById('displayUserName');
    if (displayUserElement) {
        displayUserElement.textContent = usuarioLogado.nome || usuarioLogado.usuario;
    }
    
    // Atualizar status do sistema
    atualizarStatusSistema('Sistema carregado com sucesso');
}

// Configurar eventos específicos da página teste
function configurarEventosTeste() {
    console.log('🔧 Configurando eventos da página teste...');
    
    // Configurar botão de informações do usuário
    const btnInfoUsuario = document.querySelector('.btn-teste');
    if (btnInfoUsuario && btnInfoUsuario.onclick) {
        // Se já tem onclick no HTML, não sobrescrever
        console.log('✅ Botão de informações já configurado no HTML');
    }
    
    // Configurar botão de verificar status
    const btnStatus = document.querySelectorAll('.btn-teste')[1];
    if (btnStatus) {
        btnStatus.addEventListener('click', verificarStatusCompleto);
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
    
    console.log('✅ Eventos configurados');
}

// Iniciar verificação de alertas
function iniciarVerificacaoAlertas() {
    console.log('🔔 Iniciando verificação de alertas...');
    
    // Usar a função verificarAlertas do script.js
    if (typeof window.verificarAlertas === 'function') {
        // Aguardar 2 segundos para o Firebase inicializar completamente
        setTimeout(() => {
            console.log('📊 Verificando alertas...');
            window.verificarAlertas();
            
            // Atualizar contadores
            if (typeof window.atualizarContadoresAlertas === 'function') {
                window.atualizarContadoresAlertas();
            }
        }, 2000);
    }
}

// Mostrar conteúdo da página
function mostrarConteudoPagina() {
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        const mainContent = document.getElementById('mainContent');
        
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        
        if (mainContent) {
            mainContent.style.display = 'block';
        }
        
        console.log('✅ Conteúdo da página exibido');
    }, 1000);
}

// ===== FUNÇÕES ESPECÍFICAS DA PÁGINA TESTE =====

// Função para mostrar informações do usuário
function mostrarInfoUsuario() {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    if (!usuarioLogado) {
        alert('Usuário não está logado!');
        return;
    }
    
    const mensagem = `
        📋 INFORMAÇÕES DO USUÁRIO:
        
        👤 Nome: ${usuarioLogado.nome || 'Não informado'}
        🔑 Usuário: ${usuarioLogado.usuario}
        📧 Email: ${usuarioLogado.email || 'Não informado'}
        👥 Grupos: ${usuarioLogado.grupos ? usuarioLogado.grupos.length : 0}
        🔐 Perfil: ${usuarioLogado.perfil || 'Padrão'}
        
        ✅ Página usando funções do script.js
    `;
    
    alert(mensagem);
    
    // Mostrar também na página
    atualizarStatusSistema(`Informações carregadas: ${usuarioLogado.usuario}`);
}

// Função para verificar status completo
function verificarStatusCompleto() {
    console.log('🔍 Verificando status completo...');
    
    // Verificar localStorage
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    const temUsuario = !!usuarioLogado;
    
    // Verificar funções do script.js
    const funcoesDisponiveis = typeof window.abrirAlertasObservador === 'function' &&
                               typeof window.abrirAlertasResponsavel === 'function' &&
                               typeof window.logout === 'function';
    
    // Verificar elementos da página
    const elementosExistentes = {
        'Cabeçalho': !!document.querySelector('.home-header'),
        'Sinos de Alerta': !!document.querySelector('.alert-bells-container'),
        'Conteúdo': !!document.querySelector('.content-area')
    };
    
    // Montar mensagem de status
    let statusHTML = `
        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 4px solid #27ae60; margin-top: 10px;">
            <h4 style="margin: 0 0 10px 0; color: #27ae60;">
                <i class="fas fa-check-circle"></i> Status do Sistema
            </h4>
            <div style="font-size: 14px; line-height: 1.6;">
                <div><strong>Usuário:</strong> ${temUsuario ? '✅ Logado' : '❌ Não logado'}</div>
                <div><strong>Funções script.js:</strong> ${funcoesDisponiveis ? '✅ Disponíveis' : '❌ Indisponíveis'}</div>
                <div><strong>Elementos da página:</strong></div>
    `;
    
    Object.keys(elementosExistentes).forEach(elemento => {
        statusHTML += `<div style="margin-left: 20px;">${elemento}: ${elementosExistentes[elemento] ? '✅' : '❌'}</div>`;
    });
    
    statusHTML += `
                <div style="margin-top: 10px; font-size: 12px; color: #666;">
                    <i class="fas fa-clock"></i> Verificado em: ${new Date().toLocaleTimeString()}
                </div>
            </div>
        </div>
    `;
    
    // Atualizar na página
    const statusElement = document.getElementById('statusSistema');
    if (statusElement) {
        statusElement.innerHTML = statusHTML;
    }
    
    // Mostrar alerta também
    alert('Status verificado com sucesso!\nVerifique os detalhes na página.');
}

// Função auxiliar para atualizar status na página
function atualizarStatusSistema(mensagem) {
    const statusElement = document.getElementById('statusSistema');
    if (statusElement) {
        statusElement.innerHTML = `
            <div style="background: #e3f2fd; padding: 10px 15px; border-radius: 6px; border-left: 4px solid #1976d2;">
                <i class="fas fa-info-circle"></i> ${mensagem}
            </div>
        `;
    }
}

// Função para mostrar erro
function mostrarErro(mensagem) {
    const loadingText = document.getElementById('loadingText');
    if (loadingText) {
        loadingText.innerHTML = `
            <div style="color: #e74c3c;">
                <i class="fas fa-exclamation-triangle"></i> ${mensagem}
            </div>
            <button onclick="window.location.reload()" style="
                margin-top: 10px;
                padding: 8px 16px;
                background: #e74c3c;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            ">
                <i class="fas fa-sync-alt"></i> Tentar Novamente
            </button>
        `;
    }
}

// Função para verificar status (chamada pelo botão)
function verificarStatus() {
    verificarStatusCompleto();
}

// As funções abrirAlertasObservador(), abrirAlertasResponsavel() e logout()
// já estão disponíveis globalmente via script.js
// NÃO precisamos recriá-las aqui!

console.log('✅ teste.js carregado');
