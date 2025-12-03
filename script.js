// Gerenciamento de Estado
let tarefas = [];
let usuarios = [];
let editandoTarefaId = null;

// script.js - VERSÃO DEBUG
console.log('=== DEBUG: script.js INICIADO ===');

// Inicialização
// script.js - Início do arquivo
document.addEventListener('DOMContentLoaded', function() {
    console.log('1. DOM carregado');
    
    // Mostrar loading
    document.getElementById('loadingText').textContent = 'Iniciando sistema...';
    
    // Verificar de forma MUITO SIMPLES
    const usuarioLogado = localStorage.getItem('usuarioLogado');
    
    if (!usuarioLogado) {
        console.log('❌ Nenhum usuário no localStorage');
        document.getElementById('loadingText').textContent = 'Redirecionando para login...';
        
        // Aguardar 2 segundos e redirecionar
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    try {
        console.log('2. Usuário encontrado no localStorage');
        const usuario = JSON.parse(usuarioLogado);
        console.log('3. Usuário:', usuario);
        
        // Mostrar na tela imediatamente
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        
        // Configurar dados do usuário
        if (document.getElementById('userName')) {
            document.getElementById('userName').textContent = usuario.nome || usuario.usuario || 'Usuário';
        }
        
        if (document.getElementById('data-atual')) {
            document.getElementById('data-atual').textContent = new Date().toLocaleDateString('pt-BR');
        }
        
        console.log('4. Interface configurada');
        
        // Tentar inicializar Firebase
        setTimeout(() => {
            if (window.db) {
                console.log('✅ Firebase já carregado, inicializando sistema...');
                inicializarSistema();
            } else {
                console.log('⚠️ Firebase não carregado ainda, tentando novamente...');
                // Tentar novamente após 1 segundo
                setTimeout(inicializarSistema, 1000);
            }
        }, 500);
        
    } catch (error) {
        console.error('❌ Erro ao processar usuário:', error);
        document.getElementById('loadingText').textContent = 'Erro, redirecionando...';
        
        localStorage.removeItem('usuarioLogado');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }
});

// Função criarBotaoDashboard
function criarBotaoDashboard() {
    console.log('🔄 Criando botão Dashboard...');
    const headerButtons = document.querySelector('.header-buttons');
    if (headerButtons) {
        headerButtons.innerHTML = `
            <button class="btn btn-primary" onclick="window.location.href='dashboard.html'">
                <i class="fas fa-chart-line"></i> Dashboard
            </button>
        `;
        console.log('✅ Botão Dashboard criado');
    }
}

// Função inicializarSistema SIMPLIFICADA
function inicializarSistema() {
    console.log('🔥 Inicializando sistema Firebase...');
    
    // Mostrar status
    if (document.getElementById('status-sincronizacao')) {
        document.getElementById('status-sincronizacao').innerHTML = 
            '<i class="fas fa-sync-alt"></i> Iniciando...';
    }
    
    // Verificar se Firebase está carregado
    if (!window.db) {
        console.log('⏳ Firebase não carregado, tentando configurar...');
        
        // Tentar configurar manualmente
        try {
            // Configuração direta
            const firebaseConfig = {
                apiKey: "AIzaSyAs0Ke4IBfBWDrfH0AXaOhCEjtfpPtR_Vg",
                authDomain: "orgtarefas-85358.firebaseapp.com",
                projectId: "orgtarefas-85358",
                storageBucket: "orgtarefas-85358.firebasestorage.app",
                messagingSenderId: "1023569488575",
                appId: "1:1023569488575:web:18f9e201115a1a92ccb40a"
            };

            if (typeof firebase !== 'undefined') {
                firebase.initializeApp(firebaseConfig);
                window.db = firebase.firestore();
                console.log('✅ Firebase configurado manualmente!');
            } else {
                console.error('❌ Firebase não disponível');
                return;
            }
        } catch (error) {
            console.error('❌ Erro ao configurar Firebase:', error);
            return;
        }
    }
    
    console.log('✅ Firebase carregado, configurando sistema...');
    
    // Configurar data mínima
    configurarDataMinima();
    
    // Configurar Firebase listeners
    configurarFirebase();
}

function configurarDataMinima() {
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('tarefaDataInicio').min = hoje;
    document.getElementById('tarefaDataFim').min = hoje;
}

// Função configurarFirebase SIMPLIFICADA
function configurarFirebase() {
    console.log('📡 Configurando Firebase...');
    
    try {
        // Listener básico para tarefas
        db.collection("tarefas")
            .orderBy("dataCriacao", "desc")
            .limit(20) // Limitar para teste
            .onSnapshot(
                (snapshot) => {
                    console.log('📊 Tarefas recebidas:', snapshot.size);
                    tarefas = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    
                    // Atualizar status
                    if (document.getElementById('status-sincronizacao')) {
                        document.getElementById('status-sincronizacao').innerHTML = 
                            '<i class="fas fa-bolt"></i> Conectado';
                    }
                    
                    atualizarInterface();
                    console.log('🎉 Sistema funcionando!');
                },
                (error) => {
                    console.error('❌ Erro Firestore:', error);
                    if (document.getElementById('status-sincronizacao')) {
                        document.getElementById('status-sincronizacao').innerHTML = 
                            '<i class="fas fa-exclamation-triangle"></i> Offline';
                    }
                }
            );
        
        // Carregar usuários
        carregarUsuarios();
        
    } catch (error) {
        console.error('❌ Erro na configuração:', error);
    }
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
    
    // Carregar sistemas disponíveis
    carregarSistemasParaVinculo();
    
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


// Função para buscar atividades de um sistema específico
async function buscarAtividadesDoSistema(sistemaId) {
    console.log(`🔍 Buscando atividades do sistema: ${sistemaId}`);
    
    try {
        const snapshot = await db.collection('atividades')
            .where('sistemaId', '==', sistemaId)
            .get();
        
        if (!snapshot.empty) {
            const atividades = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`✅ ${atividades.length} atividades encontradas para o sistema ${sistemaId}`);
            return atividades;
        } else {
            console.log(`📂 Nenhuma atividade encontrada para o sistema ${sistemaId}`);
            return [];
        }
        
    } catch (error) {
        console.error('❌ Erro ao buscar atividades do sistema:', error);
        return [];
    }
}

// Função para buscar informações do sistema pelo ID
async function buscarInformacoesSistema(sistemaId) {
    console.log(`🔍 Buscando informações do sistema: ${sistemaId}`);
    
    try {
        const doc = await db.collection('sistemas').doc(sistemaId).get();
        
        if (doc.exists) {
            const sistema = { id: doc.id, ...doc.data() };
            console.log(`✅ Sistema encontrado: ${sistema.nome}`);
            return sistema;
        } else {
            console.log(`❌ Sistema não encontrado: ${sistemaId}`);
            return null;
        }
        
    } catch (error) {
        console.error('❌ Erro ao buscar informações do sistema:', error);
        return null;
    }
}

// Função para carregar sistemas para vinculação
async function carregarSistemasParaVinculo() {
    console.log('📊 Carregando sistemas para vinculação...');
    
    try {
        const snapshot = await db.collection('sistemas').get();
        const sistemas = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log('✅ Sistemas carregados:', sistemas.length);

        // Preencher select de sistemas
        const selectSistema = document.getElementById('tarefaSistema');
        selectSistema.innerHTML = '<option value="">Nenhum sistema (tarefa independente)</option>';
        
        sistemas.forEach(sistema => {
            const option = `<option value="${sistema.id}">${sistema.nome}</option>`;
            selectSistema.innerHTML += option;
        });
        
        // Também preencher em um filtro opcional
        const selectFiltroSistema = document.getElementById('filterSistema');
        if (selectFiltroSistema) {
            selectFiltroSistema.innerHTML = '<option value="">Todos os sistemas</option>';
            sistemas.forEach(sistema => {
                const option = `<option value="${sistema.id}">${sistema.nome}</option>`;
                selectFiltroSistema.innerHTML += option;
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar sistemas:', error);
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
    const total = tarefas.length;
    const pendentes = tarefas.filter(t => t.status === 'pendente').length;
    const andamento = tarefas.filter(t => t.status === 'andamento').length;
    const concluidas = tarefas.filter(t => t.status === 'concluido').length;

    document.getElementById('total-tarefas').textContent = total;
    document.getElementById('tarefas-pendentes').textContent = pendentes;
    document.getElementById('tarefas-andamento').textContent = andamento;
    document.getElementById('tarefas-concluidas').textContent = concluidas;
}

async function atualizarListaTarefas() {
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

    // Usar Promise.all para buscar atividades de todas as tarefas vinculadas
    const tarefasComAtividades = await Promise.all(
        tarefasFiltradas.map(async (tarefa) => {
            let sistemaInfo = '';
            let atividadesSistema = '';
            
            if (tarefa.sistemaId) {
                // Buscar informações do sistema
                const sistema = await buscarInformacoesSistema(tarefa.sistemaId);
                
                if (sistema) {
                    sistemaInfo = `
                        <div class="sistema-vinculado">
                            <i class="fas fa-project-diagram"></i>
                            <span class="sistema-nome">Sistema: ${sistema.nome}</span>
                            <span class="sistema-status">${sistema.descricao || ''}</span>
                        </div>
                    `;
                    
                    // Buscar atividades do sistema
                    const atividades = await buscarAtividadesDoSistema(tarefa.sistemaId);
                    
                    if (atividades.length > 0) {
                        atividadesSistema = `
                            <div class="atividades-sistema">
                                <div class="atividades-header">
                                    <i class="fas fa-list-check"></i>
                                    <strong>Atividades do Sistema:</strong>
                                </div>
                                <div class="atividades-lista">
                                    ${atividades.map(atividade => `
                                        <div class="atividade-item ${atividade.status === 'concluido' ? 'concluida' : ''}">
                                            <i class="fas fa-${getIconStatusAtividade(atividade.status)}"></i>
                                            <span class="atividade-titulo">${atividade.titulo}</span>
                                            <span class="atividade-status badge status-${atividade.status}">
                                                ${atividade.status === 'pendente' ? 'Pendente' : 
                                                  atividade.status === 'andamento' ? 'Em Andamento' : 'Concluída'}
                                            </span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    } else {
                        atividadesSistema = `
                            <div class="atividades-sistema sem-atividades">
                                <i class="fas fa-info-circle"></i>
                                <span>Este sistema ainda não tem atividades cadastradas</span>
                            </div>
                        `;
                    }
                } else {
                    sistemaInfo = `
                        <div class="sistema-vinculado erro">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>Sistema não encontrado (ID: ${tarefa.sistemaId})</span>
                        </div>
                    `;
                }
            }
            
            return { ...tarefa, sistemaInfo, atividadesSistema };
        })
    );

    // Renderizar as tarefas com as atividades
    container.innerHTML = tarefasComAtividades.map(tarefa => `
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
                    ${tarefa.status === 'pendente' ? 'Pendente' : 
                      tarefa.status === 'andamento' ? 'Em Andamento' : 'Concluído'}
                </span>
                ${tarefa.responsavel ? `
                    <span class="task-responsavel">
                        <i class="fas fa-user"></i> ${tarefa.responsavel}
                    </span>
                ` : ''}
            </div>

            ${tarefa.atividadesSistema || ''}

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

    container.innerHTML = tarefasFiltradas.map(tarefa => {
        // Buscar informações do sistema se estiver vinculada
        let sistemaInfo = '';
        let atividadesSistema = '';
        
        if (tarefa.sistemaId) {
            // Aqui você pode buscar informações do sistema
            // Por enquanto, apenas mostra o ID
            sistemaInfo = `
                <div class="sistema-vinculado">
                    <i class="fas fa-link"></i>
                    <span class="sistema-nome">Vinculada ao sistema: ${tarefa.sistemaId}</span>
                </div>
            `;
            
            // Espaço reservado para futuras atividades do sistema
            atividadesSistema = `
                <div class="atividades-sistema">
                    <small><i class="fas fa-list-check"></i> Atividades do sistema aparecerão aqui</small>
                </div>
            `;
        }
        
        return `
        <div class="task-card prioridade-${tarefa.prioridade} ${tarefa.sistemaId ? 'vinculada-sistema' : ''}">
            <div class="task-header">
                <div>
                    <div class="task-title">${tarefa.titulo}</div>
                    ${tarefa.descricao ? `<div class="task-desc">${tarefa.descricao}</div>` : ''}
                    ${sistemaInfo}
                </div>
            </div>
            
            <div class="task-meta">
                <span class="badge prioridade-${tarefa.prioridade}">
                    ${tarefa.prioridade.charAt(0).toUpperCase() + tarefa.prioridade.slice(1)}
                </span>
                <span class="badge status-${tarefa.status}">
                    ${tarefa.status === 'pendente' ? 'Pendente' : 
                      tarefa.status === 'andamento' ? 'Em Andamento' : 'Concluído'}
                </span>
                ${tarefa.responsavel ? `
                    <span class="task-responsavel">
                        <i class="fas fa-user"></i> ${tarefa.responsavel}
                    </span>
                ` : ''}
            </div>

            ${atividadesSistema}

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
    `}).join('');
}

// Função auxiliar para ícone de status
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
document.getElementById('searchInput').addEventListener('input', atualizarListaTarefas);
document.getElementById('filterStatus').addEventListener('change', atualizarListaTarefas);
document.getElementById('filterPrioridade').addEventListener('change', atualizarListaTarefas);
document.getElementById('filterResponsavel').addEventListener('change', atualizarListaTarefas);

// Fechar modal clicando fora
window.onclick = function(event) {
    const modal = document.getElementById('modalTarefa');
    if (event.target === modal) {
        fecharModalTarefa();
    }
}
