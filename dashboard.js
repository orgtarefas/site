// arquivo dashboard.js 
console.log('=== GESTOR DE ATIVIDADES INICIANDO ===');

// ========== VARIÁVEIS GLOBAIS ==========
let tarefasExpandidas = new Set();
let gestorAtividades;
let ctrlPressed = false; // Variável global para controlar Ctrl

// ========== FUNÇÕES AUXILIARES ==========

// Função para visualizar atividade (para usuários não-responsáveis)
function visualizarAtividade(atividadeId) {
    console.log(`👁️ Visualizando atividade: ${atividadeId}`);
    
    try {
        if (gestorAtividades) {
            gestorAtividades.carregarAtividadesParaVinculo();
        }
        
        const atividadeDoc = await db.collection('atividades').doc(atividadeId).get();
        
        if (!atividadeDoc.exists) {
            alert('Atividade não encontrada');
            return;
        }
        
        const atividade = {
            id: atividadeDoc.id,
            ...atividadeDoc.data()
        };
        
        // Abrir modal apenas para visualização
        abrirModalVisualizacaoAtividade(atividade);
        
    } catch (error) {
        console.error('❌ Erro ao buscar atividade:', error);
        alert('Erro ao carregar atividade: ' + error.message);
    }
}

// Função para abrir modal de visualização (sem edição)
function abrirModalVisualizacaoAtividade(atividade) {
    console.log(`📋 Abrindo modal de visualização para atividade: ${atividade.id}`);
    
    const modal = document.getElementById('modalAtividade');
    const titulos = {
        'execucao': 'Execução das Atividades',
        'monitoramento': 'Monitoramento',
        'conclusao': 'Conclusão e Revisão'
    };
    
    document.getElementById('modalAtividadeTitulo').textContent = `Visualizar Atividade - ${titulos[atividade.tipo] || 'Detalhes'}`;
    
    // Formatar observadores
    const observadoresFormatados = atividade.observadores && atividade.observadores.length > 0 ?
        atividade.observadores.map(obs => {
            const usuarioObj = gestorAtividades.usuarios.find(u => u.usuario === obs);
            return usuarioObj ? (usuarioObj.nome || usuarioObj.usuario) : obs;
        }).join(', ') : 'Nenhum';
    
    // Formatar vínculos
    const vinculosFormatados = atividade.atividadesVinculadas && atividade.atividadesVinculadas.length > 0 ?
        atividade.atividadesVinculadas.length + ' atividade(s) vinculada(s)' : 'Nenhum';
    
    document.getElementById('modalAtividadeBody').innerHTML = `
        <div class="atividade-view">
            <div class="view-field">
                <label>Título:</label>
                <div class="view-value">${gestorAtividades.escapeHtml(atividade.titulo || '')}</div>
            </div>
            
            <div class="view-field">
                <label>Descrição:</label>
                <div class="view-value">${gestorAtividades.escapeHtml(atividade.descricao || 'Nenhuma descrição')}</div>
            </div>
            
            <div class="view-row">
                <div class="view-field">
                    <label>Responsável:</label>
                    <div class="view-value">${atividade.responsavel || 'Não definido'}</div>
                </div>
                <div class="view-field">
                    <label>Data Prevista:</label>
                    <div class="view-value">${atividade.dataPrevista || 'Sem data'}</div>
                </div>
            </div>
            
            <div class="view-row">
                <div class="view-field">
                    <label>Criado por:</label>
                    <div class="view-value">${atividade.criadoPor || 'Não informado'}</div>
                </div>
                <div class="view-field">
                    <label>Data de Criação:</label>
                    <div class="view-value">${atividade.dataRegistro ? 
                        new Date(atividade.dataRegistro.toDate()).toLocaleString('pt-BR') : 
                        'Não informada'}</div>
                </div>
            </div>
            
            <div class="view-row">
                <div class="view-field">
                    <label>Prioridade:</label>
                    <div class="view-value">
                        <span class="badge prioridade-${atividade.prioridade || 'media'}">
                            ${atividade.prioridade === 'alta' ? 'Alta' : 
                              atividade.prioridade === 'baixa' ? 'Baixa' : 'Média'}
                        </span>
                    </div>
                </div>
                <div class="view-field">
                    <label>Status:</label>
                    <div class="view-value">
                        <span class="badge status-${atividade.status || 'nao_iniciado'}">
                            ${getLabelStatus(atividade.status)}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="view-field">
                <label>Observadores:</label>
                <div class="view-value">${observadoresFormatados}</div>
            </div>
            
            <div class="view-field">
                <label>Vínculos com outras atividades:</label>
                <div class="view-value">${vinculosFormatados}</div>
            </div>
            
            <div class="view-field">
                <label>Última Atualização:</label>
                <div class="view-value">${atividade.dataAtualizacao ? 
                    new Date(atividade.dataAtualizacao.toDate()).toLocaleString('pt-BR') : 
                    'Não informada'}</div>
            </div>
            
            <div class="modal-footer" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                <button type="button" class="btn btn-outline" onclick="fecharModalAtividade()">Fechar</button>
                ${gestorAtividades.usuario && (gestorAtividades.usuario.usuario === atividade.responsavel || gestorAtividades.usuario.usuario === atividade.criadoPor) ?
                    `<button type="button" class="btn btn-primary" onclick="editarAtividade('${atividade.id}')">
                        <i class="fas fa-edit"></i> Editar Atividade
                    </button>` : ''
                }
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Função para atualizar preview dos observadores
function atualizarPreviewObservadores() {
    const select = document.getElementById('observadorAtividade');
    const preview = document.getElementById('observadoresPreview');
    const previewContainer = document.querySelector('.multi-select-preview');
    
    if (select && preview && previewContainer) {
        const selecionados = Array.from(select.selectedOptions).map(opt => opt.text);
        if (selecionados.length > 0) {
            if (selecionados.length === 1) {
                preview.textContent = selecionados[0];
            } else if (selecionados.length === 2) {
                preview.textContent = selecionados.join(' e ');
            } else {
                preview.textContent = `${selecionados.length} observadores selecionados`;
            }
            previewContainer.classList.add('has-selected');
        } else {
            preview.textContent = 'Nenhum observador selecionado';
            previewContainer.classList.remove('has-selected');
        }
    }
}

// Função para mostrar todos os observadores em um modal
function mostrarTodosObservadores(atividadeId) {
    console.log(`👁️ Mostrando todos os observadores da atividade: ${atividadeId}`);
    
    // Encontrar a atividade
    if (!gestorAtividades) return;
    
    let atividadeEncontrada = null;
    gestorAtividades.tarefas.forEach(tarefa => {
        const atividade = tarefa.atividades?.find(a => a.id === atividadeId);
        if (atividade) {
            atividadeEncontrada = atividade;
        }
    });
    
    if (!atividadeEncontrada) return;
    
    const observadores = atividadeEncontrada.observadores || [];
    
    if (observadores.length === 0) {
        alert('Esta atividade não tem observadores');
        return;
    }
    
    // Criar lista de observadores formatada
    const listaObservadores = observadores.map(obs => {
        const usuarioObj = gestorAtividades.usuarios.find(u => u.usuario === obs);
        const nomeExibicao = usuarioObj ? (usuarioObj.nome || usuarioObj.usuario) : obs;
        return `<li>${nomeExibicao}</li>`;
    }).join('');
    
    // Criar modal temporário
    const modalHTML = `
        <div id="modalObservadores" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h2><i class="fas fa-users"></i> Observadores da Atividade</h2>
                    <button class="close" onclick="fecharModalObservadores()">&times;</button>
                </div>
                <div class="modal-body">
                    <p><strong>Atividade:</strong> ${atividadeEncontrada.titulo}</p>
                    <p><strong>Total de observadores:</strong> ${observadores.length}</p>
                    <div class="observadores-lista" style="max-height: 300px; overflow-y: auto; margin-top: 15px;">
                        <ul style="list-style: none; padding: 0;">
                            ${listaObservadores}
                        </ul>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="fecharModalObservadores()">Fechar</button>
                </div>
            </div>
        </div>
    `;
    
    // Adicionar ao body
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHTML;
    document.body.appendChild(modalDiv);
    
    // Fechar ao clicar fora
    document.getElementById('modalObservadores').onclick = function(e) {
        if (e.target === this) {
            fecharModalObservadores();
        }
    };
}

// Função para fechar o modal de observadores
function fecharModalObservadores() {
    const modal = document.getElementById('modalObservadores');
    if (modal) {
        modal.remove();
    }
}


// Função para toggle do multi-select
function toggleMultiSelect(selectId) {
    const select = document.getElementById(selectId);
    const wrapper = select.parentElement;
    
    if (wrapper.classList.contains('select-open')) {
        // Se já está aberto, fecha
        wrapper.classList.remove('select-open');
        select.classList.remove('visible');
        
        // Remover o event listener global de fechamento
        if (wrapper._clickOutsideHandler) {
            document.removeEventListener('click', wrapper._clickOutsideHandler);
            delete wrapper._clickOutsideHandler;
        }
    } else {
        // Fecha outros selects abertos
        document.querySelectorAll('.multi-select-wrapper.select-open').forEach(otherWrapper => {
            otherWrapper.classList.remove('select-open');
            otherWrapper.querySelector('.multi-select').classList.remove('visible');
            
            // Remover event listeners dos outros selects
            if (otherWrapper._clickOutsideHandler) {
                document.removeEventListener('click', otherWrapper._clickOutsideHandler);
                delete otherWrapper._clickOutsideHandler;
            }
        });
        
        // Abre este select
        wrapper.classList.add('select-open');
        select.classList.add('visible');
        select.focus();
        
        // Configurar fechamento ao clicar fora
        const clickOutsideHandler = (e) => {
            if (!wrapper.contains(e.target)) {
                wrapper.classList.remove('select-open');
                select.classList.remove('visible');
                document.removeEventListener('click', clickOutsideHandler);
                delete wrapper._clickOutsideHandler;
                
                // Atualizar preview
                atualizarPreviewObservadores();
            }
        };
        
        wrapper._clickOutsideHandler = clickOutsideHandler;
        setTimeout(() => {
            document.addEventListener('click', clickOutsideHandler);
        }, 10);
    }
}

// Configurar detecção de teclas Ctrl
function configurarDetecaoCtrl() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Control' || e.key === 'Meta') {
            ctrlPressed = true;
            console.log('Ctrl pressionado');
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.key === 'Control' || e.key === 'Meta') {
            ctrlPressed = false;
            console.log('Ctrl liberado');
        }
    });
}

// Configurar comportamento do multi-select (CORRIGIDO)
function configurarMultiSelectBehavior() {
    const selectObservadores = document.getElementById('observadorAtividade');
    
    if (selectObservadores) {
        // Configurar detecção de Ctrl
        configurarDetecaoCtrl();
        
        // Detectar clique nas opções
        selectObservadores.addEventListener('click', (e) => {
            if (e.target.tagName === 'OPTION') {
                // Se Ctrl não está pressionado, fecha o dropdown
                if (!ctrlPressed) {
                    console.log('Ctrl NÃO pressionado - fechando dropdown');
                    
                    // Pequeno delay para permitir a seleção
                    setTimeout(() => {
                        const wrapper = selectObservadores.parentElement;
                        if (wrapper.classList.contains('select-open')) {
                            wrapper.classList.remove('select-open');
                            selectObservadores.classList.remove('visible');
                            
                            // Remover event listener
                            if (wrapper._clickOutsideHandler) {
                                document.removeEventListener('click', wrapper._clickOutsideHandler);
                                delete wrapper._clickOutsideHandler;
                            }
                        }
                        
                        // Atualizar preview
                        atualizarPreviewObservadores();
                    }, 150);
                } else {
                    console.log('Ctrl pressionado - mantendo dropdown aberto');
                    // Se Ctrl está pressionado, mantém aberto e só atualiza o preview
                    setTimeout(atualizarPreviewObservadores, 50);
                }
            }
        });
        
        // Também fechar com clique fora (backup)
        selectObservadores.addEventListener('blur', () => {
            // Pequeno delay para verificar se outro elemento ganhou foco
            setTimeout(() => {
                if (!document.activeElement || !selectObservadores.contains(document.activeElement)) {
                    const wrapper = selectObservadores.parentElement;
                    if (wrapper.classList.contains('select-open')) {
                        wrapper.classList.remove('select-open');
                        selectObservadores.classList.remove('visible');
                        
                        // Remover event listener
                        if (wrapper._clickOutsideHandler) {
                            document.removeEventListener('click', wrapper._clickOutsideHandler);
                            delete wrapper._clickOutsideHandler;
                        }
                        
                        // Atualizar preview
                        atualizarPreviewObservadores();
                    }
                }
            }, 100);
        });
        
        // Fechar com ESC
        selectObservadores.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const wrapper = selectObservadores.parentElement;
                wrapper.classList.remove('select-open');
                selectObservadores.classList.remove('visible');
                
                // Remover event listener
                if (wrapper._clickOutsideHandler) {
                    document.removeEventListener('click', wrapper._clickOutsideHandler);
                    delete wrapper._clickOutsideHandler;
                }
                
                // Atualizar preview
                atualizarPreviewObservadores();
            }
            
            // Permitir seleção múltipla com Shift
            if (e.key === 'Shift') {
                console.log('Shift pressionado para seleção múltipla');
            }
        });
        
        // Atualizar preview quando houver mudanças
        selectObservadores.addEventListener('change', atualizarPreviewObservadores);
        
        // Inicializar preview
        setTimeout(atualizarPreviewObservadores, 100);
    }
}

function manterEstadoExpansaoTarefas() {
    console.log('💾 Salvando estado de expansão das tarefas...');
    tarefasExpandidas.clear();
    
    document.querySelectorAll('.task-body').forEach(tarefa => {
        if (tarefa.style.display !== 'none') {
            const id = tarefa.id.replace('tarefa-', '');
            tarefasExpandidas.add(id);
            console.log(`✅ Tarefa ${id} estava expandida`);
        }
    });
}

function restaurarEstadoExpansaoTarefas() {
    console.log('🔄 Restaurando estado de expansão das tarefas...');
    tarefasExpandidas.forEach(id => {
        const elemento = document.getElementById(`tarefa-${id}`);
        const header = elemento ? elemento.previousElementSibling : null;
        const chevron = header ? header.querySelector('.fa-chevron-down, .fa-chevron-up') : null;
        
        if (elemento && header && chevron) {
            elemento.style.display = 'block';
            chevron.classList.remove('fa-chevron-down');
            chevron.classList.add('fa-chevron-up');
            console.log(`✅ Restaurada tarefa ${id}`);
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

async function carregarVinculosAtividade(atividadeId) {
    try {
        // Buscar atividades que têm esta atividade como vínculo
        const snapshot = await db.collection('atividades')
            .where('atividadesVinculadas', 'array-contains', atividadeId)
            .get();
        
        return snapshot.docs.map(doc => doc.id);
    } catch (error) {
        console.error('❌ Erro ao carregar vínculos da atividade:', error);
        return [];
    }
}

function toggleTarefa(tarefaId) {
    console.log(`🔧 Toggle tarefa: ${tarefaId}`);
    const elemento = document.getElementById(`tarefa-${tarefaId}`);
    const header = elemento.previousElementSibling;
    const chevron = header.querySelector('.fa-chevron-down, .fa-chevron-up');
    
    if (!elemento || !chevron) return;
    
    if (elemento.style.display === 'none') {
        elemento.style.display = 'block';
        chevron.classList.remove('fa-chevron-down');
        chevron.classList.add('fa-chevron-up');
        tarefasExpandidas.add(tarefaId);
        console.log(`✅ Expandida tarefa ${tarefaId}`);
    } else {
        elemento.style.display = 'none';
        chevron.classList.remove('fa-chevron-up');
        chevron.classList.add('fa-chevron-down');
        tarefasExpandidas.delete(tarefaId);
        console.log(`✅ Recolhida tarefa ${tarefaId}`);
    }
    
    event.stopPropagation();
}

function logout() {
    console.log('🚪 Logout realizado');
    localStorage.removeItem('usuarioLogado');
    window.location.href = 'login.html';
}

function verificarConclusaoVinculos() {
    const statusSelecionado = document.getElementById('statusAtividade')?.value;
    const checkboxes = document.querySelectorAll('.vinculos-container input[type="checkbox"]:checked');
    const alertDiv = document.getElementById('alertVinculos');
    const alertText = document.getElementById('alertVinculosText');
    
    if (statusSelecionado === 'concluido' && checkboxes.length > 0) {
        alertText.textContent = `Ao salvar, esta atividade será adicionada como vínculo em ${checkboxes.length} atividade(s) selecionada(s). Quando essas atividades forem concluídas, esta atividade será alterada para "Pendente".`;
        alertDiv.style.display = 'block';
    } else {
        alertDiv.style.display = 'none';
    }
}

function fecharModalAtividade() {
    console.log('❌ Fechando modal de atividade');
    document.getElementById('modalAtividade').style.display = 'none';
    if (gestorAtividades) {
        gestorAtividades.atividadeEditando = null;
    }
}

function configurarListenerConclusoes() {
    console.log('🎯 Configurando listener para conclusões...');
    
    if (!window.db) {
        console.error('❌ Firebase não está disponível');
        return;
    }
    
    db.collection('atividades').onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified') {
                const atividadeAntiga = change.doc._previousData;
                const atividadeNova = change.doc.data();
                
                if (atividadeAntiga?.status === atividadeNova.status) {
                    return;
                }
                
                // IMPORTANTE: Processar quando uma atividade é concluída
                if (atividadeAntiga?.status !== 'concluido' && 
                    atividadeNova.status === 'concluido') {
                    
                    console.log(`✅🔥 LISTENER: Atividade ${change.doc.id} foi concluída!`);
                    console.log(`📋 Vai processar: ${atividadeNova.atividadesVinculadas?.join(', ') || 'Nenhum'}`);
                    
                    if (gestorAtividades) {
                        setTimeout(() => {
                            gestorAtividades.processarConclusaoAtividade(change.doc.id);
                        }, 500);
                    }
                }
            }
        });
    });
}

// ========== CLASSE PRINCIPAL ==========
class GestorAtividades {
    constructor() {
        console.log('🏗️ Criando nova instância do GestorAtividades');
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

    // função 
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    async carregarAtividadesParaVinculo() {
        try {
            console.log('🔗 Carregando atividades para vínculo...');
            
            // Primeiro, obter grupos do usuário
            const usuarioAtual = this.usuario.usuario;
            const gruposSnapshot = await db.collection('grupos')
                .where('membros', 'array-contains', usuarioAtual)
                .get();
            
            const gruposIdsUsuario = gruposSnapshot.docs.map(doc => doc.id);
            
            // Se o usuário não pertence a nenhum grupo, não mostrar atividades para vínculo
            if (gruposIdsUsuario.length === 0) {
                this.atividadesDisponiveis = [];
                console.log('⚠️ Usuário não pertence a nenhum grupo - sem atividades para vínculo');
                return;
            }
            
            // Carregar TODAS as tarefas e filtrar
            const todasTarefasSnapshot = await db.collection('tarefas').get();
            
            // Filtrar tarefas que o usuário tem acesso
            const tarefasUsuario = todasTarefasSnapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .filter(tarefa => {
                    if (!tarefa.gruposAcesso || !Array.isArray(tarefa.gruposAcesso)) return false;
                    return tarefa.gruposAcesso.some(grupoId => 
                        gruposIdsUsuario.includes(grupoId)
                    );
                });
            
            const tarefasIds = tarefasUsuario.map(t => t.id);
            
            if (tarefasIds.length === 0) {
                this.atividadesDisponiveis = [];
                console.log('⚠️ Nenhuma tarefa disponível para o usuário - sem atividades para vínculo');
                return;
            }
            
            // Carregar atividades APENAS das tarefas que o usuário tem acesso
            const snapshot = await db.collection('atividades')
                .where('tarefaId', 'in', tarefasIds)
                .get();
            
            this.atividadesDisponiveis = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                tarefaNome: this.getNomeTarefa(doc.data().tarefaId)
            }));
            
            console.log(`✅ ${this.atividadesDisponiveis.length} atividades disponíveis para vínculo (do(s) grupo(s) do usuário)`);
            
        } catch (error) {
            console.error('❌ Erro ao carregar atividades para vínculo:', error);
            this.atividadesDisponiveis = [];
        }
    }

    getNomeTarefa(tarefaId) {
        const tarefa = this.tarefas.find(t => t.id === tarefaId);
        
        if (!tarefa) {
            console.log(`❌ Tarefa ${tarefaId} não encontrada`);
            return 'Tarefa não encontrada';
        }
        
        // Usar 'titulo' se existir, senão usar 'nome'
        const nome = tarefa.titulo || tarefa.nome || 'Tarefa sem nome';
        console.log(`✅ Tarefa ${tarefaId}: ${nome}`);
        return nome;
    }

    async verificarAutenticacao() {
        console.log('🔐 Verificando autenticação...');
        const usuarioLogado = localStorage.getItem('usuarioLogado');
        
        if (!usuarioLogado) {
            console.log('❌ Usuário não autenticado, redirecionando...');
            window.location.href = 'login.html';
            return;
        }
        
        this.usuario = JSON.parse(usuarioLogado);
        console.log(`✅ Usuário autenticado: ${this.usuario.nome || this.usuario.usuario}`);
        
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
    
            // OBTER GRUPOS DO USUÁRIO LOGADO
            const usuarioAtual = this.usuario.usuario;
            console.log(`👤 Usuário atual: ${usuarioAtual}`);
            
            // Buscar grupos onde o usuário é membro
            const gruposSnapshot = await db.collection('grupos')
                .where('membros', 'array-contains', usuarioAtual)
                .get();
            
            const gruposUsuario = gruposSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            const gruposIdsUsuario = gruposUsuario.map(g => g.id);
            console.log(`📌 IDs dos grupos do usuário:`, gruposIdsUsuario);
            
            // Se o usuário não pertence a nenhum grupo, mostrar todas as tarefas
            // (isso é para compatibilidade, mas você pode querer mostrar uma mensagem)
            if (gruposIdsUsuario.length === 0) {
                console.log('⚠️ Usuário não pertence a nenhum grupo, mostrando todas as tarefas');
            }
    
            // Carregar TODAS as tarefas
            const tarefasSnapshot = await db.collection('tarefas').get();
            
            // Filtrar tarefas que o usuário tem acesso
            this.tarefas = tarefasSnapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .filter(tarefa => {
                    // Se o usuário não tem grupos, mostrar todas (compatibilidade)
                    if (gruposIdsUsuario.length === 0) return true;
                    
                    // Se a tarefa não tem gruposAcesso, o usuário não tem acesso
                    if (!tarefa.gruposAcesso || !Array.isArray(tarefa.gruposAcesso) || tarefa.gruposAcesso.length === 0) {
                        console.log(`❌ Tarefa ${tarefa.id} não tem gruposAcesso definido`);
                        return false;
                    }
                    
                    // Verificar se há interseção entre grupos da tarefa e grupos do usuário
                    const temAcesso = tarefa.gruposAcesso.some(grupoId => 
                        gruposIdsUsuario.includes(grupoId)
                    );
                    
                    if (!temAcesso) {
                        console.log(`🚫 Usuário NÃO tem acesso à tarefa: ${tarefa.titulo || tarefa.nome}`);
                    } else {
                        console.log(`✅ Usuário TEM acesso à tarefa: ${tarefa.titulo || tarefa.nome}`);
                    }
                    
                    return temAcesso;
                });
            
            console.log(`✅ ${this.tarefas.length} tarefas filtradas do(s) grupo(s) do usuário:`);
            this.tarefas.forEach(t => {
                const gruposAcesso = t.gruposAcesso || [];
                console.log(`  - ${t.id}: ${t.titulo || t.nome || 'Sem nome'} 
                    (GruposAcesso: ${gruposAcesso.join(', ')})`);
            });
    
            // Carregar atividades
            const atividadesSnapshot = await db.collection('atividades').get();
            const todasAtividades = atividadesSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    tarefaNome: this.getNomeTarefa(data.tarefaId)
                };
            });
            
            console.log(`✅ ${todasAtividades.length} atividades carregadas`);
            
            // Agrupar atividades por tarefa (apenas tarefas que o usuário tem acesso)
            this.tarefas.forEach(tarefa => {
                tarefa.atividades = todasAtividades.filter(a => a.tarefaId === tarefa.id);
                console.log(`📌 Tarefa "${this.getNomeTarefa(tarefa.id)}" tem ${tarefa.atividades.length} atividades`);
            });
    
            // Atualizar status
            document.getElementById('status-sincronizacao').innerHTML = 
                '<i class="fas fa-check-circle"></i> Sincronizado';
    
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            document.getElementById('status-sincronizacao').innerHTML = 
                '<i class="fas fa-exclamation-triangle"></i> Offline';
        }
    }

    inicializarGraficos() {
        console.log('📊 Inicializando gráficos...');
        this.inicializarGraficoStatus();
        this.inicializarGraficoProgresso();
        this.inicializarGraficoTimeline();
    }

    inicializarGraficoStatus() {
        try {
            const ctx = document.getElementById('statusChart').getContext('2d');
            const dados = this.calcularEstatisticas();
            
            console.log('Dados para gráfico de status:', dados);
            
            this.charts.status = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Não Iniciadas', 'Pendentes', 'Em Andamento', 'Concluídas', 'Atrasadas'],
                    datasets: [{
                        data: [
                            dados.naoIniciadas,
                            dados.pendentes,  
                            dados.andamento,
                            dados.concluidas,
                            dados.atrasadas
                        ],
                        backgroundColor: [
                            '#6c757d',
                            '#f39c12',
                            '#3498db',
                            '#27ae60',
                            '#e74c3c'
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
            console.log('✅ Gráfico de status inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar gráfico de status:', error);
        }
    }

    inicializarGraficoProgresso() {
        try {
            const ctx = document.getElementById('progressChart').getContext('2d');
            
            // Usar titulo se existir, senão nome
            const tarefasNomes = this.tarefas.map(t => t.titulo || t.nome || 'Sem nome');
            const tarefasProgresso = this.tarefas.map(tarefa => {
                const atividades = tarefa.atividades || [];
                if (atividades.length === 0) return 0;
                const concluidas = atividades.filter(a => a.status === 'concluido').length;
                return (concluidas / atividades.length) * 100;
            });

            this.charts.progress = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: tarefasNomes,
                    datasets: [{
                        label: 'Progresso (%)',
                        data: tarefasProgresso,
                        backgroundColor: this.tarefas.map(t => t.cor || '#2C3E50')
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });
            console.log('✅ Gráfico de progresso inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar gráfico de progresso:', error);
        }
    }

    inicializarGraficoTimeline() {
        try {
            const ctx = document.getElementById('timelineChart').getContext('2d');
            
            // Dados de exemplo
            const ultimos7Dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
            const dadosTimeline = [5, 8, 12, 6, 15, 10, 7];

            this.charts.timeline = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ultimos7Dias,
                    datasets: [{
                        label: 'Atividades Concluídas',
                        data: dadosTimeline,
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39, 174, 96, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            console.log('✅ Gráfico de timeline inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar gráfico de timeline:', error);
        }
    }

    calcularEstatisticas() {
        let total = 0;
        let naoIniciadas = 0;
        let pendentes = 0;
        let andamento = 0;
        let concluidas = 0;
        let atrasadas = 0;
    
        this.tarefas.forEach(tarefa => {
            const atividades = tarefa.atividades || [];
            total += atividades.length;
            
            atividades.forEach(atividade => {
                const status = atividade.status ? atividade.status.toLowerCase().trim() : '';
                
                if (status === 'nao_iniciado' || status === 'não iniciado') {
                    naoIniciadas++;
                } else if (status === 'pendente') {
                    pendentes++;
                } else if (status === 'andamento') {
                    andamento++;
                } else if (status === 'concluido' || status === 'concluído') {
                    concluidas++;
                }
            });
        });
    
        console.log('📊 Estatísticas:', { total, naoIniciadas, pendentes, andamento, concluidas, atrasadas });
        
        // Atualizar interface
        document.getElementById('total-atividades').textContent = total;
        document.getElementById('nao-iniciadas').textContent = naoIniciadas;
        document.getElementById('pendentes').textContent = pendentes;
        document.getElementById('andamento').textContent = andamento;
        document.getElementById('concluidas').textContent = concluidas;
        document.getElementById('atrasadas').textContent = atrasadas;
    
        return { total, naoIniciadas, pendentes, andamento, concluidas, atrasadas };
    }

    renderizarTarefas() {
        console.log('🎨 Renderizando tarefas...');
        const container = document.getElementById('tarefas-container');
        
        // Verificar se há tarefas para o usuário atual
        if (this.tarefas.length === 0) {
            // Verificar se o usuário pertence a algum grupo
            const usuarioAtual = this.usuario.usuario;
            
            db.collection('grupos')
                .where('membros', 'array-contains', usuarioAtual)
                .get()
                .then(gruposSnapshot => {
                    const temGrupos = gruposSnapshot.size > 0;
                    
                    if (!temGrupos) {
                        container.innerHTML = `
                            <div class="empty-tarefas">
                                <i class="fas fa-users-slash"></i>
                                <h3>Você não pertence a nenhum grupo</h3>
                                <p>Para visualizar tarefas, você precisa ser membro de um grupo de trabalho.</p>
                                <button class="btn btn-primary btn-sm mt-3" onclick="window.location.href='workmanager.html'">
                                    <i class="fas fa-users"></i> Ir para Grupos de Trabalho
                                </button>
                            </div>
                        `;
                    } else {
                        container.innerHTML = `
                            <div class="empty-tarefas">
                                <i class="fas fa-tasks"></i>
                                <h3>Nenhuma tarefa disponível</h3>
                                <p>Não há tarefas atribuídas aos seus grupos de trabalho no momento.</p>
                                <button class="btn btn-primary btn-sm mt-3" onclick="window.location.href='index.html'">
                                    <i class="fas fa-cog"></i> Ir para Configurações
                                </button>
                            </div>
                        `;
                    }
                })
                .catch(error => {
                    console.error('❌ Erro ao verificar grupos do usuário:', error);
                    
                    // Fallback: mostrar mensagem padrão
                    container.innerHTML = `
                        <div class="empty-tarefas">
                            <i class="fas fa-tasks"></i>
                            <h3>Nenhuma tarefa disponível</h3>
                            <p>Não foi possível carregar as tarefas do momento.</p>
                            <button class="btn btn-primary btn-sm mt-3" onclick="window.location.reload()">
                                <i class="fas fa-sync-alt"></i> Tentar novamente
                            </button>
                        </div>
                    `;
                });
            
            return;
        }
        
        // Salvar estado atual ANTES de re-renderizar
        manterEstadoExpansaoTarefas();
        
        container.innerHTML = this.tarefas.map(tarefa => {
            // Verificar se esta tarefa estava expandida
            const estavaExpandida = tarefasExpandidas.has(tarefa.id);
            
            // Usar titulo se existir, senão nome
            const nomeExibicao = tarefa.titulo || tarefa.nome || 'Tarefa sem nome';
            
            // Obter informações dos grupos da tarefa para exibição
            const gruposAcessoInfo = this.obterInfoGruposTarefa(tarefa);
            
            return `
                <div class="task-card">
                    <div class="task-header" onclick="toggleTarefa('${tarefa.id}')">
                        <div class="task-title-section">
                            <h2>
                                <i class="fas fa-tasks" style="color: ${tarefa.cor || '#2C3E50'}"></i>
                                ${nomeExibicao}
                            </h2>
                            ${gruposAcessoInfo ? `
                                <div class="task-groups-info" title="Grupos com acesso a esta tarefa">
                                    <i class="fas fa-users"></i>
                                    <span>${gruposAcessoInfo}</span>
                                </div>
                            ` : ''}
                        </div>
                        <div class="task-status">
                            <div class="status-badges-container">
                                ${this.getTextoStatusTarefa(tarefa)}
                            </div>
                            <i class="fas fa-chevron-${estavaExpandida ? 'up' : 'down'}"></i>
                        </div>
                    </div>
                    <div class="task-body" id="tarefa-${tarefa.id}" style="display: ${estavaExpandida ? 'block' : 'none'};">
                        ${tarefa.descricao ? `<p class="task-desc">${tarefa.descricao}</p>` : ''}
                        <div class="activities-grid">
                            ${this.renderizarAtividadesTarefa(tarefa)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log(`✅ Renderizadas ${this.tarefas.length} tarefas`);
        
        // Restaurar o estado de expansão
        setTimeout(() => {
            restaurarEstadoExpansaoTarefas();
        }, 10);
    }
    
    // Adicione esta função auxiliar para obter informações dos grupos da tarefa
    obterInfoGruposTarefa(tarefa) {
        if (!tarefa.gruposAcesso || !Array.isArray(tarefa.gruposAcesso) || tarefa.gruposAcesso.length === 0) {
            return null;
        }
        
        // Tentar obter nomes dos grupos
        const gruposDoUsuario = this.obterGruposUsuarioCache();
        
        if (gruposDoUsuario && gruposDoUsuario.length > 0) {
            const gruposNomes = [];
            
            tarefa.gruposAcesso.forEach(grupoId => {
                const grupo = gruposDoUsuario.find(g => g.id === grupoId);
                if (grupo) {
                    gruposNomes.push(grupo.nome || `Grupo ${grupoId.substring(0, 6)}...`);
                } else {
                    gruposNomes.push(`Grupo ${grupoId.substring(0, 6)}...`);
                }
            });
            
            if (gruposNomes.length > 0) {
                // Limitar a exibição para 2 grupos, mostrar "e mais X" se tiver mais
                if (gruposNomes.length <= 2) {
                    return gruposNomes.join(', ');
                } else {
                    return `${gruposNomes.slice(0, 2).join(', ')} e mais ${gruposNomes.length - 2}`;
                }
            }
        }
        
        // Fallback: mostrar apenas a quantidade de grupos
        return `${tarefa.gruposAcesso.length} grupo(s)`;
    }
    
    // Adicione esta função para cachear os grupos do usuário (opcional, para performance)
    obterGruposUsuarioCache() {
        // Esta função pode ser implementada para cachear os grupos
        // Por enquanto retornamos null e buscamos quando necessário
        return null;
    }
    

    calcularEstatisticasTarefa(tarefa) {
        const atividades = tarefa.atividades || [];
        const total = atividades.length;
        const naoIniciadas = atividades.filter(a => a.status === 'nao_iniciado').length;
        const pendentes = atividades.filter(a => a.status === 'pendente').length;
        const andamento = atividades.filter(a => a.status === 'andamento').length;
        const concluidas = atividades.filter(a => a.status === 'concluido').length;
        
        return {
            total,
            naoIniciadas,
            pendentes,
            andamento,
            concluidas
        };
    }
    
    renderizarAtividadesTarefa(tarefa) {
        const atividades = tarefa.atividades || [];
        
        if (atividades.length === 0) {
            return `
                <div class="empty-activities">
                    <p>Nenhuma atividade cadastrada para esta tarefa</p>
                    <button class="btn btn-primary btn-sm" onclick="abrirModalAtividade('${tarefa.id}')">
                        <i class="fas fa-plus"></i> Adicionar Atividade
                    </button>
                </div>
            `;
        }
    
        // Agrupar por tipo
        const tipos = ['execucao', 'monitoramento', 'conclusao'];
        const titulos = {
            'execucao': 'Execução das Atividades',
            'monitoramento': 'Monitoramento',
            'conclusao': 'Conclusão e Revisão'
        };
    
        return tipos.map(tipo => {
            const atividadesTipo = atividades.filter(a => a.tipo === tipo);
            
            return `
                <div class="activity-section">
                    <div class="section-header">
                        <h3><i class="fas fa-list-check"></i> ${titulos[tipo]}</h3>
                        <button class="btn btn-primary btn-sm" onclick="abrirModalAtividade('${tarefa.id}', '${tipo}')">
                            <i class="fas fa-plus"></i> Nova Atividade
                        </button>
                    </div>
                    <div class="checklist">
                        ${atividadesTipo.length > 0 ? 
                            atividadesTipo.map(atividade => {
                                const status = atividade.status || 'nao_iniciado';
                                const atividadesVinculadas = atividade.atividadesVinculadas || [];
                                const temVinculos = atividadesVinculadas.length > 0;
                                const observadores = atividade.observadores || [];
                                const temObservadores = observadores.length > 0;
                                const totalObservadores = observadores.length;
                                
                                // Verificar permissões do usuário atual
                                const usuarioAtual = this.usuario ? this.usuario.usuario : null;
                                const isResponsavel = usuarioAtual && atividade.responsavel === usuarioAtual;
                                const isCriador = usuarioAtual && atividade.criadoPor === usuarioAtual;
                                const podeEditarExcluir = isResponsavel || isCriador;
                                const podeAlterarStatus = isResponsavel; // Apenas responsável altera status
                                
                                // Limitar exibição para 2 observadores, mostrar "e mais X"
                                let observadoresHTML = '';
                                let verMaisHTML = '';
                                
                                if (temObservadores) {
                                    // Limitar a 2 observadores
                                    const observadoresLimitados = totalObservadores > 2 ? 
                                        observadores.slice(0, 2) : observadores;
                                    
                                    observadoresHTML = observadoresLimitados.map(obs => {
                                        const usuarioObj = this.usuarios.find(u => u.usuario === obs);
                                        const nomeExibicao = usuarioObj ? (usuarioObj.nome || usuarioObj.usuario) : obs;
                                        return `<span class="observador-tag" data-observador="${obs}">${nomeExibicao}</span>`;
                                    }).join('');
                                    
                                    // Adicionar botão "Ver mais" se tiver mais de 2
                                    if (totalObservadores > 2) {
                                        const restantes = totalObservadores - 2;
                                        verMaisHTML = `
                                            <button class="btn-ver-mais-observadores" 
                                                    data-atividade-id="${atividade.id}" 
                                                    onclick="mostrarTodosObservadores('${atividade.id}')"
                                                    title="Clique para ver todos os observadores">
                                                <span class="observador-tag observador-ver-mais">
                                                    <i class="fas fa-users"></i> +${restantes}
                                                </span>
                                            </button>
                                        `;
                                    }
                                }
                                
                                const opcoesStatus = [
                                    {value: 'nao_iniciado', label: 'Não Iniciado'},
                                    {value: 'pendente', label: 'Pendente'},
                                    {value: 'andamento', label: 'Em Andamento'},
                                    {value: 'concluido', label: 'Concluído'}
                                ];
                                
                                // Gerar select baseado no papel do usuário
                                let selectHTML = '';
                                if (podeAlterarStatus) {
                                    // Responsável: select normal
                                    selectHTML = opcoesStatus.map(opcao => `
                                        <option value="${opcao.value}" ${status === opcao.value ? 'selected' : ''}>
                                            ${opcao.label}
                                        </option>
                                    `).join('');
                                } else {
                                    // Não é responsável: apenas visualização
                                    const statusAtual = opcoesStatus.find(opcao => opcao.value === status);
                                    const statusLabel = statusAtual ? statusAtual.label : 'Não definido';
                                    
                                    // Determinar a cor do badge baseado no status
                                    let badgeClass = '';
                                    switch(status) {
                                        case 'nao_iniciado': badgeClass = 'status-nao_iniciado'; break;
                                        case 'pendente': badgeClass = 'status-pendente'; break;
                                        case 'andamento': badgeClass = 'status-andamento'; break;
                                        case 'concluido': badgeClass = 'status-concluido'; break;
                                        default: badgeClass = 'status-nao_iniciado';
                                    }
                                    
                                    selectHTML = `
                                        <div class="status-display-only" title="Apenas o responsável pode alterar o status">
                                            <span class="badge ${badgeClass}">
                                                ${isResponsavel ? '<i class="fas fa-user-check" style="margin-right: 4px; font-size: 10px;"></i>' : 
                                                  isCriador ? '<i class="fas fa-plus-circle" style="margin-right: 4px; font-size: 10px;"></i>' : 
                                                  '<i class="fas fa-lock" style="margin-right: 4px; font-size: 10px;"></i>'}
                                                ${statusLabel}
                                            </span>
                                        </div>
                                    `;
                                }
                                
                                const tituloEscapado = (atividade.titulo || '').replace(/'/g, "\\'");
                                
                                // Badges indicativos de papel
                                let roleBadges = '';
                                if (isResponsavel) {
                                    roleBadges += `
                                        <span class="role-badge responsavel-badge" title="Você é o responsável por esta atividade">
                                            <i class="fas fa-user-check"></i> Responsável
                                        </span>
                                    `;
                                }
                                if (isCriador && !isResponsavel) {
                                    roleBadges += `
                                        <span class="role-badge criador-badge" title="Você criou esta atividade">
                                            <i class="fas fa-plus-circle"></i> Criador
                                        </span>
                                    `;
                                }
                                
                                return `
                                    <div class="checklist-item ${temVinculos ? 'atividade-com-vinculos' : ''} ${podeEditarExcluir ? 'pode-editar-atividade' : ''}">
                                        <div class="item-info">
                                            <div class="item-title">
                                                ${atividade.titulo}
                                                ${roleBadges}
                                                ${temVinculos ? 
                                                    `<span class="vinculos-tooltip" title="Esta atividade é vínculo de ${atividadesVinculadas.length} outra(s) atividade(s)">
                                                        <i class="fas fa-link text-info" style="margin-left: 8px; font-size: 12px;"></i>
                                                    </span>`
                                                    : ''
                                                }
                                            </div>
                                            ${atividade.descricao ? `<div class="item-desc">${atividade.descricao}</div>` : ''}
                                            <div class="item-meta">
                                                <span><i class="fas fa-user"></i> ${atividade.responsavel || 'Não definido'}</span>
                                                ${atividade.criadoPor ? 
                                                    `<span class="criador-info" title="Criado por ${atividade.criadoPor}">
                                                        <i class="fas fa-user-plus"></i> ${atividade.criadoPor}
                                                    </span>` 
                                                    : ''
                                                }
                                                ${temObservadores ? 
                                                    `<span class="observadores-container">
                                                        <i class="fas fa-eye"></i> Observadores: 
                                                        ${observadoresHTML}
                                                        ${verMaisHTML}
                                                    </span>` 
                                                    : ''
                                                }
                                                <span><i class="fas fa-calendar"></i> ${atividade.dataPrevista || 'Sem data'}</span>
                                                ${!podeAlterarStatus ? 
                                                    // Status para não-responsável (só visualização)
                                                    `<span class="badge status-${status}">
                                                        ${getLabelStatus(status)}
                                                    </span>` 
                                                    : ''
                                                }
                                                ${temVinculos ? 
                                                    `<span class="vinculos-badge">
                                                        <i class="fas fa-link"></i> ${atividadesVinculadas.length} vínculo(s)
                                                    </span>` 
                                                    : ''
                                                }
                                            </div>
                                        </div>
                                        <div class="item-actions">
                                            <div class="status-selector">
                                                ${podeAlterarStatus ? 
                                                    // Responsável: pode alterar status
                                                    `<select class="status-select" 
                                                            data-id="${atividade.id}"
                                                            data-titulo="${tituloEscapado}"
                                                            onchange="alterarStatusAtividade('${atividade.id}', this.value, '${tituloEscapado}')">
                                                        ${selectHTML}
                                                    </select>`
                                                    : 
                                                    // Não é responsável: apenas visualização
                                                    selectHTML
                                                }
                                            </div>
                                            
                                            ${podeEditarExcluir ? 
                                                // Responsável OU Criador: pode editar
                                                `<button class="btn-icon btn-edit" onclick="editarAtividade('${atividade.id}')">
                                                    <i class="fas fa-edit"></i>
                                                </button>`
                                                :
                                                // Não pode editar: visualização apenas
                                                `<button class="btn-icon btn-view" onclick="visualizarAtividade('${atividade.id}')" title="Visualizar atividade">
                                                    <i class="fas fa-eye"></i>
                                                </button>`
                                            }
                                            ${podeEditarExcluir ? 
                                                // Responsável OU Criador: pode excluir
                                                `<button class="btn-icon btn-delete" onclick="excluirAtividade('${atividade.id}')">
                                                    <i class="fas fa-trash"></i>
                                                </button>`
                                                :
                                                // Não pode excluir
                                                ''
                                            }
                                        </div>
                                    </div>
                                `;
                            }).join('') :
                            '<div class="checklist-item"><div class="item-desc">Nenhuma atividade cadastrada</div></div>'
                        }
                    </div>
                </div>
            `;
        }).join('');
    }

    getTextoStatusTarefa(tarefa) {
        const stats = this.calcularEstatisticasTarefa(tarefa);
        const total = stats.total;
        
        if (total === 0) {
            return '<span class="status-mini-badge badge-sem-atividades">Sem atividades</span>';
        }
        
        const badges = [];
        
        if (stats.naoIniciadas > 0) {
            badges.push(`<span class="status-mini-badge badge-nao_iniciado">Não Iniciado (${stats.naoIniciadas}/${total})</span>`);
        }
        if (stats.pendentes > 0) {
            badges.push(`<span class="status-mini-badge badge-pendente">Pendente (${stats.pendentes}/${total})</span>`);
        }
        if (stats.andamento > 0) {
            badges.push(`<span class="status-mini-badge badge-andamento">Em Andamento (${stats.andamento}/${total})</span>`);
        }
        if (stats.concluidas > 0) {
            badges.push(`<span class="status-mini-badge badge-concluido">Concluído (${stats.concluidas}/${total})</span>`);
        }
        
        return badges.join(' ');
    }

    configurarListeners() {
        console.log('🎧 Configurando listeners...');
        
        // Listener para atualizações de atividades
        db.collection('atividades').onSnapshot(() => {
            console.log('🔄 Atualizando atividades em tempo real...');
            this.carregarDados().then(() => {
                this.renderizarTarefas();
                this.atualizarGraficos();
            });
        });
        
        // Listener para tarefas
        db.collection('tarefas').onSnapshot(() => {
            console.log('🔄 Atualizando lista de tarefas...');
            this.carregarDados().then(() => {
                this.renderizarTarefas();
                this.atualizarGraficos();
            });
        });
        
        configurarListenerConclusoes();
    }
    
    atualizarGraficos() {
        console.log('📈 Atualizando gráficos...');
        
        if (this.charts.status) {
            const dados = this.calcularEstatisticas();
            
            this.charts.status.data.datasets[0].data = [
                dados.naoIniciadas,
                dados.pendentes,
                dados.andamento,
                dados.concluidas,
                dados.atrasadas
            ];
            
            this.charts.status.update();
        }
    
        if (this.charts.progress) {
            const tarefasProgresso = this.tarefas.map(tarefa => {
                const atividades = tarefa.atividades || [];
                if (atividades.length === 0) return 0;
                const concluidas = atividades.filter(a => a.status === 'concluido').length;
                const andamento = atividades.filter(a => a.status === 'andamento').length;
                const total = atividades.length;
                const progresso = concluidas + andamento;
                return (progresso / total) * 100;
            });
            
            this.charts.progress.data.datasets[0].data = tarefasProgresso;
            this.charts.progress.update();
        }
    }

    async processarConclusaoAtividade(atividadeId) {
        try {
            console.log(`🔍 Processando conclusão da atividade: ${atividadeId}`);
            
            // PRIMEIRO: Buscar a atividade que foi concluída
            const atividadeConcluidaDoc = await db.collection('atividades').doc(atividadeId).get();
            
            if (!atividadeConcluidaDoc.exists) {
                console.log(`❌ Atividade ${atividadeId} não encontrada`);
                return;
            }
            
            const atividadeConcluida = atividadeConcluidaDoc.data();
            
            // AGORA: Buscar as atividades que ESTÃO nos vínculos da atividade concluída
            // Ou seja: atividades cujos IDs estão em atividadesVinculadas da atividade concluída
            const atividadesVinculadasIds = atividadeConcluida.atividadesVinculadas || [];
            
            console.log(`📋 Atividade ${atividadeId} tem ${atividadesVinculadasIds.length} atividade(s) em seus vínculos:`, atividadesVinculadasIds);
            
            if (atividadesVinculadasIds.length > 0) {
                console.log(`🔄 Processando ${atividadesVinculadasIds.length} atividades que estão nos vínculos de ${atividadeId}`);
                
                const batch = db.batch();
                let atualizadas = 0;
                
                // Para cada ID que está na lista de vínculos da atividade concluída
                for (const vinculadaId of atividadesVinculadasIds) {
                    const atividadeVinculadaRef = db.collection('atividades').doc(vinculadaId);
                    const vinculadaDoc = await atividadeVinculadaRef.get();
                    
                    if (vinculadaDoc.exists) {
                        const vinculadaData = vinculadaDoc.data();
                        
                        // Verificar se a atividade NÃO está concluída
                        if (vinculadaData.status !== 'concluido') {
                            batch.update(atividadeVinculadaRef, {
                                status: 'pendente',
                                dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
                            });
                            atualizadas++;
                            console.log(`✅ Marcando atividade ${vinculadaId} (que está no vínculo de ${atividadeId}) como pendente`);
                        } else {
                            console.log(`ℹ️ Atividade ${vinculadaId} já está concluída, mantendo status`);
                        }
                    }
                }
                
                if (atualizadas > 0) {
                    await batch.commit();
                    console.log(`✅ ${atualizadas} atividades foram atualizadas para "pendente"`);
                } else {
                    console.log(`ℹ️ Nenhuma atividade precisa ser atualizada para pendente`);
                }
                
                // Recarregar dados após atualização
                setTimeout(() => {
                    this.carregarDados().then(() => {
                        restaurarEstadoExpansaoTarefas();
                        this.renderizarTarefas();
                        this.atualizarGraficos();
                    });
                }, 1000);
            } else {
                console.log(`ℹ️ Atividade ${atividadeId} não tem atividades em seus vínculos`);
            }
            
        } catch (error) {
            console.error('❌ Erro ao processar conclusão:', error);
        }
    }

    async abrirModalAtividade(tarefaId, tipo = 'execucao', atividadeExistente = null) {
        console.log(`📋 Abrindo modal para ${atividadeExistente ? 'editar' : 'criar'} atividade`);
        this.atividadeEditando = atividadeExistente ? atividadeExistente.id : null;
        
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
        
        const usuariosOptions = this.usuarios.map(user => {
            const nomeExibicao = user.nome || user.usuario;
            return `<option value="${user.usuario}">${nomeExibicao}</option>`;
        }).join('');
        
        const formatarDataParaInput = (dataString) => {
            if (!dataString) return '';
            return dataString.split('T')[0];
        };
        
        // Preparar observadores selecionados
        const observadoresSelecionados = atividadeExistente && atividadeExistente.observadores 
            ? atividadeExistente.observadores 
            : [];
        
        let atividadesVinculadasHTML = '';
        if (this.atividadesDisponiveis.length > 0) {
            const atividadesParaVincular = this.atividadesDisponiveis.filter(atv => 
                !atividadeExistente || atv.id !== atividadeExistente.id
            );
            
            const atividadesVinculadasIds = atividadeExistente && atividadeExistente.atividadesVinculadas 
                ? atividadeExistente.atividadesVinculadas 
                : [];
            
            atividadesVinculadasHTML = `
                <div class="form-group">
                    <label for="vinculosAtividade">
                        <i class="fas fa-link"></i> Vincular Atividade (opcional)
                        <small class="form-text">Ao selecionar atividades abaixo, esta atividade será adicionada como vínculo NAS ATIVIDADES SELECIONADAS. Quando as atividades selecionadas forem concluídas, esta atividade será alterada para "Pendente".</small>
                    </label>
                    <div class="vinculos-container" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 10px;">
                        ${atividadesParaVincular.map(atv => {
                            // Verificar se ESTA atividade (a que está sendo editada) já é vínculo da atividade atv
                            let checked = false;
                            if (atv.atividadesVinculadas && atividadeExistente) {
                                // A atividade atv tem atividadeExistente em seus vínculos?
                                checked = atv.atividadesVinculadas.includes(atividadeExistente.id);
                            }
                            
                            return `
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" value="${atv.id}" id="vinculo-${atv.id}" ${checked ? 'checked' : ''}>
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
                           value="${atividadeExistente ? this.escapeHtml(atividadeExistente.titulo) : ''}">
                </div>
                <div class="form-group">
                    <label for="descricaoAtividade">Descrição</label>
                    <textarea id="descricaoAtividade" class="form-control" rows="3">${atividadeExistente ? this.escapeHtml(atividadeExistente.descricao || '') : ''}</textarea>
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
                        <label for="observadorAtividade">Observadores (opcional)</label>
                        <div class="multi-select-wrapper">
                            <div class="multi-select-preview" onclick="toggleMultiSelect('observadorAtividade')">
                                <span id="observadoresPreview">Nenhum observador selecionado</span>
                                <i class="fas fa-chevron-down"></i>
                            </div>
                            <select id="observadorAtividade" class="form-control multi-select" multiple size="5">
                                ${usuariosOptions}
                            </select>
                        </div>
                        <small class="form-text">Clique para selecionar múltiplos observadores (Ctrl+Clique para seleção múltipla)</small>
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
        
        // Configurar valores após o DOM ser renderizado
        setTimeout(() => {
            // Configurar responsável
            const selectResponsavel = document.getElementById('responsavelAtividade');
            if (selectResponsavel && atividadeExistente && atividadeExistente.responsavel) {
                selectResponsavel.value = atividadeExistente.responsavel;
            }
            
            // Configurar observadores
            const selectObservadores = document.getElementById('observadorAtividade');
            if (selectObservadores && observadoresSelecionados.length > 0) {
                observadoresSelecionados.forEach(obs => {
                    for (let i = 0; i < selectObservadores.options.length; i++) {
                        if (selectObservadores.options[i].value === obs) {
                            selectObservadores.options[i].selected = true;
                            break;
                        }
                    }
                });
            }
            
            // Configurar o multi-select
            configurarMultiSelectBehavior();
            
            // Atualizar preview inicial
            atualizarPreviewObservadores();
        }, 100);
        
        verificarConclusaoVinculos();
    }
        
}

// ========== FUNÇÕES RESTANTES ==========

async function abrirModalAtividade(tarefaId, tipo = 'execucao', atividadeExistente = null) {
    if (gestorAtividades) {
        await gestorAtividades.abrirModalAtividade(tarefaId, tipo, atividadeExistente);
        // Adicione 'async' na declaração e 'await' na chamada
    }
}

async function salvarAtividade(tarefaId, tipo) {
    console.log(`💾 Salvando atividade para tarefa: ${tarefaId}, tipo: ${tipo}`);
    
    const titulo = document.getElementById('tituloAtividade').value;
    const responsavel = document.getElementById('responsavelAtividade').value;
    
    if (!titulo || !responsavel) {
        alert('Preencha todos os campos obrigatórios');
        return;
    }
    
    // Coletar múltiplos observadores selecionados
    const observadoresSelect = document.getElementById('observadorAtividade');
    const observadores = [];
    if (observadoresSelect) {
        for (let i = 0; i < observadoresSelect.options.length; i++) {
            if (observadoresSelect.options[i].selected) {
                observadores.push(observadoresSelect.options[i].value);
            }
        }
    }
    
    // Coletar IDs das atividades selecionadas para vincular
    const atividadesParaVincular = [];
    const checkboxes = document.querySelectorAll('.vinculos-container input[type="checkbox"]:checked');
    checkboxes.forEach(checkbox => {
        atividadesParaVincular.push(checkbox.value);
    });
    
    // Definir dados da atividade
    const atividade = {
        tarefaId: tarefaId,
        tipo: tipo,
        titulo: titulo,
        descricao: document.getElementById('descricaoAtividade').value,
        responsavel: responsavel,
        dataPrevista: document.getElementById('dataPrevista').value,
        prioridade: document.getElementById('prioridadeAtividade').value,
        observadores: observadores, // Array com múltiplos observadores
        dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // IMPORTANTE: NÃO alterar o status na edição
    if (gestorAtividades && gestorAtividades.atividadeEditando) {
        // Se está editando, NÃO incluir o status nos dados
        // O status permanece o mesmo
    } else {
        // Se está criando nova, definir como 'nao_iniciado'
        atividade.status = 'nao_iniciado';
        // Adicionar quem criou a atividade
        atividade.criadoPor = gestorAtividades ? gestorAtividades.usuario.usuario : 'desconhecido';
    }
    
    try {
        let atividadeId;
        
        if (gestorAtividades && gestorAtividades.atividadeEditando) {
            // Se está editando, usar update mantendo o status atual
            atividadeId = gestorAtividades.atividadeEditando;
            
            // 1. Buscar vínculos antigos para remover
            const atividadeAntiga = await db.collection('atividades').doc(atividadeId).get();
            const antigosVinculosIds = atividadeAntiga.exists ? 
                atividadeAntiga.data().atividadesVinculadas || [] : [];
            
            // 2. Atualizar a atividade principal (exceto status e criadoPor)
            await db.collection('atividades').doc(atividadeId).update(atividade);
            console.log(`✅ Atividade ${atividadeId} atualizada`);
            
            // 3. REMOVER vínculos antigos das atividades
            for (const vinculoId of antigosVinculosIds) {
                const vinculoRef = db.collection('atividades').doc(vinculoId);
                const vinculoDoc = await vinculoRef.get();
                
                if (vinculoDoc.exists) {
                    const vinculoData = vinculoDoc.data();
                    const novasAtividadesVinculadas = (vinculoData.atividadesVinculadas || [])
                        .filter(id => id !== atividadeId);
                    
                    await vinculoRef.update({
                        atividadesVinculadas: novasAtividadesVinculadas,
                        dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`🔄 Removido vínculo de ${atividadeId} na atividade ${vinculoId}`);
                }
            }
            
        } else {
            // Criar nova atividade (com status 'nao_iniciado' e criadoPor)
            const docRef = await db.collection('atividades').add({
                ...atividade,
                dataRegistro: firebase.firestore.FieldValue.serverTimestamp()
            });
            atividadeId = docRef.id;
            console.log(`✅ Nova atividade ${atividadeId} criada por ${atividade.criadoPor}`);
        }
        
        // AGORA: ADICIONAR O VÍNCULO NAS ATIVIDADES SELECIONADAS
        if (atividadesParaVincular.length > 0) {
            console.log(`🔗 Adicionando vínculo da atividade ${atividadeId} em ${atividadesParaVincular.length} atividades selecionadas`);
            
            const batch = db.batch();
            let atualizadas = 0;
            
            for (const selecionadaId of atividadesParaVincular) {
                const atividadeSelecionadaRef = db.collection('atividades').doc(selecionadaId);
                const selecionadaDoc = await atividadeSelecionadaRef.get();
                
                if (selecionadaDoc.exists) {
                    const selecionadaData = selecionadaDoc.data();
                    const atividadesVinculadasAtuais = selecionadaData.atividadesVinculadas || [];
                    
                    // Adicionar o ID desta atividade se ainda não estiver na lista
                    if (!atividadesVinculadasAtuais.includes(atividadeId)) {
                        batch.update(atividadeSelecionadaRef, {
                            atividadesVinculadas: [...atividadesVinculadasAtuais, atividadeId],
                            dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        atualizadas++;
                        console.log(`✅ Adicionado vínculo de ${atividadeId} na atividade ${selecionadaId}`);
                    }
                }
            }
            
            if (atualizadas > 0) {
                await batch.commit();
                console.log(`✅ ${atualizadas} atividades tiveram a atividade ${atividadeId} adicionada como vínculo`);
            }
        }
        
        fecharModalAtividade();
        
        if (gestorAtividades) {
            await gestorAtividades.carregarDados();
            await gestorAtividades.carregarAtividadesParaVinculo();
            gestorAtividades.renderizarTarefas();
            gestorAtividades.atualizarGraficos();
        }
        
        alert(atividadeId ? '✅ Atividade atualizada com sucesso!' : '✅ Atividade criada com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao salvar atividade:', error);
        alert('Erro ao salvar atividade: ' + error.message);
    }
}
    
async function editarAtividade(atividadeId) {
    console.log(`✏️ Editando atividade: ${atividadeId}`);
    
    try {
        // Verificar permissões antes de editar
        if (!gestorAtividades || !gestorAtividades.usuario) {
            alert('❌ Usuário não identificado');
            return;
        }
        
        const usuarioAtual = gestorAtividades.usuario.usuario;
        const atividadeDoc = await db.collection('atividades').doc(atividadeId).get();
        
        if (!atividadeDoc.exists) {
            alert('Atividade não encontrada');
            return;
        }
        
        const atividade = atividadeDoc.data();
        
        // Verificar se o usuário é o responsável OU criador
        const isResponsavel = atividade.responsavel === usuarioAtual;
        const isCriador = atividade.criadoPor === usuarioAtual;
        
        if (!isResponsavel && !isCriador) {
            alert('❌ Apenas o responsável ou criador da atividade podem editá-la.');
            return;
        }
        
        if (gestorAtividades) {
            await gestorAtividades.carregarAtividadesParaVinculo();
        }
        
        const atividadeCompleta = {
            id: atividadeDoc.id,
            ...atividade
        };
        
        await abrirModalAtividade(atividade.tarefaId, atividade.tipo, atividadeCompleta);
        
    } catch (error) {
        console.error('❌ Erro ao buscar atividade:', error);
        alert('Erro ao carregar atividade: ' + error.message);
    }
}

async function excluirAtividade(atividadeId) {
    // Verificar permissões
    if (!gestorAtividades || !gestorAtividades.usuario) {
        alert('❌ Usuário não identificado');
        return;
    }
    
    try {
        const usuarioAtual = gestorAtividades.usuario.usuario;
        const atividadeDoc = await db.collection('atividades').doc(atividadeId).get();
        
        if (!atividadeDoc.exists) {
            alert('Atividade não encontrada');
            return;
        }
        
        const atividade = atividadeDoc.data();
        
        // Verificar se o usuário é o responsável OU criador
        const isResponsavel = atividade.responsavel === usuarioAtual;
        const isCriador = atividade.criadoPor === usuarioAtual;
        
        if (!isResponsavel && !isCriador) {
            alert('❌ Apenas o responsável ou criador da atividade podem excluí-la.');
            return;
        }
        
        if (!confirm('Tem certeza que deseja excluir esta atividade?')) return;
        
        await db.collection('atividades').doc(atividadeId).delete();
        console.log(`🗑️ Atividade ${atividadeId} excluída`);
        alert('✅ Atividade excluída com sucesso!');
        
        if (gestorAtividades) {
            await gestorAtividades.carregarDados();
            gestorAtividades.renderizarTarefas();
            gestorAtividades.atualizarGraficos();
        }
        
    } catch (error) {
        console.error('❌ Erro ao excluir atividade:', error);
        alert('Erro ao excluir atividade: ' + error.message);
    }
}

async function alterarStatusAtividade(atividadeId, novoStatus, tituloAtividade) {
    console.log(`🔄 Alterando status da atividade ${atividadeId} para ${novoStatus}`);
    
    // Verificar se o usuário é o responsável
    if (!gestorAtividades || !gestorAtividades.usuario) {
        alert('❌ Usuário não identificado');
        return;
    }
    
    const usuarioAtual = gestorAtividades.usuario.usuario;
    
    try {
        // Buscar a atividade para verificar o responsável
        const atividadeDoc = await db.collection('atividades').doc(atividadeId).get();
        
        if (!atividadeDoc.exists) {
            alert('Atividade não encontrada');
            return;
        }
        
        const atividade = atividadeDoc.data();
        
        // Verificar se o usuário atual é o responsável
        if (atividade.responsavel !== usuarioAtual) {
            alert('❌ Apenas o responsável pela atividade pode alterar o status.');
            
            // Resetar o select para o valor anterior
            const select = document.querySelector(`.status-select[data-id="${atividadeId}"]`);
            if (select) {
                select.value = atividade.status || 'nao_iniciado';
            }
            
            return;
        }
        
        const select = document.querySelector(`.status-select[data-id="${atividadeId}"]`);
        const statusAnterior = select ? select.value : 'nao_iniciado';
        
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
        
        if (novoStatus === 'concluido' && gestorAtividades) {
            await gestorAtividades.processarConclusaoAtividade(atividadeId);
        }
        
        if (gestorAtividades) {
            setTimeout(() => {
                gestorAtividades.calcularEstatisticas();
                gestorAtividades.atualizarGraficos();
            }, 500);
        }
        
    } catch (error) {
        console.error('❌ Erro ao alterar status:', error);
        
        const select = document.querySelector(`.status-select[data-id="${atividadeId}"]`);
        if (select) {
            select.value = atividade ? atividade.status : 'nao_iniciado';
            alert('Erro ao alterar status: ' + error.message);
        }
        
    } finally {
        const select = document.querySelector(`.status-select[data-id="${atividadeId}"]`);
        if (select) {
            select.classList.remove('processing');
            select.disabled = false;
        }
    }
}

// ========== INICIALIZAÇÃO ==========

document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM carregado, inicializando...');
    
    // Criar instância do gestor
    gestorAtividades = new GestorAtividades();
    
    // Inicializar o gestor
    gestorAtividades.init();

    // Configurar listener para conclusões
    setTimeout(() => {
        console.log('⏰ Configurando listener para conclusões...');
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
