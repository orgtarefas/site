// teste.js - Configuração específica da página teste
// Usa todas as funções do script.js que já estão carregadas

// Inicialização da página teste
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 teste.js - Iniciando página de teste...');
    
    // 1. Verificar autenticação
    verificarAutenticacao();
    
    // 2. Configurar eventos específicos da página teste
    configurarPaginaTeste();
    
    // 3. Inicializar sistema de alertas (usando funções do script.js)
    inicializarAlertasTeste();
});

// Função para verificar autenticação
function verificarAutenticacao() {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    if (!usuarioLogado) {
        console.log('❌ Usuário não logado, redirecionando para login...');
        window.location.href = 'login.html';
        return;
    }
    
    console.log('✅ Usuário logado:', usuarioLogado.nome);
    
    // Atualizar nome do usuário na interface
    document.getElementById('userName').textContent = usuarioLogado.nome;
    document.getElementById('displayUserName').textContent = usuarioLogado.nome || usuarioLogado.usuario;
    
    // Se tiver grupos, mostrar também
    if (usuarioLogado.grupos && usuarioLogado.grupos.length > 0) {
        console.log('👥 Grupos do usuário:', usuarioLogado.grupos);
    }
}

// Função para configurar a página teste
function configurarPaginaTeste() {
    console.log('⚙️ Configurando eventos da página teste...');
    
    // Exemplo: Adicionar evento ao botão de teste
    const botaoTeste = document.querySelector('.btn-teste');
    if (botaoTeste) {
        botaoTeste.addEventListener('click', mostrarInfoUsuario);
    }
    
    // Configurar fechamento de dropdowns ao clicar fora
    document.addEventListener('click', function(event) {
        const containers = document.querySelectorAll('.alerts-container');
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
    
    // Mostrar conteúdo principal após 1 segundo
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        console.log('✅ Conteúdo da página teste exibido');
    }, 1000);
}

// Função para inicializar sistema de alertas na página teste
function inicializarAlertasTeste() {
    console.log('🔔 Inicializando sistema de alertas para página teste...');
    
    // Verificar se as funções do script.js estão disponíveis
    if (typeof window.verificarAlertas === 'function') {
        console.log('✅ Funções de alerta disponíveis do script.js');
        
        // Aguardar um pouco e verificar alertas
        setTimeout(() => {
            const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
            if (usuarioLogado) {
                console.log('🔍 Verificando alertas para:', usuarioLogado.usuario);
                window.verificarAlertas();
            }
        }, 2000);
    } else {
        console.log('⚠️ Funções de alerta não disponíveis, usando sistema básico');
        inicializarAlertasBasico();
    }
    
    // Verificar alertas periodicamente (a cada 30 segundos)
    setInterval(() => {
        if (typeof window.verificarAlertas === 'function') {
            window.verificarAlertas();
        }
    }, 30000);
}

// Sistema básico de alertas (fallback)
function inicializarAlertasBasico() {
    console.log('🔄 Usando sistema básico de alertas');
    
    // Inicializar contadores como zero
    const observadorCountEl = document.getElementById('observadorAlertCount');
    const responsavelCountEl = document.getElementById('responsavelAlertCount');
    
    if (observadorCountEl) {
        observadorCountEl.textContent = '0';
        observadorCountEl.style.display = 'none';
    }
    
    if (responsavelCountEl) {
        responsavelCountEl.textContent = '0';
        responsavelCountEl.style.display = 'none';
    }
}

// Função de exemplo para mostrar informações do usuário
function mostrarInfoUsuario() {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    if (!usuarioLogado) {
        alert('Usuário não está logado!');
        return;
    }
    
    const info = `
        📋 INFORMAÇÕES DO USUÁRIO:
        
        👤 Nome: ${usuarioLogado.nome || 'Não informado'}
        🔑 Usuário: ${usuarioLogado.usuario}
        📧 Email: ${usuarioLogado.email || 'Não informado'}
        👥 Grupos: ${usuarioLogado.grupos ? usuarioLogado.grupos.join(', ') : 'Nenhum grupo'}
        🔐 Perfil: ${usuarioLogado.perfil || 'Padrão'}
        
        ℹ️ Estas informações estão armazenadas no localStorage.
    `;
    
    alert(info);
    
    // Alternativa: mostrar em um card na página
    const card = document.querySelector('.teste-card:nth-child(2)');
    if (card) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'status-message info';
        infoDiv.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <div>
                <strong>Informações do Usuário:</strong><br>
                Usuário: ${usuarioLogado.usuario}<br>
                Grupos: ${usuarioLogado.grupos ? usuarioLogado.grupos.length : 0}
            </div>
        `;
        
        // Remover mensagem anterior se existir
        const mensagemAnterior = card.querySelector('.status-message');
        if (mensagemAnterior) {
            mensagemAnterior.remove();
        }
        
        card.appendChild(infoDiv);
        
        // Remover após 5 segundos
        setTimeout(() => {
            if (infoDiv.parentElement) {
                infoDiv.remove();
            }
        }, 5000);
    }
}

// Funções que redirecionam para as funções do script.js (se existirem)
function abrirAlertasObservador() {
    console.log('📞 Chamando abrirAlertasObservador...');
    
    if (typeof window.abrirAlertasObservador === 'function') {
        window.abrirAlertasObservador();
    } else {
        console.warn('⚠️ Função abrirAlertasObservador não encontrada, mostrando exemplo');
        mostrarAlertaExemplo('observador');
    }
}

function abrirAlertasResponsavel() {
    console.log('📞 Chamando abrirAlertasResponsavel...');
    
    if (typeof window.abrirAlertasResponsavel === 'function') {
        window.abrirAlertasResponsavel();
    } else {
        console.warn('⚠️ Função abrirAlertasResponsavel não encontrada, mostrando exemplo');
        mostrarAlertaExemplo('responsavel');
    }
}

function logout() {
    console.log('📞 Chamando logout...');
    
    if (typeof window.logout === 'function') {
        window.logout();
    } else {
        console.warn('⚠️ Função logout não encontrada, usando implementação local');
        localStorage.removeItem('usuarioLogado');
        window.location.href = 'login.html';
    }
}

// Função para mostrar alerta de exemplo (fallback)
function mostrarAlertaExemplo(tipo) {
    const containerId = tipo === 'observador' ? 'observadorAlertsContainer' : 'responsavelAlertsContainer';
    const container = document.getElementById(containerId);
    
    if (container) {
        container.classList.add('show');
        
        const alertList = tipo === 'observador' ? 
            document.getElementById('observadorAlertList') : 
            document.getElementById('responsavelAlertList');
        
        if (alertList) {
            if (tipo === 'observador') {
                alertList.innerHTML = `
                    <div class="alert-item unread">
                        <div class="alert-item-header">
                            <div class="alert-item-title">
                                <i class="fas fa-eye"></i>
                                Alerta de Teste - Observador
                            </div>
                            <div class="alert-item-time">Agora mesmo</div>
                        </div>
                        <div class="alert-item-body">
                            Status alterado: "Atividade de Teste"<br>
                            <small>De: Não Iniciado → Para: Em Andamento</small>
                        </div>
                        <div class="alert-actions">
                            <button class="btn-mark-read" onclick="this.closest('.alert-item').remove()">
                                <i class="fas fa-check-circle"></i> Marcar como Lido
                            </button>
                        </div>
                    </div>
                `;
            } else {
                alertList.innerHTML = `
                    <div class="alert-item unread">
                        <div class="alert-item-header">
                            <div class="alert-item-title">
                                <i class="fas fa-bell"></i>
                                Tarefa Pendente - Teste
                            </div>
                            <div class="alert-item-time">5 min atrás</div>
                        </div>
                        <div class="alert-item-body">
                            Você tem uma atividade pendente:<br>
                            <strong>"Revisar Documentação"</strong>
                        </div>
                        <div class="alert-actions">
                            <button class="btn-go-to-activity" onclick="window.location.href='dashboard.html'">
                                <i class="fas fa-external-link-alt"></i> Ver Atividade
                            </button>
                        </div>
                    </div>
                `;
            }
        }
    }
}

console.log('✅ teste.js carregado e pronto');
