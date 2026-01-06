// teste.js - Sistema completo para página teste (VERSÃO CORRIGIDA)

console.log('🚀 teste.js - Sistema inicializando...');

// Estado local (não conflita com script.js)
const estadoTeste = {
    usuario: null,
    alertasTesteObservador: [],
    alertasTesteResponsavel: [],
    paginaCarregada: false
};

// Inicialização principal
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 DOM carregado - Iniciando página teste');
    
    // 1. Verificar autenticação do usuário
    verificarAutenticacao();
    
    // 2. Configurar eventos da página
    configurarEventosPagina();
    
    // 3. Inicializar sistema de alertas
    inicializarSistemaAlertas();
    
    // 4. Mostrar conteúdo da página APÓS 1 segundo
    setTimeout(() => {
        mostrarConteudoPagina();
    }, 1000);
});

// Verificar autenticação do usuário
function verificarAutenticacao() {
    const usuarioData = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    if (!usuarioData) {
        console.log('❌ Usuário não autenticado');
        mostrarErro('Usuário não logado. Redirecionando para login...');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    estadoTeste.usuario = usuarioData;
    console.log('✅ Usuário autenticado:', usuarioData.nome);
    
    // Atualizar interface com dados do usuário
    atualizarInterfaceUsuario();
}

// Atualizar interface com dados do usuário
function atualizarInterfaceUsuario() {
    if (!estadoTeste.usuario) return;
    
    // Atualizar nome no cabeçalho
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = estadoTeste.usuario.nome;
    }
    
    // Atualizar nome no conteúdo
    const displayUserElement = document.getElementById('displayUserName');
    if (displayUserElement) {
        displayUserElement.textContent = estadoTeste.usuario.nome || estadoTeste.usuario.usuario;
    }
    
    atualizarStatusSistema(`Usuário: ${estadoTeste.usuario.usuario}`);
}

// Configurar eventos da página
function configurarEventosPagina() {
    console.log('🔧 Configurando eventos da página...');
    
    // Configurar fechamento de dropdowns ao clicar fora
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

// Inicializar sistema de alertas
function inicializarSistemaAlertas() {
    console.log('🔔 Inicializando sistema de alertas local...');
    
    // Resetar contadores
    resetarContadoresAlertas();
    
    // Criar alertas de exemplo
    criarAlertasExemplo();
}

// Resetar contadores de alertas
function resetarContadoresAlertas() {
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

// Criar alertas de exemplo
function criarAlertasExemplo() {
    estadoTeste.alertasTesteObservador = [
        {
            id: 'exemplo_1',
            titulo: 'Sistema de Teste Carregado',
            descricao: 'A página teste foi carregada com sucesso',
            data: new Date(),
            tipo: 'success'
        }
    ];
    
    estadoTeste.alertasTesteResponsavel = [
        {
            id: 'exemplo_2',
            titulo: 'Demonstração de Funcionalidades',
            descricao: 'Clique nos sinos para testar o sistema de alertas',
            data: new Date(),
            tipo: 'info'
        }
    ];
}

// Mostrar conteúdo da página
function mostrarConteudoPagina() {
    console.log('🖥️ Mostrando conteúdo da página...');
    
    const loading = document.getElementById('loadingScreen');
    const content = document.getElementById('mainContent');
    
    if (loading) {
        loading.style.display = 'none';
        console.log('✅ Tela de loading ocultada');
    }
    
    if (content) {
        content.style.display = 'block';
        console.log('✅ Conteúdo principal exibido');
    }
    
    estadoTeste.paginaCarregada = true;
    atualizarStatusSistema('Página carregada com sucesso');
    
    // Adicionar evento para botões
    configurarBotoesTeste();
}

// Configurar botões de teste
function configurarBotoesTeste() {
    const botoes = document.querySelectorAll('.btn-teste');
    botoes.forEach((botao, index) => {
        botao.addEventListener('click', function() {
            console.log(`🔘 Botão clicado: ${this.textContent.trim()}`);
        });
    });
}

// ===== FUNÇÕES DO CABEÇALHO =====

// Abrir alertas de observador
function abrirAlertasObservadorTeste() {
    console.log('👁️ Abrindo alertas de observador...');
    
    const container = document.getElementById('observadorAlertsContainer');
    if (!container) {
        console.error('❌ Container não encontrado');
        return;
    }
    
    // Fechar outros dropdowns
    document.querySelectorAll('.alerts-container.show').forEach(other => {
        if (other !== container) other.classList.remove('show');
    });
    
    // Alternar visibilidade
    container.classList.toggle('show');
    
    // Usar sistema local
    mostrarAlertasLocais('observador', estadoTeste.alertasTesteObservador);
}

// Abrir alertas de responsável
function abrirAlertasResponsavelTeste() {
    console.log('🔔 Abrindo alertas de responsável...');
    
    const container = document.getElementById('responsavelAlertsContainer');
    if (!container) {
        console.error('❌ Container não encontrado');
        return;
    }
    
    // Fechar outros dropdowns
    document.querySelectorAll('.alerts-container.show').forEach(other => {
        if (other !== container) other.classList.remove('show');
    });
    
    // Alternar visibilidade
    container.classList.toggle('show');
    
    // Usar sistema local
    mostrarAlertasLocais('responsavel', estadoTeste.alertasTesteResponsavel);
}

// Mostrar alertas locais
function mostrarAlertasLocais(tipo, alertas) {
    const containerId = tipo === 'observador' ? 'observadorAlertsContainer' : 'responsavelAlertsContainer';
    const container = document.getElementById(containerId);
    
    if (!container) return;
    
    // Verificar se dropdown existe
    let dropdown = container.querySelector('.alert-dropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'alert-dropdown';
        dropdown.innerHTML = `
            <div class="alert-dropdown-header">
                <h4><i class="fas fa-${tipo === 'observador' ? 'eye' : 'bell'}"></i>
                    ${tipo === 'observador' ? 'Alertas de Observador' : 'Alertas Pendentes'}
                </h4>
            </div>
            <div class="alert-dropdown-content" id="${tipo}AlertListLocal">
                <div class="no-alerts">Carregando...</div>
            </div>
        `;
        container.appendChild(dropdown);
    }
    
    // Mostrar alertas
    const content = dropdown.querySelector('.alert-dropdown-content');
    if (content) {
        if (alertas.length === 0) {
            content.innerHTML = '<div class="no-alerts">Nenhum alerta</div>';
        } else {
            const alertasHTML = alertas.map(alerta => `
                <div class="alert-item">
                    <div class="alert-item-header">
                        <div class="alert-item-title">
                            <i class="fas fa-${getIconTipo(alerta.tipo)}"></i>
                            ${alerta.titulo}
                        </div>
                        <div class="alert-item-time">${formatarTempoAtras(alerta.data)}</div>
                    </div>
                    <div class="alert-item-body">${alerta.descricao}</div>
                </div>
            `).join('');
            
            content.innerHTML = alertasHTML;
        }
    }
}

// Logout
function logoutTeste() {
    console.log('🚪 Executando logout...');
    
    if (confirm('Deseja realmente sair do sistema?')) {
        localStorage.removeItem('usuarioLogado');
        window.location.href = 'login.html';
    }
}

// ===== FUNÇÕES DA PÁGINA TESTE =====

// Mostrar informações do usuário
function mostrarInfoUsuario() {
    if (!estadoTeste.usuario) {
        alert('Nenhum usuário logado!');
        return;
    }
    
    const info = `
        📋 INFORMAÇÕES DO USUÁRIO
        
        👤 Nome: ${estadoTeste.usuario.nome || 'Não informado'}
        🔑 Usuário: ${estadoTeste.usuario.usuario}
        📧 Email: ${estadoTeste.usuario.email || 'Não informado'}
        👥 Grupos: ${estadoTeste.usuario.grupos ? estadoTeste.usuario.grupos.length : 0}
        
        📍 Página: Teste
    `;
    
    alert(info);
    atualizarStatusSistema('Informações exibidas');
}

// Atualizar usuário
function atualizarUsuario() {
    const usuarioData = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    if (usuarioData) {
        estadoTeste.usuario = usuarioData;
        atualizarInterfaceUsuario();
        atualizarStatusSistema('Usuário atualizado');
        alert('✅ Usuário atualizado com sucesso!');
    } else {
        alert('❌ Usuário não encontrado no sistema!');
    }
}

// Verificar status do sistema
function verificarStatusSistema() {
    const status = {
        usuario: !!estadoTeste.usuario,
        localStorage: !!localStorage.getItem('usuarioLogado'),
        paginaCarregada: estadoTeste.paginaCarregada,
        alertasObservador: estadoTeste.alertasTesteObservador.length,
        alertasResponsavel: estadoTeste.alertasTesteResponsavel.length,
        timestamp: new Date().toLocaleTimeString()
    };
    
    const statusHTML = `
        <div class="status-detalhado">
            <h4><i class="fas fa-clipboard-check"></i> Status Detalhado</h4>
            <div class="status-lista">
                <div><i class="fas fa-user"></i> <strong>Usuário:</strong> ${status.usuario ? '✅ Logado' : '❌ Não logado'}</div>
                <div><i class="fas fa-database"></i> <strong>LocalStorage:</strong> ${status.localStorage ? '✅ OK' : '❌ Vazio'}</div>
                <div><i class="fas fa-check-circle"></i> <strong>Página:</strong> ${status.paginaCarregada ? '✅ Carregada' : '❌ Não carregada'}</div>
                <div><i class="fas fa-eye"></i> <strong>Alertas Observador:</strong> ${status.alertasObservador}</div>
                <div><i class="fas fa-bell"></i> <strong>Alertas Responsável:</strong> ${status.alertasResponsavel}</div>
                <div><i class="fas fa-clock"></i> <strong>Verificado em:</strong> ${status.timestamp}</div>
            </div>
        </div>
    `;
    
    const statusElement = document.getElementById('statusSistema');
    if (statusElement) {
        statusElement.innerHTML = statusHTML;
    }
    
    alert(`✅ Status verificado:\n- Usuário: ${status.usuario ? 'OK' : 'FALHA'}\n- Página: ${status.paginaCarregada ? 'OK' : 'FALHA'}`);
}

// Testar alertas
function testarAlertas() {
    const novoAlerta = {
        id: 'teste_' + Date.now(),
        titulo: 'Teste de Sistema Manual',
        descricao: 'Este alerta foi gerado pelo botão de teste',
        data: new Date(),
        tipo: 'info'
    };
    
    estadoTeste.alertasTesteObservador.unshift(novoAlerta);
    
    // Atualizar contador
    const contador = document.getElementById('observadorAlertCount');
    if (contador) {
        contador.textContent = estadoTeste.alertasTesteObservador.length;
        contador.style.display = 'flex';
    }
    
    atualizarStatusSistema('Alerta de teste adicionado');
    alert('✅ Alerta de teste adicionado!\nClique no sino de observador para visualizar.');
}

// Atualizar status na página
function atualizarStatusSistema(mensagem) {
    const alertStatus = document.getElementById('alertStatus');
    if (alertStatus) {
        alertStatus.textContent = mensagem;
        alertStatus.className = 'status-indicator active';
        
        setTimeout(() => {
            alertStatus.className = 'status-indicator';
        }, 3000);
    }
}

// Mostrar erro
function mostrarErro(mensagem) {
    console.error('❌ Erro:', mensagem);
    const statusElement = document.getElementById('statusSistema');
    if (statusElement) {
        statusElement.innerHTML = `
            <div class="status-error">
                <i class="fas fa-exclamation-triangle"></i> ${mensagem}
            </div>
        `;
    }
}

// ===== FUNÇÕES UTILITÁRIAS =====

// Formatar tempo atrás
function formatarTempoAtras(data) {
    const agora = new Date();
    const dataAlerta = new Date(data);
    const diferencaMinutos = Math.floor((agora - dataAlerta) / (1000 * 60));
    
    if (diferencaMinutos < 1) return 'Agora mesmo';
    if (diferencaMinutos < 60) return `${diferencaMinutos} min atrás`;
    
    const diferencaHoras = Math.floor(diferencaMinutos / 60);
    if (diferencaHoras < 24) return `${diferencaHoras} h atrás`;
    
    const diferencaDias = Math.floor(diferencaHoras / 24);
    return `${diferencaDias} d atrás`;
}

// Obter ícone pelo tipo
function getIconTipo(tipo) {
    switch(tipo) {
        case 'success': return 'check-circle';
        case 'warning': return 'exclamation-triangle';
        case 'info': return 'info-circle';
        default: return 'info-circle';
    }
}

// Exportar funções para uso global
window.abrirAlertasObservadorTeste = abrirAlertasObservadorTeste;
window.abrirAlertasResponsavelTeste = abrirAlertasResponsavelTeste;
window.logoutTeste = logoutTeste;
window.mostrarInfoUsuario = mostrarInfoUsuario;
window.atualizarUsuario = atualizarUsuario;
window.verificarStatusSistema = verificarStatusSistema;
window.testarAlertas = testarAlertas;

console.log('✅ teste.js - Sistema carregado com sucesso');
