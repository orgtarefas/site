// programa.js - Sistema de Programas com Relacionamento de Tarefas

// Variáveis globais
let programas = [];
let todasTarefas = [];
let tarefasPorPrograma = {};
let programasCollection = null;
let tarefasCollection = null;
let usuarioLogado = null;
let programaEditando = null;

// Inicialização da página
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Verificar autenticação
        usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
        
        if (!usuarioLogado) {
            window.location.href = 'login.html';
            return;
        }
        
        document.getElementById('userName').textContent = usuarioLogado.nome || usuarioLogado.usuario;
        document.getElementById('loadingText').textContent = 'Inicializando sistema...';
        
        // Inicializar Firebase
        await inicializarFirebase();
        
        // Configurar listeners e carregar dados
        configurarEventListeners();
        await carregarDadosCompletos();
        
        // Esconder tela de loading
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
        }, 1000);
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        document.getElementById('loadingText').textContent = 'Erro ao carregar. Tente novamente.';
    }
});

// Inicializar Firebase
async function inicializarFirebase() {
    try {
        // Usando a mesma configuração do script.js
        const firebaseConfig = {
            apiKey: "AIzaSyAs0Ke4IBfBWDrfH0AXaOhCEjtfpPtR_Vg",
            authDomain: "orgtarefas-85358.firebaseapp.com",
            projectId: "orgtarefas-85358",
            storageBucket: "orgtarefas-85358.firebasestorage.app",
            messagingSenderId: "1023569488575",
            appId: "1:1023569488575:web:18f9e201115a1a92ccb40a"
        };
        
        // Inicializar Firebase se ainda não foi
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        // Configurar referências
        const db = firebase.firestore();
        programasCollection = db.collection("programas");
        tarefasCollection = db.collection("tarefas");
        
        // Configurar listener em tempo real para programas
        configurarListenerProgramas();
        
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase:', error);
        throw error;
    }
}

// Configurar listener em tempo real para programas
function configurarListenerProgramas() {
    programasCollection.orderBy("dataCriacao", "desc")
        .onSnapshot(async (snapshot) => {
            try {
                programas = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                console.log(`📊 ${programas.length} programas carregados`);
                
                // Para cada programa, buscar informações das tarefas relacionadas
                await buscarInformacoesTarefas();
                
                // Atualizar estatísticas
                atualizarEstatisticasReais();
                
                // Renderizar programas
                renderizarProgramas(programas);
                
                // Atualizar status de conexão
                const statusEl = document.getElementById('status-sincronizacao');
                if (statusEl) {
                    statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Conectado';
                }
                
            } catch (error) {
                console.error('❌ Erro no listener de programas:', error);
            }
        }, (error) => {
            console.error('❌ Erro no Firestore:', error);
            const statusEl = document.getElementById('status-sincronizacao');
            if (statusEl) {
                statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Erro Conexão';
            }
        });
}

// Carregar dados completos
async function carregarDadosCompletos() {
    try {
        // Carregar todas as tarefas uma vez
        await carregarTodasTarefas();
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados completos:', error);
    }
}

// Carregar todas as tarefas
async function carregarTodasTarefas() {
    try {
        const loadingText = document.getElementById('loadingText');
        if (loadingText) {
            loadingText.textContent = 'Carregando tarefas...';
        }
        
        const snapshot = await tarefasCollection.get();
        todasTarefas = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log(`✅ ${todasTarefas.length} tarefas carregadas`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar tarefas:', error);
        todasTarefas = [];
    }
}

// Buscar informações detalhadas das tarefas relacionadas aos programas
async function buscarInformacoesTarefas() {
    tarefasPorPrograma = {};
    
    for (const programa of programas) {
        const tarefasIds = programa.tarefas_relacionadas || [];
        const tarefasDoPrograma = [];
        
        // Buscar cada tarefa pelo ID
        for (const tarefaId of tarefasIds) {
            const tarefa = todasTarefas.find(t => t.id === tarefaId);
            if (tarefa) {
                tarefasDoPrograma.push({
                    id: tarefa.id,
                    titulo: tarefa.titulo || 'Tarefa sem título',
                    status: tarefa.status || 'nao_iniciado',
                    prioridade: tarefa.prioridade || 'media',
                    dataFim: tarefa.dataFim,
                    gruposAcesso: tarefa.gruposAcesso || [],
                    descricao: tarefa.descricao || ''
                });
            }
        }
        
        tarefasPorPrograma[programa.id] = tarefasDoPrograma;
    }
}

// Calcular estatísticas reais baseadas nas tarefas
function atualizarEstatisticasReais() {
    try {
        const totalProgramas = programas.length;
        let programasEmAndamento = 0;
        let programasConcluidos = 0;
        let totalTarefasEmProgramas = 0;
        let tarefasAtivasEmProgramas = 0;
        let programasComTarefas = 0;
        
        // Para cada programa, analisar suas tarefas
        programas.forEach(programa => {
            const tarefasPrograma = tarefasPorPrograma[programa.id] || [];
            const totalTarefas = tarefasPrograma.length;
            
            if (totalTarefas > 0) {
                programasComTarefas++;
                totalTarefasEmProgramas += totalTarefas;
                
                // Contar tarefas ativas (não concluídas)
                const tarefasAtivas = tarefasPrograma.filter(tarefa => {
                    const status = (tarefa.status || '').toLowerCase().trim();
                    return !(status === 'concluido' || status === 'concluído');
                }).length;
                
                tarefasAtivasEmProgramas += tarefasAtivas;
                
                // Determinar status do programa
                const todasConcluidas = tarefasPrograma.every(tarefa => {
                    const status = (tarefa.status || '').toLowerCase().trim();
                    return status === 'concluido' || status === 'concluído';
                });
                
                if (todasConcluidas) {
                    programasConcluidos++;
                } else if (tarefasAtivas > 0) {
                    programasEmAndamento++;
                }
            }
        });
        
        // Atualizar interface - VERIFICAR SE ELEMENTOS EXISTEM
        const totalProgramasEl = document.getElementById('total-programas');
        const programasAndamentoEl = document.getElementById('programas-andamento');
        const programasConcluidosEl = document.getElementById('programas-concluidos');
        const tarefasTotaisEl = document.getElementById('tarefas-totais-programas');
        const tarefasAtivasEl = document.getElementById('tarefas-ativas-programas');
        
        if (totalProgramasEl) totalProgramasEl.textContent = totalProgramas;
        if (programasAndamentoEl) programasAndamentoEl.textContent = programasEmAndamento;
        if (programasConcluidosEl) programasConcluidosEl.textContent = programasConcluidos;
        
        if (tarefasTotaisEl) {
            tarefasTotaisEl.innerHTML = `
                <span class="total">${totalTarefasEmProgramas}</span>
                <span class="separator">/</span>
                <span class="programas">${programasComTarefas}</span>
            `;
        }
        
        if (tarefasAtivasEl) {
            tarefasAtivasEl.innerHTML = `
                <span class="total">${tarefasAtivasEmProgramas}</span>
                <span class="separator">/</span>
                <span class="programas">${programasEmAndamento}</span>
            `;
        }
        
        console.log('📊 Estatísticas calculadas:', {
            totalProgramas,
            programasEmAndamento,
            programasConcluidos,
            totalTarefasEmProgramas,
            tarefasAtivasEmProgramas,
            programasComTarefas
        });
        
    } catch (error) {
        console.error('❌ Erro ao calcular estatísticas:', error);
    }
}

// Configurar eventos
function configurarEventListeners() {
    // Botão novo programa
    const btnNovoPrograma = document.getElementById('btn-novo-programa');
    if (btnNovoPrograma) {
        btnNovoPrograma.addEventListener('click', () => {
            abrirModalPrograma();
        });
    }
    
    // Botão criar primeiro programa
    const btnCriarPrimeiro = document.getElementById('btn-criar-primeiro-programa');
    if (btnCriarPrimeiro) {
        btnCriarPrimeiro.addEventListener('click', () => {
            abrirModalPrograma();
        });
    }
    
    // Busca de programas
    const searchInput = document.getElementById('program-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            filtrarProgramas();
        });
    }
    
    // Filtros
    const filterStatus = document.getElementById('filter-program-status');
    if (filterStatus) {
        filterStatus.addEventListener('change', () => {
            filtrarProgramas();
        });
    }
}

// Filtrar programas
function filtrarProgramas() {
    const termoBusca = document.getElementById('program-search')?.value.toLowerCase() || '';
    const filtroStatus = document.getElementById('filter-program-status')?.value || '';
    
    const programasFiltrados = programas.filter(programa => {
        // Filtro por busca
        if (termoBusca && !programa.titulo.toLowerCase().includes(termoBusca) && 
            !(programa.descricao && programa.descricao.toLowerCase().includes(termoBusca))) {
            return false;
        }
        
        // Filtro por status do programa (baseado nas tarefas)
        if (filtroStatus) {
            const tarefasPrograma = tarefasPorPrograma[programa.id] || [];
            let statusPrograma = 'planejamento';
            
            if (tarefasPrograma.length > 0) {
                const todasConcluidas = tarefasPrograma.every(tarefa => {
                    const status = (tarefa.status || '').toLowerCase().trim();
                    return status === 'concluido' || status === 'concluído';
                });
                
                if (todasConcluidas) {
                    statusPrograma = 'concluido';
                } else {
                    statusPrograma = 'andamento';
                }
            }
            
            if (statusPrograma !== filtroStatus) {
                return false;
            }
        }
        
        return true;
    });
    
    renderizarProgramas(programasFiltrados);
}

// Renderizar programas na grid
function renderizarProgramas(listaProgramas) {
    const grid = document.getElementById('programs-grid');
    const emptyState = document.getElementById('empty-programs');
    
    if (!grid || !emptyState) return;
    
    if (!listaProgramas || listaProgramas.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    grid.style.display = 'grid';
    emptyState.style.display = 'none';
    
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
    
    const tarefasPrograma = tarefasPorPrograma[programa.id] || [];
    const totalTarefas = tarefasPrograma.length;
    
    // Calcular progresso
    const tarefasConcluidas = tarefasPrograma.filter(tarefa => {
        const status = (tarefa.status || '').toLowerCase().trim();
        return status === 'concluido' || status === 'concluído';
    }).length;
    
    const progresso = totalTarefas > 0 ? (tarefasConcluidas / totalTarefas) * 100 : 0;
    
    // Determinar status do programa
    let statusHTML = '';
    if (totalTarefas > 0) {
        if (tarefasConcluidas === totalTarefas) {
            statusHTML = '<span class="program-status status-concluido">Concluído</span>';
        } else {
            statusHTML = '<span class="program-status status-ativo">Em Andamento</span>';
        }
    }
    
    // Formatar data
    const dataCriacao = programa.dataCriacao ? 
        formatarDataFirestore(programa.dataCriacao) : 'Não definida';
    
    // ✅ NOVO: Criar lista de tarefas para exibição
    let listaTarefasHTML = '';
    if (totalTarefas > 0) {
        // Limitar a 5 tarefas para não sobrecarregar o card
        const tarefasParaExibir = tarefasPrograma.slice(0, 5);
        
        listaTarefasHTML = `
            <div class="program-tarefas-lista">
                <div class="tarefas-lista-header">
                    <i class="fas fa-list-check"></i>
                    <strong>Tarefas Relacionadas (${totalTarefas}):</strong>
                </div>
                <div class="tarefas-lista-items">
                    ${tarefasParaExibir.map((tarefa, index) => {
                        const statusClasse = normalizarStatusParaClasse(tarefa.status);
                        const statusLabel = formatarStatus(tarefa.status);
                        const isConcluida = statusClasse === 'status-concluido';
                        
                        return `
                        <div class="tarefa-lista-item ${isConcluida ? 'concluida' : ''}" 
                             onclick="irParaTarefa('${tarefa.id}')" 
                             title="Clique para ver esta tarefa">
                            <div class="tarefa-item-numero">
                                <span>${index + 1}</span>
                            </div>
                            <div class="tarefa-item-info">
                                <div class="tarefa-item-titulo">
                                    ${tarefa.titulo}
                                </div>
                                <div class="tarefa-item-detalhes">
                                    <span class="badge ${statusClasse}">
                                        ${statusLabel}
                                    </span>
                                    ${tarefa.prioridade ? 
                                        `<span class="badge prioridade-${tarefa.prioridade}">
                                            ${tarefa.prioridade}
                                        </span>` : ''}
                                </div>
                            </div>
                            <div class="tarefa-item-action">
                                <i class="fas fa-external-link-alt"></i>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
                ${totalTarefas > 5 ? 
                    `<div class="tarefas-lista-footer">
                        <small>+ ${totalTarefas - 5} tarefa(s) restante(s)</small>
                    </div>` : ''}
            </div>
        `;
    } else {
        listaTarefasHTML = `
            <div class="program-sem-tarefas">
                <i class="fas fa-info-circle"></i>
                <span>Nenhuma tarefa relacionada a este programa</span>
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="program-header">
            <div class="program-icon">
                <i class="fas fa-project-diagram"></i>
            </div>
            <div class="program-title">
                <h3>${programa.titulo || 'Programa sem título'}</h3>
                ${statusHTML}
            </div>
            <div class="program-actions">
                <button class="btn-icon" title="Ver detalhes" onclick="verDetalhesPrograma('${programa.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon" title="Editar" onclick="editarPrograma('${programa.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-icon-excluir" title="Excluir" onclick="excluirPrograma('${programa.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="program-content">
            <p class="program-description">${programa.descricao || 'Sem descrição'}</p>
            
            <!-- ✅ NOVO: Lista de tarefas -->
            ${listaTarefasHTML}
            
            <div class="program-meta">
                <div class="meta-item">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Criado: ${dataCriacao}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-tasks"></i>
                    <span>${totalTarefas} Tarefas</span>
                    ${tarefasConcluidas > 0 ? 
                        `<small style="margin-left: 5px; color: #4CAF50;">
                            (${tarefasConcluidas} concluídas)
                        </small>` : ''}
                </div>
                <div class="meta-item">
                    <i class="fas fa-user"></i>
                    <span>${programa.criadoPor || 'Não informado'}</span>
                </div>
            </div>
            <div class="progress-container">
                <div class="progress-label">
                    <span>Progresso Geral</span>
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


// Função para excluir programa
async function excluirPrograma(programaId) {
    try {
        const programa = programas.find(p => p.id === programaId);
        if (!programa) return;
        
        // Verificar se tem tarefas relacionadas
        const tarefasPrograma = tarefasPorPrograma[programaId] || [];
        
        let mensagemConfirmacao = `Tem certeza que deseja excluir o programa "${programa.titulo}"?`;
        
        if (tarefasPrograma.length > 0) {
            mensagemConfirmacao += `\n\nEste programa tem ${tarefasPrograma.length} tarefa(s) relacionada(s). A exclusão NÃO removerá as tarefas, apenas o vínculo com o programa.`;
        }
        
        if (!confirm(mensagemConfirmacao)) {
            return;
        }
        
        // Excluir do Firebase
        await programasCollection.doc(programaId).delete();
        
        // Mostrar mensagem de sucesso
        mostrarMensagem('Programa excluído com sucesso!', 'success');
        
        // O listener do Firebase vai atualizar automaticamente a lista
        
    } catch (error) {
        console.error('❌ Erro ao excluir programa:', error);
        mostrarMensagem('Erro ao excluir programa: ' + error.message, 'error');
    }
}

// MODAL DE PROGRAMA
async function abrirModalPrograma(programaId = null) {
    const modal = document.getElementById('modalPrograma');
    if (!modal) return;
    
    const titulo = document.getElementById('modalProgramaTitle');
    if (!titulo) return;
    
    programaEditando = programaId ? programas.find(p => p.id === programaId) : null;
    
    if (programaEditando) {
        titulo.textContent = 'Editar Programa';
        preencherFormularioPrograma(programaEditando);
    } else {
        titulo.textContent = 'Novo Programa';
        limparFormularioPrograma();
    }
    
    // Carregar tarefas para seleção
    await carregarTarefasParaSelecao(programaEditando?.tarefas_relacionadas);
    
    modal.style.display = 'flex';
}

function fecharModalPrograma() {
    const modal = document.getElementById('modalPrograma');
    if (modal) {
        modal.style.display = 'none';
    }
    programaEditando = null;
    limparFormularioPrograma();
}

function preencherFormularioPrograma(programa) {
    const tituloInput = document.getElementById('programaTitulo');
    const descricaoInput = document.getElementById('programaDescricao');
    
    if (tituloInput) tituloInput.value = programa.titulo || '';
    if (descricaoInput) descricaoInput.value = programa.descricao || '';
}

function limparFormularioPrograma() {
    const form = document.getElementById('formPrograma');
    if (form) form.reset();
    
    const container = document.getElementById('tarefas-selecionadas-container');
    if (container) container.innerHTML = '';
}

// Carregar tarefas para seleção no modal
async function carregarTarefasParaSelecao(tarefasSelecionadasIds = []) {
    const container = document.getElementById('lista-tarefas-selecao');
    if (!container) return;
    
    if (todasTarefas.length === 0) {
        container.innerHTML = '<div class="no-tarefas">Nenhuma tarefa encontrada</div>';
        return;
    }
    
    // Limpar container de selecionados
    const containerSelecionados = document.getElementById('tarefas-selecionadas-container');
    if (containerSelecionados) containerSelecionados.innerHTML = '';
    
    // Adicionar tarefas selecionadas
    tarefasSelecionadasIds?.forEach(tarefaId => {
        const tarefa = todasTarefas.find(t => t.id === tarefaId);
        if (tarefa) {
            adicionarTarefaSelecionada(tarefa);
        }
    });
    
    // Filtrar tarefas que não estão selecionadas
    const tarefasDisponiveis = todasTarefas.filter(tarefa => 
        !tarefasSelecionadasIds?.includes(tarefa.id)
    );
    
    if (tarefasDisponiveis.length === 0) {
        container.innerHTML = '<div class="no-tarefas">Todas as tarefas já estão selecionadas</div>';
        return;
    }
    
    // Renderizar tarefas disponíveis
    container.innerHTML = tarefasDisponiveis.map(tarefa => `
        <div class="tarefa-item-selecao" data-tarefa-id="${tarefa.id}">
            <div class="tarefa-info">
                <div class="tarefa-titulo">${tarefa.titulo || 'Tarefa sem título'}</div>
                <div class="tarefa-detalhes">
                    <span class="badge prioridade-${tarefa.prioridade || 'media'}">
                        ${tarefa.prioridade || 'Média'}
                    </span>
                    <span class="badge status-${tarefa.status || 'nao_iniciado'}">
                        ${formatarStatus(tarefa.status)}
                    </span>
                    ${tarefa.dataFim ? `<small><i class="fas fa-calendar"></i> ${formatarData(tarefa.dataFim)}</small>` : ''}
                </div>
            </div>
            <button class="btn-add-tarefa" onclick="selecionarTarefa('${tarefa.id}')">
                <i class="fas fa-plus"></i> Adicionar
            </button>
        </div>
    `).join('');
}

// Filtrar tarefas na busca
function filtrarTarefasSelecao(termo) {
    const container = document.getElementById('lista-tarefas-selecao');
    if (!container) return;
    
    const items = container.querySelectorAll('.tarefa-item-selecao');
    
    termo = termo.toLowerCase();
    
    items.forEach(item => {
        const titulo = item.querySelector('.tarefa-titulo')?.textContent.toLowerCase() || '';
        const descricao = item.querySelector('.tarefa-detalhes')?.textContent.toLowerCase() || '';
        
        if (titulo.includes(termo) || descricao.includes(termo)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Selecionar tarefa
function selecionarTarefa(tarefaId) {
    const tarefa = todasTarefas.find(t => t.id === tarefaId);
    if (tarefa) {
        // Adicionar ao container de selecionados
        adicionarTarefaSelecionada(tarefa);
        
        // Remover da lista de disponíveis
        const item = document.querySelector(`.tarefa-item-selecao[data-tarefa-id="${tarefaId}"]`);
        if (item) {
            item.remove();
        }
    }
}

// Adicionar tarefa ao container de selecionadas
function adicionarTarefaSelecionada(tarefa) {
    const container = document.getElementById('tarefas-selecionadas-container');
    if (!container) return;
    
    const tarefaDiv = document.createElement('div');
    tarefaDiv.className = 'tarefa-selecionada-item';
    tarefaDiv.dataset.tarefaId = tarefa.id;
    
    tarefaDiv.innerHTML = `
        <div class="tarefa-selecionada-info">
            <div class="tarefa-selecionada-titulo">
                <i class="fas fa-task"></i>
                ${tarefa.titulo || 'Tarefa sem título'}
            </div>
            <div class="tarefa-selecionada-detalhes">
                <span class="badge status-${tarefa.status || 'nao_iniciado'}">
                    ${formatarStatus(tarefa.status)}
                </span>
            </div>
        </div>
        <button class="btn-remover-tarefa" onclick="removerTarefaSelecionada('${tarefa.id}')">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(tarefaDiv);
}

// Remover tarefa selecionada
function removerTarefaSelecionada(tarefaId) {
    // Remover do container de selecionados
    const item = document.querySelector(`.tarefa-selecionada-item[data-tarefa-id="${tarefaId}"]`);
    if (item) {
        item.remove();
    }
    
    // Adicionar de volta à lista de disponíveis
    const tarefa = todasTarefas.find(t => t.id === tarefaId);
    if (tarefa) {
        const container = document.getElementById('lista-tarefas-selecao');
        if (container) {
            const novoItem = document.createElement('div');
            novoItem.className = 'tarefa-item-selecao';
            novoItem.dataset.tarefaId = tarefa.id;
            novoItem.innerHTML = `
                <div class="tarefa-info">
                    <div class="tarefa-titulo">${tarefa.titulo || 'Tarefa sem título'}</div>
                    <div class="tarefa-detalhes">
                        <span class="badge prioridade-${tarefa.prioridade || 'media'}">
                            ${tarefa.prioridade || 'Média'}
                        </span>
                        <span class="badge status-${tarefa.status || 'nao_iniciado'}">
                            ${formatarStatus(tarefa.status)}
                        </span>
                        ${tarefa.dataFim ? `<small><i class="fas fa-calendar"></i> ${formatarData(tarefa.dataFim)}</small>` : ''}
                    </div>
                </div>
                <button class="btn-add-tarefa" onclick="selecionarTarefa('${tarefa.id}')">
                    <i class="fas fa-plus"></i> Adicionar
                </button>
            `;
            
            container.appendChild(novoItem);
        }
    }
}

// Obter IDs das tarefas selecionadas
function obterTarefasSelecionadasIds() {
    const container = document.getElementById('tarefas-selecionadas-container');
    if (!container) return [];
    
    const items = container.querySelectorAll('.tarefa-selecionada-item');
    return Array.from(items).map(item => item.dataset.tarefaId);
}

// Salvar programa
async function salvarPrograma() {
    try {
        const tituloInput = document.getElementById('programaTitulo');
        const descricaoInput = document.getElementById('programaDescricao');
        
        if (!tituloInput || !descricaoInput) return;
        
        const titulo = tituloInput.value.trim();
        const descricao = descricaoInput.value.trim();
        const tarefasSelecionadas = obterTarefasSelecionadasIds();
        
        if (!titulo) {
            alert('O título do programa é obrigatório!');
            return;
        }
        
        const programaData = {
            titulo,
            descricao: descricao || '',
            tarefas_relacionadas: tarefasSelecionadas,
            dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (programaEditando) {
            // Atualizar programa existente
            await programasCollection.doc(programaEditando.id).update(programaData);
            mostrarMensagem('Programa atualizado com sucesso!', 'success');
        } else {
            // Criar novo programa
            programaData.criadoPor = usuarioLogado.usuario;
            programaData.dataCriacao = firebase.firestore.FieldValue.serverTimestamp();
            
            await programasCollection.add(programaData);
            mostrarMensagem('Programa criado com sucesso!', 'success');
        }
        
        fecharModalPrograma();
        
    } catch (error) {
        console.error('❌ Erro ao salvar programa:', error);
        mostrarMensagem('Erro ao salvar programa: ' + error.message, 'error');
    }
}

// MODAL DE DETALHES
async function verDetalhesPrograma(programaId) {
    const modal = document.getElementById('modalDetalhesPrograma');
    if (!modal) return;
    
    const programa = programas.find(p => p.id === programaId);
    if (!programa) return;
    
    const tarefasPrograma = tarefasPorPrograma[programaId] || [];
    
    // Preencher informações básicas
    const detalhesTitulo = document.getElementById('detalhesProgramaTitle');
    const detalhesNome = document.getElementById('detalhesNomePrograma');
    const detalhesDescricao = document.getElementById('detalhesDescricaoPrograma');
    const detalhesCriadoPor = document.getElementById('detalhesCriadoPor');
    
    if (detalhesTitulo) detalhesTitulo.textContent = programa.titulo;
    if (detalhesNome) detalhesNome.textContent = programa.titulo;
    if (detalhesDescricao) detalhesDescricao.textContent = programa.descricao || 'Sem descrição';
    if (detalhesCriadoPor) detalhesCriadoPor.textContent = programa.criadoPor || 'Não informado';
    
    // Datas
    const dataCriacao = programa.dataCriacao ? 
        formatarDataFirestore(programa.dataCriacao) : 'Não definida';
    const detalhesDatas = document.getElementById('detalhesDatasPrograma');
    if (detalhesDatas) detalhesDatas.textContent = `Criado em: ${dataCriacao}`;
    
    // Status
    const statusElement = document.getElementById('detalhesStatusPrograma');
    if (statusElement) {
        let statusClass = 'status-planejamento';
        let statusText = 'Planejamento';
        
        if (tarefasPrograma.length > 0) {
            const todasConcluidas = tarefasPrograma.every(tarefa => {
                const status = (tarefa.status || '').toLowerCase().trim();
                return status === 'concluido' || status === 'concluído';
            });
            
            if (todasConcluidas) {
                statusClass = 'status-concluido';
                statusText = 'Concluído';
            } else {
                statusClass = 'status-ativo';
                statusText = 'Em Andamento';
            }
        }
        
        statusElement.className = `badge ${statusClass}`;
        statusElement.textContent = statusText;
    }
    
    // Progresso
    const tarefasConcluidas = tarefasPrograma.filter(tarefa => {
        const status = (tarefa.status || '').toLowerCase().trim();
        return status === 'concluido' || status === 'concluído';
    }).length;
    
    const progresso = tarefasPrograma.length > 0 ? 
        (tarefasConcluidas / tarefasPrograma.length) * 100 : 0;
    
    const detalhesProgresso = document.getElementById('detalhesProgressoPrograma');
    const detalhesProgressoBarra = document.getElementById('detalhesProgressoBarra');
    
    if (detalhesProgresso) detalhesProgresso.textContent = `${Math.round(progresso)}%`;
    if (detalhesProgressoBarra) detalhesProgressoBarra.style.width = `${progresso}%`;
    
    // Configurar botão de editar
    const btnEditar = document.getElementById('btnEditarPrograma');
    if (btnEditar) {
        btnEditar.onclick = () => {
            fecharModalDetalhesPrograma();
            setTimeout(() => editarPrograma(programaId), 300);
        };
    }

    // Configurar botão de excluir
    const btnExcluir = document.getElementById('btnExcluirPrograma');
    if (btnExcluir) {
        btnExcluir.onclick = () => {
            if (confirm(`Tem certeza que deseja excluir o programa "${programa.titulo}"?`)) {
                excluirPrograma(programaId);
                fecharModalDetalhesPrograma();
            }
        };
    }
    
    // Listar tarefas
    const containerTarefas = document.getElementById('lista-tarefas-detalhes');
    if (containerTarefas) {
        if (tarefasPrograma.length === 0) {
            containerTarefas.innerHTML = '<div class="no-tarefas">Nenhuma tarefa relacionada</div>';
        } else {
            containerTarefas.innerHTML = tarefasPrograma.map(tarefa => `
                <div class="tarefa-detalhe-item">
                    <div class="tarefa-detalhe-header">
                        <div class="tarefa-detalhe-titulo">
                            <i class="fas fa-task"></i>
                            ${tarefa.titulo}
                        </div>
                        <div class="tarefa-detalhe-status">
                            <span class="badge status-${tarefa.status || 'nao_iniciado'}">
                                ${formatarStatus(tarefa.status)}
                            </span>
                        </div>
                    </div>
                    ${tarefa.descricao ? `
                        <div class="tarefa-detalhe-descricao">
                            ${tarefa.descricao}
                        </div>
                    ` : ''}
                    <div class="tarefa-detalhe-meta">
                        ${tarefa.dataFim ? `
                            <small><i class="fas fa-calendar"></i> Vence: ${formatarData(tarefa.dataFim)}</small>
                        ` : ''}
                        <small><i class="fas fa-flag"></i> ${tarefa.prioridade || 'Média'}</small>
                    </div>
                </div>
            `).join('');
        }
    }
    
    modal.style.display = 'flex';
}

function fecharModalDetalhesPrograma() {
    const modal = document.getElementById('modalDetalhesPrograma');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Funções de ação
function editarPrograma(programaId) {
    abrirModalPrograma(programaId);
}

// Funções auxiliares
function formatarData(dataString) {
    if (!dataString) return 'Não definida';
    try {
        return new Date(dataString + 'T00:00:00').toLocaleDateString('pt-BR');
    } catch {
        return dataString;
    }
}

function formatarDataFirestore(timestamp) {
    if (!timestamp) return 'Não definida';
    try {
        const date = timestamp.toDate();
        return date.toLocaleDateString('pt-BR');
    } catch {
        return 'Data inválida';
    }
}

// ✅ FUNÇÃO AUXILIAR: Formatador de status melhorado
function formatarStatus(status) {
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

function mostrarMensagem(mensagem, tipo = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${tipo}`;
    notification.innerHTML = `
        <i class="fas fa-${tipo === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${mensagem}
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        background: ${tipo === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        font-weight: 500;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentElement) {
                notification.parentElement.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// ✅ FUNÇÃO: Ir para a tarefa específica
function irParaTarefa(tarefaId) {
    // Abrir a página de tarefas em nova aba com scroll para a tarefa específica
    const url = `index.html#tarefa-${tarefaId}`;
    
    // Verificar se já estamos na página de tarefas
    if (window.location.pathname.includes('index.html')) {
        // Se já está na página de tarefas, scroll para a tarefa
        window.location.hash = `tarefa-${tarefaId}`;
        
        // Mostrar mensagem
        mostrarMensagem('Rolando para a tarefa selecionada...', 'info');
    } else {
        // Abrir em nova aba
        window.open(url, '_blank');
    }
}

// ✅ FUNÇÃO AUXILIAR: Normalizar status para classe CSS
function normalizarStatusParaClasse(status) {
    if (!status) return 'status-nao_iniciado';
    const statusNorm = status.toLowerCase().trim();
    
    switch(statusNorm) {
        case 'nao_iniciado':
        case 'não iniciado':
            return 'status-nao_iniciado';
        case 'pendente':
            return 'status-pendente';
        case 'andamento':
        case 'em andamento':
            return 'status-andamento';
        case 'concluido':
        case 'concluído':
            return 'status-concluido';
        default:
            return 'status-nao_iniciado';
    }
}

function logout() {
    if (confirm('Deseja realmente sair do sistema?')) {
        localStorage.removeItem('usuarioLogado');
        window.location.href = 'login.html';
    }
}

// Torna funções globais
window.abrirModalPrograma = abrirModalPrograma;
window.fecharModalPrograma = fecharModalPrograma;
window.salvarPrograma = salvarPrograma;
window.editarPrograma = editarPrograma;
window.excluirPrograma = excluirPrograma;
window.verDetalhesPrograma = verDetalhesPrograma;
window.fecharModalDetalhesPrograma = fecharModalDetalhesPrograma;
window.filtrarTarefasSelecao = filtrarTarefasSelecao;
window.selecionarTarefa = selecionarTarefa;
window.removerTarefaSelecionada = removerTarefaSelecionada;
window.irParaTarefa = irParaTarefa; // ✅ ADICIONE ESTA LINHA
window.logout = logout;
