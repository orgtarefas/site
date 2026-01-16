// script.js - arquivo
//console.log('=== SISTEMA INICIANDO ===');

// Estado global
let tarefas = [];
let usuarios = [];
let grupos = [];
let atividadesPorTarefa = {};
let editandoTarefaId = null;
let modoEdicao = false;
let editandoProgramaId = null;

// Estado global dos alertas
let alertasObservador = [];
let alertasResponsavel = [];
let ultimaVerificacaoAlertas = null;
let ultimoStatusNotificado = {};

// Variável para o banco de logins
let dbLogins = null;

// Inicialização
// Configurar event listeners
document.addEventListener('DOMContentLoaded', async function() {
    //console.log('🚀 Inicializando sistema...');
    document.getElementById('loadingText').textContent = 'Verificando autenticação...';
    
    // Verificar se usuário está logado
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    if (!usuarioLogado) {
        //console.log('❌ Usuário não logado, redirecionando...');
        window.location.href = 'login.html';
        return;
    }

    //console.log('👤 Usuário logado:', usuarioLogado.nome);
    document.getElementById('userName').textContent = usuarioLogado.nome;

    // DEBUG: Verificar dados do usuário logado
    //console.log('📋 Dados completos do usuário logado:', usuarioLogado);
    //console.log('👥 Grupos do usuário:', usuarioLogado.grupos);
    
    // PRIMEIRO: Inicializar os bancos Firebase ANTES de qualquer operação
    //console.log('🔥 Inicializando DOIS bancos Firebase PRIMEIRO...');
    await inicializarBancosFirebase();
    
    // DEPOIS: Continuar com o resto da inicialização
    //console.log('📥 Continuando inicialização do sistema...');
    await inicializarSistema();
});

// FUNÇÃO: Carregar programas
async function carregarProgramas() {
    console.log('📋 Carregando programas...');
    
    try {
        // Verificar se existe a coleção "programas"
        const programasRef = db.collection("programas");
        const snapshot = await programasRef.orderBy("dataAtualizacao", "desc").get();
        
        if (snapshot.empty) {
            console.log('ℹ️ Nenhum programa encontrado no sistema');
            programas = [];
            return;
        }
        
        programas = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log('✅ Programas carregados:', programas.length);
        console.log('📋 Programas:', programas);

        // Preencher select de programas no modal
        const selectProgramas = document.getElementById('tarefaPrograma');
        
        if (selectProgramas) {
            selectProgramas.innerHTML = '<option value="">Nenhum programa</option>';
            
            programas.forEach(programa => {
                const option = document.createElement('option');
                option.value = programa.id;
                option.textContent = programa.titulo || programa.nome || programa.id; // Usa 'titulo' se existir
                selectProgramas.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar programas:', error);
        programas = [];
    }
}

async function inicializarBancosFirebase() {
    try {
        //console.log('⚡ Inicializando bancos Firebase...');
        
        // Banco 1: ORGTAREFAS (já configurado no HTML, mas vamos garantir)
        if (!window.db) {
            //console.log('🔄 Configurando banco ORGTAREFAS...');
            
            const firebaseConfigOrgtarefas = {
                apiKey: "AIzaSyAs0Ke4IBfBWDrfH0AXaOhCEjtfpPtR_Vg",
                authDomain: "orgtarefas-85358.firebaseapp.com",
                projectId: "orgtarefas-85358",
                storageBucket: "orgtarefas-85358.firebasestorage.app",
                messagingSenderId: "1023569488575",
                appId: "1:1023569488575:web:18f9e201115a1a92ccb40a"
            };
            
            // Inicializar primeiro app (default)
            const appOrgtarefas = firebase.initializeApp(firebaseConfigOrgtarefas);
            window.db = appOrgtarefas.firestore();
            //console.log('✅ Banco ORGTAREFAS inicializado!');
        } else {
            //console.log('✅ Banco ORGTAREFAS já está configurado');
        }
        
        // Banco 2: LOGINS
        //console.log('🔄 Configurando banco de LOGINS...');
        
        const firebaseConfigLogins = {
            apiKey: "AIzaSyCJpyAouZtwoWC0QDmTtpJxn0_j_w8DlvU",
            authDomain: "logins-c3407.firebaseapp.com",
            projectId: "logins-c3407",
            storageBucket: "logins-c3407.firebasestorage.app",
            messagingSenderId: "809861558230",
            appId: "1:809861558230:web:e6e41bf1db9b3cfd887e77"
        };
        
        try {
            // Inicializar segundo app com nome diferente
            const appLogins = firebase.initializeApp(firebaseConfigLogins, "LoginsApp");
            window.dbLogins = appLogins.firestore();
            //console.log('✅ Banco LOGINS inicializado!');
        } catch (error) {
            if (error.code === 'app/duplicate-app') {
                //console.log('ℹ️ Firebase já inicializado, usando referências existentes');
                window.dbLogins = firebase.app("LoginsApp").firestore();
            } else {
                throw error;
            }
        }
        
        //console.log('🎯 Ambos os bancos configurados: db (ORGTAREFAS) e dbLogins (LOGINS)');
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao configurar bancos:', error);
        return false;
    }
}

async function inicializarSistema() {
    console.log('📋 Inicializando sistema...');
    document.getElementById('loadingText').textContent = 'Conectando aos bancos de dados...';

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
    
    // AGORA db JÁ DEVE ESTAR DEFINIDO
    if (!window.db) {
        console.error('❌ Banco ORGTAREFAS não foi inicializado!');
        mostrarErro('Erro ao conectar com o banco de dados');
        return;
    }
    
    // ⚡ AJUSTE IMPORTANTE: Se não tiver grupos, buscar AGORA antes de continuar
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!usuarioLogado.grupos || usuarioLogado.grupos.length === 0) {
        console.log('🔄 Carregando grupos do usuário antes de continuar...');
        document.getElementById('loadingText').textContent = 'Carregando grupos do usuário...';
        
        try {
            // Chamar a função que carrega grupos diretamente
            await carregarGruposDoUsuarioLogado();
            
            // Recarregar usuário logado atualizado
            const usuarioAtualizado = JSON.parse(localStorage.getItem('usuarioLogado'));
            console.log('✅ Grupos carregados:', usuarioAtualizado.grupos);
        } catch (error) {
            console.error('❌ Erro ao carregar grupos:', error);
        }
    }
    
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
    
    // Continuar com o resto do sistema
    try {
        // PRIMEIRO: Carregar usuários e grupos DO USUÁRIO LOGADO
        console.log('📥 Carregando dados do usuário...');
        document.getElementById('loadingText').textContent = 'Carregando seus dados...';
        
        // Carregar usuários primeiro (APENAS do LOGINS agora)
        await carregarUsuarios();
        
        // Carregar programas ← ADICIONE ESTA LINHA
        await carregarProgramas();
        
        // Verificar se grupos do usuário foram carregados
        const usuarioAtual = JSON.parse(localStorage.getItem('usuarioLogado'));
        
        if (!usuarioAtual.grupos || usuarioAtual.grupos.length === 0) {
            console.log('⚠️ Usuário não está em nenhum grupo! Mostrando todas as tarefas.');
        }
        
        // DEPOIS: Carregar o resto
        console.log('📊 Carregando dados do sistema...');
        document.getElementById('loadingText').textContent = 'Carregando tarefas...';
        
        await carregarGrupos(); // Esta carrega todos os grupos do sistema
        configurarFirebase();

        // Tornar estatísticas clicáveis (sem notificação)
        setTimeout(() => {
            criarEstatisticasClicaveis();
        }, 1000);
        
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

// Função para tornar estatísticas clicáveis 
function criarEstatisticasClicaveis() {
    const estatisticas = [
        { id: 'total-tarefas', status: 'todos', label: 'Total de Tarefas' },
        { id: 'tarefas-naoiniciadas', status: 'nao_iniciado', label: 'Não Iniciadas' },
        { id: 'tarefas-pendentes', status: 'pendente', label: 'Pendentes' },
        { id: 'tarefas-andamento', status: 'andamento', label: 'Em Andamento' },
        { id: 'tarefas-concluidas', status: 'concluido', label: 'Concluídas' }
    ];
    
    estatisticas.forEach(estatistica => {
        const card = document.querySelector(`#${estatistica.id}`).closest('.stat-card');
        if (card) {
            // Adicionar cursor pointer
            card.style.cursor = 'pointer';
            
            // Adicionar efeito hover simples
            card.addEventListener('mouseenter', function() {
                this.style.opacity = '0.9';
                this.style.transform = 'translateY(-2px)';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.opacity = '1';
                this.style.transform = 'translateY(0)';
            });
            
            // Adicionar evento de clique DIRETO
            card.addEventListener('click', function() {
                aplicarFiltroStatus(estatistica.status);
            });
        }
    });
}

// Função para aplicar filtro por status (SEM NOTIFICAÇÃO)
function aplicarFiltroStatus(status) {
    // Atualizar o filtro de status no select
    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
        // Para "todos" usamos valor vazio
        filterStatus.value = status === 'todos' ? '' : status;
    }
    
    // Limpar outros filtros (opcional)
    const searchInput = document.getElementById('searchInput');
    const filterPrioridade = document.getElementById('filterPrioridade');
    const filterResponsavel = document.getElementById('filterResponsavel');
    
    if (searchInput) searchInput.value = '';
    if (filterPrioridade) filterPrioridade.value = '';
    if (filterResponsavel) filterResponsavel.value = '';
    
    // Atualizar lista de tarefas
    atualizarListaTarefas();
    
    // Apenas scroll suave para a lista
    setTimeout(() => {
        const listaTarefas = document.getElementById('lista-tarefas');
        if (listaTarefas) {
            listaTarefas.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

// FUNÇÃO: Determinar status da tarefa com base nas atividades
function determinarStatusTarefaPorAtividades(atividades) {
    // Se não houver atividades, retorna não iniciado
    if (!atividades || atividades.length === 0) {
        return 'nao_iniciado';
    }
    
    // Contar status das atividades
    let countNaoIniciado = 0;
    let countPendente = 0;
    let countConcluido = 0;
    let countAndamento = 0;
    let countTotal = atividades.length;
    
    atividades.forEach(atividade => {
        const status = (atividade.status || 'nao_iniciado').toLowerCase().trim();
        
        // CORREÇÃO: Verificar TODAS as variações possíveis de cada status
        if (status === 'nao_iniciado' || status === 'não iniciado' || status === 'nao-iniciado') {
            countNaoIniciado++;
        } 
        else if (status === 'pendente') {
            countPendente++;
        }
        else if (status === 'concluido' || status === 'concluído' || status === 'concluido') {
            countConcluido++;
        }
        else if (status === 'andamento' || status === 'em andamento' || status === 'em_andamento') {
            countAndamento++;
        }
        else {
            // Se não reconhecer, considera como não iniciado
            countNaoIniciado++;
        }
    });
    
    // DEBUG: Mostrar contagens (descomente para testar)
    // console.log('📊 Contagem de status:', {
    //     total: countTotal,
    //     naoIniciado: countNaoIniciado,
    //     pendente: countPendente,
    //     concluido: countConcluido,
    //     andamento: countAndamento
    // });
    
    // APLICAR AS REGRAS NA ORDEM CORRETA:
    
    // 1. Se ALGUMA atividade está PENDENTE → Tarefa = "PENDENTE"
    if (countPendente > 0) {
        // console.log('✅ REGRA 1: Tem atividade pendente → Tarefa = PENDENTE');
        return 'pendente';
    }
    
    // 2. Se TODAS as atividades estão CONCLUÍDAS → Tarefa = "CONCLUÍDO"
    if (countConcluido === countTotal) {
        // console.log('✅ REGRA 2: Todas concluídas → Tarefa = CONCLUÍDO');
        return 'concluido';
    }
    
    // 3. Se TODAS as atividades estão NÃO INICIADAS → Tarefa = "NÃO INICIADO"
    if (countNaoIniciado === countTotal) {
        // console.log('✅ REGRA 3: Todas não iniciadas → Tarefa = NÃO INICIADO');
        return 'nao_iniciado';
    }
    
    // 4. Qualquer outra combinação → Tarefa = "EM ANDAMENTO"
    // console.log('✅ REGRA 4: Mistura de status → Tarefa = EM ANDAMENTO');
    return 'andamento';
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
    //console.log('👥 Carregando grupos...');
    
    try {
        const snapshot = await db.collection("grupos").get();
        
        grupos = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        //console.log('✅ Grupos carregados:', grupos.length);

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

// FUNÇÃO: Atualizar status de uma tarefa específica
async function atualizarStatusTarefa(tarefaId) {
    try {
        // Buscar atividades desta tarefa
        const atividadesDaTarefa = atividadesPorTarefa[tarefaId] || [];
        
        // Determinar novo status
        const novoStatus = determinarStatusTarefaPorAtividades(atividadesDaTarefa);
        
        // Buscar tarefa atual
        const tarefaIndex = tarefas.findIndex(t => t.id === tarefaId);
        if (tarefaIndex === -1) return;
        
        const statusAtual = tarefas[tarefaIndex].status || 'nao_iniciado';
        
        // Se o status mudou, atualizar no Firestore
        if (statusAtual !== novoStatus) {
            //console.log(`🔄 Atualizando tarefa ${tarefaId}: ${statusAtual} -> ${novoStatus}`);
            
            await db.collection("tarefas").doc(tarefaId).update({
                status: novoStatus,
                dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Atualizar localmente
            tarefas[tarefaIndex].status = novoStatus;
            
            // Atualizar interface
            atualizarInterface();
        }
        
    } catch (error) {
        console.error('❌ Erro ao atualizar status da tarefa:', error);
    }
}


// Carregar grupos do usuário logado do banco ORGTAREFAS
async function carregarGruposDoUsuarioLogado() {
    //console.log('👤 Buscando grupos do usuário logado...');
    
    try {
        const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
        if (!usuarioLogado || !usuarioLogado.usuario) {
            //console.log('⚠️ Usuário não logado');
            return;
        }
        
        const usuarioAtual = usuarioLogado.usuario;
        //console.log(`🔍 Procurando grupos para: ${usuarioAtual}`);
        
        // Aguardar um pouco para garantir que o Firebase está inicializado
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Verificar se db está disponível
        if (!window.db) {
            //console.log('⏳ Aguardando inicialização do Firebase...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Buscar TODOS os grupos para ver em quais o usuário está incluído
        const gruposSnapshot = await db.collection('grupos').get();
        
        if (gruposSnapshot.empty) {
            //console.log('❌ Nenhum grupo encontrado no sistema');
            return;
        }
        
        //console.log(`📊 Total de grupos no sistema: ${gruposSnapshot.docs.length}`);
        
        const gruposDoUsuario = [];
    
        // DEBUG: Mostrar todos os grupos e suas estruturas
        gruposSnapshot.forEach(doc => {
            const grupoData = doc.data();
            const grupoId = doc.id;
            
            //console.log(`\n📋 Grupo: ${grupoData.nome || grupoId} (ID: ${grupoId})`);
            
            // Verificar TODAS as propriedades do grupo que podem conter usuários
            const propriedadesComUsuarios = ['usuarios', 'users', 'membros', 'members', 'integrantes'];
            
            let encontrado = false;
            
            for (const prop of propriedadesComUsuarios) {
                if (grupoData[prop] && Array.isArray(grupoData[prop])) {
                    //console.log(`   Propriedade "${prop}":`, grupoData[prop]);
                    
                    // Verificar se o usuário atual está na lista
                    const usuarioNoGrupo = grupoData[prop].some(user => {
                        // Diferentes formatos possíveis
                        if (typeof user === 'string') {
                            return user === usuarioAtual;
                        } else if (user && typeof user === 'object') {
                            return user.usuario === usuarioAtual || 
                                   user.login === usuarioAtual || 
                                   user.id === usuarioAtual ||
                                   user.email === usuarioAtual;
                        }
                        return false;
                    });
                    
                    if (usuarioNoGrupo) {
                        //console.log(`   ✅ USUÁRIO ENCONTRADO no grupo via propriedade "${prop}"!`);
                        gruposDoUsuario.push(grupoId);
                        encontrado = true;
                        break;
                    }
                }
            }
            
            if (!encontrado) {
                //console.log(`   ❌ Usuário NÃO encontrado neste grupo`);
            }
        });
        
        //console.log(`\n📊 RESUMO: Grupos encontrados para ${usuarioAtual}:`, gruposDoUsuario);
        
        if (gruposDoUsuario.length === 0) {
            //console.log(`⚠️ ATENÇÃO: Usuário ${usuarioAtual} não está em nenhum grupo!`);
        }
        
        // Atualizar o objeto usuarioLogado com os grupos encontrados
        usuarioLogado.grupos = gruposDoUsuario;
        
        // Salvar de volta no localStorage
        localStorage.setItem('usuarioLogado', JSON.stringify(usuarioLogado));
        
        //console.log('👥 Grupos atualizados do usuário:', usuarioLogado.grupos);
        
        return gruposDoUsuario;
        
    } catch (error) {
        console.error('❌ Erro ao carregar grupos do usuário:', error);
        return [];
    }
}

// FUNÇÃO: Atualizar status de todas as tarefas (para uso na inicialização)
async function atualizarStatusTodasTarefas() {
    try {
        //console.log('🔄 Atualizando status de todas as tarefas...');
        
        for (const tarefa of tarefas) {
            const atividadesDaTarefa = atividadesPorTarefa[tarefa.id] || [];
            const novoStatus = determinarStatusTarefaPorAtividades(atividadesDaTarefa);
            const statusAtual = tarefa.status || 'nao_iniciado';
            
            if (statusAtual !== novoStatus) {
                await db.collection("tarefas").doc(tarefa.id).update({
                    status: novoStatus,
                    dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                tarefa.status = novoStatus;
            }
        }
        
        //console.log('✅ Status de todas as tarefas atualizado!');
        
    } catch (error) {
        console.error('❌ Erro ao atualizar status das tarefas:', error);
    }
}

// Função de debug para ver estrutura dos grupos
async function debugEstruturaGrupos() {
    //console.log('🔍 DEBUG - Estrutura dos grupos...');
    
    try {
        const snapshot = await db.collection('grupos').get();
        
        //console.log(`📊 Total de grupos: ${snapshot.docs.length}`);
        
        snapshot.forEach((doc, index) => {
            const data = doc.data();
            //console.log(`\n${index + 1}. Grupo: ${data.nome || 'Sem nome'} (ID: ${doc.id})`);
            //console.log('   Chaves/propriedades:', Object.keys(data));
            
            // Mostrar todas as propriedades que são arrays
            Object.keys(data).forEach(key => {
                if (Array.isArray(data[key])) {
                    //console.log(`   - ${key}:`, data[key]);
                }
            });
        });
        
    } catch (error) {
        console.error('❌ Erro no debug:', error);
    }
}

// Torna global para poder chamar no console
window.debugEstruturaGrupos = debugEstruturaGrupos;

// FUNÇÃO: Carregar usuários do banco LOGINS
async function carregarUsuarios() {
    //console.log('👥 Carregando usuários...');
    
    try {
        // Tenta primeiro do banco LOGINS
        if (window.dbLogins) {
            //console.log('📊 Buscando usuários no banco LOGINS...');
            
            // Acessar o documento LOGINS_ORGTAREFAS no banco LOGINS
            const docRef = window.dbLogins.collection('logins').doc('LOGINS_ORGTAREFAS');
            const docSnap = await docRef.get();
            
            // CORREÇÃO: Usar propriedade exists, não método
            if (docSnap.exists) {  // <-- ALTERADO AQUI
                const dadosCompletos = docSnap.data();
                //console.log('✅ Documento LOGINS_ORGTAREFAS carregado do banco LOGINS');
                
                // Processar usuários da estrutura LOGINS_ORGTAREFAS
                usuarios = [];
                
                Object.keys(dadosCompletos).forEach(key => {
                    // Verificar se é um campo userX_uid
                    if (key.startsWith('user') && (key.includes('_uid') || /\d/.test(key))) {
                        const userData = dadosCompletos[key];
                        
                        if (userData && userData.login) {
                            usuarios.push({
                                id: key,
                                usuario: userData.login,
                                nome: userData.displayName || userData.login,
                                displayName: userData.displayName || userData.login,
                                perfil: userData.perfil || '',
                                status: userData.status || 'ativo',
                                isOnline: userData.isOnline || false,
                                email: userData.email || ''
                            });
                        }
                    }
                });
                
                //console.log('✅ Usuários carregados do LOGINS:', usuarios.length);
                
            } else {
                //console.log('❌ Documento LOGINS_ORGTAREFAS não encontrado no banco LOGINS');
                // NÃO tentar fallback para ORGTAREFAS
                usuarios = [];
            }
        } else {
            //console.log('❌ Banco LOGINS não disponível');
            usuarios = [];
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar usuários do LOGINS:', error);
        // NÃO tentar fallback para ORGTAREFAS
        usuarios = [];
    }
    
    // AGORA CARREGAR OS GRUPOS DO USUÁRIO LOGADO
    await carregarGruposDoUsuarioLogado();
    
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
}

function configurarFirebase() {
    //console.log('📡 Configurando listener do Firestore...');
    document.getElementById('loadingText').textContent = 'Carregando tarefas...';
    
    // Listener em tempo real para tarefas
    db.collection("tarefas")
        .orderBy("dataCriacao", "desc")
        .onSnapshot(
            async (snapshot) => {
                //console.log('📊 Dados recebidos:', snapshot.size, 'tarefas');
                tarefas = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                await carregarAtividadesParaTodasTarefas();
                
                document.getElementById('loadingScreen').style.display = 'none';
                document.getElementById('mainContent').style.display = 'block';
                document.getElementById('status-sincronizacao').innerHTML = '<i class="fas fa-check-circle"></i> Conectado';
                
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

    // Listener para atividades - QUANDO ATIVIDADES MUDAM, ATUALIZAR STATUS DAS TAREFAS
    db.collection("atividades")
        .onSnapshot((snapshot) => {
            //console.log('🔄 Atualização de atividades - Total de documentos:', snapshot.size);
            
            const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
            if (!usuarioLogado) return;
            
            // Para CADA mudança em atividade, atualizar status da tarefa correspondente
            snapshot.docChanges().forEach(change => {
                //console.log(`📝 Mudança tipo: ${change.type} - ID: ${change.doc.id}`);
                
                // Se for qualquer tipo de mudança (adicionada, modificada ou removida)
                if (change.type === 'added' || change.type === 'modified' || change.type === 'removed') {
                    const atividade = change.doc.data();
                    const tarefaId = atividade.tarefaId;
                    
                    if (tarefaId) {
                        // ✅ ATUALIZAR STATUS DA TAREFA quando atividade muda
                        setTimeout(() => {
                            atualizarStatusTarefa(tarefaId);
                        }, 800);
                    }
                }
                
                // Código existente para alertas de observadores
                if (change.type === 'modified') {
                    const novaAtividade = change.doc.data();
                    
                    if (change.doc._previousData) {
                        const atividadeAntiga = change.doc._previousData;
                        
                        // Verificar se houve mudança de status
                        const statusAntigo = atividadeAntiga.status || 'nao_iniciado';
                        const statusNovo = novaAtividade.status || 'nao_iniciado';
                        
                        if (statusAntigo !== statusNovo) {
                            // Gerar alertas para os observadores
                            gerarAlertaParaObservadores(change.doc.id, novaAtividade, atividadeAntiga);
                        }
                    }
                }
            });
            
            // Verificar alertas após mudanças
            setTimeout(() => {
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
        //console.log(`🔔 GERAR ALERTA: Atividade ${atividadeId}`);
        //console.log(`📊 Status anterior: ${atividadeAntiga.status || 'não definido'}`);
        //console.log(`📊 Status novo: ${novaAtividade.status || 'não definido'}`);
        
        // Verificar se realmente houve mudança
        const statusAntigo = atividadeAntiga.status || 'nao_iniciado';
        const statusNovo = novaAtividade.status || 'nao_iniciado';
        
        if (statusAntigo === statusNovo) {
            //console.log('ℹ️ Sem mudança real de status, ignorando');
            return;
        }
        
        // Verificar se há observadores
        const observadores = novaAtividade.observadores || [];
        
        if (observadores.length === 0) {
            //console.log('ℹ️ Atividade não tem observadores');
            return;
        }
        
        //console.log(`👥 Observadores encontrados:`, observadores);
        
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
        
        //console.log(`✅ Asteriscos adicionados aos observadores`);
        
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
            //console.log(`ℹ️ Usuário ${usuarioAtual} não é observador desta atividade`);
            return;
        }
        
        //console.log(`✅ Usuário ${usuarioAtual} É observador desta atividade`);
        
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
        
        //console.log(`✅ Alerta criado: ${statusAntigo} → ${statusNovo}`);
        //console.log(`📊 Total de alertas: ${alertasObservador.length}`);
        
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
    //console.log('🔍 Forçando verificação de alertas...');
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!usuarioLogado) return;
    
    const usuarioAtual = usuarioLogado.usuario;
    
    await verificarAlertasObservador(usuarioAtual);
    await verificarAlertasResponsavel(usuarioAtual);
    atualizarContadoresAlertas();
    
    //console.log('✅ Verificação forçada concluída');
}

// Torna a função global
window.forcarVerificacaoAlertas = forcarVerificacaoAlertas;

// Listener específico para detectar quando observadores são atualizados
function configurarListenerObservadores() {
    //console.log('👁️ Configurando listener para observadores...');
    
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
                        //console.log(`👥 Observadores alterados na atividade ${change.doc.id}`);
                        
                        // Verificar se o asterisco foi adicionado/removido para este usuário
                        const tinhaAsteriscoAntes = obsAntigos.includes(usuarioAtual + '*');
                        const temAsteriscoAgora = obsNovos.includes(usuarioAtual + '*');
                        
                        if (!tinhaAsteriscoAntes && temAsteriscoAgora) {
                            //console.log(`⭐ NOVO ASTERISCO para ${usuarioAtual}`);
                            // Forçar verificação completa
                            setTimeout(() => {
                                verificarAlertasObservador(usuarioAtual);
                            }, 1000);
                        }
                    }
                    
                    // Verificar também se o status mudou (para garantir)
                    if (atividadeAntiga.status !== novaAtividade.status) {
                        //console.log(`🔄 Status alterado: ${atividadeAntiga.status} → ${novaAtividade.status}`);
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
    try {
        const snapshot = await db.collection("atividades").get();
        const todasAtividades = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

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

        // ORDENAR atividades dentro de cada tarefa (opcional)
        Object.keys(atividadesPorTarefa).forEach(tarefaId => {
            atividadesPorTarefa[tarefaId] = ordenarAtividadesPorTipo(atividadesPorTarefa[tarefaId]);
        });

        // ✅ ATUALIZAR O STATUS DAS TAREFAS COM BASE NAS ATIVIDADES
        await atualizarStatusTodasTarefas();

    } catch (error) {
        console.error('❌ Erro ao carregar atividades:', error);
    }
}

// ========== FUNÇÕES DE ALERTAS ==========

// Função para verificar alertas
async function verificarAlertas() {
    //console.log('🔔 Verificando alertas...');
    
    const isHomePage = window.location.pathname.includes('index.html') || 
                      window.location.pathname.endsWith('/');
    
    if (!isHomePage) {
        //console.log('⏸️ Não é página Home - Pulando verificação de alertas');
        return;
    }
    
    try {
        const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
        if (!usuarioLogado) return;
        
        const usuarioAtual = usuarioLogado.usuario;
        
        //console.log('🔄 Iniciando verificação completa de alertas...');
        
        
        // Verificar alertas de observador
        await verificarAlertasObservador(usuarioAtual);
        
        // Verificar alertas de responsável
        await verificarAlertasResponsavel(usuarioAtual);
        
        // Atualizar interface
        atualizarContadoresAlertas();
        
        // DEBUG: Mostrar estado atual dos alertas
        //console.log(`📊 Alertas estado: ${alertasObservador.length} observador, ${alertasResponsavel.length} responsável`);
        
        // Verificar novamente em 30 segundos
        setTimeout(verificarAlertas, 30000);
        
    } catch (error) {
        console.error('❌ Erro ao verificar alertas:', error);
    }
}

// Função para verificar alertas de observador
async function verificarAlertasObservador(usuarioAtual) {
    try {
        //console.log(`🔍 Buscando alertas para observador: ${usuarioAtual}`);
        
        // Buscar atividades onde o usuário é observador COM asterisco
        const snapshot = await db.collection('atividades')
            .where('observadores', 'array-contains', usuarioAtual + '*')
            .get();
        
        //console.log(`📊 Atividades com asterisco: ${snapshot.docs.length}`);
        
        // DEBUG: Mostrar o que foi encontrado
        snapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            //console.log(`${index + 1}. ${data.titulo || 'Sem título'} (${doc.id})`);
            //console.log(`   Status: ${data.status} | StatusAnterior: ${data.statusAnterior}`);
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
        
        //console.log(`⚠️ ${atividadesComAlerta.length} atividades com alertas não vistos`);
        
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
            //console.log(`✅ Alerta criado: ${alerta.titulo} (${statusAnterior} → ${statusAtual})`);
        }
        
        // Atualizar interface
        atualizarContadoresAlertas();
        
    } catch (error) {
        console.error('❌ Erro em alertas de observador:', error);
    }
}

// Função de debug para verificar estado dos observadores
async function debugObservadores() {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!usuarioLogado) return;
    
    const usuarioAtual = usuarioLogado.usuario;
    
    //console.log('🔍 DEBUG - Estado dos observadores para:', usuarioAtual);
    
    try {
        // Buscar todas as atividades
        const snapshot = await db.collection('atividades').get();
        
        //console.log('📊 Todas as atividades:', snapshot.docs.length);
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const observadores = data.observadores || [];
            
            // Verificar se o usuário é observador
            const isObservador = observadores.some(obs => {
                const obsSemAsterisco = obs.endsWith('*') ? obs.slice(0, -1) : obs;
                return obsSemAsterisco === usuarioAtual;
            });
            
            if (isObservador) {
                //console.log(`\n📋 Atividade: ${data.titulo || 'Sem título'} (${doc.id})`);
                //console.log(`   Observadores:`, observadores);
                //console.log(`   Tem "*" para ${usuarioAtual}?: ${observadores.includes(usuarioAtual + '*') ? 'SIM' : 'NÃO'}`);
                //console.log(`   Status: ${data.status || 'não definido'}`);
                //console.log(`   StatusAnterior: ${data.statusAnterior || 'não definido'}`);
                //console.log(`   Diferentes?: ${data.status !== data.statusAnterior ? 'SIM' : 'NÃO'}`);
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
    //console.log('🧹 Cache de alertas limpo');
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
        
        //console.log(`👤 Usuário é responsável por ${atividadesComoResponsavel.length} atividades`);
        
        // FILTRAR APENAS STATUS "pendente"
        const atividadesPendentes = atividadesComoResponsavel.filter(atividade => {
            const status = (atividade.status || '').toLowerCase().trim();
            return status === 'pendente';
        });
        
        //console.log(`⏰ ${atividadesPendentes.length} atividades pendentes`);
        
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
    //console.log(`🔢 Contadores: Observador=${naoLidosObservador}, Responsável=${naoLidosResponsavel}`);
    
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
    
    //console.log('✅ Contadores atualizados');
}

// Função para abrir dropdown de alertas de observador
function abrirAlertasObservador() {
    // VERIFICAR SE ESTAMOS NA PÁGINA HOME
    const isHomePage = window.location.pathname.includes('index.html') || 
                      window.location.pathname.endsWith('/');
    
    if (!isHomePage) {
        //console.log('⚠️ Função disponível apenas na página Home');
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


// Função para abrir dropdown de alertas de responsável
function abrirAlertasResponsavel() {
    // VERIFICAR SE ESTAMOS NA PÁGINA HOME
    const isHomePage = window.location.pathname.includes('index.html') || 
                      window.location.pathname.endsWith('/');
    
    if (!isHomePage) {
        //console.log('⚠️ Função disponível apenas na página Home');
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
                    <button class="btn-go-to-activity" onclick="irParaAtividade('${alerta.atividadeId}')">
                        <i class="fas fa-external-link-alt"></i> Ver Atividade
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
    
    //console.log('🚀 Verificação inicial de alertas...');
    
    // Aguardar 3 segundos para garantir que tudo carregou
    setTimeout(async () => {
        await verificarAlertasObservador(usuarioAtual);
        await verificarAlertasResponsavel(usuarioAtual);
        atualizarContadoresAlertas();
        
        //console.log('✅ Verificação inicial concluída');
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
                    
                    //console.log(`✅ Asterisco removido para ${alerta.observador} na atividade ${alerta.atividadeId}`);
                    
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
    const tituloOriginal = extrairTituloSemGrupos(tarefa.titulo, tarefa.gruposAcesso, tarefa.programaId);
    
    // Preencher os campos do formulário
    document.getElementById('tarefaTitulo').value = tituloOriginal;
    document.getElementById('tarefaDescricao').value = tarefa.descricao || '';
    document.getElementById('tarefaPrioridade').value = tarefa.prioridade;
    document.getElementById('tarefaDataInicio').value = tarefa.dataInicio || '';
    document.getElementById('tarefaDataFim').value = tarefa.dataFim;
    
    // Preencher programa
    const selectProgramas = document.getElementById('tarefaPrograma');
    if (selectProgramas) {
        selectProgramas.value = tarefa.programaId || '';
    }
    
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
    
    // Armazenar programa atual para verificar mudanças
    editandoTarefaId = tarefaId;
    editandoProgramaId = tarefa.programaId; // ← Adicione esta linha
    
    console.log('📝 Formulário preenchido:', {
        tituloOriginal: tituloOriginal,
        programaId: tarefa.programaId,
        programaNome: obterNomePrograma(tarefa.programaId),
        gruposAcesso: tarefa.gruposAcesso,
        nomesGrupos: obterNomesTodosGrupos(tarefa.gruposAcesso),
        tituloCompleto: tarefa.titulo
    });
}

// FUNÇÃO AUXILIAR: Extrair título sem os grupos e programa (para formulário de edição)
function extrairTituloSemGrupos(tituloCompleto, gruposIds, programaId = null) {
    if (!tituloCompleto) return '';
    
    const nomePrograma = programaId ? obterNomePrograma(programaId) : '';
    const nomesGrupos = gruposIds && Array.isArray(gruposIds) && gruposIds.length > 0 ? 
        obterNomesTodosGrupos(gruposIds) : '';
    
    console.log('🔍 Extraindo título sem prefixos:', {
        tituloCompleto,
        nomePrograma,
        nomesGrupos
    });
    
    let tituloLimpo = tituloCompleto;
    
    // Tentar remover todos os padrões possíveis
    
    // Padrão 1: "Programa - Tarefa - Grupos"
    if (nomePrograma && nomesGrupos) {
        const padrao1 = `${nomePrograma} - ${nomesGrupos} - `;
        const padrao2 = `${nomePrograma} - ${nomesGrupos} -`;
        const padrao3 = `${nomePrograma} -  - ${nomesGrupos}`;
        
        if (tituloCompleto.startsWith(padrao1)) {
            tituloLimpo = tituloCompleto.substring(padrao1.length);
        } else if (tituloCompleto.startsWith(padrao2)) {
            tituloLimpo = tituloCompleto.substring(padrao2.length);
        } else if (tituloCompleto.includes(padrao3)) {
            // Se houver espaço extra entre os traços
            const match = tituloCompleto.match(new RegExp(`^${nomePrograma.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} - (.*?) - ${nomesGrupos.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
            if (match) tituloLimpo = match[1];
        }
    }
    
    // Padrão 2: "Programa - Tarefa" (sem grupos no título)
    if (nomePrograma && tituloLimpo === tituloCompleto) {
        const padrao = `${nomePrograma} - `;
        if (tituloCompleto.startsWith(padrao)) {
            tituloLimpo = tituloCompleto.substring(padrao.length);
        }
    }
    
    // Padrão 3: "Tarefa - Grupos" (apenas grupos, sem programa)
    if (!nomePrograma && nomesGrupos && tituloLimpo === tituloCompleto) {
        const padrao = ` - ${nomesGrupos}`;
        if (tituloCompleto.endsWith(padrao)) {
            tituloLimpo = tituloCompleto.substring(0, tituloCompleto.length - padrao.length);
        }
    }
    
    // Padrão 4: "Grupos - Tarefa" (formato antigo - para compatibilidade)
    if (!nomePrograma && nomesGrupos && tituloLimpo === tituloCompleto) {
        const padrao = `${nomesGrupos} - `;
        if (tituloCompleto.startsWith(padrao)) {
            tituloLimpo = tituloCompleto.substring(padrao.length);
        }
    }
    
    // Se ainda não limpou, tentar remover qualquer coisa que comece com " - " ou termine com " - "
    if (tituloLimpo === tituloCompleto) {
        // Remover prefixos que começam com "X - "
        const prefixMatch = tituloCompleto.match(/^([^-]+ - )(.*)$/);
        if (prefixMatch) {
            tituloLimpo = prefixMatch[2];
        }
        
        // Remover sufixos que terminam com " - X"
        const suffixMatch = tituloLimpo.match(/^(.*)( - [^-]+)$/);
        if (suffixMatch) {
            tituloLimpo = suffixMatch[1];
        }
    }
    
    // Limpar espaços extras
    tituloLimpo = tituloLimpo.trim();
    
    console.log('✅ Título limpo:', tituloLimpo);
    return tituloLimpo;
}

// FUNÇÃO: Obter nome do programa pelo ID
function obterNomePrograma(programaId) {
    if (!programaId) return '';
    
    const programa = programas.find(p => p.id === programaId);
    // Retorna 'titulo' (conforme sua estrutura) ou 'nome' como fallback
    return programa ? (programa.titulo || programa.nome || '') : '';
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
    
    // Resetar programa para "Nenhum"
    const selectProgramas = document.getElementById('tarefaPrograma');
    if (selectProgramas) {
        selectProgramas.value = '';
    }
    
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

// Função para atualizar array de tarefas_relacionadas no programa (OPCIONAL)
async function atualizarTarefasRelacionadasNoPrograma(programaId, tarefaId) {
    try {
        if (!programaId) return; // Se não tem programa, não faz nada
        
        const programaRef = db.collection("programas").doc(programaId);
        const programaDoc = await programaRef.get();
        
        if (!programaDoc.exists) {
            console.warn('⚠️ Programa não encontrado:', programaId);
            return;
        }
        
        const programaData = programaDoc.data();
        const tarefasRelacionadas = programaData.tarefas_relacionadas || [];
        
        // Adicionar tarefaId se ainda não estiver na lista
        if (!tarefasRelacionadas.includes(tarefaId)) {
            tarefasRelacionadas.push(tarefaId);
            
            await programaRef.update({
                tarefas_relacionadas: tarefasRelacionadas,
                dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`✅ Tarefa ${tarefaId} adicionada às tarefas_relacionadas do programa ${programaId}`);
        }
        
    } catch (error) {
        console.error('❌ Erro ao atualizar tarefas_relacionadas do programa:', error);
    }
}


async function salvarTarefa() {
    console.log('💾 Salvando tarefa...');
    
    // Obter programa selecionado
    const programaSelect = document.getElementById('tarefaPrograma');
    const novoProgramaId = programaSelect ? programaSelect.value : '';
    
    // Obter grupos selecionados
    const gruposSelect = document.getElementById('tarefaGrupos');
    const gruposSelecionados = Array.from(gruposSelect.selectedOptions)
        .map(option => option.value)
        .filter(value => value !== '');
    
    if (gruposSelecionados.length === 0) {
        mostrarNotificacao('Selecione pelo menos um grupo para a tarefa!', 'error');
        return;
    }
    
    // Obter nomes dos elementos
    const nomePrograma = obterNomePrograma(novoProgramaId);
    const nomesTodosGrupos = obterNomesTodosGrupos(gruposSelecionados);
    const tituloDigitado = document.getElementById('tarefaTitulo').value.trim();
    
    if (!tituloDigitado) {
        mostrarNotificacao('Digite um título para a tarefa!', 'error');
        return;
    }
    
    // ✅ Criar título com a ordem sempre correta
    let tituloCompleto = '';
    
    if (nomePrograma && nomesTodosGrupos) {
        // 1. COM PROGRAMA E GRUPOS: "Programa - Tarefa - Grupos"
        tituloCompleto = `${nomePrograma} - ${tituloDigitado} - ${nomesTodosGrupos}`;
    } else if (nomePrograma) {
        // 2. APENAS COM PROGRAMA: "Programa - Tarefa"
        tituloCompleto = `${nomePrograma} - ${tituloDigitado}`;
    } else if (nomesTodosGrupos) {
        // 3. APENAS COM GRUPOS: "Tarefa - Grupos" (INVERTIDO)
        tituloCompleto = `${tituloDigitado} - ${nomesTodosGrupos}`;
    } else {
        // 4. SEM PROGRAMA NEM GRUPOS (não deveria acontecer, mas previne erro)
        tituloCompleto = tituloDigitado;
    }
    
    console.log('📝 Formatando título:', {
        nomePrograma,
        tituloDigitado,
        nomesTodosGrupos,
        tituloCompleto
    });
    
    // Preparar objeto tarefa
    const tarefa = {
        titulo: tituloCompleto,
        descricao: document.getElementById('tarefaDescricao').value || '',
        prioridade: document.getElementById('tarefaPrioridade').value,
        dataInicio: document.getElementById('tarefaDataInicio').value || null,
        dataFim: document.getElementById('tarefaDataFim').value,
        programaId: novoProgramaId || null, // Campo do programa
        gruposAcesso: gruposSelecionados,
        dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        let tarefaId = editandoTarefaId;
        
        if (modoEdicao && editandoTarefaId) {
            // ✏️ Editando tarefa existente
            
            // ✅ 1. Se mudou de programa, remover do programa antigo
            if (editandoProgramaId && editandoProgramaId !== novoProgramaId) {
                console.log(`🔄 Mudando tarefa ${editandoTarefaId} do programa ${editandoProgramaId} para ${novoProgramaId}`);
                await removerTarefaDePrograma(editandoProgramaId, editandoTarefaId);
            }
            
            // ✅ 2. Se removeu o programa, remover do programa antigo
            if (editandoProgramaId && !novoProgramaId) {
                console.log(`🔄 Removendo tarefa ${editandoTarefaId} do programa ${editandoProgramaId}`);
                await removerTarefaDePrograma(editandoProgramaId, editandoTarefaId);
            }
            
            // 3. Atualizar a tarefa no Firestore
            await db.collection("tarefas").doc(editandoTarefaId).update(tarefa);
            tarefaId = editandoTarefaId;
            
            console.log(`✅ Tarefa ${editandoTarefaId} atualizada`);
            
        } else {
            // 🆕 Criando nova tarefa
            const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
            
            // Para nova tarefa, pode definir como "nao_iniciado" inicialmente
            const novaTarefa = {
                ...tarefa,
                status: 'nao_iniciado', // Status inicial
                dataCriacao: firebase.firestore.FieldValue.serverTimestamp(),
                criadoPor: usuarioLogado.usuario
            };
            
            const tarefaRef = await db.collection("tarefas").add(novaTarefa);
            tarefaId = tarefaRef.id;
            
            console.log(`✅ Nova tarefa criada: ${tarefaId}`);
        }
        
        // ✅ 4. Se tem um programa novo, adicionar ao array de tarefas_relacionadas
        if (novoProgramaId && tarefaId) {
            console.log(`🔄 Adicionando tarefa ${tarefaId} ao programa ${novoProgramaId}`);
            await atualizarTarefasRelacionadasNoPrograma(novoProgramaId, tarefaId);
        }
        
        // 5. Limpar estados de edição
        editandoProgramaId = null;
        
        // 6. Fechar modal e mostrar mensagem
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
        // Primeiro, remover de todos os programas que referenciam esta tarefa
        const tarefa = tarefas.find(t => t.id === tarefaId);
        if (tarefa && tarefa.programaId) {
            await removerTarefaDePrograma(tarefa.programaId, tarefaId);
        }
        
        await db.collection("tarefas").doc(tarefaId).delete();
        mostrarNotificacao('Tarefa excluída com sucesso!', 'success');
    } catch (error) {
        console.error('❌ Erro ao excluir tarefa:', error);
        mostrarNotificacao('Erro ao excluir tarefa', 'error');
    }
}

// Função para remover tarefa do array de tarefas_relacionadas do programa
async function removerTarefaDePrograma(programaId, tarefaId) {
    try {
        if (!programaId) return; // Se não tem programa, não faz nada
        
        console.log(`🔄 Removendo tarefa ${tarefaId} do programa ${programaId}`);
        
        const programaRef = db.collection("programas").doc(programaId);
        const programaDoc = await programaRef.get();
        
        if (!programaDoc.exists) {
            console.warn('⚠️ Programa não encontrado:', programaId);
            return;
        }
        
        const programaData = programaDoc.data();
        let tarefasRelacionadas = programaData.tarefas_relacionadas || [];
        
        // Filtrar para remover a tarefaId
        const novasTarefasRelacionadas = tarefasRelacionadas.filter(id => id !== tarefaId);
        
        // Se a lista mudou, atualizar
        if (tarefasRelacionadas.length !== novasTarefasRelacionadas.length) {
            await programaRef.update({
                tarefas_relacionadas: novasTarefasRelacionadas,
                dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`✅ Tarefa ${tarefaId} removida das tarefas_relacionadas do programa ${programaId}`);
        }
        
    } catch (error) {
        console.error('❌ Erro ao remover tarefa do programa:', error);
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
    //console.log('Texto da atividade atualizado:', texto);
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
    
    // Contar por status (usando a mesma lógica de normalização da função determinarStatusTarefaPorAtividades)
    let total = 0;
    let naoiniciadas = 0;
    let pendentes = 0;
    let andamento = 0;
    let concluidas = 0;
    
    tarefasVisiveis.forEach(tarefa => {
        const status = (tarefa.status || 'nao_iniciado').toLowerCase().trim();
        
        // Usar a mesma lógica da função determinarStatusTarefaPorAtividades
        if (status === 'nao_iniciado' || status === 'não iniciado' || status === 'nao-iniciado') {
            naoiniciadas++;
        } 
        else if (status === 'pendente') {
            pendentes++;
        }
        else if (status === 'andamento' || status === 'em andamento' || status === 'em_andamento') {
            andamento++;
        }
        else if (status === 'concluido' || status === 'concluído' || status === 'concluido') {
            concluidas++;
        }
        else {
            // Se não reconhecer, considera como não iniciado
            naoiniciadas++;
        }
        
        total++;
    });

    // DEBUG: Mostrar contagem (descomente para testar)
    // console.log('📊 Estatísticas:', {
    //     total,
    //     naoiniciadas,
    //     pendentes,
    //     andamento,
    //     concluidas
    // });

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
            
            // Adicionar tooltip com a contagem
            elemento.title = `${elementos[id]} ${id.replace('tarefas-', '').replace('-', ' ')}`;
        }
    });
}

function atualizarListaTarefas() {
    const container = document.getElementById('lista-tarefas');
    if (!container) {
        console.error('❌ Container de tarefas não encontrado!');
        return;
    }
    
    console.log('📊 Atualizando lista de tarefas...');
    console.log(`📋 Total de tarefas disponíveis: ${tarefas.length}`);
    
    // Obter usuário logado
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    const usuarioGrupos = usuarioLogado?.grupos || [];
    
    console.log(`👤 Usuário logado: ${usuarioLogado?.usuario}`);
    console.log(`👥 Grupos do usuário: ${usuarioGrupos.length} grupos`, usuarioGrupos);
    
    // DEBUG: Listar todas as tarefas disponíveis
    console.log('🔍 Todas as tarefas disponíveis no sistema:');
    tarefas.forEach((tarefa, index) => {
        console.log(`${index + 1}. ${tarefa.titulo} | Programa: ${tarefa.programaId || 'Nenhum'} | Grupos: ${JSON.stringify(tarefa.gruposAcesso)} | Status: ${tarefa.status}`);
    });
    
    // Filtrar tarefas baseado no usuário logado
    const tarefasFiltradasPorGrupo = tarefas.filter(tarefa => {
        // DEBUG: Mostrar verificação para cada tarefa
        console.log(`\n🔍 Verificando tarefa: ${tarefa.titulo}`);
        console.log(`   Programa: ${tarefa.programaId || 'Nenhum'}`);
        console.log(`   Grupos da tarefa: ${JSON.stringify(tarefa.gruposAcesso)}`);
        
        // Se a tarefa não tem grupos definidos, mostra para todos
        if (!tarefa.gruposAcesso || !Array.isArray(tarefa.gruposAcesso) || tarefa.gruposAcesso.length === 0) {
            console.log(`   ✅ MOSTRAR: Tarefa sem grupos definidos (mostra para todos)`);
            return true;
        }
        
        // Verifica se usuário pertence a algum dos grupos da tarefa
        const temAcesso = tarefa.gruposAcesso.some(grupoId => 
            usuarioGrupos.includes(grupoId)
        );
        
        console.log(`   ${temAcesso ? '✅ MOSTRAR' : '❌ OCULTAR'}: Usuário ${temAcesso ? 'tem' : 'NÃO tem'} acesso`);
        
        return temAcesso;
    });
    
    console.log(`📊 Tarefas após filtro de grupos: ${tarefasFiltradasPorGrupo.length}`);
    
    // Aplicar outros filtros (busca, status, etc.)
    const tarefasFiltradas = filtrarTarefas(tarefasFiltradasPorGrupo);
    
    console.log(`📊 Tarefas após todos os filtros: ${tarefasFiltradas.length}`);
    
    // ====== DESTACAR FILTRO ATIVO NAS ESTATÍSTICAS ======
    // Obter status do filtro ativo
    const filterStatus = document.getElementById('filterStatus');
    const statusAtivo = filterStatus ? filterStatus.value : '';
    
    // Remover destaque de todos os cards de estatística
    document.querySelectorAll('.stat-card').forEach(card => {
        card.classList.remove('active-filter', 'other-filter');
    });
    
    // Destacar o card correspondente ao filtro ativo
    let filtroAtivoLabel = '';
    
    if (statusAtivo) {
        let cardId = '';
        switch(statusAtivo) {
            case 'nao_iniciado':
                cardId = 'tarefas-naoiniciadas';
                filtroAtivoLabel = 'Não Iniciadas';
                break;
            case 'pendente':
                cardId = 'tarefas-pendentes';
                filtroAtivoLabel = 'Pendentes';
                break;
            case 'andamento':
                cardId = 'tarefas-andamento';
                filtroAtivoLabel = 'Em Andamento';
                break;
            case 'concluido':
                cardId = 'tarefas-concluidas';
                filtroAtivoLabel = 'Concluídas';
                break;
        }
        
        if (cardId) {
            const card = document.getElementById(cardId);
            if (card) {
                const cardElement = card.closest('.stat-card');
                cardElement.classList.add('active-filter');
            }
        }
    } else {
        // Se nenhum filtro ativo ou filtro "todos", destacar total
        const card = document.getElementById('total-tarefas');
        if (card) {
            const cardElement = card.closest('.stat-card');
            cardElement.classList.add('active-filter');
            filtroAtivoLabel = 'Total';
        }
    }
    
    // Verificar outros filtros ativos (busca, prioridade, responsável)
    const searchInput = document.getElementById('searchInput');
    const filterPrioridade = document.getElementById('filterPrioridade');
    const filterResponsavel = document.getElementById('filterResponsavel');
    
    const buscaAtiva = searchInput && searchInput.value.trim() !== '';
    const prioridadeAtiva = filterPrioridade && filterPrioridade.value !== '';
    const responsavelAtivo = filterResponsavel && filterResponsavel.value !== '';
    
    // Se houver outros filtros além do status, adicionar classe especial
    if (buscaAtiva || prioridadeAtiva || responsavelAtivo) {
        const totalElement = document.getElementById('total-tarefas');
        if (totalElement) {
            const cardElement = totalElement.closest('.stat-card');
            cardElement.classList.add('other-filter');
        }
    }
    
    // Se não houver tarefas, mostrar mensagem
    if (tarefasFiltradas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks"></i>
                <h3>Nenhuma tarefa encontrada</h3>
                <p>${filtroAtivoLabel ? `Com filtro: ${filtroAtivoLabel}` : 'Clique em "Nova Tarefa" para começar'}</p>
                <small style="margin-top: 10px; color: #666;">
                    ${buscaAtiva ? `Busca: "${searchInput.value}"<br>` : ''}
                    ${prioridadeAtiva ? `Prioridade: ${filterPrioridade.options[filterPrioridade.selectedIndex].text}<br>` : ''}
                    ${responsavelAtivo ? `Responsável: ${filterResponsavel.options[filterResponsavel.selectedIndex].text}<br>` : ''}
                    Usuário: ${usuarioLogado?.usuario}<br>
                    Grupos: ${usuarioGrupos.join(', ') || 'Nenhum grupo definido'}
                </small>
            </div>
        `;
        return;
    }

    // Renderizar tarefas
    console.log('🎨 Renderizando tarefas...');
    
    container.innerHTML = tarefasFiltradas.map(tarefa => {
        console.log(`   Renderizando: ${tarefa.titulo}`);
        
        // Adicionar informação do programa se houver
        let programaInfo = '';
        if (tarefa.programaId) {
            const programa = programas.find(p => p.id === tarefa.programaId);
            if (programa) {
                programaInfo = `
                    <div class="programa-tarefa">
                        <i class="fas fa-project-diagram"></i>
                        <span class="programa-nome">${programa.titulo || 'Programa'}</span>
                    </div>
                `;
            }
        }
        
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
            const atividadesConcluidas = atividadesDaTarefa.filter(a => {
                const status = (a.status || '').toLowerCase().trim();
                return status === 'concluido' || status === 'concluído';
            }).length;
            
            atividadesHTML = `
                <div class="atividades-sistema">
                    <div class="atividades-header">
                        <i class="fas fa-list-check"></i>
                        <strong>Atividades da Tarefa (${atividadesConcluidas}/${atividadesDaTarefa.length}):</strong>
                    </div>
                    <div class="atividades-lista">
                        ${atividadesDaTarefa.map((atividade, index) => {
                            const isConcluida = atividade.status && 
                                               ((atividade.status.toLowerCase() === 'concluido') || 
                                                (atividade.status.toLowerCase() === 'concluído'));
                            
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
        <div class="task-card prioridade-${tarefa.prioridade} ${tarefa.programaId ? 'has-programa' : ''}">
            <div class="task-header">
                <div>
                    <div class="task-title">${tarefa.titulo}</div>
                    ${tarefa.descricao ? `<div class="task-desc">${tarefa.descricao}</div>` : ''}
                    ${programaInfo}
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
    
    console.log('✅ Lista de tarefas renderizada!');
}

// Função para testar a formatação do título
window.testarFormatacaoTitulo = function(programaId = '', titulo = 'Minha Tarefa', gruposIds = []) {
    const nomePrograma = programaId ? obterNomePrograma(programaId) : '';
    const nomesGrupos = gruposIds.length > 0 ? obterNomesTodosGrupos(gruposIds) : '';
    
    console.log('🧪 TESTE DE FORMATAÇÃO:');
    console.log('=====================');
    console.log('Programa:', nomePrograma);
    console.log('Título:', titulo);
    console.log('Grupos:', nomesGrupos);
    
    let tituloFormatado = '';
    
    if (nomePrograma && nomesGrupos) {
        tituloFormatado = `${nomePrograma} - ${titulo} - ${nomesGrupos}`;
        console.log('📝 Formato 1 (Programa + Tarefa + Grupos):', tituloFormatado);
    } else if (nomePrograma) {
        tituloFormatado = `${nomePrograma} - ${titulo}`;
        console.log('📝 Formato 2 (Programa + Tarefa):', tituloFormatado);
    } else if (nomesGrupos) {
        tituloFormatado = `${titulo} - ${nomesGrupos}`;
        console.log('📝 Formato 3 (Tarefa + Grupos):', tituloFormatado);
    } else {
        tituloFormatado = titulo;
        console.log('📝 Formato 4 (Apenas Tarefa):', tituloFormatado);
    }
    
    return tituloFormatado;
};

// Função para debug dos programas
window.debugProgramas = function() {
    console.log('🔍 DEBUG - Programas');
    console.log('===================');
    console.log(`Total de programas: ${programas.length}`);
    
    programas.forEach((programa, index) => {
        console.log(`\n${index + 1}. ${programa.titulo || 'Sem título'} (ID: ${programa.id})`);
        console.log(`   Descrição: ${programa.descricao || 'Nenhuma'}`);
        console.log(`   Tarefas relacionadas: ${programa.tarefas_relacionadas?.length || 0}`);
        if (programa.tarefas_relacionadas?.length > 0) {
            console.log(`   IDs das tarefas:`, programa.tarefas_relacionadas);
        }
    });
    
    // Mostrar tarefas com programa
    const tarefasComPrograma = tarefas.filter(t => t.programaId);
    console.log(`\n📊 Tarefas com programa: ${tarefasComPrograma.length}/${tarefas.length}`);
    
    tarefasComPrograma.forEach((tarefa, index) => {
        const programa = programas.find(p => p.id === tarefa.programaId);
        console.log(`${index + 1}. "${tarefa.titulo.substring(0, 40)}..."`);
        console.log(`   Programa: ${programa?.titulo || 'Não encontrado'} (${tarefa.programaId})`);
    });
};

// Função de debug para testar acesso às tarefas
window.debugTarefas = function() {
    //console.log('🔍 DEBUG - Sistema de Tarefas');
    //console.log('===========================');
    
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    //console.log('👤 Usuário:', usuarioLogado?.usuario);
    //console.log('📋 Dados completos:', usuarioLogado);
    
    //console.log('\n📊 ESTATÍSTICAS:');
    //console.log(`- Total tarefas: ${tarefas.length}`);
    //console.log(`- Total grupos carregados: ${grupos.length}`);
    //console.log(`- Total atividades: ${Object.keys(atividadesPorTarefa).length} tarefas com atividades`);
    
    //console.log('\n🔍 TAREFAS DISPONÍVEIS:');
    tarefas.forEach((tarefa, index) => {
        //console.log(`${index + 1}. "${tarefa.titulo}"`);
        //console.log(`   ID: ${tarefa.id}`);
        //console.log(`   Status: ${tarefa.status}`);
        //console.log(`   Grupos: ${JSON.stringify(tarefa.gruposAcesso)}`);
        //console.log(`   Atividades: ${atividadesPorTarefa[tarefa.id]?.length || 0}`);
        //console.log('---');
    });
    
    //console.log('\n👥 GRUPOS DISPONÍVEIS:');
    grupos.forEach((grupo, index) => {
        //console.log(`${index + 1}. ${grupo.nome} (ID: ${grupo.id})`);
    });
    
    //console.log('\n🎯 VERIFICAÇÃO DE ACESSO:');
    const usuarioGrupos = usuarioLogado?.grupos || [];
    //console.log(`Usuário pertence aos grupos: ${usuarioGrupos.join(', ') || 'Nenhum'}`);
    
    tarefas.forEach((tarefa, index) => {
        let temAcesso = false;
        
        if (!tarefa.gruposAcesso || tarefa.gruposAcesso.length === 0) {
            temAcesso = true;
        } else {
            temAcesso = tarefa.gruposAcesso.some(grupoId => 
                usuarioGrupos.includes(grupoId)
            );
        }
        
        //console.log(`${index + 1}. "${tarefa.titulo.substring(0, 50)}..." - ${temAcesso ? '✅ ACESSO PERMITIDO' : '❌ SEM ACESSO'}`);
    });
};

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
        // Filtro por busca (título ou descrição)
        if (termo && !tarefa.titulo.toLowerCase().includes(termo) && 
            !(tarefa.descricao && tarefa.descricao.toLowerCase().includes(termo))) {
            return false;
        }
        
        // Filtro por status (se status for vazio, mostra todos)
        if (status && tarefa.status !== status) return false;
        
        // Filtro por prioridade (se prioridade for vazio, mostra todas)
        if (prioridade && tarefa.prioridade !== prioridade) return false;
        
        // Filtro por responsável (se responsavel for vazio, mostra todos)
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
    //console.log('🚪 Fazendo logout...');
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

//novas funções globais para headers
window.abrirAlertasObservador = abrirAlertasObservador;
window.abrirAlertasResponsavel = abrirAlertasResponsavel;
window.verificarAlertas = verificarAlertas;
window.verificarAlertasObservador = verificarAlertasObservador;
window.verificarAlertasResponsavel = verificarAlertasResponsavel;
window.atualizarContadoresAlertas = atualizarContadoresAlertas;
window.marcarAlertaComoLido = marcarAlertaComoLido;
window.irParaAtividade = irParaAtividade;
