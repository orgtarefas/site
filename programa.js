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
                
                // Para cada programa, buscar informações das tarefas relacionadas
                await buscarInformacoesTarefas();
                
                // Atualizar estatísticas
                await calcularEstatisticasReais();
                
                // Renderizar programas
                renderizarProgramas(programas);
                
                // Atualizar status de conexão
                document.getElementById('status-sincronizacao').innerHTML = 
                    '<i class="fas fa-check-circle"></i> Conectado';
                
            } catch (error) {
                console.error('❌ Erro no listener de programas:', error);
            }
        }, (error) => {
            console.error('❌ Erro no Firestore:', error);
            document.getElementById('status-sincronizacao').innerHTML = 
                '<i class="fas fa-exclamation-triangle"></i> Erro Conexão';
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
        document.getElementById('loadingText').textContent = 'Carregando tarefas...';
        
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
async function calcularEstatisticasReais() {
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
        
        // Atualizar interface
        document.getElementById('total-programas').textContent = totalProgramas;
        document.getElementById('programas-andamento').textContent = programasEmAndamento;
        document.getElementById('programas-concluidos').textContent = programasConcluidos;
        document.getElementById('tarefas-totais-programas').innerHTML = 
            `<span class="total">${totalTarefasEmProgramas}</span>
             <span class="separator">/</span>
             <span class="programas">${programasComTarefas}</span>`;
        document.getElementById('tarefas-ativas-programas').innerHTML = 
            `<span class="total">${tarefasAtivasEmProgramas}</span>
             <span class="separator">/</span>
             <span class="programas">${programasEmAndamento}</span>`;
        
    } catch (error) {
        console.error('❌ Erro ao calcular estatísticas:', error);
    }
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
    if (filterStatus) {
        filterStatus.addEventListener('change', () => {
            filtrarProgramas();
        });
    }
    
    // Fechar modal ao clicar fora
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('modalPrograma');
        const modalDetalhes = document.getElementById('modalDetalhesPrograma');
        
        if (event.target === modal) {
            fecharModalPrograma();
        }
        if (event.target === modalDetalhes) {
            fecharModalDetalhesPrograma();
        }
    });
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
        
        // Filtro por status
        if (filtroStatus) {
            const tarefasPrograma = tarefasPorPrograma[programa.id] || [];
            let statusPrograma = 'planejamento';
            
            if (tarefasPrograma.length > 0) {
                const todasConcluidas = tarefasPrograma.every(tarefa => {
                    const status = (tarefa.status || '').toLowerCase().trim();
                    return status === 'concluido' || status === 'concluído';
                });
                
                const temAtivas = tarefasPrograma.some(tarefa => {
                    const status = (tarefa.status || '').toLowerCase().trim();
                    return !(status === 'concluido' || status === 'concluído');
                });
                
                if (todasConcluidas) {
                    statusPrograma = 'concluido';
                } else if (temAtivas) {
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
    
    const tarefasPrograma = tarefasPorPrograma[programa.id] || [];
    const totalTarefas = tarefasPrograma.length;
    
    // Calcular progresso
    const tarefasConcluidas = tarefasPrograma.filter(tarefa => {
        const status = (tarefa.status || '').toLowerCase().trim();
        return status === 'concluido' || status === 'concluído';
    }).length;
    
    const progresso = totalTarefas > 0 ? (tarefasConcluidas / totalTarefas) * 100 : 0;
    
    // Determinar status do programa
    let statusPrograma = 'planejamento';
    let statusClass = 'status-planejamento';
    let statusText = 'Planejamento';
    
    if (totalTarefas > 0) {
        if (tarefasConcluidas === totalTarefas) {
            statusPrograma = 'concluido';
            statusClass = 'status-concluido';
            statusText = 'Concluído';
        } else if (tarefasConcluidas > 0 || tarefasPrograma.some(t => {
            const status = (t.status || '').toLowerCase().trim();
            return status === 'andamento' || status === 'em andamento';
        })) {
            statusPrograma = 'andamento';
            statusClass = 'status-ativo';
            statusText = 'Em Andamento';
        }
    }
    
    // Formatar data
    const dataCriacao = programa.dataCriacao ? 
        formatarDataFirestore(programa.dataCriacao) : 'Não definida';
    
    card.innerHTML = `
        <div class="program-header">
            <div class="program-icon">
                <i class="fas fa-project-diagram"></i>
            </div>
            <div class="program-title">
                <h3>${programa.titulo || 'Programa sem título'}</h3>
                <span class="program-status ${statusClass}">${statusText}</span>
            </div>
            <div class="program-actions">
                <button class="btn-icon" title="Ver detalhes" onclick="verDetalhesPrograma('${programa.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon" title="Editar" onclick="editarPrograma('${programa.id}')">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        </div>
        <div class="program-content">
            <p class="program-description">${programa.descricao || 'Sem descrição'}</p>
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

// MODAL DE PROGRAMA
async function abrirModalPrograma(programaId = null) {
    const modal = document.getElementById('modalPrograma');
    const titulo = document.getElementById('modalProgramaTitle');
    
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
    modal.style.display = 'none';
    programaEditando = null;
    limparFormularioPrograma();
}

function preencherFormularioPrograma(programa) {
    document.getElementById('programaTitulo').value = programa.titulo || '';
    document.getElementById('programaDescricao').value = programa.descricao || '';
    document.getElementById('programaStatus').value = programa.status || 'planejamento';
    
    // Datas - converter de Timestamp para string
    if (programa.dataInicio) {
        document.getElementById('programaDataInicio').value = 
            formatarTimestampParaInput(programa.dataInicio);
    }
    if (programa.dataFim) {
        document.getElementById('programaDataFim').value = 
            formatarTimestampParaInput(programa.dataFim);
    }
}

function limparFormularioPrograma() {
    document.getElementById('formPrograma').reset();
    document.getElementById('tarefas-selecionadas-container').innerHTML = '';
}

// Carregar tarefas para seleção no modal
async function carregarTarefasParaSelecao(tarefasSelecionadasIds = []) {
    const container = document.getElementById('lista-tarefas-selecao');
    
    if (todasTarefas.length === 0) {
        container.innerHTML = '<div class="no-tarefas">Nenhuma tarefa encontrada</div>';
        return;
    }
    
    // Limpar container de selecionados
    const containerSelecionados = document.getElementById('tarefas-selecionadas-container');
    containerSelecionados.innerHTML = '';
    
    // Adicionar tarefas selecionadas
    tarefasSelecionadasIds.forEach(tarefaId => {
        const tarefa = todasTarefas.find(t => t.id === tarefaId);
        if (tarefa) {
            adicionarTarefaSelecionada(tarefa);
        }
    });
    
    // Filtrar tarefas que não estão selecionadas
    const tarefasDisponiveis = todasTarefas.filter(tarefa => 
        !tarefasSelecionadasIds.includes(tarefa.id)
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
    const items = container.querySelectorAll('.tarefa-item-selecao');
    
    termo = termo.toLowerCase();
    
    items.forEach(item => {
        const titulo = item.querySelector('.tarefa-titulo').textContent.toLowerCase();
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

// Obter IDs das tarefas selecionadas
function obterTarefasSelecionadasIds() {
    const container = document.getElementById('tarefas-selecionadas-container');
    const items = container.querySelectorAll('.tarefa-selecionada-item');
    return Array.from(items).map(item => item.dataset.tarefaId);
}

// Salvar programa
async function salvarPrograma() {
    try {
        const titulo = document.getElementById('programaTitulo').value.trim();
        const descricao = document.getElementById('programaDescricao').value.trim();
        const status = document.getElementById('programaStatus').value;
        const dataInicio = document.getElementById('programaDataInicio').value;
        const dataFim = document.getElementById('programaDataFim').value;
        const tarefasSelecionadas = obterTarefasSelecionadasIds();
        
        if (!titulo) {
            alert('O título do programa é obrigatório!');
            return;
        }
        
        const programaData = {
            titulo,
            descricao,
            status,
            dataInicio: dataInicio || null,
            dataFim: dataFim || null,
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
    const programa = programas.find(p => p.id === programaId);
    if (!programa) return;
    
    const modal = document.getElementById('modalDetalhesPrograma');
    const tarefasPrograma = tarefasPorPrograma[programaId] || [];
    
    // Preencher informações básicas
    document.getElementById('detalhesProgramaTitle').textContent = programa.titulo;
    document.getElementById('detalhesNomePrograma').textContent = programa.titulo;
    document.getElementById('detalhesDescricaoPrograma').textContent = programa.descricao || 'Sem descrição';
    document.getElementById('detalhesCriadoPor').textContent = programa.criadoPor || 'Não informado';
    
    // Datas
    const dataCriacao = programa.dataCriacao ? 
        formatarDataFirestore(programa.dataCriacao) : 'Não definida';
    document.getElementById('detalhesDatasPrograma').textContent = `Criado em: ${dataCriacao}`;
    
    // Status
    const statusElement = document.getElementById('detalhesStatusPrograma');
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
        } else if (tarefasPrograma.some(t => {
            const status = (t.status || '').toLowerCase().trim();
            return status === 'andamento' || status === 'em andamento';
        })) {
            statusClass = 'status-ativo';
            statusText = 'Em Andamento';
        }
    }
    
    statusElement.className = `badge ${statusClass}`;
    statusElement.textContent = statusText;
    
    // Progresso
    const tarefasConcluidas = tarefasPrograma.filter(tarefa => {
        const status = (tarefa.status || '').toLowerCase().trim();
        return status === 'concluido' || status === 'concluído';
    }).length;
    
    const progresso = tarefasPrograma.length > 0 ? 
        (tarefasConcluidas / tarefasPrograma.length) * 100 : 0;
    
    document.getElementById('detalhesProgressoPrograma').textContent = `${Math.round(progresso)}%`;
    document.getElementById('detalhesProgressoBarra').style.width = `${progresso}%`;
    
    // Configurar botão de editar
    document.getElementById('btnEditarPrograma').onclick = () => {
        fecharModalDetalhesPrograma();
        setTimeout(() => editarPrograma(programaId), 300);
    };
    
    // Listar tarefas
    const containerTarefas = document.getElementById('lista-tarefas-detalhes');
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
    
    modal.style.display = 'flex';
}

function fecharModalDetalhesPrograma() {
    const modal = document.getElementById('modalDetalhesPrograma');
    modal.style.display = 'none';
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

function formatarTimestampParaInput(timestamp) {
    if (!timestamp) return '';
    try {
        const date = timestamp.toDate();
        return date.toISOString().split('T')[0];
    } catch {
        return '';
    }
}

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
window.verDetalhesPrograma = verDetalhesPrograma;
window.fecharModalDetalhesPrograma = fecharModalDetalhesPrograma;
window.filtrarTarefasSelecao = filtrarTarefasSelecao;
window.selecionarTarefa = selecionarTarefa;
window.removerTarefaSelecionada = removerTarefaSelecionada;
window.logout = logout;
