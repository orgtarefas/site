// header.js - Lógica específica do cabeçalho global

// Variáveis globais
let observadorAlerts = [];
let responsavelAlerts = [];
let usuarioLogado = null;
let db = null;

// Configuração do Firebase (substitua com suas credenciais)
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJETO",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "SEU_SENDER_ID",
    appId: "SEU_APP_ID"
};

// Inicializar Firebase
function inicializarFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            console.log("Firebase inicializado no cabeçalho");
            
            // Verificar autenticação
            verificarAutenticacao();
            
            // Configurar listeners para alertas
            configurarListenersAlertas();
        } else {
            db = firebase.firestore();
            verificarAutenticacao();
            configurarListenersAlertas();
        }
    } catch (error) {
        console.error("Erro ao inicializar Firebase:", error);
    }
}

// Verificar autenticação do usuário
function verificarAutenticacao() {
    // Simulação de usuário logado - em produção, usar Firebase Auth
    usuarioLogado = {
        id: "thiago.barbosa",
        nome: "Thiago Barbosa",
        email: "thiago.barbosa@empresa.com"
    };
    
    // Atualizar nome do usuário no cabeçalho
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = usuarioLogado.id;
    }
    
    // Atualizar status de conexão
    atualizarStatusConexao(true);
}

// Atualizar status de conexão
function atualizarStatusConexao(conectado) {
    const statusElement = document.getElementById('status-sincronizacao');
    if (statusElement) {
        if (conectado) {
            statusElement.innerHTML = '<i class="fas fa-bolt"></i> Conectado';
            statusElement.style.background = 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)';
            statusElement.style.color = 'var(--success)';
            statusElement.style.borderColor = '#c8e6c9';
        } else {
            statusElement.innerHTML = '<i class="fas fa-plug"></i> Desconectado';
            statusElement.style.background = 'linear-gradient(135deg, #ffe6e6 0%, #ffcccc 100%)';
            statusElement.style.color = 'var(--danger)';
            statusElement.style.borderColor = '#ffcccc';
        }
    }
}

// Configurar listeners para alertas
function configurarListenersAlertas() {
    if (!db) return;
    
    // Simulação de alertas - em produção, usar Firestore listeners
    carregarAlertasMock();
    
    // Atualizar alertas a cada 30 segundos
    setInterval(carregarAlertasMock, 30000);
}

// Carregar alertas mock (simulação)
function carregarAlertasMock() {
    // Alertas de observador (mudanças de status)
    observadorAlerts = [
        {
            id: 'obs_1',
            tipo: 'observador',
            titulo: 'Status alterado',
            mensagem: 'Tarefa "MACRO PLANILHA CONVÊNIOS PKL" mudou de "Não iniciado" para "Em andamento"',
            tempo: '5 minutos atrás',
            lido: false,
            tarefaId: 'tarefa_123'
        },
        {
            id: 'obs_2',
            tipo: 'observador',
            titulo: 'Nova atividade',
            mensagem: 'Nova atividade adicionada em "RELATÓRIO FINANCEIRO"',
            tempo: '1 hora atrás',
            lido: true,
            tarefaId: 'tarefa_456'
        }
    ];
    
    // Alertas de responsável (pendentes)
    responsavelAlerts = [
        {
            id: 'resp_1',
            tipo: 'responsavel',
            titulo: 'Tarefa pendente',
            mensagem: 'Tarefa "ATUALIZAR DASHBOARD" está pendente há 2 dias',
            tempo: 'Ontem',
            lido: false,
            tarefaId: 'tarefa_789'
        }
    ];
    
    atualizarContadoresAlertas();
    renderizarAlertasObservador();
    renderizarAlertasResponsavel();
}

// Atualizar contadores de alertas
function atualizarContadoresAlertas() {
    const naoLidosObservador = observadorAlerts.filter(a => !a.lido).length;
    const naoLidosResponsavel = responsavelAlerts.filter(a => !a.lido).length;
    
    const observadorCount = document.getElementById('observadorAlertCount');
    const responsavelCount = document.getElementById('responsavelAlertCount');
    
    if (observadorCount) {
        if (naoLidosObservador > 0) {
            observadorCount.textContent = naoLidosObservador;
            observadorCount.style.display = 'flex';
        } else {
            observadorCount.style.display = 'none';
        }
    }
    
    if (responsavelCount) {
        if (naoLidosResponsavel > 0) {
            responsavelCount.textContent = naoLidosResponsavel;
            responsavelCount.style.display = 'flex';
        } else {
            responsavelCount.style.display = 'none';
        }
    }
}

// Renderizar alertas do observador
function renderizarAlertasObservador() {
    const alertList = document.getElementById('observadorAlertList');
    if (!alertList) return;
    
    if (observadorAlerts.length === 0) {
        alertList.innerHTML = '<div class="no-alerts">Nenhum alerta</div>';
        return;
    }
    
    alertList.innerHTML = '';
    observadorAlerts.forEach(alerta => {
        const alertItem = document.createElement('div');
        alertItem.className = `alert-item ${alerta.lido ? 'read' : 'unread'}`;
        alertItem.dataset.alertaId = alerta.id;
        alertItem.onclick = () => marcarAlertaComoLido(alerta.id, 'observador');
        
        alertItem.innerHTML = `
            <div class="alert-item-header">
                <div class="alert-item-title">${alerta.titulo}</div>
                <div class="alert-item-time">${alerta.tempo}</div>
            </div>
            <div class="alert-item-body">${alerta.mensagem}</div>
            <div class="alert-actions">
                <button class="btn-mark-read" onclick="event.stopPropagation(); marcarAlertaComoLido('${alerta.id}', 'observador')">
                    <i class="fas fa-check"></i> Marcar como lido
                </button>
                <a href="dashboard.html?tarefa=${alerta.tarefaId}" class="btn-go-to-activity" onclick="event.stopPropagation()">
                    <i class="fas fa-external-link-alt"></i> Ver atividade
                </a>
            </div>
        `;
        
        alertList.appendChild(alertItem);
    });
}

// Renderizar alertas do responsável
function renderizarAlertasResponsavel() {
    const alertList = document.getElementById('responsavelAlertList');
    if (!alertList) return;
    
    if (responsavelAlerts.length === 0) {
        alertList.innerHTML = '<div class="no-alerts">Nenhuma pendência</div>';
        return;
    }
    
    alertList.innerHTML = '';
    responsavelAlerts.forEach(alerta => {
        const alertItem = document.createElement('div');
        alertItem.className = `alert-item ${alerta.lido ? 'read' : 'unread'}`;
        alertItem.dataset.alertaId = alerta.id;
        alertItem.onclick = () => marcarAlertaComoLido(alerta.id, 'responsavel');
        
        alertItem.innerHTML = `
            <div class="alert-item-header">
                <div class="alert-item-title">${alerta.titulo}</div>
                <div class="alert-item-time">${alerta.tempo}</div>
            </div>
            <div class="alert-item-body">${alerta.mensagem}</div>
            <div class="alert-actions">
                <button class="btn-mark-read" onclick="event.stopPropagation(); marcarAlertaComoLido('${alerta.id}', 'responsavel')">
                    <i class="fas fa-check"></i> Marcar como lido
                </button>
                <a href="dashboard.html?tarefa=${alerta.tarefaId}" class="btn-go-to-activity" onclick="event.stopPropagation()">
                    <i class="fas fa-external-link-alt"></i> Ver atividade
                </a>
            </div>
        `;
        
        alertList.appendChild(alertItem);
    });
}

// Abrir dropdown de alertas do observador
function abrirAlertasObservador() {
    const container = document.getElementById('observadorAlertsContainer');
    const outrosContainer = document.getElementById('responsavelAlertsContainer');
    
    // Fechar o outro dropdown se estiver aberto
    if (outrosContainer.classList.contains('show')) {
        outrosContainer.classList.remove('show');
    }
    
    // Alternar o dropdown atual
    container.classList.toggle('show');
    
    // Fechar ao clicar fora
    document.addEventListener('click', fecharDropdownsForaClick);
}

// Abrir dropdown de alertas do responsável
function abrirAlertasResponsavel() {
    const container = document.getElementById('responsavelAlertsContainer');
    const outrosContainer = document.getElementById('observadorAlertsContainer');
    
    // Fechar o outro dropdown se estiver aberto
    if (outrosContainer.classList.contains('show')) {
        outrosContainer.classList.remove('show');
    }
    
    // Alternar o dropdown atual
    container.classList.toggle('show');
    
    // Fechar ao clicar fora
    document.addEventListener('click', fecharDropdownsForaClick);
}

// Fechar dropdowns ao clicar fora
function fecharDropdownsForaClick(event) {
    const observadorContainer = document.getElementById('observadorAlertsContainer');
    const responsavelContainer = document.getElementById('responsavelAlertsContainer');
    
    if (!observadorContainer.contains(event.target) && !responsavelContainer.contains(event.target)) {
        observadorContainer.classList.remove('show');
        responsavelContainer.classList.remove('show');
        document.removeEventListener('click', fecharDropdownsForaClick);
    }
}

// Marcar alerta como lido
function marcarAlertaComoLido(alertaId, tipo) {
    if (tipo === 'observador') {
        const alerta = observadorAlerts.find(a => a.id === alertaId);
        if (alerta) {
            alerta.lido = true;
            renderizarAlertasObservador();
            atualizarContadoresAlertas();
        }
    } else {
        const alerta = responsavelAlerts.find(a => a.id === alertaId);
        if (alerta) {
            alerta.lido = true;
            renderizarAlertasResponsavel();
            atualizarContadoresAlertas();
        }
    }
}

// Marcar todos os alertas do observador como lidos
function marcarObservadorComoLido() {
    observadorAlerts.forEach(alerta => {
        alerta.lido = true;
    });
    renderizarAlertasObservador();
    atualizarContadoresAlertas();
}

// Marcar todos os alertas do responsável como lidos
function marcarResponsavelComoLido() {
    responsavelAlerts.forEach(alerta => {
        alerta.lido = true;
    });
    renderizarAlertasResponsavel();
    atualizarContadoresAlertas();
}

// Logout
function logout() {
    if (confirm('Deseja realmente sair do sistema?')) {
        // Em produção, fazer logout do Firebase Auth
        localStorage.removeItem('usuarioLogado');
        sessionStorage.removeItem('usuarioLogado');
        
        // Redirecionar para página de login
        window.location.href = 'login.html';
    }
}

// Destacar botão ativo
function destacarBotaoAtivo(paginaAtual) {
    const botoes = document.querySelectorAll('.btn-header');
    botoes.forEach(botao => {
        botao.classList.remove('active');
        if (botao.textContent.includes(paginaAtual)) {
            botao.classList.add('active');
            botao.style.background = 'linear-gradient(135deg, #1c5d8f 0%, #2980b9 100%)';
        }
    });
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    inicializarFirebase();
    
    // Adicionar event listener ao logo para voltar à página inicial
    const logo = document.querySelector('.site-logo');
    if (logo) {
        logo.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }
    
    // Destacar botão ativo baseado na URL atual
    const path = window.location.pathname;
    if (path.includes('chat.html')) {
        destacarBotaoAtivo('Chat');
    } else if (path.includes('dashboard.html')) {
        destacarBotaoAtivo('Minhas Atividades');
    } else if (path.includes('workmanager.html')) {
        destacarBotaoAtivo('Grupos de Trabalho');
    } else if (path.includes('index.html')) {
        destacarBotaoAtivo('Página Inicial');
    }
});
