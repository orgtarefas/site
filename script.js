// script.js - VERSÃO COMPLETA COM MODAL ÚNICO E CONTROLE DE VISIBILIDADE
console.log('=== SISTEMA INICIANDO ===');

// Estado global
let tarefas = [];
let usuarios = [];
let grupos = [];
let atividadesPorTarefa = {};
let editandoTarefaId = null;
let modoEdicao = false;

// Estado global dos alertas
let alertasObservador = [];
let alertasResponsavel = [];
let alertasLidosObservador = new Set();
let alertasLidosResponsavel = new Set();
let ultimaVerificacaoAlertas = null;

// Inicialização
// Configurar event listeners
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
    
    // Configurar data mínima
    configurarDataMinima();
    
    // Configurar event listeners dos filtros
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
    
    // Inicializar sistema
    inicializarSistema();
});

function inicializarSistema() {
    console.log('🔥 Inicializando Firebase...');
    document.getElementById('loadingText').textContent = 'Conectando ao banco de dados...';
    
    // Aguardar Firebase carregar
    if (!window.db) {
        console.log('⏳ Aguardando Firebase...');
        setTimeout(inicializarSistema, 100);
        return;
    }

    console.log('✅ Firebase carregado!');
    
    try {
        carregarUsuarios();
        carregarGrupos();
        configurarFirebase();
        
        // VERIFICAR SE É A PÁGINA HOME (index.html) ANTES DE INICIAR ALERTAS
        const isHomePage = window.location.pathname.includes('index.html') || 
                          window.location.pathname.endsWith('/');
        
        if (isHomePage) {
            console.log('🏠 Página Home detectada - Iniciando sistema de alertas');
            carregarAlertasLidos();
            
            // Iniciar verificação de alertas após 1 segundo
            setTimeout(() => {
                verificarAlertas();
            }, 1000);
        } else {
            console.log('📋 Página Dashboard - Alertas não serão iniciados aqui');
        }
        
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

        // Apenas preencher select de responsável para FILTRO
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
                
                await carregarAtividadesParaTodasTarefas();
                
                document.getElementById('loadingScreen').style.display = 'none';
                document.getElementById('mainContent').style.display = 'block';
                document.getElementById('status-sincronizacao').innerHTML = '<i class="fas fa-bolt"></i> Conectado';
                
                atualizarInterface();
                
                // Iniciar alertas
                setTimeout(verificarAlertas, 1000);
            },
            (error) => {
                console.error('❌ Erro no Firestore:', error);
                document.getElementById('loadingScreen').style.display = 'none';
                document.getElementById('mainContent').style.display = 'block';
                document.getElementById('status-sincronizacao').innerHTML = '<i class="fas fa-exclamation-triangle"></i> Erro Conexão';
                mostrarErro('Erro ao carregar tarefas: ' + error.message);
            }
        );
    
// Listener SIMPLES para atividades
db.collection("atividades")
    .onSnapshot((snapshot) => {
        console.log('🔄 Atualização de atividades');
        
        const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
        if (!usuarioLogado) return;
        
        // Verificar se há mudanças de status
        snapshot.docChanges().forEach(change => {
            // Só processar modificações
            if (change.type === 'modified') {
                const novaAtividade = change.doc.data();
                
                // Verificar se há estado anterior disponível
                if (change.doc.previous && typeof change.doc.previous.data === 'function') {
                    const atividadeAntiga = change.doc.previous.data();
                    
                    // Se o status mudou, atualizar statusAnterior
                    if (atividadeAntiga && novaAtividade.status !== atividadeAntiga.status) {
                        console.log(`📊 Status alterado: ${atividadeAntiga.status} → ${novaAtividade.status}`);
                        
                        // Salvar status anterior
                        db.collection('atividades').doc(change.doc.id).update({
                            statusAnterior: atividadeAntiga.status,
                            dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                } else {
                    // Para novas atividades, definir statusAnterior como 'nao_iniciado'
                    console.log(`📝 Nova atividade detectada: ${novaAtividade.titulo}`);
                }
            }
        });
        
        // Verificar alertas a cada mudança
        setTimeout(verificarAlertas, 500);
    });
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

// ========== FUNÇÕES DE ALERTAS ==========

// Função para verificar alertas
async function verificarAlertas() {
    console.log('🔔 Verificando alertas...');
    
    const isHomePage = window.location.pathname.includes('index.html') || 
                      window.location.pathname.endsWith('/');
    
    if (!isHomePage) {
        console.log('⏸️ Não é página Home - Pulando verificação de alertas');
        return;
    }
    
    try {
        const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
        if (!usuarioLogado) return;
        
        const usuarioAtual = usuarioLogado.usuario;
        
        // Verificar ambos tipos de alertas
        await verificarAlertasObservador(usuarioAtual);
        await verificarAlertasResponsavel(usuarioAtual);
        
        // Atualizar interface
        atualizarContadoresAlertas();
        
        // Verificar novamente em 30 segundos
        setTimeout(verificarAlertas, 30000);
        
    } catch (error) {
        console.error('❌ Erro ao verificar alertas:', error);
    }
}

// Função para verificar alertas de observador
async function verificarAlertasObservador(usuarioAtual) {
    try {
        console.log(`🔍 Buscando atividades do observador: ${usuarioAtual}`);
        
        // Buscar TUDO onde o usuário é observador
        const snapshot = await db.collection('atividades')
            .where('observadores', 'array-contains', usuarioAtual)
            .get();
        
        const atividades = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log(`📋 Atividades encontradas:`, atividades.length);
        console.log(`📊 Detalhes das atividades:`);
        atividades.forEach(atividade => {
            console.log(`   - ${atividade.titulo}: Status=${atividade.status}, StatusAnterior=${atividade.statusAnterior}`);
        });
        
        // Verificar se alguma atividade tem statusAnterior diferente do status atual
        const atividadesComMudanca = atividades.filter(atividade => {
            // Se não tem statusAnterior, não sabemos se mudou
            if (!atividade.statusAnterior) return false;
            
            // Se são diferentes, houve mudança
            return atividade.statusAnterior !== atividade.status;
        });
        
        console.log(`🔄 Atividades com mudança:`, atividadesComMudanca.length);
        
        // Criar alertas para todas as mudanças encontradas
        alertasObservador = atividadesComMudanca.map(atividade => {
            const dataAlteracao = atividade.dataAtualizacao?.toDate() || new Date();
            const alertaId = `obs_${atividade.id}_${dataAlteracao.getTime()}`;
            
            return {
                id: alertaId,
                atividadeId: atividade.id,
                titulo: atividade.titulo || 'Atividade sem título',
                statusAntigo: atividade.statusAnterior,
                statusNovo: atividade.status,
                dataAlteracao: dataAlteracao,
                tarefaNome: atividade.tarefaNome || 'Tarefa desconhecida',
                tipo: 'observador',
                descricao: atividade.descricao || ''
            };
        });
        
        console.log(`✅ Alertas criados:`, alertasObservador.length);
        
        // Atualizar interface
        atualizarContadoresAlertas();
        
    } catch (error) {
        console.error('❌ Erro em alertas de observador:', error);
    }
}

// Função para verificar alertas de responsável - APENAS PENDENTES
async function verificarAlertasResponsavel(usuarioAtual) {
    try {
        // Buscar atividades onde o usuário é responsável
        const snapshot = await db.collection('atividades')
            .where('responsavel', '==', usuarioAtual)
            .get();
        
        const atividadesComoResponsavel = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log(`👤 Usuário é responsável por ${atividadesComoResponsavel.length} atividades`);
        
        // FILTRAR APENAS STATUS "pendente"
        const atividadesPendentes = atividadesComoResponsavel.filter(atividade => {
            const status = (atividade.status || '').toLowerCase().trim();
            return status === 'pendente';
        });
        
        console.log(`⏰ ${atividadesPendentes.length} atividades pendentes`);
        
        // Criar alertas para atividades pendentes
        alertasResponsavel = atividadesPendentes.map(atividade => {
            const alertaId = `resp_${atividade.id}`;
            
            return {
                id: alertaId,
                atividadeId: atividade.id,
                titulo: atividade.titulo || 'Atividade sem título',
                status: 'pendente',
                dataCriacao: new Date(),
                tarefaNome: atividade.tarefaNome || 'Tarefa desconhecida',
                tipo: 'responsavel',
                dataPrevista: atividade.dataPrevista,
                descricao: atividade.descricao || '',
                responsavel: atividade.responsavel || 'Não definido'
            };
        });
        
    } catch (error) {
        console.error('❌ Erro ao verificar alertas de responsável:', error);
    }
}

// função para rastrear mudanças de status nas atividades
async function monitorarMudancasStatusAtividades() {
    console.log('🔄 Monitorando mudanças de status em atividades...');
    
    // Listener para atividades
    db.collection('atividades')
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'modified') {
                    const novaAtividade = change.doc.data();
                    const atividadeAntiga = change.doc.previous.data();
                    
                    // Verificar se o status mudou
                    if (atividadeAntiga && novaAtividade.status !== atividadeAntiga.status) {
                        console.log(`🔄 Status alterado na atividade ${change.doc.id}:`, 
                                  atividadeAntiga.status, '→', novaAtividade.status);
                        
                        // Atualizar histórico de status
                        db.collection('atividades').doc(change.doc.id).update({
                            statusAnterior: atividadeAntiga.status,
                            dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
                        }).then(() => {
                            console.log('✅ Histórico de status atualizado');
                            // Forçar nova verificação de alertas
                            setTimeout(verificarAlertas, 1000);
                        });
                    }
                }
            });
        });
}


// Variável para histórico de status
let historicoStatus = {};

// Função para carregar histórico de alterações de status
async function carregarHistoricoStatus(usuarioAtual) {
    try {
        // Buscar histórico das últimas 24 horas
        const vinteQuatroHorasAtras = new Date();
        vinteQuatroHorasAtras.setHours(vinteQuatroHorasAtras.getHours() - 24);
        
        const snapshot = await db.collection('atividades')
            .where('observadores', 'array-contains', usuarioAtual)
            .where('dataAtualizacao', '>=', vinteQuatroHorasAtras)
            .get();
        
        historicoStatus = {};
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            historicoStatus[doc.id] = {
                ultimaAlteracao: data.dataAtualizacao,
                statusAnterior: data.statusAnterior || 'nao_iniciado',
                statusAtual: data.status || 'nao_iniciado'
            };
        });
        
    } catch (error) {
        console.error('❌ Erro ao carregar histórico de status:', error);
    }
}

// Função para mostrar notificação rápida
function mostrarNotificacaoRapida(mensagem) {
    // Verificar se já existe notificação
    const notificacaoExistente = document.querySelector('.notificacao-rapida');
    if (notificacaoExistente) {
        notificacaoExistente.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'notificacao-rapida';
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 8px;
        background: #ffc107;
        color: #856404;
        font-weight: 500;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    
    notification.innerHTML = `
        <i class="fas fa-clock"></i>
        <span>${mensagem}</span>
        <button onclick="this.parentElement.remove()" style="
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
            margin-left: 8px;
        ">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Remover automaticamente após 5 segundos
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// CSS para animação
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
    
    .notificacao-rapida {
        animation: slideIn 0.3s ease;
    }
`;
document.head.appendChild(style);

// Função para atualizar contadores de alertas (SÓ NO INDEX.HTML)
function atualizarContadoresAlertas() {
    // VERIFICAR SE ESTAMOS NA PÁGINA HOME
    const isHomePage = window.location.pathname.includes('index.html') || 
                      window.location.pathname.endsWith('/');
    
    if (!isHomePage) {
        return; // Sair se não for a página home
    }
    
    // Contar alertas não lidos
    const naoLidosObservador = alertasObservador.filter(alerta => 
        !alertasLidosObservador.has(alerta.id)
    ).length;
    
    const naoLidosResponsavel = alertasResponsavel.filter(alerta => 
        !alertasLidosResponsavel.has(alerta.id)
    ).length;
    
    // Atualizar contadores na interface (já sabemos que elementos existem)
    document.getElementById('observadorAlertCount').textContent = naoLidosObservador;
    document.getElementById('responsavelAlertCount').textContent = naoLidosResponsavel;
    
    // Mostrar/ocultar contadores
    document.getElementById('observadorAlertCount').style.display = 
        naoLidosObservador > 0 ? 'flex' : 'none';
    document.getElementById('responsavelAlertCount').style.display = 
        naoLidosResponsavel > 0 ? 'flex' : 'none';
    
    // Mostrar notificação apenas para pendências (responsável)
    if (naoLidosResponsavel > 0) {
        setTimeout(() => {
            mostrarNotificacaoRapida(`Você tem ${naoLidosResponsavel} atividade(s) pendente(s)!`);
        }, 1000);
    }
}

// Função para abrir dropdown de alertas de observador
function abrirAlertasObservador() {
    // VERIFICAR SE ESTAMOS NA PÁGINA HOME
    const isHomePage = window.location.pathname.includes('index.html') || 
                      window.location.pathname.endsWith('/');
    
    if (!isHomePage) {
        console.log('⚠️ Função disponível apenas na página Home');
        return;
    }
    
    const container = document.getElementById('observadorAlertsContainer');
    const otherContainers = document.querySelectorAll('.alerts-container.show');
    
    // Fechar outros dropdowns
    otherContainers.forEach(other => {
        if (other !== container) {
            other.classList.remove('show');
        }
    });
    
    // Alternar este dropdown
    container.classList.toggle('show');
    
    // Renderizar alertas
    renderizarAlertasObservador();
}


// Função para renderizar alertas de observador (QUALQUER ALTERAÇÃO)
function renderizarAlertasObservador() {
    const container = document.getElementById('observadorAlertList');
    
    if (alertasObservador.length === 0) {
        container.innerHTML = '<div class="no-alerts">Nenhuma alteração recente</div>';
        return;
    }
    
    const alertasHTML = alertasObservador.map(alerta => {
        const isLido = alertasLidosObservador.has(alerta.id);
        const tempoAtras = formatarTempoAtras(alerta.dataAlteracao);
        
        return `
            <div class="alert-item ${isLido ? 'read' : 'unread'}" data-alerta-id="${alerta.id}">
                <div class="alert-item-header">
                    <div class="alert-item-title">
                        <i class="fas fa-eye"></i>
                        ${alerta.titulo}
                    </div>
                    <div class="alert-item-time">${tempoAtras}</div>
                </div>
                <div class="alert-item-body">
                    Status alterado em <strong>${alerta.tarefaNome}</strong>
                    ${alerta.responsavel ? `<div class="alert-responsavel"><i class="fas fa-user"></i> ${alerta.responsavel}</div>` : ''}
                    ${alerta.descricao ? `<p class="alert-descricao">${alerta.descricao}</p>` : ''}
                </div>
                <div class="alert-item-details">
                    <div class="alert-status-change">
                        <span class="alert-status-badge badge-de ${normalizarStatusParaClasse(alerta.statusAntigo)}">
                            ${getLabelStatus(alerta.statusAntigo)}
                        </span>
                        <i class="fas fa-arrow-right"></i>
                        <span class="alert-status-badge badge-para ${normalizarStatusParaClasse(alerta.statusNovo)}">
                            ${getLabelStatus(alerta.statusNovo)}
                        </span>
                    </div>
                </div>
                <div class="alert-actions">
                    ${!isLido ? `
                        <button class="btn-mark-read" onclick="marcarAlertaComoLido('${alerta.id}', 'observador')">
                            <i class="fas fa-check"></i> Marcar como lido
                        </button>
                    ` : ''}
                    <button class="btn-go-to-activity" onclick="irParaAtividade('${alerta.atividadeId}')">
                        <i class="fas fa-eye"></i> Ver atividade
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = alertasHTML;
}


// Função para abrir dropdown de alertas de responsável
function abrirAlertasResponsavel() {
    // VERIFICAR SE ESTAMOS NA PÁGINA HOME
    const isHomePage = window.location.pathname.includes('index.html') || 
                      window.location.pathname.endsWith('/');
    
    if (!isHomePage) {
        console.log('⚠️ Função disponível apenas na página Home');
        return;
    }
    
    const container = document.getElementById('responsavelAlertsContainer');
    const otherContainers = document.querySelectorAll('.alerts-container.show');
    
    // Fechar outros dropdowns
    otherContainers.forEach(other => {
        if (other !== container) {
            other.classList.remove('show');
        }
    });
    
    // Alternar este dropdown
    container.classList.toggle('show');
    
    // Renderizar alertas
    renderizarAlertasResponsavel();
}

// Função para renderizar alertas de responsável (APENAS PENDENTES)
function renderizarAlertasResponsavel() {
    const container = document.getElementById('responsavelAlertList');
    
    if (alertasResponsavel.length === 0) {
        container.innerHTML = '<div class="no-alerts">Nenhuma atividade pendente</div>';
        return;
    }
    
    const alertasHTML = alertasResponsavel.map(alerta => {
        const isLido = alertasLidosResponsavel.has(alerta.id);
        const tempoAtras = formatarTempoAtras(alerta.dataCriacao);
        const dataPrevista = alerta.dataPrevista ? 
            `<div class="alert-data-prevista">
                <i class="fas fa-calendar"></i>
                ${formatarData(alerta.dataPrevista)}
            </div>` : 
            '';
        
        return `
            <div class="alert-item ${isLido ? 'read' : 'unread'}" data-alerta-id="${alerta.id}">
                <div class="alert-item-header">
                    <div class="alert-item-title">
                        <i class="fas fa-user-check"></i>
                        ${alerta.titulo}
                    </div>
                    <div class="alert-item-time">${tempoAtras}</div>
                </div>
                <div class="alert-item-body">
                    <strong>${alerta.tarefaNome}</strong>
                    ${alerta.descricao ? `<p class="alert-descricao">${alerta.descricao}</p>` : ''}
                </div>
                <div class="alert-item-details">
                    <span class="badge alert-status-badge status-pendente">PENDENTE</span>
                    ${dataPrevista}
                </div>
                <div class="alert-actions">
                    ${!isLido ? `
                        <button class="btn-mark-read" onclick="marcarAlertaComoLido('${alerta.id}', 'responsavel')">
                            <i class="fas fa-check"></i> Visualizado
                        </button>
                    ` : ''}
                    <button class="btn-go-to-activity" onclick="irParaAtividade('${alerta.atividadeId}')">
                        <i class="fas fa-external-link-alt"></i> Resolver
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = alertasHTML;
}

// Função para ir para a atividade
function irParaAtividade(atividadeId) {
    // Marcar como lido primeiro
    marcarAlertaComoLido(atividadeId, 'responsavel');
    
    // Abrir dashboard ou página de atividades
    window.open(`dashboard.html?atividade=${atividadeId}`, '_blank');
}

// Função para marcar alerta como lido
function marcarAlertaComoLido(alertaId, tipo) {
    if (tipo === 'observador') {
        alertasLidosObservador.add(alertaId);
        localStorage.setItem('alertasLidosObservador', JSON.stringify([...alertasLidosObservador]));
    } else {
        alertasLidosResponsavel.add(alertaId);
        localStorage.setItem('alertasLidosResponsavel', JSON.stringify([...alertasLidosResponsavel]));
    }
    
    // Atualizar interface
    atualizarContadoresAlertas();
    
    // Re-renderizar lista
    if (tipo === 'observador') {
        renderizarAlertasObservador();
    } else {
        renderizarAlertasResponsavel();
    }
}

// Função para marcar todos os alertas de observador como lido
function marcarTodosAlertasObservadorComoLido() {
    alertasObservador.forEach(alerta => {
        alertasLidosObservador.add(alerta.id);
    });
    
    localStorage.setItem('alertasLidosObservador', JSON.stringify([...alertasLidosObservador]));
    atualizarContadoresAlertas();
    renderizarAlertasObservador();
}

// Função para marcar todas as pendências como visualizado
function marcarTodasPendenciasComoLido() {
    alertasResponsavel.forEach(alerta => {
        alertasLidosResponsavel.add(alerta.id);
    });
    
    localStorage.setItem('alertasLidosResponsavel', JSON.stringify([...alertasLidosResponsavel]));
    atualizarContadoresAlertas();
    renderizarAlertasResponsavel();
}

// Função para formatar tempo atrás
function formatarTempoAtras(data) {
    const agora = new Date();
    const dataAlerta = new Date(data);
    const diferencaMinutos = Math.floor((agora - dataAlerta) / (1000 * 60));
    
    if (diferencaMinutos < 1) return 'Agora mesmo';
    if (diferencaMinutos < 60) return `${diferencaMinutos} min atrás`;
    
    const diferencaHoras = Math.floor(diferencaMinutos / 60);
    if (diferencaHoras < 24) return `${diferencaHoras} h atrás`;
    
    const diferencaDias = Math.floor(diferencaHoras / 24);
    return `${diferencaDias} d atrás`;
}

// Carregar alertas lidos do localStorage
function carregarAlertasLidos() {
    try {
        const lidosObservador = JSON.parse(localStorage.getItem('alertasLidosObservador') || '[]');
        const lidosResponsavel = JSON.parse(localStorage.getItem('alertasLidosResponsavel') || '[]');
        
        alertasLidosObservador = new Set(lidosObservador);
        alertasLidosResponsavel = new Set(lidosResponsavel);
    } catch (error) {
        console.error('❌ Erro ao carregar alertas lidos:', error);
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
    const secaoAtividades = document.getElementById('secao-atividades');
    
    if (modoEdicao) {
        titulo.textContent = 'Editar Tarefa';
        btnSalvar.textContent = 'Salvar Alterações';
        preencherFormulario(tarefaId);
        // Ocultar atividades na edição
        if (secaoAtividades) secaoAtividades.style.display = 'none';
    } else {
        titulo.textContent = 'Nova Tarefa';
        btnSalvar.textContent = 'Salvar Tarefa';
        limparFormulario();
        // Mostrar atividades apenas na nova tarefa
        if (secaoAtividades) secaoAtividades.style.display = 'block';
    }
    
    modal.style.display = 'flex';
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
    
    // USANDO A FUNÇÃO AUXILIAR para extrair título sem os grupos
    const tituloOriginal = extrairTituloSemGrupos(tarefa.titulo, tarefa.gruposAcesso);
    
    // Preencher os campos do formulário
    document.getElementById('tarefaTitulo').value = tituloOriginal;
    document.getElementById('tarefaDescricao').value = tarefa.descricao || '';
    document.getElementById('tarefaPrioridade').value = tarefa.prioridade;
    document.getElementById('tarefaDataInicio').value = tarefa.dataInicio || '';
    document.getElementById('tarefaDataFim').value = tarefa.dataFim;
    
    // Preencher grupos (múltipla seleção)
    const selectGrupos = document.getElementById('tarefaGrupos');
    if (selectGrupos) {
        // Desmarcar todos primeiro
        Array.from(selectGrupos.options).forEach(option => {
            option.selected = false;
        });
        
        // Marcar apenas os grupos da tarefa
        if (tarefa.gruposAcesso && Array.isArray(tarefa.gruposAcesso)) {
            Array.from(selectGrupos.options).forEach(option => {
                if (tarefa.gruposAcesso.includes(option.value)) {
                    option.selected = true;
                }
            });
        }
    }
    
    console.log('📝 Formulário preenchido:', {
        tituloOriginal: tituloOriginal,
        gruposAcesso: tarefa.gruposAcesso,
        nomesGrupos: obterNomesTodosGrupos(tarefa.gruposAcesso),
        tituloCompleto: tarefa.titulo
    });
}

// FUNÇÃO AUXILIAR: Extrair título sem os grupos (para formulário de edição)
function extrairTituloSemGrupos(tituloCompleto, gruposIds) {
    if (!gruposIds || !Array.isArray(gruposIds) || gruposIds.length === 0) {
        return tituloCompleto;
    }
    
    const nomesGrupos = obterNomesTodosGrupos(gruposIds);
    
    if (nomesGrupos) {
        // Primeiro tenta com todos os grupos
        const prefixoComTodos = nomesGrupos + ' - ';
        if (tituloCompleto.startsWith(prefixoComTodos)) {
            return tituloCompleto.substring(prefixoComTodos.length);
        }
        
        // Para compatibilidade com tarefas antigas que só tinham primeiro grupo
        const primeiroGrupoId = gruposIds[0];
        const primeiroGrupo = grupos.find(g => g.id === primeiroGrupoId);
        if (primeiroGrupo) {
            const prefixoIndividual = primeiroGrupo.nome + ' - ';
            if (tituloCompleto.startsWith(prefixoIndividual)) {
                return tituloCompleto.substring(prefixoIndividual.length);
            }
        }
    }
    
    // Se não encontrar prefixo, retorna o título original
    return tituloCompleto;
}

// FUNÇÃO: Obter nomes de TODOS os grupos separados por vírgula
function obterNomesTodosGrupos(gruposIds) {
    if (!gruposIds || !Array.isArray(gruposIds) || gruposIds.length === 0) {
        return '';
    }
    
    const nomes = gruposIds.map(grupoId => {
        const grupo = grupos.find(g => g.id === grupoId);
        return grupo ? grupo.nome : grupoId;
    });
    
    return nomes.join(', ');
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
    
    // USANDO A NOVA FUNÇÃO: Obter nomes de TODOS os grupos
    const nomesTodosGrupos = obterNomesTodosGrupos(gruposSelecionados);
    const tituloDigitado = document.getElementById('tarefaTitulo').value.trim();
    
    // Criar título com prefixo de todos os grupos
    const tituloCompleto = nomesTodosGrupos ? 
        `${nomesTodosGrupos} - ${tituloDigitado}` : 
        tituloDigitado;
    
    // Preparar objeto tarefa (sem Status e Responsável)
    const tarefa = {
        titulo: tituloCompleto,
        descricao: document.getElementById('tarefaDescricao').value || '',
        prioridade: document.getElementById('tarefaPrioridade').value,
        dataInicio: document.getElementById('tarefaDataInicio').value || null,
        dataFim: document.getElementById('tarefaDataFim').value,
        gruposAcesso: gruposSelecionados,
        dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Para NOVA TAREFA, podemos definir Status padrão e adicionar atividades
    if (!modoEdicao) {
        // Status padrão para nova tarefa
        tarefa.status = 'nao_iniciado'; // Valor padrão
        
        // Adicionar atividades da nova tarefa
        const atividades = obterAtividadesDoFormulario();
        if (atividades.length > 0) {
            tarefa.atividades = atividades;
        }
    }

    try {
        if (modoEdicao && editandoTarefaId) {
            console.log('✏️ Editando tarefa:', editandoTarefaId);
            // Na edição, mantém o Status existente (não atualiza)
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

    // VERIFICAR SE OS ELEMENTOS EXISTEM ANTES DE ATUALIZAR
    const elementos = {
        'total-tarefas': total,
        'tarefas-naoiniciadas': naoiniciadas,
        'tarefas-pendentes': pendentes,
        'tarefas-andamento': andamento,
        'tarefas-concluidas': concluidas
    };
    
    Object.keys(elementos).forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = elementos[id];
        }
    });
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

// Fechar dropdowns de alerta ao clicar fora
document.addEventListener('click', function(event) {
    // Verificar se o clique foi fora de um container de alerta
    const containers = document.querySelectorAll('.alerts-container');
    let clickDentroDeAlerta = false;
    
    containers.forEach(container => {
        if (container.contains(event.target)) {
            clickDentroDeAlerta = true;
        }
    });
    
    // Se clicou fora, fechar todos os dropdowns
    if (!clickDentroDeAlerta) {
        containers.forEach(container => {
            container.classList.remove('show');
        });
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
