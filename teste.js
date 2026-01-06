// teste.js - Versão corrigida (sem declarações duplicadas)

console.log('🚀 teste.js - Inicializando sistema independente...');

// NÃO declare estas variáveis novamente - use as que já existem do script.js
// Se não existirem, criaremos apenas para esta página

// Inicialização principal
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 DOM carregado, iniciando página teste...');
    
    // 1. Inicializar página básica
    inicializarPaginaBasica();
    
    // 2. Verificar autenticação
    verificarEConfigurarUsuario();
    
    // 3. Configurar eventos
    configurarEventosPagina();
    
    // 4. Mostrar conteúdo
    mostrarConteudo();
    
    console.log('✅ Página teste inicializada com sucesso');
});

// Inicialização básica da página
function inicializarPaginaBasica() {
    console.log('⚙️ Configurando página básica...');
    
    // Configurar alertas básicos
    inicializarAlertasBasicos();
    
    // Configurar fechamento de dropdowns
    configurarFechamentoDropdowns();
    
    // Atualizar status inicial
    atualizarStatusSistema('Sistema inicializado');
}

// Verificar e configurar usuário
function verificarEConfigurarUsuario() {
    // Usar a variável do localStorage diretamente
    const usuarioData = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    if (!usuarioData) {
        console.log('❌ Usuário não logado');
        mostrarErro('Usuário não autenticado. Redirecionando...');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    console.log('✅ Usuário logado:', usuarioData.nome);
    
    // Atualizar interface
    atualizarInterfaceUsuario(usuarioData);
    
    // Tentar usar funções do script.js se disponíveis
    tentarUsarScriptJS();
}

// Atualizar interface do usuário
function atualizarInterfaceUsuario(usuario) {
    if (!usuario) return;
    
    // Atualizar nome no cabeçalho
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = usuario.nome;
    }
    
    // Atualizar nome no conteúdo
    const displayUserElement = document.getElementById('displayUserName');
    if (displayUserElement) {
        displayUserElement.textContent = usuario.nome || usuario.usuario;
    }
    
    // Atualizar status
    atualizarStatusSistema(`Usuário: ${usuario.usuario}`);
}

// Tentar usar funções do script.js se disponíveis
function tentarUsarScriptJS() {
    console.log('🔍 Verificando funções do script.js...');
    
    // Lista de funções que gostaríamos de usar do script.js
    const funcoesDesejadas = [
        'abrirAlertasObservador',
        'abrirAlertasResponsavel',
        'verificarAlertas',
        'atualizarContadoresAlertas',
        'logout'
    ];
    
    let funcoesDisponiveis = 0;
    
    funcoesDesejadas.forEach(funcao => {
        if (typeof window[funcao] === 'function') {
            console.log(`✅ ${funcao} disponível do script.js`);
            funcoesDisponiveis++;
        }
    });
    
    if (funcoesDisponiveis > 0) {
        console.log(`🎯 ${funcoesDisponiveis}/${funcoesDesejadas.length} funções disponíveis do script.js`);
        
        // Se verificarAlertas estiver disponível, usar
        if (typeof window.verificarAlertas === 'function') {
            setTimeout(() => {
                console.log('🔔 Usando verificarAlertas do script.js...');
                try {
                    window.verificarAlertas();
                } catch (error) {
                    console.error('Erro ao chamar verificarAlertas:', error);
                }
            }, 1500);
        }
    } else {
        console.log('ℹ️ Nenhuma função do script.js disponível, usando sistema local');
    }
}

// Configurar eventos da página
function configurarEventosPagina() {
    console.log('🔧 Configurando eventos da página...');
    
    // Configurar botões
    const botoes = document.querySelectorAll('.btn-teste');
    botoes.forEach((botao, index) => {
        botao.addEventListener('click', function() {
            console.log(`🔘 Botão ${index + 1} clicado: ${this.textContent.trim()}`);
        });
    });
}

// Mostrar conteúdo da página
function mostrarConteudo() {
    setTimeout(() => {
        const loading = document.getElementById('loadingScreen');
        const content = document.getElementById('mainContent');
        
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';
        
        console.log('✅ Conteúdo exibido');
        atualizarStatusSistema('Página carregada com sucesso');
    }, 800);
}

// ===== SISTEMA DE ALERTAS (LOCAL) =====

// Inicializar alertas básicos
function inicializarAlertasBasicos() {
    console.log('🔔 Inicializando sistema de alertas local...');
    
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
    
    // Criar alguns alertas de exemplo
    criarAlertasExemplo();
}

// Criar alertas de exemplo
function criarAlertasExemplo() {
    // Usar arrays locais apenas para esta página
    if (!window.alertasTesteObservador) {
        window.alertasTesteObservador = [
            {
                id: 'exemplo_1',
                titulo: 'Sistema de Teste Ativo',
                descricao: 'Página teste carregada com sucesso',
                data: new Date(),
                tipo: 'info'
            }
        ];
    }
    
    if (!window.alertasTesteResponsavel) {
        window.alertasTesteResponsavel = [
            {
                id: 'exemplo_2',
                titulo: 'Demonstração de Alertas',
                descricao: 'Clique nos sinos para testar',
                data: new Date(),
                tipo: 'info'
            }
        ];
    }
}

// Configurar fechamento de dropdowns
function configurarFechamentoDropdowns() {
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

// Função para abrir alertas de observador
function abrirAlertasObservadorTeste() {
    console.log('👁️ Abrindo alertas de observador...');
    
    const container = document.getElementById('observadorAlertsContainer');
    if (!container) return;
    
    // Fechar outros dropdowns
    document.querySelectorAll('.alerts-container.show').forEach(other => {
        if (other !== container) other.classList.remove('show');
    });
    
    // Alternar este dropdown
    container.classList.toggle('show');
    
    // Verificar se podemos usar a função do script.js
    if (typeof window.abrirAlertasObservador === 'function' && 
        window.abrirAlertasObservador !== abrirAlertasObservadorTeste) {
        console.log('🎯 Usando função real do script.js');
        try {
            window.abrirAlertasObservador();
            return;
        } catch (error) {
            console.error('Erro ao usar função do script.js:', error);
        }
    }
    
    // Usar sistema local
    mostrarAlertasLocais('observador');
}

// Função para abrir alertas de responsável
function abrirAlertasResponsavelTeste() {
    console.log('🔔 Abrindo alertas de responsável...');
    
    const container = document.getElementById('responsavelAlertsContainer');
    if (!container) return;
    
    // Fechar outros dropdowns
    document.querySelectorAll('.alerts-container.show').forEach(other => {
        if (other !== container) other.classList.remove('show');
    });
    
    // Alternar este dropdown
    container.classList.toggle('show');
    
    // Verificar se podemos usar a função do script.js
    if (typeof window.abrirAlertasResponsavel === 'function' && 
        window.abrirAlertasResponsavel !== abrirAlertasResponsavelTeste) {
        console.log('🎯 Usando função real do script.js');
        try {
            window.abrirAlertasResponsavel();
            return;
        } catch (error) {
            console.error('Erro ao usar função do script.js:', error);
        }
    }
    
    // Usar sistema local
    mostrarAlertasLocais('responsavel');
}

// Mostrar alertas locais
function mostrarAlertasLocais(tipo) {
    // Usar arrays locais específicos para teste
    const alertas = tipo === 'observador' 
        ? (window.alertasTesteObservador || [])
        : (window.alertasTesteResponsavel || []);
    
    const containerId = tipo === 'observador' ? 'observadorAlertsContainer' : 'responsavelAlertsContainer';
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Criar dropdown se não existir
    let dropdown = container.querySelector('.alert-dropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'alert-dropdown';
        dropdown.innerHTML = `
            <div class="alert-dropdown-header">
                <h4><i class="fas fa-${tipo === 'observador' ? 'eye' : 'bell'}"></i> 
                    ${tipo === 'observador' ? 'Alertas de Observador' : 'Alertas de Responsável'}
                </h4>
            </div>
            <div class="alert-dropdown-content" id="${tipo}AlertListLocal">
                <div class="no-alerts">Carregando...</div>
            </div>
        `;
        container.appendChild(dropdown);
    }
    
    // Mostrar alertas
    const alertList = document.getElementById(`${tipo}AlertListLocal`);
    if (alertList) {
        if (alertas.length === 0) {
            alertList.innerHTML = '<div class="no-alerts">Nenhum alerta</div>';
        } else {
            const alertasHTML = alertas.map(alerta => `
                <div class="alert-item">
                    <div class="alert-item-header">
                        <div class="alert-item-title">
                            <i class="fas fa-${alerta.tipo === 'info' ? 'info-circle' : 'exclamation-circle'}"></i>
                            ${alerta.titulo}
                        </div>
                        <div class="alert-item-time">${formatarTempoAtras(alerta.data)}</div>
                    </div>
                    <div class="alert-item-body">${alerta.descricao}</div>
                </div>
            `).join('');
            
            alertList.innerHTML = alertasHTML;
        }
    }
}

// Função logout
function logoutTeste() {
    console.log('🚪 Executando logout...');
    
    if (confirm('Deseja realmente sair do sistema?')) {
        // Tentar usar função do script.js se disponível
        if (typeof window.logout === 'function' && window.logout !== logoutTeste) {
            try {
                window.logout();
                return;
            } catch (error) {
                console.error('Erro ao usar logout do script.js:', error);
            }
        }
        
        // Logout local
        localStorage.removeItem('usuarioLogado');
        window.location.href = 'login.html';
    }
}

// ===== FUNÇÕES DA PÁGINA TESTE =====

// Mostrar informações do usuário
function mostrarInfoUsuario() {
    const usuarioData = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    if (!usuarioData) {
        alert('Nenhum usuário logado!');
        return;
    }
    
    const info = `
        👤 NOME: ${usuarioData.nome || 'Não informado'}
        🔑 USUÁRIO: ${usuarioData.usuario}
        📧 EMAIL: ${usuarioData.email || 'Não informado'}
        👥 GRUPOS: ${usuarioData.grupos ? usuarioData.grupos.length : 0}
        🔐 PERFIL: ${usuarioData.perfil || 'Padrão'}
        
        📍 PÁGINA: Teste (sistema independente)
    `;
    
    alert(info);
    atualizarStatusSistema('Informações exibidas');
}

// Atualizar usuário
function atualizarUsuario() {
    const usuarioData = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (usuarioData) {
        atualizarInterfaceUsuario(usuarioData);
        atualizarStatusSistema('Usuário atualizado');
    } else {
        alert('Usuário não encontrado!');
    }
}

// Verificar status do sistema
function verificarStatusSistema() {
    console.log('🔍 Verificando status do sistema...');
    
    // Coletar informações
    const usuarioData = JSON.parse(localStorage.getItem('usuarioLogado'));
    const info = {
        usuario: !!usuarioData,
        localStorage: !!localStorage.getItem('usuarioLogado'),
        scriptJS: typeof window.abrirAlertasObservador === 'function',
        alertasObservador: window.alertasTesteObservador ? window.alertasTesteObservador.length : 0,
        alertasResponsavel: window.alertasTesteResponsavel ? window.alertasTesteResponsavel.length : 0,
        timestamp: new Date().toLocaleTimeString()
    };
    
    // Atualizar na página
    const statusElement = document.getElementById('statusSistema');
    if (statusElement) {
        statusElement.innerHTML = `
            <div class="status-info">
                <h4><i class="fas fa-check-circle text-success"></i> Status do Sistema</h4>
                <ul>
                    <li><strong>Usuário:</strong> ${info.usuario ? '✅ Logado' : '❌ Não logado'}</li>
                    <li><strong>LocalStorage:</strong> ${info.localStorage ? '✅ OK' : '❌ Vazio'}</li>
                    <li><strong>Script.js:</strong> ${info.scriptJS ? '✅ Disponível' : '❌ Indisponível'}</li>
                    <li><strong>Alertas Observador:</strong> ${info.alertasObservador}</li>
                    <li><strong>Alertas Responsável:</strong> ${info.alertasResponsavel}</li>
                    <li><strong>Verificado em:</strong> ${info.timestamp}</li>
                </ul>
            </div>
        `;
    }
    
    // Também mostrar alerta
    alert(`Status verificado:\nUsuário: ${info.usuario ? 'OK' : 'FALHA'}\nScript.js: ${info.scriptJS ? 'OK' : 'FALHA'}`);
}

// Testar alertas
function testarAlertas() {
    console.log('🧪 Testando sistema de alertas...');
    
    // Inicializar arrays se não existirem
    if (!window.alertasTesteObservador) {
        window.alertasTesteObservador = [];
    }
    
    // Adicionar alerta de teste
    const novoAlerta = {
        id: 'teste_' + Date.now(),
        titulo: 'Teste de Sistema',
        descricao: 'Este é um alerta de teste gerado manualmente',
        data: new Date(),
        tipo: 'info'
    };
    
    window.alertasTesteObservador.unshift(novoAlerta);
    
    // Atualizar contador
    const contador = document.getElementById('observadorAlertCount');
    if (contador) {
        contador.textContent = window.alertasTesteObservador.length;
        contador.style.display = 'flex';
    }
    
    atualizarStatusSistema('Alerta de teste adicionado');
    alert('✅ Alerta de teste adicionado!\nClique no sino de observador para ver.');
}

// Atualizar status na página
function atualizarStatusSistema(mensagem) {
    const alertStatus = document.getElementById('alertStatus');
    if (alertStatus) {
        alertStatus.textContent = mensagem;
        alertStatus.className = 'status-indicator active';
        
        // Resetar após 3 segundos
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

// Exportar funções para uso global
// Usar nomes diferentes para não conflitar com script.js
window.abrirAlertasObservadorTeste = abrirAlertasObservadorTeste;
window.abrirAlertasResponsavelTeste = abrirAlertasResponsavelTeste;
window.logoutTeste = logoutTeste;
window.mostrarInfoUsuario = mostrarInfoUsuario;
window.atualizarUsuario = atualizarUsuario;
window.verificarStatusSistema = verificarStatusSistema;
window.testarAlertas = testarAlertas;

console.log('✅ teste.js - Todas funções carregadas e prontas');
