// programa.js - Sistema de Programas com Hierarquia (Estrutura Simplificada)

// Variáveis globais
let programas = [];
let tarefasPorPrograma = {};
let todasTarefas = [];
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
        
        // Inicializar Firebase
        await inicializarFirebase();
        
        // Configurar listeners e carregar dados
        configurarEventListeners();
        
        // Carregar tarefas para mostrar
        await carregarTodasTarefas();
        
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
        const firebaseConfig = {
            apiKey: "AIzaSyAs0Ke4IBfBWDrfH0AXaOhCEjtfpPtR_Vg",
            authDomain: "orgtarefas-85358.firebaseapp.com",
            projectId: "orgtarefas-85358",
            storageBucket: "orgtarefas-85358.firebasestorage.app",
            messagingSenderId: "1023569488575",
            appId: "1:1023569488575:web:18f9e201115a1a92ccb40a"
        };
        
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        const db = firebase.firestore();
        programasCollection = db.collection("programas");
        tarefasCollection = db.collection("tarefas");
        
        // Configurar listener
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
                    ...doc.data(),
                    membros: doc.data().membros || {} // Garantir que membros existe
                }));
                
                console.log('📋 Programas carregados:', programas.length);
                
                // Buscar informações das tarefas relacionadas
                await buscarInformacoesTarefasDireto();
                
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

async function carregarTodasTarefas() {
    try {
        console.log('📥 Carregando todas as tarefas...');
        const snapshot = await tarefasCollection.get();
        todasTarefas = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log('✅ Todas as tarefas carregadas:', todasTarefas.length);
    } catch (error) {
        console.error('❌ Erro ao carregar tarefas:', error);
        todasTarefas = [];
    }
}

// Buscar informações das tarefas relacionadas
async function buscarInformacoesTarefasDireto() {
    tarefasPorPrograma = {};
    
    for (const programa of programas) {
        const tarefasIds = programa.tarefas_relacionadas || [];
        const tarefasDoPrograma = [];
        
        console.log(`🔍 Buscando tarefas do programa ${programa.titulo}:`, tarefasIds.length);
        
        if (tarefasIds.length > 0) {
            for (const tarefaId of tarefasIds) {
                try {
                    const tarefaDoc = await tarefasCollection.doc(tarefaId).get();
                    
                    if (tarefaDoc.exists) {
                        const tarefaData = tarefaDoc.data();
                        tarefasDoPrograma.push({
                            id: tarefaId,
                            titulo: tarefaData.titulo || 'Tarefa sem título',
                            status: tarefaData.status || 'nao_iniciado',
                            prioridade: tarefaData.prioridade || 'media',
                            dataFim: tarefaData.dataFim,
                            gruposAcesso: tarefaData.gruposAcesso || [],
                            descricao: tarefaData.descricao || '',
                            dataCriacao: tarefaData.dataCriacao,
                            criadoPor: tarefaData.criadoPor,
                            programaId: tarefaData.programaId || null
                        });
                    } else {
                        console.warn(`⚠️ Tarefa ${tarefaId} não encontrada no banco`);
                    }
                } catch (error) {
                    console.error(`❌ Erro ao buscar tarefa ${tarefaId}:`, error);
                }
            }
        }
        
        tarefasPorPrograma[programa.id] = tarefasDoPrograma;
        console.log(`✅ ${tarefasDoPrograma.length} tarefas encontradas para o programa ${programa.titulo}`);
    }
}

// Função atualizada para a nova lógica
function verificarPermissaoPrograma(programa) {
    if (!usuarioLogado || !programa) return 'demais';
    
    const usuario = usuarioLogado.usuario;
    
    // Se for o criador do programa, é admin por padrão
    // (mesmo se não estiver explicitamente no campo membros)
    if (programa.criadoPor === usuario) {
        return 'admin';
    }
    
    // Verificar se está na lista de membros do programa
    if (programa.membros && programa.membros[usuario]) {
        return programa.membros[usuario]; // Retorna "admin" ou "membro"
    }
    
    // Se não está na lista de membros, é "demais"
    return 'demais';
}

// Calcular estatísticas
function atualizarEstatisticasReais() {
    try {
        const totalProgramas = programas.length;
        let programasEmAndamento = 0;
        let programasConcluidos = 0;
        let totalTarefasEmProgramas = 0;
        let tarefasAtivasEmProgramas = 0;
        let programasComTarefas = 0;
        
        programas.forEach(programa => {
            const tarefasPrograma = tarefasPorPrograma[programa.id] || [];
            const totalTarefas = tarefasPrograma.length;
            
            if (totalTarefas > 0) {
                programasComTarefas++;
                totalTarefasEmProgramas += totalTarefas;
                
                const tarefasAtivas = tarefasPrograma.filter(tarefa => {
                    const status = (tarefa.status || '').toLowerCase().trim();
                    return !(status === 'concluido' || status === 'concluído');
                }).length;
                
                tarefasAtivasEmProgramas += tarefasAtivas;
                
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

// Criar card de programa com controle de permissões
function criarCardPrograma(programa) {
    const card = document.createElement('div');
    card.className = 'program-card';
    card.dataset.id = programa.id;
    
    // Verificar permissões do usuário atual
    const roleUsuario = verificarPermissaoPrograma(programa);
    const isAdmin = roleUsuario === 'admin';
    const isMembro = roleUsuario === 'membro';
    const isDemais = roleUsuario === 'demais';
    
    const tarefasPrograma = tarefasPorPrograma[programa.id] || [];
    const totalTarefas = tarefasPrograma.length;
    
    // Calcular progresso (só se for admin ou membro)
    const tarefasConcluidas = (isAdmin || isMembro) ? 
        tarefasPrograma.filter(tarefa => {
            const status = (tarefa.status || '').toLowerCase().trim();
            return status === 'concluido' || status === 'concluído';
        }).length : 0;
    
    const progresso = totalTarefas > 0 ? (tarefasConcluidas / totalTarefas) * 100 : 0;
    
    // Determinar status do programa
    let statusHTML = '';
    if (totalTarefas > 0) {
        if (tarefasConcluidas === totalTarefas) {
            statusHTML = '<span class="program-status status-concluido">Concluído</span>';
        } else {
            statusHTML = '<span class="program-status status-ativo">Em Andamento</span>';
        }
    } else {
        statusHTML = '<span class="program-status status-planejamento">Planejamento</span>';
    }
    
    // Formatar data
    const dataCriacao = programa.dataCriacao ? 
        formatarDataFirestore(programa.dataCriacao) : 'Não definida';
    
    // Criar lista de tarefas (só para admin e membro)
    let listaTarefasHTML = '';
    if (isAdmin || isMembro) {
        if (totalTarefas > 0) {
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
                            const tarefaTituloCurto = tarefa.titulo.length > 60 ? 
                                tarefa.titulo.substring(0, 60) + '...' : tarefa.titulo;
                            
                            return `
                            <div class="tarefa-lista-item ${isConcluida ? 'concluida' : ''}" 
                                 onclick="irParaTarefa('${tarefa.id}')" 
                                 title="${tarefa.titulo}">
                                <div class="tarefa-item-numero">
                                    <span>${index + 1}</span>
                                </div>
                                <div class="tarefa-item-info">
                                    <div class="tarefa-item-titulo">
                                        ${tarefaTituloCurto}
                                    </div>
                                    <div class="tarefa-item-detalhes">
                                        <span class="badge ${statusClasse}">
                                            ${statusLabel}
                                        </span>
                                        ${tarefa.prioridade ? 
                                            `<span class="badge prioridade-${tarefa.prioridade}">
                                                ${tarefa.prioridade.charAt(0).toUpperCase() + tarefa.prioridade.slice(1)}
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
    } else {
        // Para usuários "Demais", mostrar apenas contagem
        listaTarefasHTML = `
            <div class="program-sem-tarefas">
                <i class="fas fa-lock"></i>
                <span>Conteúdo restrito para membros</span>
            </div>
        `;
    }
    
    // Botões de ação baseados na role
    let acoesHTML = '';
    if (isAdmin) {
        acoesHTML = `
            <button class="btn-icon" title="Ver detalhes" onclick="verDetalhesPrograma('${programa.id}')">
                <i class="fas fa-eye"></i>
            </button>
            <button class="btn-icon" title="Editar" onclick="editarPrograma('${programa.id}')">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon" title="Gerenciar Membros" onclick="gerenciarMembrosPrograma('${programa.id}')">
                <i class="fas fa-users-cog"></i>
            </button>
            <button class="btn-icon btn-icon-excluir" title="Excluir" onclick="excluirPrograma('${programa.id}')">
                <i class="fas fa-trash"></i>
            </button>
        `;
    } else if (isMembro) {
        acoesHTML = `
            <button class="btn-icon" title="Ver detalhes" onclick="verDetalhesPrograma('${programa.id}')">
                <i class="fas fa-eye"></i>
            </button>
        `;
    } else {
        // Demais - só pode ver
        acoesHTML = `
            <button class="btn-icon" title="Ver detalhes" onclick="verDetalhesPrograma('${programa.id}')">
                <i class="fas fa-eye"></i>
            </button>
        `;
    }
    
    // Mostrar quem são os admins (para todos)
    let adminsHTML = '';
    if (programa.membros) {
        const admins = Object.entries(programa.membros)
            .filter(([usuario, role]) => role === 'admin')
            .map(([usuario, role]) => usuario);
        
        if (admins.length > 0) {
            adminsHTML = `
                <div class="program-admins">
                    <i class="fas fa-crown"></i>
                    <small>Admins: ${admins.join(', ')}</small>
                </div>
            `;
        }
    }
    
    card.innerHTML = `
        <div class="program-header">
            <div class="program-icon">
                <i class="fas fa-project-diagram"></i>
            </div>
            <div class="program-title">
                <h3>${programa.titulo || 'Programa sem título'}</h3>
                ${statusHTML}
                ${isDemais ? '<span class="badge badge-info" style="margin-left: 8px;">Visualização Restrita</span>' : ''}
            </div>
            <div class="program-actions">
                ${acoesHTML}
            </div>
        </div>
        <div class="program-content">
            <p class="program-description">${programa.descricao || 'Sem descrição'}</p>
            
            ${listaTarefasHTML}
            
            <div class="program-meta">
                <div class="meta-item">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Criado: ${dataCriacao}</span>
                </div>
                ${(isAdmin || isMembro) ? `
                <div class="meta-item">
                    <i class="fas fa-tasks"></i>
                    <span>${totalTarefas} Tarefas</span>
                    ${tarefasConcluidas > 0 ? 
                        `<small style="margin-left: 5px; color: #4CAF50;">
                            (${tarefasConcluidas} concluídas)
                        </small>` : ''}
                </div>
                ` : ''}
                <div class="meta-item">
                    <i class="fas fa-user"></i>
                    <span>${programa.criadoPor || 'Não informado'}</span>
                </div>
            </div>
            ${adminsHTML}
            ${(isAdmin || isMembro) && totalTarefas > 0 ? `
            <div class="progress-container">
                <div class="progress-label">
                    <span>Progresso Geral</span>
                    <span>${Math.round(progresso)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progresso}%"></div>
                </div>
            </div>
            ` : ''}
        </div>
    `;
    
    return card;
}

// Função para excluir programa
async function excluirPrograma(programaId) {
    try {
        const programa = programas.find(p => p.id === programaId);
        if (!programa) return;
        
        // Verificar se é admin
        const roleUsuario = verificarPermissaoPrograma(programa);
        if (roleUsuario !== 'admin') {
            mostrarMensagem('Apenas administradores podem excluir programas', 'error');
            return;
        }
        
        // Verificar se tem tarefas relacionadas
        const tarefasPrograma = tarefasPorPrograma[programaId] || [];
        
        let mensagemConfirmacao = `Tem certeza que deseja excluir o programa "${programa.titulo}"?`;
        
        if (tarefasPrograma.length > 0) {
            mensagemConfirmacao += `\n\nEste programa tem ${tarefasPrograma.length} tarefa(s) relacionada(s). A exclusão NÃO removerá as tarefas, apenas o vínculo com o programa.`;
            
            // Perguntar se quer remover o campo programaId das tarefas
            mensagemConfirmacao += `\n\nDeseja também remover a referência a este programa das tarefas relacionadas?`;
            const removerDeTarefas = confirm(mensagemConfirmacao);
            
            if (removerDeTarefas) {
                // Remover programaId das tarefas relacionadas
                for (const tarefa of tarefasPrograma) {
                    try {
                        await tarefasCollection.doc(tarefa.id).update({
                            programaId: firebase.firestore.FieldValue.delete(),
                            dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        console.log(`✅ Removido programaId da tarefa ${tarefa.id}`);
                    } catch (error) {
                        console.error(`❌ Erro ao remover programaId da tarefa ${tarefa.id}:`, error);
                    }
                }
            }
        }
        
        // Excluir programa do Firebase
        await programasCollection.doc(programaId).delete();
        
        // Mostrar mensagem de sucesso
        mostrarMensagem('Programa excluído com sucesso!', 'success');
        
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
    
    // Se estiver editando, verificar se é admin
    if (programaId) {
        const programa = programas.find(p => p.id === programaId);
        const roleUsuario = verificarPermissaoPrograma(programa);
        if (roleUsuario !== 'admin') {
            mostrarMensagem('Apenas administradores podem editar programas', 'error');
            return;
        }
    }
    
    programaEditando = programaId ? programas.find(p => p.id === programaId) : null;
    
    if (programaEditando) {
        titulo.textContent = 'Editar Programa';
        preencherFormularioPrograma(programaEditando);
        
        // Mostrar tarefas vinculadas (APENAS VISUALIZAÇÃO)
        await mostrarTarefasVinculadas(programaEditando.id);
    } else {
        titulo.textContent = 'Novo Programa';
        limparFormularioPrograma();
        
        // Ocultar seção de tarefas para novo programa
        const container = document.getElementById('tarefas-visualizacao-container');
        if (container) container.style.display = 'none';
    }
    
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
}

// Adicionar criador como admin automaticamente (garantir campo membros)
async function garantirCampoMembros(programaId) {
    try {
        const programa = programas.find(p => p.id === programaId);
        if (!programa) return;
        
        // Se não tem campo membros, criar com o criador como admin
        if (!programa.membros) {
            await programasCollection.doc(programaId).update({
                membros: {
                    [programa.criadoPor]: 'admin'
                },
                dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ Campo membros criado para ${programaId}`);
        }
    } catch (error) {
        console.error('❌ Erro ao garantir campo membros:', error);
    }
}

// Função para mostrar tarefas vinculadas (APENAS VISUALIZAÇÃO)
async function mostrarTarefasVinculadas(programaId) {
    const container = document.getElementById('tarefas-exibicao-container');
    const lista = document.getElementById('tarefas-visualizacao-lista');
    
    if (!container || !lista) return;
    
    // Verificar permissão
    const programa = programas.find(p => p.id === programaId);
    const roleUsuario = verificarPermissaoPrograma(programa);
    if (roleUsuario === 'demais') {
        container.style.display = 'none';
        return;
    }
    
    // Buscar tarefas deste programa
    const tarefasDoPrograma = tarefasPorPrograma[programaId] || [];
    
    if (tarefasDoPrograma.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    
    // Limpar lista
    lista.innerHTML = '';
    
    // Adicionar cada tarefa
    tarefasDoPrograma.forEach(tarefa => {
        const tarefaItem = document.createElement('div');
        tarefaItem.className = 'tarefa-visualizacao-item';
        tarefaItem.innerHTML = `
            <div class="tarefa-visualizacao-info">
                <div class="tarefa-visualizacao-titulo">
                    <i class="fas fa-tasks"></i>
                    ${tarefa.titulo || 'Tarefa sem título'}
                </div>
                <div class="tarefa-visualizacao-detalhes">
                    <span class="badge ${normalizarStatusParaClasse(tarefa.status)}">
                        ${formatarStatus(tarefa.status)}
                    </span>
                    <span class="badge prioridade-${tarefa.prioridade || 'media'}">
                        ${tarefa.prioridade?.charAt(0).toUpperCase() + tarefa.prioridade?.slice(1) || 'Média'}
                    </span>
                    ${tarefa.dataFim ? `
                        <small><i class="fas fa-calendar"></i> ${formatarData(tarefa.dataFim)}</small>
                    ` : ''}
                </div>
            </div>
            <div class="tarefa-visualizacao-acoes">
                <button class="btn-link" onclick="irParaTarefa('${tarefa.id}')" title="Ver tarefa">
                    <i class="fas fa-external-link-alt"></i>
                </button>
            </div>
        `;
        lista.appendChild(tarefaItem);
    });
    
    // Adicionar contador
    const contador = document.createElement('div');
    contador.className = 'tarefas-visualizacao-contador';
    contador.textContent = `Total: ${tarefasDoPrograma.length} tarefa(s) vinculada(s)`;
    lista.appendChild(contador);
}

// Salvar programa
async function salvarPrograma() {
    try {
        const tituloInput = document.getElementById('programaTitulo');
        const descricaoInput = document.getElementById('programaDescricao');
        
        if (!tituloInput || !descricaoInput) return;
        
        const titulo = tituloInput.value.trim();
        const descricao = descricaoInput.value.trim();
        
        if (!titulo) {
            alert('O título do programa é obrigatório!');
            return;
        }
        
        const programaData = {
            titulo,
            descricao: descricao || '',
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
            
            // Adicionar campo membros com o criador como admin
            programaData.membros = {
                [usuarioLogado.usuario]: 'admin'
            };
            
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
    
    // Verificar permissão
    const roleUsuario = verificarPermissaoPrograma(programa);
    const isAdmin = roleUsuario === 'admin';
    const isMembro = roleUsuario === 'membro';
    const isDemais = roleUsuario === 'demais';
    
    const tarefasPrograma = tarefasPorPrograma[programaId] || [];
    
    // Garantir que todos os elementos estão visíveis primeiro (para evitar erros)
    const elementosParaRestaurar = [
        'detalhesDatasPrograma',
        'detalhesTotalTarefas',
        'detalhesProgressoPrograma',
        'detalhesProgressoBarra',
        'detalhesTarefasConcluidas',
        'detalhesTotalTarefasContagem'
    ];
    
    elementosParaRestaurar.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'block';
    });
    
    // Mostrar seção de tarefas
    const detalhesTarefasSection = document.querySelector('.detalhes-tarefas');
    if (detalhesTarefasSection) detalhesTarefasSection.style.display = 'block';
    
    // Se for demais, limitar visualização
    if (isDemais) {
        // Mostrar apenas informações básicas
        document.getElementById('detalhesProgramaTitle').textContent = programa.titulo;
        document.getElementById('detalhesNomePrograma').textContent = programa.titulo;
        document.getElementById('detalhesDescricaoPrograma').textContent = programa.descricao || 'Sem descrição';
        
        // Coletar todos os admins (incluindo criador se não estiver explicitamente no map)
        let admins = [];
        
        // O criador sempre é admin
        if (programa.criadoPor) {
            admins.push(`${programa.criadoPor} (criador)`);
        }
        
        // Admins do map membros
        if (programa.membros) {
            const adminsMap = Object.entries(programa.membros)
                .filter(([usuario, role]) => role === 'admin')
                .map(([usuario, role]) => usuario);
            
            admins.push(...adminsMap.filter(admin => admin !== programa.criadoPor));
        }
        
        // Remover duplicados (caso criador também esteja no map)
        admins = [...new Set(admins)];
        
        document.getElementById('detalhesCriadoPor').textContent = 
            `Administradores: ${admins.length > 0 ? admins.join(', ') : 'Não definidos'}`;
        
        // Ocultar seções sensíveis para Demais
        document.getElementById('detalhesDatasPrograma').textContent = '';
        document.getElementById('detalhesTotalTarefas').style.display = 'none';
        document.getElementById('detalhesProgressoPrograma').style.display = 'none';
        document.getElementById('detalhesProgressoBarra').style.display = 'none';
        document.getElementById('detalhesTarefasConcluidas').style.display = 'none';
        document.getElementById('detalhesTotalTarefasContagem').style.display = 'none';
        
        // Ocultar status automático (mostrar apenas para Admin/Membro)
        const statusAutoEl = document.getElementById('detalhesStatusAutomatico');
        if (statusAutoEl) {
            statusAutoEl.style.display = 'none';
        }
        
        // Ocultar botões de editar/excluir
        document.getElementById('btnEditarPrograma').style.display = 'none';
        document.getElementById('btnExcluirPrograma').style.display = 'none';
        
        // Ocultar seção de tarefas
        if (detalhesTarefasSection) {
            detalhesTarefasSection.style.display = 'none';
        }
        
        // Mostrar mensagem explicativa
        document.getElementById('detalhesCriadoPor').innerHTML += 
            '<br><small style="color: #666; font-style: italic;">(Você tem acesso restrito a este programa)</small>';
        
        modal.style.display = 'flex';
        return;
    }
    
    // Para admin e membro, mostrar tudo
    // Restaurar visibilidade dos elementos
    document.getElementById('detalhesTotalTarefas').style.display = 'block';
    document.getElementById('detalhesProgressoPrograma').style.display = 'block';
    document.getElementById('detalhesProgressoBarra').style.display = 'block';
    document.getElementById('detalhesTarefasConcluidas').style.display = 'block';
    document.getElementById('detalhesTotalTarefasContagem').style.display = 'block';
    
    // Mostrar seção de tarefas para Admin/Membro
    if (detalhesTarefasSection) {
        detalhesTarefasSection.style.display = 'block';
    }
    
    // Mostrar status automático
    const statusAutoEl = document.getElementById('detalhesStatusAutomatico');
    if (statusAutoEl) {
        statusAutoEl.style.display = 'inline-block';
    }
    
    // Configurar botões baseados na role
    if (isAdmin) {
        document.getElementById('btnEditarPrograma').style.display = 'inline-block';
        document.getElementById('btnExcluirPrograma').style.display = 'inline-block';
        
        // Adicionar botão de gerenciar membros (só para admin)
        const btnGerenciar = document.getElementById('btnGerenciarMembros');
        if (!btnGerenciar) {
            // Criar botão se não existir
            const footer = document.querySelector('.modal-footer');
            if (footer) {
                const btnGerenciarHTML = `
                    <button type="button" class="btn btn-secondary" id="btnGerenciarMembros">
                        <i class="fas fa-users-cog"></i> Gerenciar Membros
                    </button>
                `;
                footer.insertAdjacentHTML('afterbegin', btnGerenciarHTML);
                
                // Configurar evento
                document.getElementById('btnGerenciarMembros').onclick = () => {
                    fecharModalDetalhesPrograma();
                    setTimeout(() => gerenciarMembrosPrograma(programaId), 300);
                };
            }
        } else {
            btnGerenciar.style.display = 'inline-block';
            btnGerenciar.onclick = () => {
                fecharModalDetalhesPrograma();
                setTimeout(() => gerenciarMembrosPrograma(programaId), 300);
            };
        }
    } else {
        // Para membro, esconder botões de admin
        document.getElementById('btnEditarPrograma').style.display = 'none';
        document.getElementById('btnExcluirPrograma').style.display = 'none';
        
        // Esconder botão de gerenciar membros
        const btnGerenciar = document.getElementById('btnGerenciarMembros');
        if (btnGerenciar) {
            btnGerenciar.style.display = 'none';
        }
    }
    
    // Preencher informações básicas
    const detalhesTitulo = document.getElementById('detalhesProgramaTitle');
    const detalhesNome = document.getElementById('detalhesNomePrograma');
    const detalhesDescricao = document.getElementById('detalhesDescricaoPrograma');
    const detalhesCriadoPor = document.getElementById('detalhesCriadoPor');
    const detalhesStatusAutomatico = document.getElementById('detalhesStatusAutomatico');
    
    if (detalhesTitulo) detalhesTitulo.textContent = programa.titulo;
    if (detalhesNome) detalhesNome.textContent = programa.titulo;
    if (detalhesDescricao) detalhesDescricao.textContent = programa.descricao || 'Sem descrição';
    
    // Mostrar criador
    if (detalhesCriadoPor) {
        let criadorTexto = `Criado por: ${programa.criadoPor || 'Não informado'}`;
        
        // Adicionar role do usuário atual se for admin ou membro
        if (roleUsuario) {
            const roleText = roleUsuario === 'admin' ? 'Administrador' : 'Membro';
            criadorTexto += ` (Você é ${roleText})`;
        }
        
        detalhesCriadoPor.textContent = criadorTexto;
    }
    
    // Determinar status automático baseado nas tarefas
    let statusText = 'Planejamento';
    let statusClass = 'status-planejamento';
    
    if (tarefasPrograma.length > 0) {
        const tarefasAtivas = tarefasPrograma.filter(tarefa => {
            const status = (tarefa.status || '').toLowerCase().trim();
            return status !== 'concluido' && status !== 'concluído';
        }).length;
        
        const tarefasConcluidas = tarefasPrograma.length - tarefasAtivas;
        
        if (tarefasConcluidas === tarefasPrograma.length) {
            statusText = 'Concluído';
            statusClass = 'status-concluido';
        } else if (tarefasAtivas > 0) {
            statusText = 'Em Andamento';
            statusClass = 'status-ativo';
        } else {
            statusText = 'Planejamento';
            statusClass = 'status-planejamento';
        }
    }
    
    if (detalhesStatusAutomatico) {
        detalhesStatusAutomatico.textContent = statusText;
        detalhesStatusAutomatico.className = `badge ${statusClass}`;
    }
    
    // Datas
    const dataCriacao = programa.dataCriacao ? 
        formatarDataFirestore(programa.dataCriacao) : 'Não definida';
    const dataAtualizacao = programa.dataAtualizacao ? 
        formatarDataFirestore(programa.dataAtualizacao) : 'Não atualizado';
    
    const detalhesDatas = document.getElementById('detalhesDatasPrograma');
    if (detalhesDatas) {
        detalhesDatas.textContent = `Criado em: ${dataCriacao} | Última atualização: ${dataAtualizacao}`;
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
    const detalhesTarefasConcluidas = document.getElementById('detalhesTarefasConcluidas');
    const detalhesTotalTarefasContagem = document.getElementById('detalhesTotalTarefasContagem');
    const detalhesTotalTarefas = document.getElementById('detalhesTotalTarefas');
    
    if (detalhesProgresso) detalhesProgresso.textContent = `${Math.round(progresso)}%`;
    if (detalhesProgressoBarra) detalhesProgressoBarra.style.width = `${progresso}%`;
    if (detalhesTarefasConcluidas) detalhesTarefasConcluidas.textContent = `${tarefasConcluidas} concluídas`;
    if (detalhesTotalTarefasContagem) detalhesTotalTarefasContagem.textContent = `${tarefasPrograma.length} tarefas`;
    if (detalhesTotalTarefas) detalhesTotalTarefas.textContent = `${tarefasPrograma.length} tarefas`;
    
    // Mostrar estatísticas de membros (só para Admin/Membro)
    const estatisticasMembros = document.getElementById('estatisticasMembros');
    if (!estatisticasMembros && (isAdmin || isMembro)) {
        // Adicionar seção de estatísticas de membros
        const infoSection = document.querySelector('.detalhes-info');
        if (infoSection) {
            const membros = programa.membros || {};
            const totalMembros = Object.keys(membros).length;
            const totalAdmins = Object.values(membros).filter(role => role === 'admin').length;
            const totalMembrosRole = Object.values(membros).filter(role => role === 'membro').length;
            
            const statsHTML = `
                <div class="membros-stats" style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 6px;">
                    <small><i class="fas fa-users"></i> <strong>Integrantes do Programa:</strong> ${totalMembros} (${totalAdmins} admin, ${totalMembrosRole} membro)</small>
                </div>
            `;
            infoSection.insertAdjacentHTML('beforeend', statsHTML);
        }
    }
    
    // Configurar botão de editar
    const btnEditar = document.getElementById('btnEditarPrograma');
    if (btnEditar && isAdmin) {
        btnEditar.onclick = () => {
            fecharModalDetalhesPrograma();
            setTimeout(() => editarPrograma(programaId), 300);
        };
    }

    // Configurar botão de excluir
    const btnExcluir = document.getElementById('btnExcluirPrograma');
    if (btnExcluir && isAdmin) {
        btnExcluir.onclick = () => {
            if (confirm(`Tem certeza que deseja excluir o programa "${programa.titulo}"?\n\nEsta ação não pode ser desfeita.`)) {
                excluirPrograma(programaId);
                fecharModalDetalhesPrograma();
            }
        };
    }
    
    // Listar tarefas (só para Admin e Membro)
    const containerTarefas = document.getElementById('lista-tarefas-detalhes');
    if (containerTarefas) {
        if (tarefasPrograma.length === 0) {
            containerTarefas.innerHTML = `
                <div class="no-tarefas">
                    <i class="fas fa-info-circle"></i>
                    <p>Nenhuma tarefa relacionada a este programa</p>
                    ${isAdmin ? '<small><i class="fas fa-lightbulb"></i> Dica: Vá para a tela de Tarefas para vincular tarefas a este programa</small>' : ''}
                </div>
            `;
        } else {
            containerTarefas.innerHTML = tarefasPrograma.map((tarefa, index) => {
                const statusLabel = formatarStatus(tarefa.status);
                const statusClasse = normalizarStatusParaClasse(tarefa.status);
                const dataFimFormatada = tarefa.dataFim ? formatarData(tarefa.dataFim) : 'Não definida';
                const tarefaDescricaoCurta = tarefa.descricao && tarefa.descricao.length > 100 ? 
                    tarefa.descricao.substring(0, 100) + '...' : tarefa.descricao || '';
                
                // Determinar ícone baseado no status
                let statusIcon = 'fa-circle';
                switch(statusClasse) {
                    case 'status-concluido': statusIcon = 'fa-check-circle'; break;
                    case 'status-andamento': statusIcon = 'fa-spinner'; break;
                    case 'status-pendente': statusIcon = 'fa-clock'; break;
                    default: statusIcon = 'fa-circle';
                }
                
                return `
                <div class="tarefa-detalhe-item" onclick="irParaTarefa('${tarefa.id}')" style="cursor: pointer;">
                    <div class="tarefa-detalhe-header">
                        <div class="tarefa-detalhe-titulo">
                            <span class="tarefa-numero">${index + 1}.</span>
                            <i class="fas fa-tasks"></i>
                            ${tarefa.titulo}
                        </div>
                        <div class="tarefa-detalhe-status">
                            <span class="badge ${statusClasse}">
                                <i class="fas ${statusIcon}"></i>
                                ${statusLabel}
                            </span>
                            <span class="badge prioridade-${tarefa.prioridade || 'media'}">
                                <i class="fas fa-flag"></i>
                                ${tarefa.prioridade?.charAt(0).toUpperCase() + tarefa.prioridade?.slice(1) || 'Média'}
                            </span>
                        </div>
                    </div>
                    ${tarefaDescricaoCurta ? `
                        <div class="tarefa-detalhe-descricao">
                            ${tarefaDescricaoCurta}
                        </div>
                    ` : ''}
                    <div class="tarefa-detalhe-meta">
                        ${tarefa.dataFim ? `
                            <small><i class="fas fa-calendar-alt"></i> Vence: ${dataFimFormatada}</small>
                        ` : ''}
                        <small><i class="fas fa-user"></i> Criado por: ${tarefa.criadoPor || 'Não informado'}</small>
                        ${tarefa.programaId ? `
                            <small><i class="fas fa-project-diagram"></i> Vinculado a este programa</small>
                        ` : ''}
                    </div>
                </div>
                `;
            }).join('');
        }
    }
    
    // Adicionar contador de tarefas no header da seção
    const tarefasHeader = document.querySelector('.tarefas-header h4');
    if (tarefasHeader && tarefasPrograma.length > 0) {
        tarefasHeader.innerHTML = `<i class="fas fa-tasks"></i> Tarefas Relacionadas (${tarefasPrograma.length})`;
    }
    
    modal.style.display = 'flex';
}

function fecharModalDetalhesPrograma() {
    const modal = document.getElementById('modalDetalhesPrograma');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Gerenciamento de Membros
async function gerenciarMembrosPrograma(programaId) {
    // Criar modal se não existir
    if (!document.getElementById('modalGerenciarMembros')) {
        criarModalGerenciarMembros();
    }
    
    const modal = document.getElementById('modalGerenciarMembros');
    const programa = programas.find(p => p.id === programaId);
    
    if (!programa || !modal) return;
    
    // Verificar se usuário atual é admin
    const roleUsuario = verificarPermissaoPrograma(programa);
    if (roleUsuario !== 'admin') {
        mostrarMensagem('Apenas administradores podem gerenciar membros', 'error');
        return;
    }
    
    document.getElementById('gerenciarMembrosTitulo').textContent = `Gerenciar Membros - ${programa.titulo}`;
    document.getElementById('gerenciarMembrosProgramaId').value = programaId;
    
    // Carregar lista de membros
    await carregarListaMembros(programa);
    
    modal.style.display = 'flex';
}

// Criar modal de gerenciamento de membros
function criarModalGerenciarMembros() {
    const modalHTML = `
    <div id="modalGerenciarMembros" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="gerenciarMembrosTitulo">Gerenciar Membros</h2>
                <button class="close" onclick="fecharModalGerenciarMembros()">&times;</button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="gerenciarMembrosProgramaId">
                
                <!-- Adicionar novo membro -->
                <div class="form-group">
                    <label for="novoMembroUsuario">
                        <i class="fas fa-user-plus"></i> Adicionar Integrante
                        <small style="color: #666; font-weight: normal;">(usuário terá acesso ao programa)</small>
                    </label>
                    <div class="input-group">
                        <input type="text" id="novoMembroUsuario" placeholder="Nome de usuário (ex: joao.silva)">
                        <select id="novoMembroRole" class="role-select">
                            <option value="admin">Administrador</option>
                            <option value="membro" selected>Membro</option>
                        </select>
                        <button class="btn btn-primary" onclick="adicionarMembro()">
                            <i class="fas fa-plus"></i> Adicionar
                        </button>
                    </div>
                    <small class="form-help">
                        <i class="fas fa-info-circle"></i> Administradores podem editar o programa e gerenciar membros.
                        <br><i class="fas fa-info-circle"></i> Membros podem visualizar todos os detalhes mas não podem editar.
                    </small>
                </div>
                
                <!-- Lista de membros -->
                <div class="membros-lista-container">
                    <h4><i class="fas fa-users"></i> Integrantes do Programa</h4>
                    <small class="form-help" style="display: block; margin-bottom: 10px;">
                        <i class="fas fa-info-circle"></i> Lista mostra apenas os integrantes (Administradores e Membros) do programa.
                        <br><i class="fas fa-info-circle"></i> Usuários que não estão nesta lista são considerados "Demais" (acesso restrito).
                    </small>
                    <div class="membros-lista" id="listaMembros">
                        <!-- Integrantes serão carregados aqui -->
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline" onclick="fecharModalGerenciarMembros()">Fechar</button>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Carregar lista de membros (APENAS Admin e Membro - exclui "Demais" da lista)
async function carregarListaMembros(programa) {
    const listaMembros = document.getElementById('listaMembros');
    if (!listaMembros) return;
    
    listaMembros.innerHTML = '<div class="loading-small">Carregando membros...</div>';
    
    try {
        const membros = programa.membros || {};
        
        // Converter map para array, filtrando apenas admin/membro (exclui se houver "demais" no map)
        const membrosArray = Object.entries(membros)
            .filter(([usuario, role]) => role === 'admin' || role === 'membro')
            .map(([usuario, role]) => ({
                usuario,
                role
            }));
        
        if (membrosArray.length === 0) {
            listaMembros.innerHTML = '<div class="empty-state-small">Nenhum membro adicionado ainda</div>';
            return;
        }
        
        let html = '';
        membrosArray.forEach(membro => {
            const roleIcon = membro.role === 'admin' ? 'fa-crown' : 'fa-user-check';
            const roleColor = membro.role === 'admin' ? '#ff9800' : '#2196F3';
            const roleText = membro.role === 'admin' ? 'Administrador' : 'Membro';
            
            html += `
            <div class="membro-item" data-usuario="${membro.usuario}">
                <div class="membro-info">
                    <div class="membro-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="membro-detalhes">
                        <div class="membro-nome">${membro.usuario}</div>
                        <div class="membro-role" style="color: ${roleColor}">
                            <i class="fas ${roleIcon}"></i>
                            ${roleText}
                        </div>
                    </div>
                </div>
                <div class="membro-acoes">
                    <select class="role-select" onchange="atualizarRoleMembro('${membro.usuario}', this.value)">
                        <option value="admin" ${membro.role === 'admin' ? 'selected' : ''}>Admin</option>
                        <option value="membro" ${membro.role === 'membro' ? 'selected' : ''}>Membro</option>
                    </select>
                    <button class="btn-icon btn-icon-danger" onclick="removerMembro('${membro.usuario}')" title="Remover do programa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            `;
        });
        
        listaMembros.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Erro ao carregar membros:', error);
        listaMembros.innerHTML = '<div class="error-state">Erro ao carregar membros</div>';
    }
}

// Adicionar/atualizar membro
async function adicionarMembro() {
    const programaId = document.getElementById('gerenciarMembrosProgramaId').value;
    const usuario = document.getElementById('novoMembroUsuario').value.trim();
    const role = document.getElementById('novoMembroRole').value;
    
    if (!programaId || !usuario) {
        mostrarMensagem('Preencha todos os campos', 'error');
        return;
    }
    
    // Validações
    if (usuario === usuarioLogado.usuario) {
        mostrarMensagem('Você não pode adicionar/editar a si mesmo', 'error');
        return;
    }
    
    // Verificar se o usuário já existe como criador (não pode ser modificado)
    const programa = programas.find(p => p.id === programaId);
    if (programa.criadoPor === usuario) {
        mostrarMensagem('O criador do programa já é administrador por padrão', 'info');
        return;
    }
    
    try {
        const programa = programas.find(p => p.id === programaId);
        if (!programa) return;
        
        // Obter membros atuais
        const membrosAtuais = programa.membros || {};
        
        // Adicionar/atualizar integrante
        membrosAtuais[usuario] = role;
        
        // Salvar no Firebase
        await programasCollection.doc(programaId).update({
            membros: membrosAtuais,
            dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const mensagem = programa.membros && programa.membros[usuario] 
            ? `${usuario} atualizado para ${role === 'admin' ? 'Administrador' : 'Membro'}`
            : `${usuario} adicionado como ${role === 'admin' ? 'Administrador' : 'Membro'}`;
        
        mostrarMensagem(mensagem, 'success');
        
        // Limpar campo
        document.getElementById('novoMembroUsuario').value = '';
        
        // Atualizar lista
        await carregarListaMembros(programa);
        
    } catch (error) {
        console.error('❌ Erro ao adicionar integrante:', error);
        mostrarMensagem('Erro ao adicionar integrante: ' + error.message, 'error');
    }
}

async function atualizarRoleMembro(usuario, novaRole) {
    const programaId = document.getElementById('gerenciarMembrosProgramaId').value;
    
    try {
        const programa = programas.find(p => p.id === programaId);
        if (!programa) return;
        
        // Validações
        if (usuario === usuarioLogado.usuario) {
            mostrarMensagem('Você não pode modificar suas próprias permissões', 'error');
            return;
        }
        
        if (programa.criadoPor === usuario) {
            mostrarMensagem('Não é possível modificar as permissões do criador do programa', 'error');
            return;
        }
        
        // Obter membros atuais
        const membrosAtuais = programa.membros || {};
        
        // Atualizar role (só pode ser admin ou membro)
        membrosAtuais[usuario] = novaRole;
        
        // Salvar no Firebase
        await programasCollection.doc(programaId).update({
            membros: membrosAtuais,
            dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        mostrarMensagem(`${usuario} atualizado para ${novaRole === 'admin' ? 'Administrador' : 'Membro'}`, 'success');
        
    } catch (error) {
        console.error('❌ Erro ao atualizar integrante:', error);
        mostrarMensagem('Erro ao atualizar permissão', 'error');
    }
}

async function removerMembro(usuario) {
    const programaId = document.getElementById('gerenciarMembrosProgramaId').value;
    
    if (!confirm(`Tem certeza que deseja remover ${usuario} do programa?\n\nEle perderá acesso e se tornará "Demais" (usuário externo).`)) {
        return;
    }
    
    try {
        const programa = programas.find(p => p.id === programaId);
        if (!programa) return;
        
        // Validações
        if (usuario === usuarioLogado.usuario) {
            mostrarMensagem('Você não pode remover a si mesmo', 'error');
            return;
        }
        
        if (programa.criadoPor === usuario) {
            mostrarMensagem('Não é possível remover o criador do programa', 'error');
            return;
        }
        
        // Obter membros atuais
        const membrosAtuais = programa.membros || {};
        
        // REMOVER COMPLETAMENTE do map (torna-se "Demais" - usuário externo)
        delete membrosAtuais[usuario];
        
        // Salvar no Firebase
        await programasCollection.doc(programaId).update({
            membros: membrosAtuais,
            dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        mostrarMensagem(`${usuario} removido do programa (agora é usuário externo)`, 'success');
        
        // Atualizar lista
        await carregarListaMembros(programa);
        
    } catch (error) {
        console.error('❌ Erro ao remover integrante:', error);
        mostrarMensagem('Erro ao remover integrante', 'error');
    }
}

// Fechar modal de membros
function fecharModalGerenciarMembros() {
    const modal = document.getElementById('modalGerenciarMembros');
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

// Formatador de status
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

// Ir para a tarefa específica
function irParaTarefa(tarefaId) {
    const url = `index.html`;
    localStorage.setItem('scrollToTarefa', tarefaId);
    window.open(url, '_blank');
}

// Normalizar status para classe CSS
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
window.irParaTarefa = irParaTarefa;
window.logout = logout;
window.gerenciarMembrosPrograma = gerenciarMembrosPrograma;
window.fecharModalGerenciarMembros = fecharModalGerenciarMembros;
window.adicionarMembro = adicionarMembro;
window.atualizarRoleMembro = atualizarRoleMembro;
window.removerMembro = removerMembro;

window.mostrarTarefasVinculadas = mostrarTarefasVinculadas;
