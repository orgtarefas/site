// teste.js - Script específico para teste.html

// Estado global (similar ao script.js)
let alertasObservador = [];
let alertasResponsavel = [];

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando página teste...');
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

    // Inicializar Firebase (apenas o banco ORGTAREFAS para esta página)
    await inicializarFirebaseTeste();
    
    // Continuar inicialização
    await inicializarPaginaTeste();
});

async function inicializarFirebaseTeste() {
    try {
        console.log('⚡ Inicializando Firebase para página teste...');
        
        // Usar apenas o banco ORGTAREFAS
        const firebaseConfigOrgtarefas = {
            apiKey: "AIzaSyAs0Ke4IBfBWDrfH0AXaOhCEjtfpPtR_Vg",
            authDomain: "orgtarefas-85358.firebaseapp.com",
            projectId: "orgtarefas-85358",
            storageBucket: "orgtarefas-85358.firebasestorage.app",
            messagingSenderId: "1023569488575",
            appId: "1:1023569488575:web:18f9e201115a1a92ccb40a"
        };
        
        // Se já estiver inicializado, usar a instância existente
        try {
            const appOrgtarefas = firebase.initializeApp(firebaseConfigOrgtarefas, "TesteApp");
            window.db = appOrgtarefas.firestore();
            console.log('✅ Firebase inicializado para teste!');
        } catch (error) {
            if (error.code === 'app/duplicate-app') {
                console.log('ℹ️ Firebase já inicializado, usando referência existente');
                window.db = firebase.app("TesteApp").firestore();
            } else {
                throw error;
            }
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao configurar Firebase:', error);
        return false;
    }
}

async function inicializarPaginaTeste() {
    console.log('📋 Inicializando página teste...');
    
    // Configurar sistema de alertas (similar ao index.html)
    inicializarSistemaAlertas();
    
    // Carregar dados do usuário
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (usuarioLogado) {
        // Verificar alertas para o usuário logado
        setTimeout(async () => {
            await verificarAlertasObservador(usuarioLogado.usuario);
            await verificarAlertasResponsavel(usuarioLogado.usuario);
            atualizarContadoresAlertas();
        }, 2000);
    }
    
    // Mostrar conteúdo principal
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
    
    // Adicionar eventos específicos da página teste
    configurarEventosTeste();
    
    console.log('✅ Página teste inicializada!');
}

// SISTEMA DE ALERTAS (cópia do script.js)
function inicializarSistemaAlertas() {
    console.log('🔔 Inicializando sistema de alertas na página teste...');
    
    // Configurar listeners para os sinos de alerta
    const observadorBell = document.getElementById('observadorBell');
    const responsavelBell = document.getElementById('responsavelBell');
    
    if (observadorBell) {
        observadorBell.addEventListener('click', abrirAlertasObservador);
    }
    
    if (responsavelBell) {
        responsavelBell.addEventListener('click', abrirAlertasResponsavel);
    }
    
    // Verificar alertas periodicamente (apenas na página teste)
    setInterval(async () => {
        const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
        if (usuarioLogado) {
            await verificarAlertasObservador(usuarioLogado.usuario);
            await verificarAlertasResponsavel(usuarioLogado.usuario);
            atualizarContadoresAlertas();
        }
    }, 60000); // Verificar a cada 1 minuto
}

// FUNÇÕES DE ALERTAS (cópia do script.js)
async function verificarAlertasObservador(usuarioAtual) {
    try {
        if (!window.db) {
            console.error('❌ Firebase não inicializado');
            return;
        }
        
        console.log(`🔍 Buscando alertas para observador: ${usuarioAtual}`);
        
        // Buscar atividades onde o usuário é observador COM asterisco
        const snapshot = await window.db.collection('atividades')
            .where('observadores', 'array-contains', usuarioAtual + '*')
            .get();
        
        console.log(`📊 Atividades com asterisco: ${snapshot.docs.length}`);
        
        const atividades = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Filtrar atividades onde status é diferente de statusAnterior
        const atividadesComAlerta = atividades.filter(atividade => {
            const status = atividade.status || 'nao_iniciado';
            const statusAnterior = atividade.statusAnterior || 'nao_iniciado';
            return status !== statusAnterior;
        });
        
        console.log(`⚠️ ${atividadesComAlerta.length} atividades com alertas não vistos`);
        
        // Limpar alertas anteriores
        alertasObservador = [];
        
        // Criar alertas para cada atividade
        for (const atividade of atividadesComAlerta) {
            // Buscar nome da tarefa
            let tarefaNome = 'Tarefa desconhecida';
            try {
                const tarefaDoc = await window.db.collection('tarefas').doc(atividade.tarefaId).get();
                if (tarefaDoc.exists) {
                    tarefaNome = tarefaDoc.data().titulo || 'Tarefa desconhecida';
                }
            } catch (error) {
                console.error('Erro ao buscar tarefa:', error);
            }
            
            const statusAnterior = atividade.statusAnterior || 'nao_iniciado';
            const statusAtual = atividade.status || 'nao_iniciado';
            
            const alertaId = `obs_${atividade.id}_${statusAtual}_${Date.now()}`;
            
            const alerta = {
                id: alertaId,
                atividadeId: atividade.id,
                titulo: atividade.titulo || 'Atividade sem título',
                statusAntigo: statusAnterior,
                statusNovo: statusAtual,
                dataAlteracao: atividade.dataAtualizacao ? 
                    atividade.dataAtualizacao.toDate() : new Date(),
                tarefaNome: tarefaNome,
                tipo: 'observador',
                descricao: atividade.descricao || '',
                responsavel: atividade.responsavel || '',
                observador: usuarioAtual
            };
            
            alertasObservador.push(alerta);
            console.log(`✅ Alerta criado: ${alerta.titulo} (${statusAnterior} → ${statusAtual})`);
        }
        
    } catch (error) {
        console.error('❌ Erro em alertas de observador:', error);
    }
}

async function verificarAlertasResponsavel(usuarioAtual) {
    try {
        if (!window.db) {
            console.error('❌ Firebase não inicializado');
            return;
        }
        
        // Buscar atividades onde o usuário é responsável
        const snapshot = await window.db.collection('atividades')
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
        
        // Atualizar array de alertas
        alertasResponsavel = atividadesPendentes.map(atividade => {
            const alertaId = `resp_${atividade.id}`;
            
            return {
                id: alertaId,
                atividadeId: atividade.id,
                titulo: atividade.titulo || 'Atividade sem título',
                status: 'pendente',
                dataCriacao: new Date(),
                tarefaNome: 'Tarefa (buscar se necessário)',
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

function atualizarContadoresAlertas() {
    // Inicializa as variáveis se não existirem
    alertasObservador = alertasObservador || [];
    alertasResponsavel = alertasResponsavel || [];
    
    const naoLidosObservador = alertasObservador.length;
    const naoLidosResponsavel = alertasResponsavel.length;
    
    console.log(`🔢 Contadores: Observador=${naoLidosObservador}, Responsável=${naoLidosResponsavel}`);
    
    // Obter elementos DOM
    const observadorCountEl = document.getElementById('observadorAlertCount');
    const responsavelCountEl = document.getElementById('responsavelAlertCount');
    
    // Verificar se elementos existem antes de atualizar
    if (observadorCountEl) {
        observadorCountEl.textContent = naoLidosObservador;
        observadorCountEl.style.display = naoLidosObservador > 0 ? 'flex' : 'none';
    }
    
    if (responsavelCountEl) {
        responsavelCountEl.textContent = naoLidosResponsavel;
        responsavelCountEl.style.display = naoLidosResponsavel > 0 ? 'flex' : 'none';
    }
    
    console.log('✅ Contadores atualizados na página teste');
}

function abrirAlertasObservador() {
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

function abrirAlertasResponsavel() {
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

function renderizarAlertasObservador() {
    const container = document.getElementById('observadorAlertList');
    
    if (alertasObservador.length === 0) {
        container.innerHTML = '<div class="no-alerts">Nenhum alerta não visualizado</div>';
        return;
    }
    
    const alertasOrdenados = [...alertasObservador].sort((a, b) => 
        new Date(b.dataAlteracao) - new Date(a.dataAlteracao)
    );
    
    const alertasHTML = alertasOrdenados.map(alerta => {
        const tempoAtras = formatarTempoAtras(alerta.dataAlteracao);
        
        return `
            <div class="alert-item unread" data-alerta-id="${alerta.id}">
                <div class="alert-item-header">
                    <div class="alert-item-title">
                        <i class="fas fa-bell"></i>
                        ${alerta.titulo}
                    </div>
                    <div class="alert-item-time">${tempoAtras}</div>
                </div>
                <div class="alert-item-body">
                    <div class="alert-mudanca-status">
                        <i class="fas fa-sync-alt"></i>
                        Status alterado em <strong>${alerta.tarefaNome}</strong>
                    </div>
                    ${alerta.responsavel ? `<div class="alert-responsavel"><i class="fas fa-user"></i> ${alerta.responsavel}</div>` : ''}
                </div>
                <div class="alert-item-details">
                    <div class="alert-status-change">
                        <div class="status-change-label">De:</div>
                        <span class="alert-status-badge badge-de status-${normalizarStatusParaClasse(alerta.statusAntigo)}">
                            ${getLabelStatus(alerta.statusAntigo)}
                        </span>
                        <div class="status-change-label">Para:</div>
                        <span class="alert-status-badge badge-para status-${normalizarStatusParaClasse(alerta.statusNovo)}">
                            ${getLabelStatus(alerta.statusNovo)}
                        </span>
                    </div>
                </div>
                <div class="alert-actions">
                    <button class="btn-mark-read" onclick="marcarAlertaComoLido('${alerta.id}', 'observador')">
                        <i class="fas fa-check-circle"></i> Marcar como Lido
                    </button>
                    <button class="btn-go-to-activity" onclick="irParaAtividade('${alerta.atividadeId}')">
                        <i class="fas fa-external-link-alt"></i> Ver Atividade
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = alertasHTML;
}

function renderizarAlertasResponsavel() {
    const container = document.getElementById('responsavelAlertList');
    
    if (alertasResponsavel.length === 0) {
        container.innerHTML = '<div class="no-alerts">Nenhuma atividade pendente</div>';
        return;
    }
    
    const alertasHTML = alertasResponsavel.map(alerta => {
        const tempoAtras = formatarTempoAtras(alerta.dataCriacao);
        const dataPrevista = alerta.dataPrevista ? 
            `<div class="alert-data-prevista">
                <i class="fas fa-calendar"></i>
                ${formatarData(alerta.dataPrevista)}
            </div>` : 
            '';
        
        return `
            <div class="alert-item unread" data-alerta-id="${alerta.id}">
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
                    <button class="btn-go-to-activity" onclick="irParaAtividade('${alerta.atividadeId}')">
                        <i class="fas fa-external-link-alt"></i> Ver Atividade
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = alertasHTML;
}

// FUNÇÕES UTILITÁRIAS (cópia do script.js)
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

function formatarData(dataString) {
    if (!dataString) return 'Não definida';
    return new Date(dataString + 'T00:00:00').toLocaleDateString('pt-BR');
}

// Funções de ação dos alertas
async function marcarAlertaComoLido(alertaId, tipo) {
    try {
        if (tipo === 'observador') {
            // Encontrar o alerta
            const alerta = alertasObservador.find(a => a.id === alertaId);
            
            if (alerta && window.db) {
                // Buscar a atividade no Firestore
                const atividadeDoc = await window.db.collection('atividades').doc(alerta.atividadeId).get();
                
                if (atividadeDoc.exists) {
                    const atividade = atividadeDoc.data();
                    const observadores = atividade.observadores || [];
                    
                    // Remover asterisco do observador específico
                    const observadoresAtualizados = observadores.map(obs => {
                        if (obs === alerta.observador + '*') {
                            return alerta.observador; // Remove o asterisco
                        }
                        return obs;
                    });
                    
                    // Atualizar no Firestore
                    await window.db.collection('atividades').doc(alerta.atividadeId).update({
                        observadores: observadoresAtualizados,
                        dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log(`✅ Asterisco removido para ${alerta.observador}`);
                    
                    // Remover da lista local
                    alertasObservador = alertasObservador.filter(a => a.id !== alertaId);
                }
            }
        } else {
            // Para alertas de responsável
            alertasResponsavel = alertasResponsavel.filter(a => a.id !== alertaId);
        }
        
        // Atualizar contadores
        atualizarContadoresAlertas();
        
        // Re-renderizar lista
        if (tipo === 'observador') {
            renderizarAlertasObservador();
        } else {
            renderizarAlertasResponsavel();
        }
        
    } catch (error) {
        console.error('❌ Erro ao marcar alerta como lido:', error);
    }
}

function irParaAtividade(atividadeId) {
    // Marcar como lido primeiro
    marcarAlertaComoLido(atividadeId, 'responsavel');
    
    // Abrir dashboard
    window.open(`dashboard.html?atividade=${atividadeId}`, '_blank');
}

// FUNÇÃO LOGOUT (cópia do script.js)
function logout() {
    console.log('🚪 Fazendo logout...');
    localStorage.removeItem('usuarioLogado');
    window.location.href = 'login.html';
}

// Fechar dropdowns de alerta ao clicar fora
document.addEventListener('click', function(event) {
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

// Configurar eventos específicos da página teste
function configurarEventosTeste() {
    console.log('⚙️ Configurando eventos da página teste...');
    
    // Adicione aqui os eventos específicos da sua página teste
    // Exemplo:
    // const botaoTeste = document.getElementById('botaoTeste');
    // if (botaoTeste) {
    //     botaoTeste.addEventListener('click', () => {
    //         alert('Botão teste clicado!');
    //     });
    // }
}

// Torna as funções globais para acesso pelo HTML
window.abrirAlertasObservador = abrirAlertasObservador;
window.abrirAlertasResponsavel = abrirAlertasResponsavel;
window.marcarAlertaComoLido = marcarAlertaComoLido;
window.irParaAtividade = irParaAtividade;
window.logout = logout;
