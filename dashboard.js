// dashboard.js - VERSÃO AJUSTADA (APENAS ATIVIDADES)
console.log('=== GESTOR DE ATIVIDADES INICIANDO ===');

class GestorAtividades { // Mudei o nome da classe
    constructor() {
        this.tarefas = [];
        this.usuarios = [];
        this.usuario = null;
        this.charts = {};
        this.atividadeEditando = null;
        this.atividadesDisponiveis = [];
    }

    async init() {
        console.log('🚀 Inicializando Gestor de Atividades...');
        
        // Verificar autenticação
        await this.verificarAutenticacao();
        
        // Carregar dados PRIMEIRO
        await this.carregarDados();
        
        // Carregar atividades disponíveis para vínculos
        await this.carregarAtividadesParaVinculo();
        
        // Inicializar gráficos DEPOIS de carregar dados
        this.inicializarGraficos();
        
        // Renderizar tarefas
        this.renderizarTarefas();
        
        // Configurar listeners
        this.configurarListeners();
        
        console.log('✅ Gestor de Atividades inicializado com sucesso!');
    }

    async carregarAtividadesParaVinculo() {
        try {
            const snapshot = await db.collection('atividades').get();
            this.atividadesDisponiveis = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                tarefaNome: this.getNomeTarefa(doc.data().tarefaId)
            }));
            console.log(`✅ ${this.atividadesDisponiveis.length} atividades disponíveis para vínculo`);
        } catch (error) {
            console.error('❌ Erro ao carregar atividades para vínculo:', error);
        }
    }

    getNomeTarefa(tarefaId) {
        const tarefa = this.tarefas.find(t => t.id === tarefaId);
        return tarefa ? tarefa.nome : 'Tarefa não encontrada';
    }

    async verificarAutenticacao() {
        const usuarioLogado = localStorage.getItem('usuarioLogado');
        
        if (!usuarioLogado) {
            console.log('❌ Usuário não autenticado, redirecionando...');
            window.location.href = 'login.html';
            return;
        }
        
        this.usuario = JSON.parse(usuarioLogado);
        
        // Atualizar interface
        if (document.getElementById('userName')) {
            document.getElementById('userName').textContent = this.usuario.nome || this.usuario.usuario;
        }
        
        if (document.getElementById('data-atual')) {
            document.getElementById('data-atual').textContent = new Date().toLocaleDateString('pt-BR');
        }
        
        // Esconder loading e mostrar conteúdo
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
    }

    async carregarDados() {
        console.log('📊 Carregando dados do Firebase...');
        
        try {
            // Carregar usuários
            const usuariosSnapshot = await db.collection('usuarios').get();
            this.usuarios = usuariosSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(`✅ ${this.usuarios.length} usuários carregados`);

            // Carregar tarefas
            const tarefasSnapshot = await db.collection('tarefas').get();
            this.tarefas = tarefasSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(`✅ ${this.tarefas.length} tarefas carregadas`);

            // Carregar atividades
            const atividadesSnapshot = await db.collection('atividades').get();
            const todasAtividades = atividadesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                tarefaNome: this.getNomeTarefa(doc.data().tarefaId)
            }));
            
            // Agrupar atividades por tarefa
            this.tarefas.forEach(tarefa => {
                tarefa.atividades = todasAtividades.filter(a => a.tarefaId === tarefa.id);
            });
            
            console.log(`✅ ${todasAtividades.length} atividades carregadas`);

            // Atualizar status
            document.getElementById('status-sincronizacao').innerHTML = 
                '<i class="fas fa-check-circle"></i> Sincronizado';

        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            document.getElementById('status-sincronizacao').innerHTML = 
                '<i class="fas fa-exclamation-triangle"></i> Offline';
        }
    }

    // ... (mantenha o resto das funções processarConclusaoAtividade, inicializarGraficos, etc)

    renderizarTarefas() {
        const container = document.getElementById('tarefas-container');
        
        if (this.tarefas.length === 0) {
            container.innerHTML = `
                <div class="empty-tarefas">
                    <i class="fas fa-tasks"></i>
                    <h3>Nenhuma tarefa disponível</h3>
                    <p>Crie tarefas na tela de configurações para começar</p>
                    <button class="btn btn-primary btn-sm mt-3" onclick="window.location.href='index.html'">
                        <i class="fas fa-cog"></i> Ir para Configurações
                    </button>
                </div>
            `;
            return;
        }
    
        // Salvar estado atual ANTES de re-renderizar
        manterEstadoExpansaoTarefas();
        
        container.innerHTML = this.tarefas.map(tarefa => {
            // Verificar se esta tarefa estava expandida
            const estavaExpandida = tarefasExpandidas.has(tarefa.id);
            
            return `
                <div class="task-card">
                    <div class="task-header" onclick="toggleTarefa('${tarefa.id}')">
                        <h2>
                            <i class="fas fa-tasks" style="color: ${tarefa.cor || '#2C3E50'}"></i>
                            ${tarefa.nome}
                        </h2>
                        <div class="task-status">
                            <div class="status-badges-container">
                                ${this.getTextoStatusTarefa(tarefa)}
                            </div>
                            <i class="fas fa-chevron-${estavaExpandida ? 'up' : 'down'}"></i>
                            <!-- REMOVI os botões de editar/excluir tarefa -->
                        </div>
                    </div>
                    <div class="task-body" id="tarefa-${tarefa.id}" style="display: ${estavaExpandida ? 'block' : 'none'};">
                        <p class="task-desc">${tarefa.descricao || 'Sem descrição'}</p>
                        <div class="activities-grid">
                            ${this.renderizarAtividadesTarefa(tarefa)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Restaurar o estado de expansão
        setTimeout(() => {
            restaurarEstadoExpansaoTarefas();
        }, 10);
    }

    // ... (mantenha o resto das funções calcularEstatisticasTarefa, renderizarAtividadesTarefa, etc)

    configurarListeners() {
        // Listener para atualizações de atividades
        db.collection('atividades').onSnapshot(() => {
            console.log('🔄 Atualizando atividades em tempo real...');
            this.carregarDados().then(() => {
                this.renderizarTarefas();
                this.atualizarGraficos();
            });
        });
        
        // Listener para tarefas (apenas para atualizar se houver mudanças)
        db.collection('tarefas').onSnapshot(() => {
            console.log('🔄 Atualizando lista de tarefas...');
            this.carregarDados().then(() => {
                this.renderizarTarefas();
                this.atualizarGraficos();
            });
        });
        
        this.configurarListenerConclusoes();
    }
    
    // ... (mantenha o resto das funções configurarListenerConclusoes, atualizarGraficos, etc)

    async editarAtividade(atividadeId) {
        this.atividadeEditando = atividadeId;
        
        const atividadeDoc = await db.collection('atividades').doc(atividadeId).get();
        
        if (!atividadeDoc.exists) {
            alert('Atividade não encontrada');
            return;
        }
        
        const atividade = atividadeDoc.data();
        const tarefa = this.tarefas.find(t => t.id === atividade.tarefaId);
        
        if (!tarefa) {
            alert('Tarefa não encontrada');
            return;
        }
        
        this.abrirModalAtividade(atividade.tarefaId, atividade.tipo, atividade);
    }
}

// ==================== fim da classe

// ========== CONTROLE DE ESTADO DE EXPANSÃO ==========
let tarefasExpandidas = new Set();

function manterEstadoExpansaoTarefas() {
    tarefasExpandidas.clear();
    
    document.querySelectorAll('.task-body').forEach(tarefa => {
        if (tarefa.style.display !== 'none') {
            const id = tarefa.id.replace('tarefa-', '');
            tarefasExpandidas.add(id);
        }
    });
}

function restaurarEstadoExpansaoTarefas() {
    tarefasExpandidas.forEach(id => {
        const elemento = document.getElementById(`tarefa-${id}`);
        const header = elemento ? elemento.previousElementSibling : null;
        const chevron = header ? header.querySelector('.fa-chevron-down, .fa-chevron-up') : null;
        
        if (elemento && header && chevron) {
            elemento.style.display = 'block';
            chevron.classList.remove('fa-chevron-down');
            chevron.classList.add('fa-chevron-up');
        }
    });
}

function getLabelStatus(status) {
    switch(status) {
        case 'nao_iniciado': return 'Não Iniciado';
        case 'pendente': return 'Pendente';
        case 'andamento': return 'Em Andamento';
        case 'concluido': return 'Concluído';
        default: return status || 'Não definido';
    }
}

// ========== FUNÇÃO PARA ALTERAR STATUS ==========
async function alterarStatusAtividade(atividadeId, novoStatus, tituloAtividade) {
    const select = document.querySelector(`.status-select[data-id="${atividadeId}"]`);
    const statusAnterior = select ? select.value : 'nao_iniciado';
    
    console.log(`🔄 Alterando status da atividade:`, {
        id: atividadeId,
        titulo: tituloAtividade,
        de: statusAnterior,
        para: novoStatus
    });
    
    if (novoStatus === 'concluido') {
        const confirmar = confirm(`Deseja realmente alterar o status de "${tituloAtividade}" para "Concluído"?\n\n⚠️ Esta ação processará automaticamente as atividades vinculadas.`);
        
        if (!confirmar) {
            if (select) select.value = statusAnterior;
            return;
        }
    }
    
    if (select) {
        select.classList.add('processing');
        select.disabled = true;
    }
    
    try {
        await db.collection('atividades').doc(atividadeId).update({
            status: novoStatus,
            dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Status da atividade "${tituloAtividade}" alterado para: ${novoStatus}`);
        
        const checklistItem = select ? select.closest('.checklist-item') : null;
        if (checklistItem) {
            const badge = checklistItem.querySelector('.badge[class*="status-"]');
            if (badge) {
                badge.className = `badge status-${novoStatus}`;
                badge.textContent = getLabelStatus(novoStatus);
            }
        }
        
        if (novoStatus === 'concluido') {
            console.log(`🔗 Processando atividades vinculadas para "${tituloAtividade}"...`);
            await gestorAtividades.processarConclusaoAtividade(atividadeId);
        }
        
        setTimeout(() => {
            gestorAtividades.calcularEstatisticas();
            gestorAtividades.atualizarGraficos();
        }, 500);
        
    } catch (error) {
        console.error('❌ Erro ao alterar status:', error);
        
        if (select) {
            select.value = statusAnterior;
            alert('Erro ao alterar status: ' + error.message);
        }
        
    } finally {
        if (select) {
            select.classList.remove('processing');
            select.disabled = false;
        }
    }
}
    
// Instanciar e inicializar o gestor
const gestorAtividades = new GestorAtividades(); // Mudei o nome da instância

// ========== FUNÇÕES GLOBAIS ==========

function logout() {
    localStorage.removeItem('usuarioLogado');
    window.location.href = 'login.html';
}

function toggleTarefa(tarefaId) {
    const elemento = document.getElementById(`tarefa-${tarefaId}`);
    const header = elemento.previousElementSibling;
    const chevron = header.querySelector('.fa-chevron-down, .fa-chevron-up');
    
    if (!elemento || !chevron) return;
    
    if (elemento.style.display === 'none') {
        elemento.style.display = 'block';
        chevron.classList.remove('fa-chevron-down');
        chevron.classList.add('fa-chevron-up');
        tarefasExpandidas.add(tarefaId);
    } else {
        elemento.style.display = 'none';
        chevron.classList.remove('fa-chevron-up');
        chevron.classList.add('fa-chevron-down');
        tarefasExpandidas.delete(tarefaId);
    }
    
    event.stopPropagation();
}

// REMOVI as funções: abrirModalTarefa, fecharModalTarefa, editarTarefa, salvarTarefa, excluirTarefa

function formatarDataRegistro(dataRegistro) {
    try {
        if (dataRegistro && dataRegistro.toDate) {
            return dataRegistro.toDate().toLocaleString('pt-BR');
        } else if (dataRegistro) {
            return new Date(dataRegistro).toLocaleString('pt-BR');
        } else {
            return 'Não disponível';
        }
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return 'Data inválida';
    }
}

function abrirModalAtividade(tarefaId, tipo = 'execucao', atividadeExistente = null) {
    gestorAtividades.atividadeEditando = atividadeExistente ? atividadeExistente.id : null;
    
    const modal = document.getElementById('modalAtividade');
    const titulos = {
        'execucao': 'Execução das Atividades',
        'monitoramento': 'Monitoramento',
        'conclusao': 'Conclusão e Revisão'
    };
    
    const tituloModal = atividadeExistente 
        ? `Editar Atividade - ${titulos[tipo]}` 
        : `Nova Atividade - ${titulos[tipo]}`;
    
    document.getElementById('modalAtividadeTitulo').textContent = tituloModal;
    
    const usuariosOptions = gestorAtividades.usuarios.map(user => {
        const selected = atividadeExistente && atividadeExistente.responsavel === user.usuario ? 'selected' : '';
        return `<option value="${user.usuario}" ${selected}>${user.nome || user.usuario}</option>`;
    }).join('');
    
    const formatarDataParaInput = (dataString) => {
        if (!dataString) return '';
        return dataString.split('T')[0];
    };
    
    const statusAtividade = atividadeExistente ? atividadeExistente.status : 'nao_iniciado';
    
    let atividadesVinculadasHTML = '';
    if (gestorAtividades.atividadesDisponiveis.length > 0) {
        const atividadesParaVincular = gestorAtividades.atividadesDisponiveis.filter(atv => 
            !atividadeExistente || atv.id !== atividadeExistente.id
        );
        
        const atividadesVinculadasIds = atividadeExistente && atividadeExistente.atividadesVinculadas 
            ? atividadeExistente.atividadesVinculadas 
            : [];
        
        atividadesVinculadasHTML = `
            <div class="form-group">
                <label for="vinculosAtividade">
                    <i class="fas fa-link"></i> Vincular Atividades (opcional)
                    <small class="form-text">Quando esta atividade for concluída, as atividades vinculadas serão alteradas para "Pendente"</small>
                </label>
                <div class="vinculos-container" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 10px;">
                    ${atividadesParaVincular.map(atv => {
                        const checked = atividadesVinculadasIds.includes(atv.id) ? 'checked' : '';
                        return `
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="${atv.id}" id="vinculo-${atv.id}" ${checked}>
                                <label class="form-check-label" for="vinculo-${atv.id}" style="font-size: 14px;">
                                    <strong>${atv.titulo}</strong>
                                    <small class="text-muted"> (${atv.tarefaNome || 'Tarefa'}) - ${getLabelStatus(atv.status)}</small>
                                </label>
                            </div>
                        `;
                    }).join('')}
                </div>
                ${atividadesParaVincular.length === 0 ? 
                    '<p class="text-muted small">Não há outras atividades disponíveis para vínculo</p>' : ''}
            </div>
        `;
    }
    
    document.getElementById('modalAtividadeBody').innerHTML = `
        <form id="formAtividade" onsubmit="event.preventDefault(); salvarAtividade('${tarefaId}', '${tipo}');">
            <div class="form-group">
                <label for="tituloAtividade">Título *</label>
                <input type="text" id="tituloAtividade" class="form-control" required 
                       value="${atividadeExistente ? atividadeExistente.titulo : ''}">
            </div>
            <div class="form-group">
                <label for="descricaoAtividade">Descrição</label>
                <textarea id="descricaoAtividade" class="form-control" rows="3">${atividadeExistente ? (atividadeExistente.descricao || '') : ''}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="responsavelAtividade">Responsável *</label>
                    <select id="responsavelAtividade" class="form-control" required>
                        <option value="">Selecione um responsável</option>
                        ${usuariosOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="dataPrevista">Data Prevista</label>
                    <input type="date" id="dataPrevista" class="form-control" 
                           value="${atividadeExistente ? formatarDataParaInput(atividadeExistente.dataPrevista) : new Date().toISOString().split('T')[0]}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="prioridadeAtividade">Prioridade</label>
                    <select id="prioridadeAtividade" class="form-control">
                        <option value="baixa" ${atividadeExistente && atividadeExistente.prioridade === 'baixa' ? 'selected' : ''}>Baixa</option>
                        <option value="media" ${(!atividadeExistente || atividadeExistente.prioridade === 'media') ? 'selected' : ''}>Média</option>
                        <option value="alta" ${atividadeExistente && atividadeExistente.prioridade === 'alta' ? 'selected' : ''}>Alta</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="statusAtividade">Status</label>
                    <select id="statusAtividade" class="form-control" onchange="verificarConclusaoVinculos()">
                        <option value="nao_iniciado" ${statusAtividade === 'nao_iniciado' ? 'selected' : ''}>Não Iniciado</option>
                        <option value="pendente" ${statusAtividade === 'pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="andamento" ${statusAtividade === 'andamento' ? 'selected' : ''}>Em Andamento</option>
                        <option value="concluido" ${statusAtividade === 'concluido' ? 'selected' : ''}>Concluído</option>
                    </select>
                </div>
            </div>
            
            ${atividadesVinculadasHTML}
            
            <div class="alert alert-info" id="alertVinculos" style="display: none; margin-top: 15px;">
                <i class="fas fa-info-circle"></i> 
                <span id="alertVinculosText"></span>
            </div>
            
            <div class="modal-footer" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                <button type="button" class="btn btn-outline" onclick="fecharModalAtividade()">Cancelar</button>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> ${atividadeExistente ? 'Atualizar' : 'Salvar'} Atividade
                </button>
            </div>
        </form>
    `;
    
    modal.style.display = 'flex';
    
    verificarConclusaoVinculos();
}

function verificarConclusaoVinculos() {
    const statusSelecionado = document.getElementById('statusAtividade').value;
    const checkboxes = document.querySelectorAll('.vinculos-container input[type="checkbox"]:checked');
    const alertDiv = document.getElementById('alertVinculos');
    const alertText = document.getElementById('alertVinculosText');
    
    if (statusSelecionado === 'concluido' && checkboxes.length > 0) {
        alertText.textContent = `Ao salvar, ${checkboxes.length} atividade(s) vinculada(s) será(ão) alterada(s) para "Pendente".`;
        alertDiv.style.display = 'block';
    } else {
        alertDiv.style.display = 'none';
    }
}

function fecharModalAtividade() {
    document.getElementById('modalAtividade').style.display = 'none';
    gestorAtividades.atividadeEditando = null;
}

async function salvarAtividade(tarefaId, tipo) {
    const titulo = document.getElementById('tituloAtividade').value;
    const responsavel = document.getElementById('responsavelAtividade').value;
    
    if (!titulo || !responsavel) {
        alert('Preencha todos os campos obrigatórios');
        return;
    }
    
    const status = document.getElementById('statusAtividade').value;
    
    const atividadesVinculadas = [];
    const checkboxes = document.querySelectorAll('.vinculos-container input[type="checkbox"]:checked');
    checkboxes.forEach(checkbox => {
        atividadesVinculadas.push(checkbox.value);
    });
    
    const atividade = {
        tarefaId: tarefaId,
        tipo: tipo,
        titulo: titulo,
        descricao: document.getElementById('descricaoAtividade').value,
        responsavel: responsavel,
        dataPrevista: document.getElementById('dataPrevista').value,
        prioridade: document.getElementById('prioridadeAtividade').value,
        status: status,
        atividadesVinculadas: atividadesVinculadas,
        dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        let atividadeId;
        
        if (gestorAtividades.atividadeEditando) {
            atividadeId = gestorAtividades.atividadeEditando;
            await db.collection('atividades').doc(atividadeId).update(atividade);
            console.log(`✅ Atividade ${atividadeId} atualizada com vínculos:`, atividadesVinculadas);
        } else {
            const docRef = await db.collection('atividades').add({
                ...atividade,
                dataRegistro: firebase.firestore.FieldValue.serverTimestamp(),
                criadoPor: gestorAtividades.usuario.usuario
            });
            atividadeId = docRef.id;
            console.log(`✅ Nova atividade ${atividadeId} criada com vínculos:`, atividadesVinculadas);
        }
        
        if (status === 'concluido' && atividadesVinculadas.length > 0) {
            console.log(`🔄 Atividade ${atividadeId} concluída com vínculos, processando...`);
            await gestorAtividades.processarConclusaoAtividade(atividadeId);
        }
        
        fecharModalAtividade();
        gestorAtividades.atividadeEditando = null;
        
        await gestorAtividades.carregarDados();
        await gestorAtividades.carregarAtividadesParaVinculo();
        gestorAtividades.renderizarTarefas();
        gestorAtividades.atualizarGraficos();
        
        alert(gestorAtividades.atividadeEditando ? '✅ Atividade atualizada!' : '✅ Atividade criada!');
        
    } catch (error) {
        console.error('❌ Erro ao salvar atividade:', error);
        alert('Erro ao salvar atividade: ' + error.message);
    }
}

async function editarAtividade(atividadeId) {
    try {
        await gestorAtividades.carregarAtividadesParaVinculo();
        
        const atividadeDoc = await db.collection('atividades').doc(atividadeId).get();
        
        if (!atividadeDoc.exists) {
            alert('Atividade não encontrada');
            return;
        }
        
        const atividade = {
            id: atividadeDoc.id,
            ...atividadeDoc.data()
        };
        
        abrirModalAtividade(atividade.tarefaId, atividade.tipo, atividade);
        
    } catch (error) {
        console.error('❌ Erro ao buscar atividade:', error);
        alert('Erro ao carregar atividade: ' + error.message);
    }
}

function configurarListenerConclusoes() {
    db.collection('atividades').onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified') {
                const atividadeAntiga = change.doc._previousData;
                const atividadeNova = change.doc.data();
                
                if (atividadeAntiga.status !== 'concluido' && 
                    atividadeNova.status === 'concluido') {
                    
                    console.log(`🔄 Atividade ${change.doc.id} foi concluída!`);
                    
                    setTimeout(() => {
                        gestorAtividades.processarConclusaoAtividade(change.doc.id);
                    }, 500);
                }
            }
        });
    });
}

async function excluirAtividade(atividadeId) {
    if (!confirm('Tem certeza que deseja excluir esta atividade?')) return;
    
    try {
        await db.collection('atividades').doc(atividadeId).delete();
        alert('✅ Atividade excluída com sucesso!');
        
        await gestorAtividades.carregarDados();
        gestorAtividades.renderizarTarefas();
        gestorAtividades.atualizarGraficos();
        
    } catch (error) {
        console.error('❌ Erro ao excluir atividade:', error);
        alert('Erro ao excluir atividade: ' + error.message);
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    gestorAtividades.init();

    setTimeout(() => {
        configurarListenerConclusoes();
    }, 3000);
});

// Fechar modais clicando fora
window.onclick = function(event) {
    const modalAtividade = document.getElementById('modalAtividade');
    
    if (event.target === modalAtividade) {
        fecharModalAtividade();
    }
};
