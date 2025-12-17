// script.js - arquivo
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
let ultimaVerificacaoAlertas = null;
let ultimoStatusNotificado = {};

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

    // INICIALIZAR CONTADORES COMO ZERO E OCULTOS
    const observadorCountEl = document.getElementById('observadorAlertCount');
    const responsavelCountEl = document.getElementById('responsavelAlertCount');
    
    if (observadorCountEl) {
        observadorCountEl.textContent = '0';
        observadorCountEl.style.display = 'none';
    }
    
    if (responsavelCountEl) {
        responsavelCountEl.textContent = '0';
        responsavelCountEl.style.display = 'none';
    }
    
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
            
            // Configurar listener específico para observadores
            configurarListenerObservadores();
            
            // Iniciar verificação de alertas após 3 segundos
            setTimeout(() => {
                const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
                if (usuarioLogado) {
                    console.log('🚀 Iniciando sistema de alertas para:', usuarioLogado.usuario);
                    verificarAlertas();
                }
            }, 3000);
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

    // Listener para detectar mudanças de status e gerar alertas automáticos
    db.collection("atividades")
        .onSnapshot((snapshot) => {
            console.log('🔄 Atualização de atividades - Total de documentos:', snapshot.size);
            
            const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
            if (!usuarioLogado) return;
            
            snapshot.docChanges().forEach(change => {
                console.log(`📝 Mudança tipo: ${change.type} - ID: ${change.doc.id}`);
                
                if (change.type === 'modified') {
                    const novaAtividade = change.doc.data();
                    
                    // Obter dados antigos da forma correta
                    if (change.doc._previousData) {
                        const atividadeAntiga = change.doc._previousData;
                        
                        // Verificar se houve mudança de status
                        const statusAntigo = atividadeAntiga.status || 'nao_iniciado';
                        const statusNovo = novaAtividade.status || 'nao_iniciado';
                        
                        if (statusAntigo !== statusNovo) {
                            console.log(`🔥 STATUS ALTERADO: ${statusAntigo} → ${statusNovo}`);
                            console.log(`📋 Dados antigos:`, atividadeAntiga);
                            console.log(`📋 Dados novos:`, novaAtividade);
                            
                            // Gerar alertas para os observadores
                            gerarAlertaParaObservadores(change.doc.id, novaAtividade, atividadeAntiga);
                        }
                    } else {
                        console.log('ℹ️ Sem dados anteriores disponíveis');
                    }
                }
            });
            
            // Verificar alertas após mudanças
            setTimeout(() => {
                const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
                if (usuarioLogado) {
                    verificarAlertas();
                }
            }, 1500);
        });

}

// Torna a função global
window.forcarVerificacaoAlertas = forcarVerificacaoAlertas;

// Função para gerar alertas automaticamente para observadores quando status muda
async function gerarAlertaParaObservadores(atividadeId, novaAtividade, atividadeAntiga) {
    try {
        console.log(`🔔 GERAR ALERTA: Atividade ${atividadeId}`);
        console.log(`📊 Status anterior: ${atividadeAntiga.status || 'não definido'}`);
        console.log(`📊 Status novo: ${novaAtividade.status || 'não definido'}`);
        
        // Verificar se realmente houve mudança
        const statusAntigo = atividadeAntiga.status || 'nao_iniciado';
        const statusNovo = novaAtividade.status || 'nao_iniciado';
        
        if (statusAntigo === statusNovo) {
            console.log('ℹ️ Sem mudança real de status, ignorando');
            return;
        }
        
        // Verificar se há observadores
        const observadores = novaAtividade.observadores || [];
        
        if (observadores.length === 0) {
            console.log('ℹ️ Atividade não tem observadores');
            return;
        }
        
        console.log(`👥 Observadores encontrados:`, observadores);
        
        // IMPORTANTE: Primeiro, garantir que todos os observadores têm asterisco
        const observadoresComAsterisco = observadores.map(obs => {
            // Se já tem asterisco, mantém
            if (obs.endsWith('*')) {
                return obs;
            }
            // Adiciona asterisco
            return obs + '*';
        });
        
        // Atualizar no Firestore com os asteriscos
        await db.collection('atividades').doc(atividadeId).update({
            observadores: observadoresComAsterisco,
            dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Asteriscos adicionados aos observadores`);
        
        // Obter usuário logado
        const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
        if (!usuarioLogado) return;
        
        const usuarioAtual = usuarioLogado.usuario;
        
        // Verificar se o usuário atual é observador
        const isObservador = observadores.some(obs => {
            const obsSemAsterisco = obs.endsWith('*') ? obs.slice(0, -1) : obs;
            return obsSemAsterisco === usuarioAtual;
        });
        
        if (!isObservador) {
            console.log(`ℹ️ Usuário ${usuarioAtual} não é observador desta atividade`);
            return;
        }
        
        console.log(`✅ Usuário ${usuarioAtual} É observador desta atividade`);
        
        // Buscar nome da tarefa
        let tarefaNome = 'Tarefa desconhecida';
        try {
            const tarefaDoc = await db.collection('tarefas').doc(novaAtividade.tarefaId).get();
            if (tarefaDoc.exists) {
                tarefaNome = tarefaDoc.data().titulo || 'Tarefa desconhecida';
            }
        } catch (e) {
            console.error('Erro ao buscar nome da tarefa:', e);
        }
        
        // Criar objeto de alerta
        const alertaId = `obs_${atividadeId}_${Date.now()}`;
        const alerta = {
            id: alertaId,
            atividadeId: atividadeId,
            titulo: novaAtividade.titulo || 'Atividade sem título',
            statusAntigo: statusAntigo,
            statusNovo: statusNovo,
            dataAlteracao: new Date(),
            tarefaNome: tarefaNome,
            tipo: 'observador',
            descricao: novaAtividade.descricao || '',
            responsavel: novaAtividade.responsavel || '',
            observador: usuarioAtual
        };
        
        // Adicionar ao array de alertas de observador
        alertasObservador.unshift(alerta);
        
        console.log(`✅ Alerta criado: ${statusAntigo} → ${statusNovo}`);
        console.log(`📊 Total de alertas: ${alertasObservador.length}`);
        
        // Atualizar contadores
        atualizarContadoresAlertas();
        
        // Mostrar notificação rápida
        setTimeout(() => {
            mostrarNotificacaoRapida(`Status alterado: "${alerta.titulo}" - ${getLabelStatus(alerta.statusAntigo)} → ${getLabelStatus(alerta.statusNovo)}`);
        }, 500);
        
    } catch (error) {
        console.error('❌ Erro ao gerar alertas para observadores:', error);
    }
}



// Função para forçar verificação de alertas (pode ser chamada manualmente)
async function forcarVerificacaoAlertas() {
    console.log('🔍 Forçando verificação de alertas...');
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!usuarioLogado) return;
    
    const usuarioAtual = usuarioLogado.usuario;
    
    await verificarAlertasObservador(usuarioAtual);
    await verificarAlertasResponsavel(usuarioAtual);
    atualizarContadoresAlertas();
    
    console.log('✅ Verificação forçada concluída');
}

// Torna a função global
window.forcarVerificacaoAlertas = forcarVerificacaoAlertas;

// Listener específico para detectar quando observadores são atualizados
function configurarListenerObservadores() {
    console.log('👁️ Configurando listener para observadores...');
    
    db.collection("atividades")
        .onSnapshot((snapshot) => {
            const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
            if (!usuarioLogado) return;
            
            const usuarioAtual = usuarioLogado.usuario;
            
            snapshot.docChanges().forEach(change => {
                if (change.type === 'modified') {
                    const novaAtividade = change.doc.data();
                    const atividadeAntiga = change.doc._previousData;
                    
                    if (!atividadeAntiga) return;
                    
                    // Verificar se OS OBSERVADORES foram alterados (não apenas status)
                    const obsAntigos = atividadeAntiga.observadores || [];
                    const obsNovos = novaAtividade.observadores || [];
                    
                    // Verificar se houve mudança nos observadores
                    if (JSON.stringify(obsAntigos) !== JSON.stringify(obsNovos)) {
                        console.log(`👥 Observadores alterados na atividade ${change.doc.id}`);
                        
                        // Verificar se o asterisco foi adicionado/removido para este usuário
                        const tinhaAsteriscoAntes = obsAntigos.includes(usuarioAtual + '*');
                        const temAsteriscoAgora = obsNovos.includes(usuarioAtual + '*');
                        
                        if (!tinhaAsteriscoAntes && temAsteriscoAgora) {
                            console.log(`⭐ NOVO ASTERISCO para ${usuarioAtual}`);
                            // Forçar verificação completa
                            setTimeout(() => {
                                verificarAlertasObservador(usuarioAtual);
                            }, 1000);
                        }
                    }
                    
                    // Verificar também se o status mudou (para garantir)
                    if (atividadeAntiga.status !== novaAtividade.status) {
                        console.log(`🔄 Status alterado: ${atividadeAntiga.status} → ${novaAtividade.status}`);
                        // Forçar verificação
                        setTimeout(() => {
                            verificarAlertasObservador(usuarioAtual);
                        }, 1500);
                    }
                }
            });
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
        
        console.log('🔄 Iniciando verificação completa de alertas...');
        
        
        // Verificar alertas de observador
        await verificarAlertasObservador(usuarioAtual);
        
        // Verificar alertas de responsável
        await verificarAlertasResponsavel(usuarioAtual);
        
        // Atualizar interface
        atualizarContadoresAlertas();
        
        // DEBUG: Mostrar estado atual dos alertas
        console.log(`📊 Alertas estado: ${alertasObservador.length} observador, ${alertasResponsavel.length} responsável`);
        
        // Verificar novamente em 30 segundos
        setTimeout(verificarAlertas, 30000);
        
    } catch (error) {
        console.error('❌ Erro ao verificar alertas:', error);
    }
}

// Função para verificar alertas de observador
async function verificarAlertasObservador(usuarioAtual) {
    try {
        console.log(`🔍 Buscando alertas para observador: ${usuarioAtual}`);
        
        // Buscar atividades onde o usuário é observador COM asterisco
        const snapshot = await db.collection('atividades')
            .where('observadores', 'array-contains', usuarioAtual + '*')
            .get();
        
        console.log(`📊 Atividades com asterisco: ${snapshot.docs.length}`);
        
        // DEBUG: Mostrar o que foi encontrado
        snapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`${index + 1}. ${data.titulo || 'Sem título'} (${doc.id})`);
            console.log(`   Status: ${data.status} | StatusAnterior: ${data.statusAnterior}`);
        });
        
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
            // Buscar nome da tarefa no Firestore
            let tarefaNome = 'Tarefa desconhecida';
            try {
                const tarefaDoc = await db.collection('tarefas').doc(atividade.tarefaId).get();
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
        
        // Atualizar interface
        atualizarContadoresAlertas();

        // aqui1
        // Se houver novos alertas, mostrar notificação
        //if (alertasObservador.length > 0) {
        //    setTimeout(() => {
        //        mostrarNotificacaoRapida(`${alertasObservador.length} atividade(s) tiveram mudança de status`);
        //    }, 1000);
        //}
        
    } catch (error) {
        console.error('❌ Erro em alertas de observador:', error);
    }
}

// Função de debug para verificar estado dos observadores
async function debugObservadores() {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!usuarioLogado) return;
    
    const usuarioAtual = usuarioLogado.usuario;
    
    console.log('🔍 DEBUG - Estado dos observadores para:', usuarioAtual);
    
    try {
        // Buscar todas as atividades
        const snapshot = await db.collection('atividades').get();
        
        console.log('📊 Todas as atividades:', snapshot.docs.length);
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const observadores = data.observadores || [];
            
            // Verificar se o usuário é observador
            const isObservador = observadores.some(obs => {
                const obsSemAsterisco = obs.endsWith('*') ? obs.slice(0, -1) : obs;
                return obsSemAsterisco === usuarioAtual;
            });
            
            if (isObservador) {
                console.log(`\n📋 Atividade: ${data.titulo || 'Sem título'} (${doc.id})`);
                console.log(`   Observadores:`, observadores);
                console.log(`   Tem "*" para ${usuarioAtual}?: ${observadores.includes(usuarioAtual + '*') ? 'SIM' : 'NÃO'}`);
                console.log(`   Status: ${data.status || 'não definido'}`);
                console.log(`   StatusAnterior: ${data.statusAnterior || 'não definido'}`);
                console.log(`   Diferentes?: ${data.status !== data.statusAnterior ? 'SIM' : 'NÃO'}`);
            }
        });
        
    } catch (error) {
        console.error('❌ Erro no debug:', error);
    }
}

window.debugObservadores = debugObservadores;


// Função para limpar o cache (opcional, para testes)
function limparCacheAlertas() {
    ultimoStatusNotificado = {};
    console.log('🧹 Cache de alertas limpo');
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
        
        // Atualizar array de alertas (substituir completamente)
        alertasResponsavel = atividadesPendentes.map(atividade => {
            const alertaId = `resp_${atividade.id}`;
            
            // Buscar nome da tarefa
            let tarefaNome = 'Tarefa desconhecida';
            if (atividade.tarefaId) {
                // Buscar em cache local
                const tarefa = tarefas.find(t => t.id === atividade.tarefaId);
                if (tarefa) {
                    tarefaNome = tarefa.titulo || 'Tarefa desconhecida';
                }
            }
            
            return {
                id: alertaId,
                atividadeId: atividade.id,
                titulo: atividade.titulo || 'Atividade sem título',
                status: 'pendente',
                dataCriacao: new Date(),
                tarefaNome: tarefaNome,
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

// Variável para histórico de status
let historicoStatus = {};

// função mostrarNotificacaoRapida:
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
        background: linear-gradient(135deg, #3498db, #2980b9);
        color: white;
        font-weight: 500;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        max-width: 400px;
    `;
    
    notification.innerHTML = `
        <i class="fas fa-bell" style="font-size: 18px;"></i>
        <div style="flex: 1;">
            <div style="font-weight: 600; margin-bottom: 2px;">Alerta de Status</div>
            <div style="font-size: 13px;">${mensagem}</div>
        </div>
        <button onclick="this.parentElement.remove()" style="
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
            margin-left: 8px;
            opacity: 0.8;
        ">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Remover automaticamente após 7 segundos
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 7000);
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
    
    // Inicializa as variáveis se não existirem
    alertasObservador = alertasObservador || [];
    alertasResponsavel = alertasResponsavel || [];
    
    // Para observador: todos os alertas na lista são não lidos
    const naoLidosObservador = alertasObservador.length;
    
    // Para responsável: todos os alertas na lista são não lidos
    const naoLidosResponsavel = alertasResponsavel.length;
    
    // DEBUG: Log para verificar valores
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
    
    console.log('✅ Contadores atualizados');
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

// Função para renderizar alertas de observador
function renderizarAlertasObservador() {
    const container = document.getElementById('observadorAlertList');
    
    if (alertasObservador.length === 0) {
        container.innerHTML = '<div class="no-alerts">Nenhum alerta não visualizado</div>';
        return;
    }
    
    // Ordenar do mais recente para o mais antigo
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
                        <span class="alert-status-badge badge-de ${normalizarStatusParaClasse(alerta.statusAntigo)}">
                            ${getLabelStatus(alerta.statusAntigo)}
                        </span>
                        <div class="status-change-label">Para:</div>
                        <span class="alert-status-badge badge-para ${normalizarStatusParaClasse(alerta.statusNovo)}">
                            ${getLabelStatus(alerta.statusNovo)}
                        </span>
                    </div>
                </div>
                <div class="alert-actions">
                    <button class="btn-mark-read" onclick="marcarAlertaComoLido('${alerta.id}', 'observador')">
                        <i class="fas fa-check-circle"></i> Marcar como visualizado
                    </button>
                    <button class="btn-go-to-activity" onclick="irParaAtividade('${alerta.atividadeId}')">
                        <i class="fas fa-external-link-alt"></i> Ver atividade
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
                    <button class="btn-mark-read" onclick="marcarAlertaComoLido('${alerta.id}', 'responsavel')">
                        <i class="fas fa-check"></i> Visualizado
                    </button>
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

// Verificação inicial mais agressiva
async function verificarInicialAlertas() {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!usuarioLogado) return;
    
    const usuarioAtual = usuarioLogado.usuario;
    
    console.log('🚀 Verificação inicial de alertas...');
    
    // Aguardar 3 segundos para garantir que tudo carregou
    setTimeout(async () => {
        await verificarAlertasObservador(usuarioAtual);
        await verificarAlertasResponsavel(usuarioAtual);
        atualizarContadoresAlertas();
        
        console.log('✅ Verificação inicial concluída');
    }, 3000);
}

// Função para marcar alerta como lido
async function marcarAlertaComoLido(alertaId, tipo) {
    try {
        if (tipo === 'observador') {
            // Encontrar o alerta
            const alerta = alertasObservador.find(a => a.id === alertaId);
            
            if (alerta) {
                // Buscar a atividade no Firestore
                const atividadeDoc = await db.collection('atividades').doc(alerta.atividadeId).get();
                
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
                    await db.collection('atividades').doc(alerta.atividadeId).update({
                        observadores: observadoresAtualizados,
                        dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log(`✅ Asterisco removido para ${alerta.observador} na atividade ${alerta.atividadeId}`);
                    
                    // Remover da lista local
                    alertasObservador = alertasObservador.filter(a => a.id !== alertaId);
                    
                    // Atualizar contadores
                    atualizarContadoresAlertas();
                }
            }
        } else {
            // Para alertas de responsável
            alertasResponsavel = alertasResponsavel.filter(a => a.id !== alertaId);
            atualizarContadoresAlertas();
        }
        
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

    // aqui4
    //setTimeout(() => {
    //    document.body.removeChild(notification);
    //}, 3000);
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
