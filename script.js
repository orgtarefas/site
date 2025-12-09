// script.js - VERSÃO COMPLETA COM MODAL ÚNICO E CONTROLE DE VISIBILIDADE
console.log('=== SISTEMA INICIANDO ===');

// Estado global
let tarefas = [];
let usuarios = [];
let grupos = [];
let atividadesPorTarefa = {};
let editandoTarefaId = null;
let modoEdicao = false;

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
    const dataInicio = document.getElementById('tarefaDataInicio');
    const dataFim = document.getElementById('tarefaDataFim');
    
    if (dataInicio) dataInicio.min = hoje;
    if (dataFim) dataFim.min = hoje;
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

        // Preencher select de grupos
        const selectGrupos = document.getElementById('tarefaGrupos');
        
        if (selectGrupos) {
            selectGrupos.innerHTML = '<option value="">Selecione um ou mais grupos...</option>';
            
            grupos.forEach(grupo => {
                const option = document.createElement('option');
                option.value = grupo.id;
                option.textContent = grupo.nome || grupo.id;
                selectGrupos.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar grupos:', error);
    }
}

// FUNÇÃO: Carregar usuários
async function carregarUsuarios() {
    console.log('👥 Carregando usuários...');
    
    try {
        const snapshot = await db.collection("usuarios").get();
        
        usuarios = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log('✅ Usuários carregados:', usuarios.length);

        // Preencher select de responsável
        const selectResponsavel = document.getElementById('tarefaResponsavel');
        if (selectResponsavel) {
            selectResponsavel.innerHTML = '<option value="">Selecionar...</option>';
            usuarios.forEach(usuario => {
                const option = document.createElement('option');
                option.value = usuario.usuario || usuario.id;
                option.textContent = usuario.nome || usuario.usuario || usuario.id;
                selectResponsavel.appendChild(option);
            });
        }

        // Preencher select de responsável para FILTRO
        const selectFiltro = document.getElementById('filterResponsavel');
        if (selectFiltro) {
            selectFiltro.innerHTML = '<option value="">Todos</option>';
            usuarios.forEach(usuario => {
                const option = document.createElement('option');
                option.value = usuario.usuario || usuario.id;
                option.textContent = usuario.nome || usuario.usuario || usuario.id;
                selectFiltro.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar usuários:', error);
    }
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
                
                // Carregar atividades para todas as tarefas
                await carregarAtividadesParaTodasTarefas();
                
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

async function carregarAtividadesParaTodasTarefas() {
    console.log('📋 Carregando atividades para todas as tarefas...');
    
    try {
        // Buscar todas as atividades
        const snapshot = await db.collection("atividades").get();
        const todasAtividades = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log('✅ Atividades carregadas:', todasAtividades.length);

        // Organizar atividades por tarefaId
        atividadesPorTarefa = {};
        
        todasAtividades.forEach(atividade => {
            if (atividade.tarefaId) {
                if (!atividadesPorTarefa[atividade.tarefaId]) {
                    atividadesPorTarefa[atividade.tarefaId] = [];
                }
                atividadesPorTarefa[atividade.tarefaId].push(atividade);
            }
        });

        console.log('📊 Atividades organizadas por tarefa:', Object.keys(atividadesPorTarefa).length);
        
        // Ordenar atividades dentro de cada tarefa
        Object.keys(atividadesPorTarefa).forEach(tarefaId => {
            atividadesPorTarefa[tarefaId] = ordenarAtividadesPorTipo(atividadesPorTarefa[tarefaId]);
        });

    } catch (error) {
        console.error('❌ Erro ao carregar atividades:', error);
    }
}

// FUNÇÃO: Buscar atividades específicas de uma tarefa
async function buscarAtividadesDaTarefa(tarefaId) {
    try {
        const snapshot = await db.collection("atividades")
            .where("tarefaId", "==", tarefaId)
            .get();
        
        if (!snapshot.empty) {
            let atividades = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Ordenar atividades por tipo
            atividades = ordenarAtividadesPorTipo(atividades);
            
            return atividades;
        }
        return [];
    } catch (error) {
        console.error('❌ Erro ao buscar atividades da tarefa:', error);
        return [];
    }
}

// FUNÇÃO: Ordenar atividades por tipo
function ordenarAtividadesPorTipo(atividades) {
    // Ordem específica dos tipos
    const ordemTipos = ['execucao', 'monitoramento', 'conclusao'];
    
    // Separar atividades que têm tipo definido
    const atividadesComTipo = atividades.filter(a => a.tipo);
    const atividadesSemTipo = atividades.filter(a => !a.tipo);
    
    // Ordenar atividades com tipo na ordem específica
    atividadesComTipo.sort((a, b) => {
        const indiceA = ordemTipos.indexOf(a.tipo);
        const indiceB = ordemTipos.indexOf(b.tipo);
        
        if (indiceA !== -1 && indiceB !== -1) {
            return indiceA - indiceB;
        }
        if (indiceA !== -1) return -1;
        if (indiceB !== -1) return 1;
        return 0;
    });
    
    // Combinar: atividades ordenadas por tipo + atividades sem tipo
    return [...atividadesComTipo, ...atividadesSemTipo];
}

// MODAL FUNCTIONS
function abrirModalTarefa(tarefaId = null) {
    editandoTarefaId = tarefaId;
    modoEdicao = !!tarefaId;
    
    const modal = document.getElementById('modalTarefa');
    const titulo = document.getElementById('modalTitulo');
    const btnSalvar = document.getElementById('btnSalvarTarefa');
    
    if (modoEdicao) {
        titulo.textContent = 'Editar Tarefa';
        btnSalvar.textContent = 'Salvar Alterações';
        preencherFormulario(tarefaId);
        ocultarCamposNovaTarefa();
    } else {
        titulo.textContent = 'Nova Tarefa';
        btnSalvar.textContent = 'Salvar Tarefa';
        limparFormulario();
        mostrarCamposNovaTarefa();
    }
    
    modal.style.display = 'flex';
}

function ocultarCamposNovaTarefa() {
    // Ocultar seção de atividades
    const secaoAtividades = document.getElementById('secao-atividades');
    if (secaoAtividades) {
        secaoAtividades.style.display = 'none';
    }
    
    // Ocultar campos Status e Responsável
    const camposNovaTarefa = document.querySelectorAll('.campo-nova-tarefa');
    camposNovaTarefa.forEach(campo => {
        campo.style.display = 'none';
    });
}

function mostrarCamposNovaTarefa() {
    // Mostrar seção de atividades
    const secaoAtividades = document.getElementById('secao-atividades');
    if (secaoAtividades) {
        secaoAtividades.style.display = 'block';
    }
    
    // Mostrar campos Status e Responsável
    const camposNovaTarefa = document.querySelectorAll('.campo-nova-tarefa');
    camposNovaTarefa.forEach(campo => {
        campo.style.display = 'block';
    });
}

function fecharModalTarefa() {
    const modal = document.getElementById('modalTarefa');
    if (modal) {
        modal.style.display = 'none';
    }
    editandoTarefaId = null;
    modoEdicao = false;
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
    document.getElementById('tarefaDataInicio').value = tarefa.dataInicio || '';
    document.getElementById('tarefaDataFim').value = tarefa.dataFim;
    
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
    const listaAtividades = document.getElementById('lista-atividades');
    if (listaAtividades) {
        listaAtividades.innerHTML = '';
    }
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
    
    // Preparar objeto tarefa base
    const tarefa = {
        titulo: tituloCompleto,
        descricao: document.getElementById('tarefaDescricao').value || '',
        prioridade: document.getElementById('tarefaPrioridade').value,
        dataInicio: document.getElementById('tarefaDataInicio').value || null,
        dataFim: document.getElementById('tarefaDataFim').value,
        gruposAcesso: gruposSelecionados,
        dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Adicionar campos específicos para NOVA TAREFA
    if (!modoEdicao) {
        tarefa.status = document.getElementById('tarefaStatus').value;
        tarefa.responsavel = document.getElementById('tarefaResponsavel').value || '';
        
        // Adicionar atividades da nova tarefa
        const atividades = obterAtividadesDoFormulario();
        if (atividades.length > 0) {
            tarefa.atividades = atividades;
        }
    }

    try {
        if (modoEdicao && editandoTarefaId) {
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
        mostrarNotificacao(modoEdicao ? 'Tarefa atualizada com sucesso!' : 'Tarefa criada com sucesso!', 'success');
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

// FUNÇÕES PARA ATIVIDADES (APENAS NOVA TAREFA)
function adicionarAtividade(texto = '', concluida = false) {
    const listaAtividades = document.getElementById('lista-atividades');
    if (!listaAtividades) return;
    
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

function alternarAtividade(atividadeId) {
    const atividadeDiv = document.getElementById(atividadeId);
    const checkbox = atividadeDiv.querySelector('.atividade-checkbox');
    atividadeDiv.classList.toggle('atividade-concluida', checkbox.checked);
}

function atualizarAtividadeTexto(atividadeId, texto) {
    console.log('Texto da atividade atualizado:', texto);
}

function removerAtividade(atividadeId) {
    const atividadeDiv = document.getElementById(atividadeId);
    if (atividadeDiv && confirm('Remover esta atividade?')) {
        atividadeDiv.remove();
    }
}

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
                <p>Clique em "Nova Tarefa" para começar</p>
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
        
        // Buscar atividades da tarefa
        const atividadesDaTarefa = atividadesPorTarefa[tarefa.id] || [];
        let atividadesHTML = '';
        
        if (atividadesDaTarefa.length > 0) {
            const atividadesConcluidas = atividadesDaTarefa.filter(a => 
                a.status && (a.status.toLowerCase() === 'concluido' || a.status.toLowerCase() === 'concluído')
            ).length;
            
            atividadesHTML = `
                <div class="atividades-sistema">
                    <div class="atividades-header">
                        <i class="fas fa-list-check"></i>
                        <strong>Atividades da Tarefa (${atividadesConcluidas}/${atividadesDaTarefa.length}):</strong>
                    </div>
                    <div class="atividades-lista">
                        ${atividadesDaTarefa.map((atividade, index) => {
                            const isConcluida = atividade.status && 
                                               (atividade.status.toLowerCase() === 'concluido' || 
                                                atividade.status.toLowerCase() === 'concluído');
                            
                            return `
                                <div class="atividade-item ${isConcluida ? 'concluida' : ''} ${atividade.tipo ? `tipo-${atividade.tipo}` : ''}">
                                    <div class="atividade-ordem">
                                        <span class="ordem-numero">${index + 1}</span>
                                    </div>
                                    <div class="atividade-tipo">
                                        <i class="fas fa-${getIconTipo(atividade.tipo)}"></i>
                                        <span class="tipo-label">${getLabelTipo(atividade.tipo)}</span>
                                    </div>
                                    <div class="atividade-conteudo">
                                        <span class="atividade-titulo">${atividade.titulo || atividade.descricao || 'Atividade sem título'}</span>
                                        <span class="atividade-status badge status-${atividade.status ? normalizarStatusParaClasse(atividade.status) : 'pendente'}">
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
        
        return `
        <div class="task-card prioridade-${tarefa.prioridade}">
            <div class="task-header">
                <div>
                    <div class="task-title">${tarefa.titulo}</div>
                    ${tarefa.descricao ? `<div class="task-desc">${tarefa.descricao}</div>` : ''}
                    ${gruposInfo}
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

            ${atividadesHTML}

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

// FUNÇÕES AUXILIARES PARA ATIVIDADES
function getIconTipo(tipo) {
    if (!tipo) return 'tasks';
    
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

function normalizarStatusParaClasse(status) {
    if (!status) return 'pendente';
    
    const statusNorm = status.toLowerCase().trim();
    
    switch(statusNorm) {
        case 'nao_iniciado':
        case 'não iniciado':
            return 'nao_iniciado';
        case 'pendente':
            return 'pendente';
        case 'andamento':
        case 'em andamento':
            return 'andamento';
        case 'concluido':
        case 'concluído':
            return 'concluido';
        default:
            return statusNorm.replace(/[^a-z0-9]/g, '_');
    }
}

function getLabelStatus(status) {
    if (!status) return 'Não Iniciado';
    
    const statusNorm = status.toLowerCase().trim();
    
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
            return status.charAt(0).toUpperCase() + status.slice(1);
    }
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
});

// Fechar modal clicando fora
window.onclick = function(event) {
    const modal = document.getElementById('modalTarefa');
    if (event.target === modal) {
        fecharModalTarefa();
    }
}

// Função para recarregar atividades
async function recarregarAtividades() {
    await carregarAtividadesParaTodasTarefas();
    atualizarListaTarefas();
}

// Torna as funções globais
window.adicionarAtividade = adicionarAtividade;
window.alternarAtividade = alternarAtividade;
window.atualizarAtividadeTexto = atualizarAtividadeTexto;
window.removerAtividade = removerAtividade;
window.abrirModalTarefa = abrirModalTarefa;
window.fecharModalTarefa = fecharModalTarefa;
window.salvarTarefa = salvarTarefa;
window.excluirTarefa = excluirTarefa;
window.logout = logout;
