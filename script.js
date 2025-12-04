// script.js - VERSÃO COMPLETA COM VÍNCULO A SISTEMAS
console.log('=== SISTEMA INICIANDO ===');

// Estado global
let tarefas = [];
let usuarios = [];
let sistemas = [];
let editandoTarefaId = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando sistema...');
    document.getElementById('loadingText').textContent = 'Verificando autenticação...';
    
    // Verificar se usuário está logado
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    if (!usuarioLogado) {
        console.log('❌ Usuário não logado, redirecionando...');
        window.location.href = 'login.html';
        return;
    }

    console.log('👤 Usuário logado:', usuarioLogado.nome);
    document.getElementById('userName').textContent = usuarioLogado.nome;
    document.getElementById('data-atual').textContent = new Date().toLocaleDateString('pt-BR');
    
    // Inicializar sistema
    inicializarSistema();
});

function inicializarSistema() {
    console.log('🔥 Inicializando Firebase...');
    document.getElementById('loadingText').textContent = 'Conectando ao banco de dados...';
    
    // Aguardar Firebase carregar
    if (!window.db) {
        console.log('⏳ Aguardando Firebase...');
        setTimeout(inicializarSistema, 500);
        return;
    }

    console.log('✅ Firebase carregado!');
    
    try {
        configurarDataMinima();
        carregarUsuarios();
        carregarSistemas();
        configurarFirebase();
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        document.getElementById('status-sincronizacao').innerHTML = '<i class="fas fa-exclamation-triangle"></i> Offline';
        mostrarErro('Erro ao conectar com o banco de dados');
    }
}

function configurarDataMinima() {
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('tarefaDataInicio').min = hoje;
    document.getElementById('tarefaDataFim').min = hoje;
}

function configurarFirebase() {
    console.log('📡 Configurando listener do Firestore...');
    document.getElementById('loadingText').textContent = 'Carregando tarefas...';
    
    // Listener em tempo real para tarefas
    db.collection("tarefas")
        .orderBy("dataCriacao", "desc")
        .onSnapshot(
            async (snapshot) => {
                console.log('📊 Dados recebidos:', snapshot.size, 'tarefas');
                tarefas = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // Finalizar carregamento
                document.getElementById('loadingScreen').style.display = 'none';
                document.getElementById('mainContent').style.display = 'block';
                document.getElementById('status-sincronizacao').innerHTML = '<i class="fas fa-bolt"></i> Tempo Real';
                
                await atualizarInterfaceComAtividades();
                console.log('🎉 Sistema carregado com sucesso!');
            },
            (error) => {
                console.error('❌ Erro no Firestore:', error);
                document.getElementById('loadingScreen').style.display = 'none';
                document.getElementById('mainContent').style.display = 'block';
                document.getElementById('status-sincronizacao').innerHTML = '<i class="fas fa-exclamation-triangle"></i> Erro Conexão';
                mostrarErro('Erro ao carregar tarefas: ' + error.message);
            }
        );
}

async function carregarUsuarios() {
    console.log('👥 Carregando usuários...');
    
    try {
        const snapshot = await db.collection("usuarios").get();
        
        usuarios = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log('✅ Usuários carregados:', usuarios.length);

        // Preencher selects de responsável
        const selectResponsavel = document.getElementById('tarefaResponsavel');
        const selectFiltro = document.getElementById('filterResponsavel');
        
        selectResponsavel.innerHTML = '<option value="">Selecionar...</option>';
        selectFiltro.innerHTML = '<option value="">Todos</option>';
        
        usuarios.forEach(usuario => {
            const option = `<option value="${usuario.usuario}">${usuario.nome || usuario.usuario}</option>`;
            selectResponsavel.innerHTML += option;
            selectFiltro.innerHTML += option;
        });
        
    } catch (error) {
        console.error('❌ Erro ao carregar usuários:', error);
    }
}

async function carregarSistemas() {
    console.log('📊 Carregando sistemas...');
    
    try {
        const snapshot = await db.collection("sistemas").get();
        
        sistemas = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log('✅ Sistemas carregados:', sistemas.length);

        // Preencher select de sistema no modal
        const selectSistemaModal = document.getElementById('tarefaSistema');
        const selectSistemaFiltro = document.getElementById('filterSistema');
        
        selectSistemaModal.innerHTML = '<option value="">Nenhum sistema</option>';
        selectSistemaFiltro.innerHTML = '<option value="">Todos os sistemas</option>';
        
        sistemas.forEach(sistema => {
            const option = `<option value="${sistema.id}">${sistema.nome}</option>`;
            selectSistemaModal.innerHTML += option;
            selectSistemaFiltro.innerHTML += option;
        });
        
    } catch (error) {
        console.error('❌ Erro ao carregar sistemas:', error);
    }
}

// Modal Functions
function abrirModalTarefa(tarefaId = null) {
    editandoTarefaId = tarefaId;
    const modal = document.getElementById('modalTarefa');
    const titulo = document.getElementById('modalTitulo');
    
    if (tarefaId) {
        titulo.textContent = 'Editar Tarefa';
        preencherFormulario(tarefaId);
    } else {
        titulo.textContent = 'Nova Tarefa';
        limparFormulario();
    }
    
    modal.style.display = 'flex';
}

function fecharModalTarefa() {
    document.getElementById('modalTarefa').style.display = 'none';
    editandoTarefaId = null;
}

function preencherFormulario(tarefaId) {
    const tarefa = tarefas.find(t => t.id === tarefaId);
    if (!tarefa) return;
    
    document.getElementById('tarefaTitulo').value = tarefa.titulo;
    document.getElementById('tarefaDescricao').value = tarefa.descricao || '';
    document.getElementById('tarefaSistema').value = tarefa.sistemaId || '';
    document.getElementById('tarefaPrioridade').value = tarefa.prioridade;
    document.getElementById('tarefaStatus').value = tarefa.status;
    document.getElementById('tarefaDataInicio').value = tarefa.dataInicio || '';
    document.getElementById('tarefaDataFim').value = tarefa.dataFim;
    document.getElementById('tarefaResponsavel').value = tarefa.responsavel || '';
}

function limparFormulario() {
    document.getElementById('formTarefa').reset();
    configurarDataMinima();
}

// CRUD Operations
async function salvarTarefa() {
    console.log('💾 Salvando tarefa...');
    
    const tarefa = {
        titulo: document.getElementById('tarefaTitulo').value,
        descricao: document.getElementById('tarefaDescricao').value,
        sistemaId: document.getElementById('tarefaSistema').value || null,
        prioridade: document.getElementById('tarefaPrioridade').value,
        status: document.getElementById('tarefaStatus').value,
        dataInicio: document.getElementById('tarefaDataInicio').value,
        dataFim: document.getElementById('tarefaDataFim').value,
        responsavel: document.getElementById('tarefaResponsavel').value,
        dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (editandoTarefaId) {
            console.log('✏️ Editando tarefa:', editandoTarefaId);
            await db.collection("tarefas").doc(editandoTarefaId).update(tarefa);
        } else {
            console.log('🆕 Criando nova tarefa');
            const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
            await db.collection("tarefas").add({
                ...tarefa,
                dataCriacao: firebase.firestore.FieldValue.serverTimestamp(),
                criadoPor: usuarioLogado.usuario
            });
        }
        
        fecharModalTarefa();
        mostrarNotificacao('Tarefa salva com sucesso!', 'success');
    } catch (error) {
        console.error('❌ Erro ao salvar tarefa:', error);
        mostrarNotificacao('Erro ao salvar tarefa: ' + error.message, 'error');
    }
}

async function excluirTarefa(tarefaId) {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    
    console.log('🗑️ Excluindo tarefa:', tarefaId);
    
    try {
        await db.collection("tarefas").doc(tarefaId).delete();
        mostrarNotificacao('Tarefa excluída com sucesso!', 'success');
    } catch (error) {
        console.error('❌ Erro ao excluir tarefa:', error);
        mostrarNotificacao('Erro ao excluir tarefa', 'error');
    }
}

// Interface
async function atualizarInterfaceComAtividades() {
    atualizarEstatisticas();
    await atualizarListaTarefasComAtividades();
}

function atualizarEstatisticas() {
    const total = tarefas.length;
    const pendentes = tarefas.filter(t => t.status === 'pendente').length;
    const andamento = tarefas.filter(t => t.status === 'andamento').length;
    const concluidas = tarefas.filter(t => t.status === 'concluido').length;

    document.getElementById('total-tarefas').textContent = total;
    document.getElementById('tarefas-pendentes').textContent = pendentes;
    document.getElementById('tarefas-andamento').textContent = andamento;
    document.getElementById('tarefas-concluidas').textContent = concluidas;
}

async function buscarAtividadesDoSistema(sistemaId) {
    try {
        const snapshot = await db.collection('atividades')
            .where('sistemaId', '==', sistemaId)
            .get();
        
        if (!snapshot.empty) {
            let atividades = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // GARANTIR QUE TODAS AS ATIVIDADES TENHAM STATUS
            atividades = atividades.map(atividade => {
                // Se a atividade não tiver status definido, define como "Não Iniciado"
                if (!atividade.status) {
                    return {
                        ...atividade,
                        status: 'nao_iniciado'
                    };
                }
                return atividade;
            });
            
            // ORDENAR ATIVIDADES PELA ORDEM ESPECÍFICA
            atividades = ordenarAtividadesPorTipo(atividades);
            
            return atividades;
        }
        return [];
    } catch (error) {
        console.error('❌ Erro ao buscar atividades:', error);
        return [];
    }
}


// FUNÇÃO PARA ORDENAR ATIVIDADES POR TIPO
function ordenarAtividadesPorTipo(atividades) {
    // Ordem específica dos tipos
    const ordemTipos = ['execucao', 'monitoramento', 'conclusao'];
    
    // Primeiro, separar atividades que têm tipo definido
    const atividadesComTipo = atividades.filter(a => a.tipo);
    const atividadesSemTipo = atividades.filter(a => !a.tipo);
    
    // Ordenar atividades com tipo na ordem específica
    atividadesComTipo.sort((a, b) => {
        const indiceA = ordemTipos.indexOf(a.tipo);
        const indiceB = ordemTipos.indexOf(b.tipo);
        
        // Se ambos têm tipo na lista de ordenação
        if (indiceA !== -1 && indiceB !== -1) {
            return indiceA - indiceB;
        }
        
        // Se apenas A tem tipo na lista, vem primeiro
        if (indiceA !== -1) return -1;
        
        // Se apenas B tem tipo na lista, vem depois
        if (indiceB !== -1) return 1;
        
        // Se nenhum tem tipo na lista, manter ordem original
        return 0;
    });
    
    // Combinar: atividades ordenadas por tipo + atividades sem tipo
    return [...atividadesComTipo, ...atividadesSemTipo];
}

async function atualizarListaTarefasComAtividades() {
    const container = document.getElementById('lista-tarefas');
    const tarefasFiltradas = filtrarTarefas();

    if (tarefasFiltradas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks"></i>
                <h3>Nenhuma tarefa encontrada</h3>
                <p>Clique em "Nova Tarefa" para começar</p>
            </div>
        `;
        return;
    }

    // Processar tarefas com suas atividades ORDENADAS
    const tarefasProcessadas = await Promise.all(
        tarefasFiltradas.map(async (tarefa) => {
            let sistemaInfo = '';
            let atividadesHTML = '';
            
            if (tarefa.sistemaId) {
                const sistema = sistemas.find(s => s.id === tarefa.sistemaId);
                if (sistema) {
                    sistemaInfo = `
                        <div class="sistema-vinculado">
                            <i class="fas fa-project-diagram"></i>
                            <span class="sistema-nome">Sistema: ${sistema.nome}</span>
                        </div>
                    `;
                    
                    // Buscar atividades do sistema (JÁ ORDENADAS)
                    const atividades = await buscarAtividadesDoSistema(tarefa.sistemaId);
                    
                    if (atividades.length > 0) {
                        // DEBUG: Log para verificar status
                        console.log('📋 Atividades encontradas para sistema', sistema.nome, ':');
                        atividades.forEach((atividade, idx) => {
                            console.log(`  ${idx + 1}. ${atividade.titulo} - Status: "${atividade.status}"`);
                        });
                        
                        atividadesHTML = `
                            <div class="atividades-sistema">
                                <div class="atividades-header">
                                    <i class="fas fa-list-check"></i>
                                    <strong>Atividades do Sistema (${atividades.length}):</strong>
                                </div>
                                <div class="atividades-lista">
                                    ${atividades.map((atividade, index) => {
                                        const statusStr = String(atividade.status || '').toLowerCase().trim();
                                        
                                        // Verifique se é concluída
                                        const isConcluida = statusStr === 'concluido' || 
                                                           statusStr === 'concluído' ||
                                                           statusStr === 'concluida' ||
                                                           statusStr === 'concluída';
                                        
                                        return `
                                            <div class="atividade-item ${isConcluida ? 'concluida' : ''}">
                                                <div class="atividade-ordem">
                                                    <span class="ordem-numero">${index + 1}</span>
                                                </div>
                                                <div class="atividade-tipo">
                                                    <i class="fas fa-${getIconTipo(atividade.tipo)}"></i>
                                                    <span class="tipo-label">${getLabelTipo(atividade.tipo)}</span>
                                                </div>
                                                <div class="atividade-conteudo">
                                                    <span class="atividade-titulo">${atividade.titulo}</span>
                                                    <span class="atividade-status badge status-${statusStr.replace(/[^a-z0-9]/g, '_')}">
                                                        ${getLabelStatus(atividade.status)}
                                                    </span>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                    
                                    
                                </div>
                            </div>
                        `;
                    }
                }
            }
            
            return { ...tarefa, sistemaInfo, atividadesHTML };
        })
    );

    // Renderizar tarefas
    container.innerHTML = tarefasProcessadas.map(tarefa => `
        <div class="task-card prioridade-${tarefa.prioridade} ${tarefa.sistemaId ? 'vinculada-sistema' : ''}">
            <div class="task-header">
                <div>
                    <div class="task-title">${tarefa.titulo}</div>
                    ${tarefa.descricao ? `<div class="task-desc">${tarefa.descricao}</div>` : ''}
                    ${tarefa.sistemaInfo || ''}
                </div>
            </div>
            
            <div class="task-meta">
                <span class="badge prioridade-${tarefa.prioridade}">
                    ${tarefa.prioridade.charAt(0).toUpperCase() + tarefa.prioridade.slice(1)}
                </span>
                <span class="badge status-${tarefa.status}">
                    ${getLabelStatus(tarefa.status)}
                </span>
                ${tarefa.responsavel ? `
                    <span class="task-responsavel">
                        <i class="fas fa-user"></i> ${tarefa.responsavel}
                    </span>
                ` : ''}
            </div>

            ${tarefa.atividadesHTML || ''}

            <div class="task-meta">
                ${tarefa.dataInicio ? `<small><i class="fas fa-play-circle"></i> ${formatarData(tarefa.dataInicio)}</small>` : ''}
                <small><i class="fas fa-flag-checkered"></i> ${formatarData(tarefa.dataFim)}</small>
            </div>

            <div class="task-actions">
                <button class="btn btn-outline btn-sm" onclick="abrirModalTarefa('${tarefa.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-danger btn-sm" onclick="excluirTarefa('${tarefa.id}')">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        </div>
    `).join('');
}

// Função auxiliar para normalizar status (adicione ao seu código)
function normalizarStatus(status) {
    if (!status) return '';
    return status.toLowerCase().trim();
}

// Função getLabelStatus atualizada (se ainda não tiver)
function getLabelStatus(status) {
    if (!status) return 'Não definido';
    
    const statusNorm = normalizarStatus(status);
    
    switch(statusNorm) {
        case 'nao_iniciado':
        case 'não iniciado':
            return 'Não Iniciado';
        case 'pendente':
            return 'Pendente';
        case 'andamento':
        case 'em andamento':
            return 'Em Andamento';
        case 'concluido':
        case 'concluído':
            return 'Concluído';
        default:
            // Mantém o original se não reconhecer
            return status.charAt(0).toUpperCase() + status.slice(1);
    }
}


    

// FUNÇÕES AUXILIARES PARA TIPOS
function getIconTipo(tipo) {
    if (!tipo) return 'question-circle';
    
    switch(tipo.toLowerCase()) {
        case 'execucao': return 'play-circle';
        case 'monitoramento': return 'eye';
        case 'conclusao': return 'check-double';
        default: return 'tasks';
    }
}

function getLabelTipo(tipo) {
    if (!tipo) return 'Outras';
    
    switch(tipo.toLowerCase()) {
        case 'execucao': return 'Execução';
        case 'monitoramento': return 'Monitoramento';
        case 'conclusao': return 'Conclusão';
        default: return tipo.charAt(0).toUpperCase() + tipo.slice(1);
    }
}

function getLabelStatus(status) {
    if (!status) return 'Não Iniciado';
    
    switch(status) {
        case 'nao_iniciado': return 'Não Iniciado';
        case 'pendente': return 'Pendente';
        case 'andamento': return 'Em Andamento';
        case 'concluido': return 'Concluído';
        default: return status;
    }
}
function getIconStatusAtividade(status) {
    switch(status) {
        case 'pendente': return 'clock';
        case 'andamento': return 'spinner';
        case 'concluido': return 'check-circle';
        default: return 'question-circle';
    }
}

function filtrarTarefas() {
    const termo = document.getElementById('searchInput').value.toLowerCase();
    const status = document.getElementById('filterStatus').value;
    const prioridade = document.getElementById('filterPrioridade').value;
    const responsavel = document.getElementById('filterResponsavel').value;
    const sistema = document.getElementById('filterSistema').value;

    return tarefas.filter(tarefa => {
        if (termo && !tarefa.titulo.toLowerCase().includes(termo) && 
            !(tarefa.descricao && tarefa.descricao.toLowerCase().includes(termo))) {
            return false;
        }
        if (status && tarefa.status !== status) return false;
        if (prioridade && tarefa.prioridade !== prioridade) return false;
        if (responsavel && tarefa.responsavel !== responsavel) return false;
        if (sistema) {
            if (sistema === 'sem-sistema' && tarefa.sistemaId) return false;
            if (sistema !== 'sem-sistema' && tarefa.sistemaId !== sistema) return false;
        }
        return true;
    });
}

// Utils
function formatarData(dataString) {
    if (!dataString) return 'Não definida';
    return new Date(dataString + 'T00:00:00').toLocaleDateString('pt-BR');
}

function mostrarNotificacao(mensagem, tipo) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        background: ${tipo === 'success' ? '#28a745' : '#dc3545'};
    `;
    notification.textContent = mensagem;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
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

function logout() {
    console.log('🚪 Fazendo logout...');
    localStorage.removeItem('usuarioLogado');
    window.location.href = 'login.html';
}

// Event Listeners para filtros
document.getElementById('searchInput').addEventListener('input', () => atualizarListaTarefasComAtividades());
document.getElementById('filterStatus').addEventListener('change', () => atualizarListaTarefasComAtividades());
document.getElementById('filterPrioridade').addEventListener('change', () => atualizarListaTarefasComAtividades());
document.getElementById('filterResponsavel').addEventListener('change', () => atualizarListaTarefasComAtividades());
document.getElementById('filterSistema').addEventListener('change', () => atualizarListaTarefasComAtividades());

// Fechar modal clicando fora
window.onclick = function(event) {
    const modal = document.getElementById('modalTarefa');
    if (event.target === modal) {
        fecharModalTarefa();
    }
}
