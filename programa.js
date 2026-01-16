// programa.js - Funcionalidades específicas para a página de Programas

// Variáveis globais
let programas = [];
let tarefas = [];
let atividades = [];
let db = null;
let programasCollection = null;

// Inicialização da página
document.addEventListener('DOMContentLoaded', function() {
    inicializarFirebase();
    inicializarProgramas();
    configurarEventListeners();
});

// Inicializar Firebase
async function inicializarFirebase() {
    try {
        // Verificar se usuário está logado
        const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
        
        if (!usuarioLogado) {
            window.location.href = 'login.html';
            return;
        }

        // Configuração do Firebase ORGTAREFAS (mesma do script.js)
        const firebaseConfig = {
            apiKey: "AIzaSyAs0Ke4IBfBWDrfH0AXaOhCEjtfpPtR_Vg",
            authDomain: "orgtarefas-85358.firebaseapp.com",
            projectId: "orgtarefas-85358",
            storageBucket: "orgtarefas-85358.firebasestorage.app",
            messagingSenderId: "1023569488575",
            appId: "1:1023569488575:web:18f9e201115a1a92ccb40a"
        };
        
        // Inicializar Firebase
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        programasCollection = db.collection("programas");
        
        document.getElementById('userName').textContent = usuarioLogado.nome || usuarioLogado.usuario;
        
        // Carregar dados
        await carregarDadosCompletos();
        
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
        }, 500);
        
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase:', error);
        mostrarErro('Erro ao conectar com o banco de dados');
    }
}

// Carregar todos os dados necessários
async function carregarDadosCompletos() {
    try {
        document.getElementById('loadingText').textContent = 'Carregando programas...';
        
        // Carregar programas
        await carregarProgramas();
        
        document.getElementById('loadingText').textContent = 'Carregando tarefas...';
        
        // Carregar tarefas
        await carregarTarefas();
        
        document.getElementById('loadingText').textContent = 'Carregando atividades...';
        
        // Carregar atividades
        await carregarAtividades();
        
        // Calcular estatísticas
        await calcularEstatisticasReais();
        
        // Renderizar programas
        renderizarProgramas(programas);
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
    }
}

// Carregar programas do Firebase
async function carregarProgramas() {
    try {
        const snapshot = await programasCollection.get();
        programas = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log(`✅ ${programas.length} programas carregados`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar programas:', error);
        programas = [];
    }
}

// Carregar tarefas do Firebase
async function carregarTarefas() {
    try {
        const snapshot = await db.collection("tarefas").get();
        tarefas = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log(`✅ ${tarefas.length} tarefas carregadas`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar tarefas:', error);
        tarefas = [];
    }
}

// Carregar atividades do Firebase
async function carregarAtividades() {
    try {
        const snapshot = await db.collection("atividades").get();
        atividades = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log(`✅ ${atividades.length} atividades carregadas`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar atividades:', error);
        atividades = [];
    }
}

// Calcular estatísticas reais baseadas nas tarefas do Firebase
async function calcularEstatisticasReais() {
    try {
        // Contar total de programas
        const totalProgramas = programas.length;
        
        // Mapear quais tarefas pertencem a quais programas
        const tarefasPorPrograma = mapearTarefasPorPrograma();
        
        // Para cada programa, verificar o status das suas tarefas
        let programasEmAndamento = 0;
        let programasConcluidos = 0;
        let totalTarefasEmProgramas = 0;
        let tarefasAtivasEmProgramas = 0;
        
        // Map para armazenar estatísticas por programa
        const estatisticasPorPrograma = {};
        
        programas.forEach(programa => {
            const programaId = programa.id;
            const tarefasDoPrograma = tarefasPorPrograma[programaId] || [];
            const totalTarefas = tarefasDoPrograma.length;
            
            // Contar tarefas ativas (não concluídas)
            const tarefasAtivas = tarefasDoPrograma.filter(tarefa => {
                const status = (tarefa.status || '').toLowerCase().trim();
                return status !== 'concluido' && status !== 'concluído';
            }).length;
            
            // Determinar status do programa
            const statusPrograma = determinarStatusPrograma(tarefasDoPrograma);
            
            // Armazenar estatísticas
            estatisticasPorPrograma[programaId] = {
                programa: programa.nome,
                totalTarefas,
                tarefasAtivas,
                statusPrograma,
                progresso: totalTarefas > 0 ? ((totalTarefas - tarefasAtivas) / totalTarefas) * 100 : 0
            };
            
            // Acumular totais gerais
            totalTarefasEmProgramas += totalTarefas;
            tarefasAtivasEmProgramas += tarefasAtivas;
            
            if (statusPrograma === 'em_andamento') {
                programasEmAndamento++;
            } else if (statusPrograma === 'concluido') {
                programasConcluidos++;
            }
        });
        
        // Atualizar interface com as estatísticas
        document.getElementById('programas-ativos').textContent = totalProgramas;
        document.getElementById('tarefas-programas').textContent = `${totalTarefasEmProgramas} / ${totalProgramas}`;
        document.getElementById('programas-andamento').textContent = programasEmAndamento;
        document.getElementById('programas-concluidos').textContent = programasConcluidos;
        document.getElementById('tarefas-ativas').textContent = `${tarefasAtivasEmProgramas} / ${programasEmAndamento}`;
        
        // Armazenar estatísticas para uso posterior
        window.estatisticasPorPrograma = estatisticasPorPrograma;
        
        console.log('📊 Estatísticas calculadas:', {
            totalProgramas,
            programasEmAndamento,
            programasConcluidos,
            totalTarefasEmProgramas,
            tarefasAtivasEmProgramas,
            estatisticasPorPrograma
        });
        
    } catch (error) {
        console.error('❌ Erro ao calcular estatísticas:', error);
    }
}

// Mapear tarefas por programa
function mapearTarefasPorPrograma() {
    const tarefasPorPrograma = {};
    
    // Para simplificar, vamos considerar que o nome do programa está no título da tarefa
    // Ou podemos adicionar um campo "programaId" nas tarefas futuramente
    programas.forEach(programa => {
        const programaId = programa.id;
        const programaNome = programa.nome.toLowerCase();
        
        // Filtrar tarefas que pertencem a este programa
        const tarefasDoPrograma = tarefas.filter(tarefa => {
            // Verificar se o título da tarefa contém o nome do programa
            const tituloTarefa = (tarefa.titulo || '').toLowerCase();
            
            // Verificar também se tem algum campo de programa na tarefa
            return tituloTarefa.includes(programaNome) || 
                   (tarefa.programa && tarefa.programa === programaId) ||
                   (tarefa.programaNome && tarefa.programaNome.toLowerCase().includes(programaNome));
        });
        
        tarefasPorPrograma[programaId] = tarefasDoPrograma;
    });
    
    return tarefasPorPrograma;
}

// Determinar status do programa baseado nas tarefas
function determinarStatusPrograma(tarefasDoPrograma) {
    if (tarefasDoPrograma.length === 0) {
        return 'planejamento';
    }
    
    // Verificar se todas as tarefas estão concluídas
    const todasConcluidas = tarefasDoPrograma.every(tarefa => {
        const status = (tarefa.status || '').toLowerCase().trim();
        return status === 'concluido' || status === 'concluído';
    });
    
    if (todasConcluidas) {
        return 'concluido';
    }
    
    // Verificar se há alguma tarefa não concluída
    const temTarefaAtiva = tarefasDoPrograma.some(tarefa => {
        const status = (tarefa.status || '').toLowerCase().trim();
        return status !== 'concluido' && status !== 'concluído';
    });
    
    if (temTarefaAtiva) {
        return 'em_andamento';
    }
    
    return 'planejamento';
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

// Criar card de programa com dados reais
function criarCardPrograma(programa) {
    const card = document.createElement('div');
    card.className = 'program-card';
    card.dataset.id = programa.id;
    card.dataset.status = programa.status;
    card.dataset.categoria = programa.categoria || '';
    
    // Obter estatísticas do programa
    const estatisticas = window.estatisticasPorPrograma?.[programa.id] || {};
    const totalTarefas = estatisticas.totalTarefas || 0;
    const tarefasAtivas = estatisticas.tarefasAtivas || 0;
    const progresso = estatisticas.progresso || 0;
    const statusPrograma = estatisticas.statusPrograma || programa.status || 'planejamento';
    
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
    let statusText = '';
    
    switch(statusPrograma) {
        case 'ativo':
        case 'em_andamento':
            statusClass = 'status-ativo';
            statusText = 'Em Andamento';
            break;
        case 'planejamento':
            statusClass = 'status-planejamento';
            statusText = 'Planejamento';
            break;
        case 'concluido':
            statusClass = 'status-concluido';
            statusText = 'Concluído';
            break;
        case 'pausado':
            statusClass = 'status-pausado';
            statusText = 'Pausado';
            break;
        default:
            statusClass = 'status-planejamento';
            statusText = programa.status || 'Planejamento';
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
                <button class="btn-icon" title="Editar" onclick="editarPrograma('${programa.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" title="Configurar" onclick="configurarPrograma('${programa.id}')">
                    <i class="fas fa-cog"></i>
                </button>
            </div>
        </div>
        <div class="program-content">
            <p class="program-description">${programa.descricao || 'Sem descrição'}</p>
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
                    <span>${totalTarefas} Tarefas</span>
                    <small style="margin-left: 5px; color: #666;">
                        (${tarefasAtivas} ativas)
                    </small>
                </div>
            </div>
            <div class="progress-container">
                <div class="progress-label">
                    <span>Progresso</span>
                    <span>${Math.round(progresso)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progresso}%"></div>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// Formatar data para exibição
function formatarData(dataString) {
    if (!dataString) return 'Não definida';
    
    try {
        const data = new Date(dataString);
        if (isNaN(data.getTime())) return 'Data inválida';
        
        const mes = data.toLocaleDateString('pt-BR', { month: 'short' });
        const ano = data.getFullYear();
        
        return `${mes.charAt(0).toUpperCase() + mes.slice(1)} ${ano}`;
    } catch (error) {
        return 'Data inválida';
    }
}

// Filtrar programas
function filtrarProgramas() {
    const termoBusca = document.getElementById('program-search')?.value.toLowerCase() || '';
    const filtroStatus = document.getElementById('filter-program-status')?.value || '';
    const filtroCategoria = document.getElementById('filter-program-category')?.value || '';
    
    const programasFiltrados = programas.filter(programa => {
        // Filtro por busca
        if (termoBusca && !programa.nome.toLowerCase().includes(termoBusca) && 
            !(programa.descricao && programa.descricao.toLowerCase().includes(termoBusca))) {
            return false;
        }
        
        // Filtro por status
        if (filtroStatus) {
            const estatisticas = window.estatisticasPorPrograma?.[programa.id] || {};
            const statusReal = estatisticas.statusPrograma || programa.status;
            
            // Mapear status real para os status do filtro
            let statusParaFiltro = statusReal;
            if (statusReal === 'em_andamento') statusParaFiltro = 'ativo';
            if (statusReal === 'planejamento') statusParaFiltro = 'planejamento';
            if (statusReal === 'concluido') statusParaFiltro = 'concluido';
            
            if (statusParaFiltro !== filtroStatus) {
                return false;
            }
        }
        
        // Filtro por categoria
        if (filtroCategoria && programa.categoria !== filtroCategoria) {
            return false;
        }
        
        return true;
    });
    
    renderizarProgramas(programasFiltrados);
}

// Modal de Programa
function abrirModalPrograma(programaId = null) {
    const modal = document.getElementById('modalPrograma');
    const titulo = document.getElementById('modalProgramaTitle');
    const form = document.getElementById('formPrograma');
    
    if (programaId) {
        // Modo edição
        const programa = programas.find(p => p.id === programaId);
        if (programa) {
            titulo.textContent = 'Editar Programa';
            preencherFormulario(programa);
        }
    } else {
        // Modo novo
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
async function salvarPrograma() {
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
        dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        const programaId = document.getElementById('modalProgramaTitle').textContent === 'Editar Programa' 
            ? programas.find(p => p.nome === programaData.nome)?.id 
            : null;
        
        if (programaId) {
            // Atualizar programa existente
            await programasCollection.doc(programaId).update(programaData);
            mostrarMensagemSucesso('Programa atualizado com sucesso!');
        } else {
            // Criar novo programa
            programaData.dataCriacao = firebase.firestore.FieldValue.serverTimestamp();
            await programasCollection.add(programaData);
            mostrarMensagemSucesso('Programa criado com sucesso!');
        }
        
        // Recarregar dados
        await carregarProgramas();
        await calcularEstatisticasReais();
        renderizarProgramas(programas);
        fecharModalPrograma();
        
    } catch (error) {
        console.error('❌ Erro ao salvar programa:', error);
        alert('Erro ao salvar programa: ' + error.message);
    }
}

// Ações de programas
async function editarPrograma(id) {
    abrirModalPrograma(id);
}

async function configurarPrograma(id) {
    // Redirecionar para página de configuração do programa
    window.location.href = `programa-config.html?id=${id}`;
}

// Logout
function logout() {
    if (confirm('Deseja realmente sair do sistema?')) {
        localStorage.removeItem('usuarioLogado');
        window.location.href = 'login.html';
    }
}

// Funções auxiliares
function mostrarMensagemSucesso(mensagem) {
    const mensagemEl = document.createElement('div');
    mensagemEl.className = 'success-message';
    mensagemEl.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${mensagem}</span>
    `;
    
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
    
    document.body.appendChild(mensagemEl);
    
    setTimeout(() => {
        mensagemEl.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (mensagemEl.parentNode) {
                mensagemEl.parentNode.removeChild(mensagemEl);
            }
        }, 300);
    }, 3000);
}

function mostrarErro(mensagem) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        background: #dc3545;
        text-align: center;
    `;
    notification.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${mensagem}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 5000);
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

// Torna funções globais
window.abrirModalPrograma = abrirModalPrograma;
window.fecharModalPrograma = fecharModalPrograma;
window.salvarPrograma = salvarPrograma;
window.editarPrograma = editarPrograma;
window.configurarPrograma = configurarPrograma;
window.logout = logout;
