// programa.js - Funcionalidades específicas para a página de Programas

// Variáveis globais
let programas = [];
let programaEditando = null;

// Inicialização da página
document.addEventListener('DOMContentLoaded', function() {
    inicializarProgramas();
    configurarEventListeners();
    carregarProgramasExemplo();
});

// Inicializar componentes
function inicializarProgramas() {
    // Configurar datas no modal
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('programaDataInicio').value = hoje;
    
    const umMesAFrente = new Date();
    umMesAFrente.setMonth(umMesAFrente.getMonth() + 1);
    document.getElementById('programaDataFim').value = umMesAFrente.toISOString().split('T')[0];
    
    // Mostrar conteúdo principal
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        const mainContent = document.getElementById('mainContent');
        
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';
        
        // Atualizar estatísticas
        atualizarEstatisticas();
    }, 1000);
}

// Configurar eventos
function configurarEventListeners() {
    // Botão novo programa
    document.getElementById('btn-novo-programa')?.addEventListener('click', () => {
        abrirModalPrograma();
    });
    
    // Botão criar primeiro programa
    document.getElementById('btn-criar-primeiro-programa')?.addEventListener('click', () => {
        abrirModalPrograma();
    });
    
    // Busca de programas
    const searchInput = document.getElementById('program-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            filtrarProgramas();
        });
    }
    
    // Filtros
    const filterStatus = document.getElementById('filter-program-status');
    const filterCategory = document.getElementById('filter-program-category');
    
    if (filterStatus) {
        filterStatus.addEventListener('change', () => {
            filtrarProgramas();
        });
    }
    
    if (filterCategory) {
        filterCategory.addEventListener('change', () => {
            filtrarProgramas();
        });
    }
    
    // Fechar modal ao clicar fora
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('modalPrograma');
        if (event.target === modal) {
            fecharModalPrograma();
        }
    });
}

// Carregar programas de exemplo (será substituído pelo Firebase)
function carregarProgramasExemplo() {
    programas = [
        {
            id: 1,
            nome: "Dashboard de Desempenho",
            descricao: "Desenvolvimento e implementação de dashboard para monitoramento de KPIs e métricas de desempenho.",
            categoria: "estrategico",
            status: "ativo",
            dataInicio: "2024-01-01",
            dataFim: "2024-06-30",
            times: ["time1", "time2"],
            progresso: 65,
            tarefas: 24
        },
        {
            id: 2,
            nome: "Automação de Processos",
            descricao: "Implementação de automação para processos manuais recorrentes.",
            categoria: "melhoria",
            status: "planejamento",
            dataInicio: "2024-03-01",
            dataFim: "2024-12-31",
            times: ["time1"],
            progresso: 15,
            tarefas: 18
        },
        {
            id: 3,
            nome: "Segurança de Dados",
            descricao: "Implementação de políticas e ferramentas de segurança de dados.",
            categoria: "projeto",
            status: "concluido",
            dataInicio: "2023-09-01",
            dataFim: "2024-01-31",
            times: ["time1", "time2", "time3", "time4"],
            progresso: 100,
            tarefas: 32
        }
    ];
    
    renderizarProgramas(programas);
}

// Renderizar programas na grid
function renderizarProgramas(listaProgramas) {
    const grid = document.getElementById('programs-grid');
    const emptyState = document.getElementById('empty-programs');
    
    if (!listaProgramas || listaProgramas.length === 0) {
        if (grid) grid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (grid) grid.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';
    
    // Limpar grid
    grid.innerHTML = '';
    
    // Adicionar cada programa
    listaProgramas.forEach(programa => {
        const card = criarCardPrograma(programa);
        grid.appendChild(card);
    });
}

// Criar card de programa
function criarCardPrograma(programa) {
    const card = document.createElement('div');
    card.className = 'program-card';
    card.dataset.id = programa.id;
    card.dataset.status = programa.status;
    card.dataset.categoria = programa.categoria;
    
    // Determinar ícone baseado na categoria
    let iconClass = 'fa-project-diagram';
    switch(programa.categoria) {
        case 'operacional':
            iconClass = 'fa-cogs';
            break;
        case 'estrategico':
            iconClass = 'fa-chart-line';
            break;
        case 'melhoria':
            iconClass = 'fa-tools';
            break;
        case 'projeto':
            iconClass = 'fa-bullseye';
            break;
    }
    
    // Formatar datas
    const dataInicio = formatarData(programa.dataInicio);
    const dataFim = formatarData(programa.dataFim);
    
    // Determinar classe de status
    let statusClass = '';
    switch(programa.status) {
        case 'ativo':
            statusClass = 'status-ativo';
            break;
        case 'planejamento':
            statusClass = 'status-planejamento';
            break;
        case 'concluido':
            statusClass = 'status-concluido';
            break;
        case 'pausado':
            statusClass = 'status-pausado';
            break;
    }
    
    // Determinar texto de status
    let statusText = '';
    switch(programa.status) {
        case 'ativo':
            statusText = 'Ativo';
            break;
        case 'planejamento':
            statusText = 'Planejamento';
            break;
        case 'concluido':
            statusText = 'Concluído';
            break;
        case 'pausado':
            statusText = 'Pausado';
            break;
    }
    
    card.innerHTML = `
        <div class="program-header">
            <div class="program-icon">
                <i class="fas ${iconClass}"></i>
            </div>
            <div class="program-title">
                <h3>${programa.nome}</h3>
                <span class="program-status ${statusClass}">${statusText}</span>
            </div>
            <div class="program-actions">
                <button class="btn-icon" title="Editar" onclick="editarPrograma(${programa.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" title="Configurar" onclick="configurarPrograma(${programa.id})">
                    <i class="fas fa-cog"></i>
                </button>
            </div>
        </div>
        <div class="program-content">
            <p class="program-description">${programa.descricao}</p>
            <div class="program-meta">
                <div class="meta-item">
                    <i class="fas fa-calendar-alt"></i>
                    <span>${dataInicio} - ${dataFim}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-users"></i>
                    <span>${programa.times ? programa.times.length : 0} Times</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-tasks"></i>
                    <span>${programa.tarefas || 0} Tarefas</span>
                </div>
            </div>
            <div class="progress-container">
                <div class="progress-label">
                    <span>Progresso</span>
                    <span>${programa.progresso || 0}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${programa.progresso || 0}%"></div>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// Formatar data para exibição
function formatarData(dataString) {
    if (!dataString) return '';
    
    const data = new Date(dataString);
    const mes = data.toLocaleDateString('pt-BR', { month: 'short' });
    const ano = data.getFullYear();
    
    return `${mes.charAt(0).toUpperCase() + mes.slice(1)} ${ano}`;
}

// Filtrar programas
function filtrarProgramas() {
    const termoBusca = document.getElementById('program-search')?.value.toLowerCase() || '';
    const filtroStatus = document.getElementById('filter-program-status')?.value || '';
    const filtroCategoria = document.getElementById('filter-program-category')?.value || '';
    
    const programasFiltrados = programas.filter(programa => {
        // Filtro por busca
        if (termoBusca && !programa.nome.toLowerCase().includes(termoBusca) && 
            !programa.descricao.toLowerCase().includes(termoBusca)) {
            return false;
        }
        
        // Filtro por status
        if (filtroStatus && programa.status !== filtroStatus) {
            return false;
        }
        
        // Filtro por categoria
        if (filtroCategoria && programa.categoria !== filtroCategoria) {
            return false;
        }
        
        return true;
    });
    
    renderizarProgramas(programasFiltrados);
    atualizarEstatisticas(programasFiltrados);
}

// Atualizar estatísticas
function atualizarEstatisticas(programasFiltrados = null) {
    const lista = programasFiltrados || programas;
    
    // Programas ativos (status ativo)
    const ativos = lista.filter(p => p.status === 'ativo').length;
    document.getElementById('programas-ativos').textContent = ativos;
    
    // Total de tarefas em programas
    const totalTarefas = lista.reduce((total, p) => total + (p.tarefas || 0), 0);
    document.getElementById('tarefas-programas').textContent = totalTarefas;
    
    // Times envolvidos (único)
    const todosTimes = lista.flatMap(p => p.times || []);
    const timesUnicos = [...new Set(todosTimes)].length;
    document.getElementById('times-programas').textContent = timesUnicos;
    
    // Programas em andamento (ativo + progresso < 100)
    const emAndamento = lista.filter(p => p.status === 'ativo' && (p.progresso || 0) < 100).length;
    document.getElementById('programas-andamento').textContent = emAndamento;
    
    // Programas concluídos
    const concluidos = lista.filter(p => p.status === 'concluido' || (p.progresso || 0) >= 100).length;
    document.getElementById('programas-concluidos').textContent = concluidos;
}

// Modal de Programa
function abrirModalPrograma(programaId = null) {
    const modal = document.getElementById('modalPrograma');
    const titulo = document.getElementById('modalProgramaTitle');
    const form = document.getElementById('formPrograma');
    
    if (programaId) {
        // Modo edição
        programaEditando = programas.find(p => p.id === programaId);
        if (programaEditando) {
            titulo.textContent = 'Editar Programa';
            preencherFormulario(programaEditando);
        }
    } else {
        // Modo novo
        programaEditando = null;
        titulo.textContent = 'Novo Programa';
        form.reset();
        
        // Resetar datas
        const hoje = new Date().toISOString().split('T')[0];
        document.getElementById('programaDataInicio').value = hoje;
        
        const umMesAFrente = new Date();
        umMesAFrente.setMonth(umMesAFrente.getMonth() + 1);
        document.getElementById('programaDataFim').value = umMesAFrente.toISOString().split('T')[0];
    }
    
    modal.style.display = 'block';
}

function fecharModalPrograma() {
    const modal = document.getElementById('modalPrograma');
    modal.style.display = 'none';
    programaEditando = null;
    document.getElementById('formPrograma').reset();
}

function preencherFormulario(programa) {
    document.getElementById('programaNome').value = programa.nome || '';
    document.getElementById('programaDescricao').value = programa.descricao || '';
    document.getElementById('programaCategoria').value = programa.categoria || '';
    document.getElementById('programaStatus').value = programa.status || 'planejamento';
    document.getElementById('programaDataInicio').value = programa.dataInicio || '';
    document.getElementById('programaDataFim').value = programa.dataFim || '';
    
    // Selecionar times
    const timesSelect = document.getElementById('programaTimes');
    if (programa.times) {
        Array.from(timesSelect.options).forEach(option => {
            option.selected = programa.times.includes(option.value);
        });
    }
}

// Salvar programa
function salvarPrograma() {
    const form = document.getElementById('formPrograma');
    
    if (!form.checkValidity()) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    const programaData = {
        nome: document.getElementById('programaNome').value.trim(),
        descricao: document.getElementById('programaDescricao').value.trim(),
        categoria: document.getElementById('programaCategoria').value,
        status: document.getElementById('programaStatus').value,
        dataInicio: document.getElementById('programaDataInicio').value,
        dataFim: document.getElementById('programaDataFim').value,
        times: Array.from(document.getElementById('programaTimes').selectedOptions).map(opt => opt.value),
        progresso: 0,
        tarefas: 0
    };
    
    if (programaEditando) {
        // Atualizar programa existente
        programaData.id = programaEditando.id;
        const index = programas.findIndex(p => p.id === programaEditando.id);
        if (index !== -1) {
            programas[index] = { ...programas[index], ...programaData };
        }
    } else {
        // Criar novo programa
        programaData.id = programas.length > 0 ? Math.max(...programas.map(p => p.id)) + 1 : 1;
        programas.push(programaData);
    }
    
    // Salvar no Firebase (será implementado posteriormente)
    // salvarProgramaFirebase(programaData);
    
    renderizarProgramas(programas);
    atualizarEstatisticas();
    fecharModalPrograma();
    
    // Mostrar feedback
    mostrarMensagemSucesso('Programa salvo com sucesso!');
}

// Ações de programas
function editarPrograma(id) {
    abrirModalPrograma(id);
}

function configurarPrograma(id) {
    alert(`Configurar programa ${id} - Esta funcionalidade será implementada em breve.`);
}

function verRelatorio(id) {
    alert(`Ver relatório do programa ${id} - Esta funcionalidade será implementada em breve.`);
}

// Logout
function logout() {
    if (confirm('Deseja realmente sair do sistema?')) {
        // Implementar logout do Firebase
        window.location.href = 'login.html';
    }
}

// Mensagem de sucesso
function mostrarMensagemSucesso(mensagem) {
    // Criar elemento de mensagem
    const mensagemEl = document.createElement('div');
    mensagemEl.className = 'success-message';
    mensagemEl.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${mensagem}</span>
    `;
    
    // Estilos inline
    mensagemEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    // Adicionar ao body
    document.body.appendChild(mensagemEl);
    
    // Remover após 3 segundos
    setTimeout(() => {
        mensagemEl.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (mensagemEl.parentNode) {
                mensagemEl.parentNode.removeChild(mensagemEl);
            }
        }, 300);
    }, 3000);
}

// Adicionar estilos de animação
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
