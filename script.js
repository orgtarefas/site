// script.js - VERSÃO COMPLETA COM ATIVIDADES
console.log('=== SISTEMA INICIANDO ===');

// Estado global
let tarefas = [];
let usuarios = [];
let grupos = [];
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
    console.log('👥 Grupos do usuário:', usuarioLogado.grupos);
    document.getElementById('userName').textContent = usuarioLogado.nome;
    document.getElementById('data-atual').textContent = new Date().toLocaleDateString('pt-BR');
    
    // Configurar data mínima
    configurarDataMinima();
    
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
        carregarUsuarios();
        carregarGrupos();
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
                
                atualizarInterface();
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
        
        if (selectResponsavel) {
            selectResponsavel.innerHTML = '<option value="">Selecionar...</option>';
        }
        
        if (selectFiltro) {
            selectFiltro.innerHTML = '<option value="">Todos</option>';
        }
        
        usuarios.forEach(usuario => {
            const option = `<option value="${usuario.usuario}">${usuario.nome || usuario.usuario}</option>`;
            if (selectResponsavel) selectResponsavel.innerHTML += option;
            if (selectFiltro) selectFiltro.innerHTML += option;
        });
        
    } catch (error) {
        console.error('❌ Erro ao carregar usuários:', error);
    }
}

// FUNÇÃO: Carregar grupos
async function carregarGrupos() {
    console.log('👥 Carregando grupos...');
    
    try {
        const snapshot = await db.collection("grupos").get();
        
        grupos = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log('✅ Grupos carregados:', grupos.length);

        // Preencher select de grupos (múltipla escolha)
        const selectGrupos = document.getElementById('tarefaGrupos');
        
        if (selectGrupos) {
            selectGrupos.innerHTML = '<option value="">Selecione um ou mais grupos...</option>';
            
            grupos.forEach(grupo => {
                const option = document.createElement('option');
                option.value = grupo.id;
                option.textContent = grupo.nome;
                selectGrupos.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar grupos:', error);
    }
}

// FUNÇÃO: Adicionar nova atividade no modal
function adicionarAtividade(texto = '', concluida = false) {
    const listaAtividades = document.getElementById('lista-atividades');
    const atividadeId = 'atividade_' + Date.now();
    
    const atividadeDiv = document.createElement('div');
    atividadeDiv.className = `atividade-item ${concluida ? 'atividade-concluida' : ''}`;
    atividadeDiv.id = atividadeId;
    
    atividadeDiv.innerHTML = `
        <input type="checkbox" class="atividade-checkbox" ${concluida ? 'checked' : ''} 
               onclick="alternarAtividade('${atividadeId}')">
        <input type="text" class="atividade-texto" value="${texto}" 
               placeholder="Descreva a atividade..." 
               onchange="atualizarAtividadeTexto('${atividadeId}', this.value)">
        <button type="button" class="btn-remover-atividade" onclick="removerAtividade('${atividadeId}')">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    listaAtividades.appendChild(atividadeDiv);
}

// FUNÇÃO: Alternar status da atividade
function alternarAtividade(atividadeId) {
    const atividadeDiv = document.getElementById(atividadeId);
    const checkbox = atividadeDiv.querySelector('.atividade-checkbox');
    atividadeDiv.classList.toggle('atividade-concluida', checkbox.checked);
}

// FUNÇÃO: Atualizar texto da atividade
function atualizarAtividadeTexto(atividadeId, texto) {
    // Apenas atualiza o objeto em memória, o salvamento será feito no salvarTarefa()
    console.log('Texto da atividade atualizado:', texto);
}

// FUNÇÃO: Remover atividade
function removerAtividade(atividadeId) {
    const atividadeDiv = document.getElementById(atividadeId);
    if (atividadeDiv && confirm('Remover esta atividade?')) {
        atividadeDiv.remove();
    }
}

// FUNÇÃO: Carregar atividades no formulário
function carregarAtividadesNoFormulario(atividades = []) {
    const listaAtividades = document.getElementById('lista-atividades');
    listaAtividades.innerHTML = '';
    
    if (atividades && atividades.length > 0) {
        atividades.forEach(atividade => {
            adicionarAtividade(atividade.texto, atividade.concluida);
        });
    }
}

// FUNÇÃO: Obter atividades do formulário
function obterAtividadesDoFormulario() {
    const atividades = [];
    const itensAtividades = document.querySelectorAll('.atividade-item');
    
    itensAtividades.forEach(item => {
        const textoInput = item.querySelector('.atividade-texto');
        const checkbox = item.querySelector('.atividade-checkbox');
        
        if (textoInput && textoInput.value.trim() !== '') {
            atividades.push({
                texto: textoInput.value.trim(),
                concluida: checkbox.checked,
                dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    });
    
    return atividades;
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
    const modal = document.getElementById('modalTarefa');
    if (modal) {
        modal.style.display = 'none';
    }
    editandoTarefaId = null;
}

function preencherFormulario(tarefaId) {
    const tarefa = tarefas.find(t => t.id === tarefaId);
    if (!tarefa) return;
    
    // Remover o prefixo do grupo do título se existir
    let tituloOriginal = tarefa.titulo;
    if (tarefa.gruposAcesso && Array.isArray(tarefa.gruposAcesso) && tarefa.gruposAcesso.length > 0) {
        const primeiroGrupo = grupos.find(g => g.id === tarefa.gruposAcesso[0]);
        if (primeiroGrupo) {
            const prefixoGrupo = primeiroGrupo.nome + ' - ';
            if (tituloOriginal.startsWith(prefixoGrupo)) {
                tituloOriginal = tituloOriginal.substring(prefixoGrupo.length);
            }
        }
    }
    
    document.getElementById('tarefaTitulo').value = tituloOriginal;
    document.getElementById('tarefaDescricao').value = tarefa.descricao || '';
    document.getElementById('tarefaPrioridade').value = tarefa.prioridade;
    document.getElementById('tarefaStatus').value = tarefa.status;
    document.getElementById('tarefaDataInicio').value = tarefa.dataInicio || '';
    document.getElementById('tarefaDataFim').value = tarefa.dataFim;
    document.getElementById('tarefaResponsavel').value = tarefa.responsavel || '';
    
    // Preencher grupos (múltipla seleção)
    const selectGrupos = document.getElementById('tarefaGrupos');
    if (tarefa.gruposAcesso && Array.isArray(tarefa.gruposAcesso)) {
        Array.from(selectGrupos.options).forEach(option => {
            option.selected = tarefa.gruposAcesso.includes(option.value);
        });
    } else {
        // Desmarcar tudo se não houver grupos
        Array.from(selectGrupos.options).forEach(option => {
            option.selected = false;
        });
    }
    
    // Preencher atividades
    if (tarefa.atividades && Array.isArray(tarefa.atividades)) {
        carregarAtividadesNoFormulario(tarefa.atividades);
    } else {
        carregarAtividadesNoFormulario([]);
    }
}

function limparFormulario() {
    const form = document.getElementById('formTarefa');
    if (form) {
        form.reset();
    }
    configurarDataMinima();
    
    // Desmarcar todos os grupos
    const selectGrupos = document.getElementById('tarefaGrupos');
    if (selectGrupos) {
        Array.from(selectGrupos.options).forEach(option => {
            option.selected = false;
        });
    }
    
    // Limpar atividades
    carregarAtividadesNoFormulario([]);
}

// FUNÇÃO: Obter nome do primeiro grupo
function obterNomePrimeiroGrupo(gruposIds) {
    if (!gruposIds || !Array.isArray(gruposIds) || gruposIds.length === 0) {
        return '';
    }
    
    const primeiroGrupo = grupos.find(g => g.id === gruposIds[0]);
    return primeiroGrupo ? primeiroGrupo.nome : '';
}

// CRUD Operations
async function salvarTarefa() {
    console.log('💾 Salvando tarefa...');
    
    // Obter grupos selecionados
    const gruposSelect = document.getElementById('tarefaGrupos');
    const gruposSelecionados = Array.from(gruposSelect.selectedOptions)
        .map(option => option.value)
        .filter(value => value !== '');
    
    if (gruposSelecionados.length === 0) {
        mostrarNotificacao('Selecione pelo menos um grupo para a tarefa!', 'error');
        return;
    }
    
    // Obter nome do primeiro grupo para adicionar ao título
    const nomePrimeiroGrupo = obterNomePrimeiroGrupo(gruposSelecionados);
    const tituloDigitado = document.getElementById('tarefaTitulo').value.trim();
    
    // Criar título com prefixo do grupo
    const tituloCompleto = nomePrimeiroGrupo ? 
        `${nomePrimeiroGrupo} - ${tituloDigitado}` : 
        tituloDigitado;
    
    // Obter atividades do formulário
    const atividades = obterAtividadesDoFormulario();
    
    const tarefa = {
        titulo: tituloCompleto,
        descricao: document.getElementById('tarefaDescricao').value || '',
        prioridade: document.getElementById('tarefaPrioridade').value,
        status: document.getElementById('tarefaStatus').value,
        dataInicio: document.getElementById('tarefaDataInicio').value || null,
        dataFim: document.getElementById('tarefaDataFim').value,
        responsavel: document.getElementById('tarefaResponsavel').value || '',
        gruposAcesso: gruposSelecionados,
        atividades: atividades,
        dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
    };

    // DEBUG
    console.log('📦 Dados a serem salvos:', {
        titulo: tarefa.titulo,
        atividades: tarefa.atividades,
        quantidadeAtividades: tarefa.atividades.length
    });

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
function atualizarInterface() {
    atualizarEstatisticas();
    atualizarListaTarefas();
}

function atualizarEstatisticas() {
    // Obter usuário logado
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    const usuarioGrupos = usuarioLogado?.grupos || [];
    
    // Filtrar tarefas baseado no usuário logado
    const tarefasVisiveis = tarefas.filter(tarefa => {
        // Se a tarefa não tem grupos definidos, mostra para todos
        if (!tarefa.gruposAcesso || !Array.isArray(tarefa.gruposAcesso) || tarefa.gruposAcesso.length === 0) {
            return true;
        }
        
        // Verifica se usuário pertence a algum dos grupos da tarefa
        return tarefa.gruposAcesso.some(grupoId => 
            usuarioGrupos.includes(grupoId)
        );
    });
    
    const total = tarefasVisiveis.length;
    const naoiniciadas = tarefasVisiveis.filter(t => {
        const status = t.status ? t.status.toLowerCase().trim() : '';
        return status === 'nao_iniciado' || status === 'não iniciado';
    }).length;
    const pendentes = tarefasVisiveis.filter(t => t.status === 'pendente').length;
    const andamento = tarefasVisiveis.filter(t => t.status === 'andamento').length;
    const concluidas = tarefasVisiveis.filter(t => t.status === 'concluido').length;

    document.getElementById('total-tarefas').textContent = total;
    document.getElementById('tarefas-naoiniciadas').textContent = naoiniciadas;
    document.getElementById('tarefas-pendentes').textContent = pendentes;
    document.getElementById('tarefas-andamento').textContent = andamento;
    document.getElementById('tarefas-concluidas').textContent = concluidas;
}

function atualizarListaTarefas() {
    const container = document.getElementById('lista-tarefas');
    if (!container) return;
    
    // Obter usuário logado
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    const usuarioGrupos = usuarioLogado?.grupos || [];
    
    // Filtrar tarefas baseado no usuário logado
    const tarefasFiltradasPorGrupo = tarefas.filter(tarefa => {
        // Se a tarefa não tem grupos definidos, mostra para todos
        if (!tarefa.gruposAcesso || !Array.isArray(tarefa.gruposAcesso) || tarefa.gruposAcesso.length === 0) {
            return true;
        }
        
        // Verifica se usuário pertence a algum dos grupos da tarefa
        return tarefa.gruposAcesso.some(grupoId => 
            usuarioGrupos.includes(grupoId)
        );
    });
    
    const tarefasFiltradas = filtrarTarefas(tarefasFiltradasPorGrupo);

    if (tarefasFiltradas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks"></i>
                <h3>Nenhuma tarefa encontrada</h3>
                <p>Você não tem acesso a nenhuma tarefa ou não há tarefas disponíveis</p>
            </div>
        `;
        return;
    }

    // Renderizar tarefas
    container.innerHTML = tarefasFiltradas.map(tarefa => {
        // Adicionar informação de grupos (todos os grupos)
        let gruposInfo = '';
        if (tarefa.gruposAcesso && Array.isArray(tarefa.gruposAcesso)) {
            const nomesGrupos = tarefa.gruposAcesso.map(grupoId => {
                const grupo = grupos.find(g => g.id === grupoId);
                return grupo ? grupo.nome : 'Grupo desconhecido';
            }).join(', ');
            
            if (nomesGrupos) {
                gruposInfo = `
                    <div class="grupos-acesso">
                        <i class="fas fa-users"></i>
                        <span class="grupos-nomes">${nomesGrupos}</span>
                    </div>
                `;
            }
        }
        
        // Calcular atividades concluídas
        let atividadesConcluidas = 0;
        let totalAtividades = 0;
        let atividadesHTML = '';
        
        if (tarefa.atividades && Array.isArray(tarefa.atividades)) {
            totalAtividades = tarefa.atividades.length;
            atividadesConcluidas = tarefa.atividades.filter(a => a.concluida).length;
            
            if (totalAtividades > 0) {
                atividadesHTML = `
                    <div class="atividades-tarefa">
                        <h4>
                            <i class="fas fa-list-check"></i> Atividades (${atividadesConcluidas}/${totalAtividades})
                        </h4>
                        <div class="atividades-lista">
                            ${tarefa.atividades.map(atividade => `
                                <div class="atividade-exibida ${atividade.concluida ? 'atividade-concluida' : ''}">
                                    <i class="fas fa-${atividade.concluida ? 'check-circle' : 'circle'}"></i>
                                    <span>${atividade.texto || 'Atividade sem descrição'}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        }
        
        return `
        <div class="task-card prioridade-${tarefa.prioridade}">
            <div class="task-header">
                <div>
                    <div class="task-title">${tarefa.titulo}</div>
                    ${tarefa.descricao ? `<div class="task-desc">${tarefa.descricao}</div>` : ''}
                    ${gruposInfo}
                    ${atividadesHTML}
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
        `;
    }).join('');
}

function filtrarTarefas(tarefasLista = tarefas) {
    const searchInput = document.getElementById('searchInput');
    const filterStatus = document.getElementById('filterStatus');
    const filterPrioridade = document.getElementById('filterPrioridade');
    const filterResponsavel = document.getElementById('filterResponsavel');
    
    const termo = searchInput ? searchInput.value.toLowerCase() : '';
    const status = filterStatus ? filterStatus.value : '';
    const prioridade = filterPrioridade ? filterPrioridade.value : '';
    const responsavel = filterResponsavel ? filterResponsavel.value : '';

    return tarefasLista.filter(tarefa => {
        if (termo && !tarefa.titulo.toLowerCase().includes(termo) && 
            !(tarefa.descricao && tarefa.descricao.toLowerCase().includes(termo))) {
            return false;
        }
        if (status && tarefa.status !== status) return false;
        if (prioridade && tarefa.prioridade !== prioridade) return false;
        if (responsavel && tarefa.responsavel !== responsavel) return false;
        return true;
    });
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

// FUNÇÕES DE TESTE (remova em produção)
async function adicionarAtividadesTeste(tarefaId) {
    const atividadesExemplo = [
        {
            texto: "Análise dos requisitos do sistema",
            concluida: true,
            dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            texto: "Desenvolvimento da interface",
            concluida: true,
            dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            texto: "Testes unitários",
            concluida: false,
            dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            texto: "Documentação do projeto",
            concluida: false,
            dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
        }
    ];
    
    try {
        await db.collection("tarefas").doc(tarefaId).update({
            atividades: atividadesExemplo,
            dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Atividades adicionadas com sucesso!');
        mostrarNotificacao('Atividades de teste adicionadas!', 'success');
    } catch (error) {
        console.error('❌ Erro ao adicionar atividades:', error);
        mostrarNotificacao('Erro ao adicionar atividades', 'error');
    }
}

function verificarEstruturaTarefa(tarefaId) {
    const tarefa = tarefas.find(t => t.id === tarefaId);
    if (tarefa) {
        console.log('📊 Estrutura da tarefa:', {
            id: tarefa.id,
            titulo: tarefa.titulo,
            temAtividades: tarefa.atividades ? true : false,
            tipoAtividades: tarefa.atividades ? typeof tarefa.atividades : 'não definido',
            atividades: tarefa.atividades,
            todasPropriedades: Object.keys(tarefa)
        });
    } else {
        console.log('❌ Tarefa não encontrada');
    }
}

// Configurar event listeners
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const filterStatus = document.getElementById('filterStatus');
    const filterPrioridade = document.getElementById('filterPrioridade');
    const filterResponsavel = document.getElementById('filterResponsavel');
    
    if (searchInput) {
        searchInput.addEventListener('input', () => atualizarListaTarefas());
    }
    
    if (filterStatus) {
        filterStatus.addEventListener('change', () => atualizarListaTarefas());
    }
    
    if (filterPrioridade) {
        filterPrioridade.addEventListener('change', () => atualizarListaTarefas());
    }
    
    if (filterResponsavel) {
        filterResponsavel.addEventListener('change', () => atualizarListaTarefas());
    }
    
    // Adicionar uma atividade padrão quando abrir modal de nova tarefa
    const modal = document.getElementById('modalTarefa');
    if (modal) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const display = modal.style.display;
                    if (display === 'flex' && !editandoTarefaId) {
                        // Adicionar uma atividade em branco por padrão
                        setTimeout(() => {
                            if (document.querySelectorAll('.atividade-item').length === 0) {
                                adicionarAtividade();
                            }
                        }, 100);
                    }
                }
            });
        });
        
        observer.observe(modal, { attributes: true });
    }
});

// Fechar modal clicando fora
window.onclick = function(event) {
    const modal = document.getElementById('modalTarefa');
    if (event.target === modal) {
        fecharModalTarefa();
    }
}

// Torna as funções de teste disponíveis globalmente (para debug)
window.adicionarAtividadesTeste = adicionarAtividadesTeste;
window.verificarEstruturaTarefa = verificarEstruturaTarefa;
