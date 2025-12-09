// dashboard.js - VERSÃO CORRIGIDA
console.log('=== GESTOR DE ATIVIDADES INICIANDO ===');

class GestorAtividades {
    constructor() {
        this.tarefas = [];
        this.usuarios = [];
        this.usuario = null;
        this.charts = {};
        this.atividadeEditando = null;
        this.atividadesDisponiveis = [];
    }

    async init() {
        console.log('🚀 Inicializando Gestor de Atividades...');
        
        // Verificar autenticação
        await this.verificarAutenticacao();
        
        // Carregar dados PRIMEIRO
        await this.carregarDados();
        
        // Carregar atividades disponíveis para vínculos
        await this.carregarAtividadesParaVinculo();
        
        // Inicializar gráficos DEPOIS de carregar dados
        this.inicializarGraficos();
        
        // Renderizar tarefas
        this.renderizarTarefas();
        
        // Configurar listeners
        this.configurarListeners();
        
        console.log('✅ Gestor de Atividades inicializado com sucesso!');
    }

    async carregarAtividadesParaVinculo() {
        try {
            const snapshot = await db.collection('atividades').get();
            this.atividadesDisponiveis = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                tarefaNome: this.getNomeTarefa(doc.data().tarefaId)
            }));
            console.log(`✅ ${this.atividadesDisponiveis.length} atividades disponíveis para vínculo`);
        } catch (error) {
            console.error('❌ Erro ao carregar atividades para vínculo:', error);
        }
    }

    getNomeTarefa(tarefaId) {
        console.log(`🔍 Buscando nome da tarefa: ${tarefaId}`);
        const tarefa = this.tarefas.find(t => t.id === tarefaId);
        
        if (!tarefa) {
            console.log(`❌ Tarefa ${tarefaId} não encontrada na lista local`);
            return 'Tarefa não encontrada';
        }
        
        console.log(`✅ Tarefa encontrada: ${tarefa.nome}`);
        return tarefa.nome;
    }

    async verificarAutenticacao() {
        const usuarioLogado = localStorage.getItem('usuarioLogado');
        
        if (!usuarioLogado) {
            console.log('❌ Usuário não autenticado, redirecionando...');
            window.location.href = 'login.html';
            return;
        }
        
        this.usuario = JSON.parse(usuarioLogado);
        
        // Atualizar interface
        if (document.getElementById('userName')) {
            document.getElementById('userName').textContent = this.usuario.nome || this.usuario.usuario;
        }
        
        if (document.getElementById('data-atual')) {
            document.getElementById('data-atual').textContent = new Date().toLocaleDateString('pt-BR');
        }
        
        // Esconder loading e mostrar conteúdo
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
    }

    async carregarDados() {
        console.log('📊 Carregando dados do Firebase...');
        
        try {
            // Carregar usuários
            const usuariosSnapshot = await db.collection('usuarios').get();
            this.usuarios = usuariosSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(`✅ ${this.usuarios.length} usuários carregados`);

            // Carregar tarefas - IMPORTANTE: Agora da coleção 'tarefas'
            const tarefasSnapshot = await db.collection('tarefas').get();
            this.tarefas = tarefasSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(`✅ ${this.tarefas.length} tarefas carregadas da coleção 'tarefas':`, 
                this.tarefas.map(t => ({ id: t.id, nome: t.nome })));

            // Carregar atividades
            const atividadesSnapshot = await db.collection('atividades').get();
            const todasAtividades = atividadesSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    tarefaNome: this.getNomeTarefa(data.tarefaId)
                };
            });
            
            console.log(`✅ ${todasAtividades.length} atividades carregadas`);
            
            // Verificar atividades sem tarefa correspondente
            const atividadesSemTarefa = todasAtividades.filter(a => a.tarefaNome === 'Tarefa não encontrada');
            if (atividadesSemTarefa.length > 0) {
                console.warn(`⚠️ ${atividadesSemTarefa.length} atividades sem tarefa correspondente:`, 
                    atividadesSemTarefa.map(a => ({ id: a.id, tarefaId: a.tarefaId })));
            }
            
            // Agrupar atividades por tarefa
            this.tarefas.forEach(tarefa => {
                tarefa.atividades = todasAtividades.filter(a => a.tarefaId === tarefa.id);
                console.log(`📌 Tarefa "${tarefa.nome}" tem ${tarefa.atividades.length} atividades`);
            });

            // Atualizar status
            document.getElementById('status-sincronizacao').innerHTML = 
                '<i class="fas fa-check-circle"></i> Sincronizado';

        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            document.getElementById('status-sincronizacao').innerHTML = 
                '<i class="fas fa-exclamation-triangle"></i> Offline';
        }
    }

    inicializarGraficos() {
        console.log('📊 Inicializando gráficos...');
        this.inicializarGraficoStatus();
        this.inicializarGraficoProgresso();
        this.inicializarGraficoTimeline();
    }

    inicializarGraficoStatus() {
        try {
            const ctx = document.getElementById('statusChart').getContext('2d');
            const dados = this.calcularEstatisticas();
            
            console.log('Dados para gráfico de status:', dados);
            
            this.charts.status = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Não Iniciadas', 'Pendentes', 'Em Andamento', 'Concluídas', 'Atrasadas'],
                    datasets: [{
                        data: [
                            dados.naoIniciadas,
                            dados.pendentes,  
                            dados.andamento,
                            dados.concluidas,
                            dados.atrasadas
                        ],
                        backgroundColor: [
                            '#6c757d',
                            '#f39c12',
                            '#3498db',
                            '#27ae60',
                            '#e74c3c'
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
            console.log('✅ Gráfico de status inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar gráfico de status:', error);
        }
    }

    inicializarGraficoProgresso() {
        try {
            const ctx = document.getElementById('progressChart').getContext('2d');
            
            const tarefasNomes = this.tarefas.map(t => t.nome || 'Sem nome');
            const tarefasProgresso = this.tarefas.map(tarefa => {
                const atividades = tarefa.atividades || [];
                if (atividades.length === 0) return 0;
                const concluidas = atividades.filter(a => a.status === 'concluido').length;
                return (concluidas / atividades.length) * 100;
            });

            this.charts.progress = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: tarefasNomes,
                    datasets: [{
                        label: 'Progresso (%)',
                        data: tarefasProgresso,
                        backgroundColor: this.tarefas.map(t => t.cor || '#2C3E50')
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });
            console.log('✅ Gráfico de progresso inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar gráfico de progresso:', error);
        }
    }

    inicializarGraficoTimeline() {
        try {
            const ctx = document.getElementById('timelineChart').getContext('2d');
            
            // Dados de exemplo
            const ultimos7Dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
            const dadosTimeline = [5, 8, 12, 6, 15, 10, 7];

            this.charts.timeline = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ultimos7Dias,
                    datasets: [{
                        label: 'Atividades Concluídas',
                        data: dadosTimeline,
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39, 174, 96, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            console.log('✅ Gráfico de timeline inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar gráfico de timeline:', error);
        }
    }

    calcularEstatisticas() {
        let total = 0;
        let naoIniciadas = 0;
        let pendentes = 0;
        let andamento = 0;
        let concluidas = 0;
        let atrasadas = 0;
    
        this.tarefas.forEach(tarefa => {
            const atividades = tarefa.atividades || [];
            total += atividades.length;
            
            // Verificar status CORRETAMENTE
            atividades.forEach(atividade => {
                const status = atividade.status ? atividade.status.toLowerCase().trim() : '';
                
                if (status === 'nao_iniciado' || status === 'não iniciado') {
                    naoIniciadas++;
                } else if (status === 'pendente') {
                    pendentes++;
                } else if (status === 'andamento') {
                    andamento++;
                } else if (status === 'concluido' || status === 'concluído') {
                    concluidas++;
                }
            });
        });
    
        // Atualizar interface
        document.getElementById('total-atividades').textContent = total;
        document.getElementById('nao-iniciadas').textContent = naoIniciadas;
        document.getElementById('pendentes').textContent = pendentes;
        document.getElementById('andamento').textContent = andamento;
        document.getElementById('concluidas').textContent = concluidas;
        document.getElementById('atrasadas').textContent = atrasadas;
    
        return { total, naoIniciadas, pendentes, andamento, concluidas, atrasadas };
    }

    renderizarTarefas() {
        const container = document.getElementById('tarefas-container');
        
        if (this.tarefas.length === 0) {
            container.innerHTML = `
                <div class="empty-tarefas">
                    <i class="fas fa-tasks"></i>
                    <h3>Nenhuma tarefa disponível</h3>
                    <p>Crie tarefas na tela de configurações para começar</p>
                    <button class="btn btn-primary btn-sm mt-3" onclick="window.location.href='index.html'">
                        <i class="fas fa-cog"></i> Ir para Configurações
                    </button>
                </div>
            `;
            return;
        }
    
        // Salvar estado atual ANTES de re-renderizar
        manterEstadoExpansaoTarefas();
        
        container.innerHTML = this.tarefas.map(tarefa => {
            // Verificar se esta tarefa estava expandida
            const estavaExpandida = tarefasExpandidas.has(tarefa.id);
            
            return `
                <div class="task-card">
                    <div class="task-header" onclick="toggleTarefa('${tarefa.id}')">
                        <h2>
                            <i class="fas fa-tasks" style="color: ${tarefa.cor || '#2C3E50'}"></i>
                            ${tarefa.nome || 'Tarefa sem nome'}
                        </h2>
                        <div class="task-status">
                            <div class="status-badges-container">
                                ${this.getTextoStatusTarefa(tarefa)}
                            </div>
                            <i class="fas fa-chevron-${estavaExpandida ? 'up' : 'down'}"></i>
                            <!-- REMOVI os botões de ação da tarefa -->
                        </div>
                    </div>
                    <div class="task-body" id="tarefa-${tarefa.id}" style="display: ${estavaExpandida ? 'block' : 'none'};">
                        <p class="task-desc">${tarefa.descricao || 'Sem descrição'}</p>
                        <div class="activities-grid">
                            ${this.renderizarAtividadesTarefa(tarefa)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Restaurar o estado de expansão
        setTimeout(() => {
            restaurarEstadoExpansaoTarefas();
        }, 10);
    }

    calcularEstatisticasTarefa(tarefa) {
        const atividades = tarefa.atividades || [];
        const total = atividades.length;
        const naoIniciadas = atividades.filter(a => a.status === 'nao_iniciado').length;
        const pendentes = atividades.filter(a => a.status === 'pendente').length;
        const andamento = atividades.filter(a => a.status === 'andamento').length;
        const concluidas = atividades.filter(a => a.status === 'concluido').length;
        
        return {
            total,
            naoIniciadas,
            pendentes,
            andamento,
            concluidas
        };
    }
        
    renderizarAtividadesTarefa(tarefa) {
        const atividades = tarefa.atividades || [];
        
        if (atividades.length === 0) {
            return `
                <div class="empty-activities">
                    <p>Nenhuma atividade cadastrada para esta tarefa</p>
                    <button class="btn btn-primary btn-sm" onclick="abrirModalAtividade('${tarefa.id}')">
                        <i class="fas fa-plus"></i> Adicionar Atividade
                    </button>
                </div>
            `;
        }
    
        // Agrupar por tipo
        const tipos = ['execucao', 'monitoramento', 'conclusao'];
        const titulos = {
            'execucao': 'Execução das Atividades',
            'monitoramento': 'Monitoramento',
            'conclusao': 'Conclusão e Revisão'
        };
    
        return tipos.map(tipo => {
            const atividadesTipo = atividades.filter(a => a.tipo === tipo);
            
            return `
                <div class="activity-section">
                    <div class="section-header">
                        <h3><i class="fas fa-list-check"></i> ${titulos[tipo]}</h3>
                        <button class="btn btn-primary btn-sm" onclick="abrirModalAtividade('${tarefa.id}', '${tipo}')">
                            <i class="fas fa-plus"></i> Nova Atividade
                        </button>
                    </div>
                    <div class="checklist">
                        ${atividadesTipo.length > 0 ? 
                            atividadesTipo.map(atividade => {
                                const status = atividade.status || 'nao_iniciado';
                                const atividadesVinculadas = atividade.atividadesVinculadas || [];
                                const temVinculos = atividadesVinculadas.length > 0;
                                
                                const opcoesStatus = [
                                    {value: 'nao_iniciado', label: 'Não Iniciado'},
                                    {value: 'pendente', label: 'Pendente'},
                                    {value: 'andamento', label: 'Em Andamento'},
                                    {value: 'concluido', label: 'Concluído'}
                                ];
                                
                                const selectHTML = opcoesStatus.map(opcao => `
                                    <option value="${opcao.value}" ${status === opcao.value ? 'selected' : ''}>
                                        ${opcao.label}
                                    </option>
                                `).join('');
                                
                                const tituloEscapado = (atividade.titulo || '').replace(/'/g, "\\'");
                                
                                return `
                                    <div class="checklist-item ${temVinculos ? 'atividade-com-vinculos' : ''}">
                                        <div class="item-info">
                                            <div class="item-title">
                                                ${atividade.titulo}
                                                ${temVinculos ? 
                                                    `<span class="vinculos-tooltip" title="${atividadesVinculadas.length} atividade(s) vinculada(s)">
                                                        <i class="fas fa-link text-info" style="margin-left: 8px; font-size: 12px;"></i>
                                                    </span>` 
                                                    : ''
                                                }
                                            </div>
                                            ${atividade.descricao ? `<div class="item-desc">${atividade.descricao}</div>` : ''}
                                            <div class="item-meta">
                                                <span><i class="fas fa-user"></i> ${atividade.responsavel || 'Não definido'}</span>
                                                <span><i class="fas fa-calendar"></i> ${atividade.dataPrevista || 'Sem data'}</span>
                                                <span class="badge status-${status}">
                                                    ${getLabelStatus(status)}
                                                </span>
                                                ${temVinculos ? 
                                                    `<span class="vinculos-badge">
                                                        <i class="fas fa-link"></i> ${atividadesVinculadas.length} vínculo(s)
                                                    </span>` 
                                                    : ''
                                                }
                                            </div>
                                        </div>
                                        <div class="item-actions">
                                            <div class="status-selector">
                                                <select class="status-select" 
                                                        data-id="${atividade.id}"
                                                        data-titulo="${tituloEscapado}"
                                                        onchange="alterarStatusAtividade('${atividade.id}', this.value, '${tituloEscapado}')">
                                                    ${selectHTML}
                                                </select>
                                            </div>
                                            
                                            <button class="btn-icon btn-edit" onclick="editarAtividade('${atividade.id}')">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="btn-icon btn-delete" onclick="excluirAtividade('${atividade.id}')">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('') :
                            '<div class="checklist-item"><div class="item-desc">Nenhuma atividade cadastrada</div></div>'
                        }
                    </div>
                </div>
            `;
        }).join('');
    }

    getTextoStatusTarefa(tarefa) {
        const stats = this.calcularEstatisticasTarefa(tarefa);
        const total = stats.total;
        
        if (total === 0) {
            return '<span class="status-mini-badge badge-sem-atividades">Sem atividades</span>';
        }
        
        const badges = [];
        
        if (stats.naoIniciadas > 0) {
            badges.push(`<span class="status-mini-badge badge-nao_iniciado">Não Iniciado (${stats.naoIniciadas}/${total})</span>`);
        }
        if (stats.pendentes > 0) {
            badges.push(`<span class="status-mini-badge badge-pendente">Pendente (${stats.pendentes}/${total})</span>`);
        }
        if (stats.andamento > 0) {
            badges.push(`<span class="status-mini-badge badge-andamento">Em Andamento (${stats.andamento}/${total})</span>`);
        }
        if (stats.concluidas > 0) {
            badges.push(`<span class="status-mini-badge badge-concluido">Concluído (${stats.concluidas}/${total})</span>`);
        }
        
        return badges.join(' ');
    }

    configurarListeners() {
        // Listener para atualizações de atividades
        db.collection('atividades').onSnapshot(() => {
            console.log('🔄 Atualizando atividades em tempo real...');
            this.carregarDados().then(() => {
                this.renderizarTarefas();
                this.atualizarGraficos();
            });
        });
        
        // Listener para tarefas (apenas para atualizar se houver mudanças)
        db.collection('tarefas').onSnapshot(() => {
            console.log('🔄 Atualizando lista de tarefas...');
            this.carregarDados().then(() => {
                this.renderizarTarefas();
                this.atualizarGraficos();
            });
        });
        
        this.configurarListenerConclusoes();
    }
    
    configurarListenerConclusoes() {
        console.log('🎯 Configurando listener para conclusões...');
        
        db.collection('atividades').onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'modified') {
                    const atividadeAntiga = change.doc._previousData;
                    const atividadeNova = change.doc.data();
                    
                    if (atividadeAntiga?.status === atividadeNova.status) {
                        return;
                    }
                    
                    if (atividadeAntiga?.status !== 'concluido' && 
                        atividadeNova.status === 'concluido') {
                        
                        console.log(`✅🔥 LISTENER: Atividade ${change.doc.id} foi concluída!`);
                        console.log(`📋 Vínculos: ${atividadeNova.atividadesVinculadas?.join(', ') || 'Nenhum'}`);
                        
                        this.processarConclusaoAtividade(change.doc.id);
                    }
                }
            });
        });
    }
    
    atualizarGraficos() {
        if (this.charts.status) {
            const dados = this.calcularEstatisticas();
            
            this.charts.status.data.datasets[0].data = [
                dados.naoIniciadas,
                dados.pendentes,
                dados.andamento,
                dados.concluidas,
                dados.atrasadas
            ];
            
            this.charts.status.update();
        }
    
        if (this.charts.progress) {
            const tarefasProgresso = this.tarefas.map(tarefa => {
                const atividades = tarefa.atividades || [];
                if (atividades.length === 0) return 0;
                const concluidas = atividades.filter(a => a.status === 'concluido').length;
                const andamento = atividades.filter(a => a.status === 'andamento').length;
                const total = atividades.length;
                const progresso = concluidas + andamento;
                return (progresso / total) * 100;
            });
            
            this.charts.progress.data.datasets[0].data = tarefasProgresso;
            this.charts.progress.update();
        }
    }

    async processarConclusaoAtividade(atividadeId) {
        try {
            console.log(`🔍 PROCESSAR: Buscando atividade ${atividadeId}...`);
            
            // Buscar a atividade
            const atividadeDoc = await db.collection('atividades').doc(atividadeId).get();
            
            if (!atividadeDoc.exists) {
                console.log(`❌ Atividade ${atividadeId} não encontrada`);
                return;
            }
    
            const atividade = atividadeDoc.data();
            console.log(`📄 Dados da atividade:`, {
                titulo: atividade.titulo,
                status: atividade.status,
                vinculos: atividade.atividadesVinculadas
            });
            
            // Verificar se há atividades vinculadas
            if (atividade.atividadesVinculadas && atividade.atividadesVinculadas.length > 0) {
                console.log(`🔄 Processando conclusão da atividade ${atividadeId}`);
                console.log(`📋 Atividades vinculadas: ${atividade.atividadesVinculadas.join(', ')}`);
                
                // Atualizar todas as atividades vinculadas para "pendente"
                const batch = db.batch();
                let atualizadas = 0;
                
                for (const vinculadaId of atividade.atividadesVinculadas) {
                    const atividadeVinculadaRef = db.collection('atividades').doc(vinculadaId);
                    
                    // Verificar se a atividade existe
                    const vinculadaDoc = await atividadeVinculadaRef.get();
                    if (vinculadaDoc.exists) {
                        const atividadeVinculada = vinculadaDoc.data();
                        console.log(`🔄 Atualizando ${vinculadaId}: ${atividadeVinculada.titulo}`);
                        
                        batch.update(atividadeVinculadaRef, {
                            status: 'pendente',
                            dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        atualizadas++;
                    } else {
                        console.log(`⚠️ Atividade vinculada ${vinculadaId} não existe`);
                    }
                }
                
                if (atualizadas > 0) {
                    await batch.commit();
                    console.log(`✅ ${atualizadas} atividades vinculadas atualizadas para "pendente"`);
                } else {
                    console.log('ℹ️ Nenhuma atividade vinculada foi atualizada');
                }
                
                // Recarregar dados após atualização
                setTimeout(() => {
                    // Atualizar apenas os dados necessários sem recolher
                    this.carregarDados().then(() => {
                        // Manter tarefas expandidas
                        restaurarEstadoExpansaoTarefas();
                        this.renderizarTarefas();
                        this.atualizarGraficos();
                    });
                }, 1000);
                
            } else {
                console.log('ℹ️ Nenhuma atividade vinculada para processar');
            }
            
        } catch (error) {
            console.error('❌ Erro ao processar conclusão:', error);
        }
    }

    async editarAtividade(atividadeId) {
        this.atividadeEditando = atividadeId;
        
        const atividadeDoc = await db.collection('atividades').doc(atividadeId).get();
        
        if (!atividadeDoc.exists) {
            alert('Atividade não encontrada');
            return;
        }
        
        const atividade = atividadeDoc.data();
        const tarefa = this.tarefas.find(t => t.id === atividade.tarefaId);
        
        if (!tarefa) {
            alert('Tarefa não encontrada');
            return;
        }
        
        this.abrirModalAtividade(atividade.tarefaId, atividade.tipo, atividade);
    }

    abrirModalAtividade(tarefaId, tipo = 'execucao', atividadeExistente = null) {
        this.atividadeEditando = atividadeExistente ? atividadeExistente.id : null;
        
        const modal = document.getElementById('modalAtividade');
        const titulos = {
            'execucao': 'Execução das Atividades',
            'monitoramento': 'Monitoramento',
            'conclusao': 'Conclusão e Revisão'
        };
        
        const tituloModal = atividadeExistente 
            ? `Editar Atividade - ${titulos[tipo]}` 
            : `Nova Atividade - ${titulos[tipo]}`;
        
        document.getElementById('modalAtividadeTitulo').textContent = tituloModal;
        
        const usuariosOptions = this.usuarios.map(user => {
            const selected = atividadeExistente && atividadeExistente.responsavel === user.usuario ? 'selected' : '';
            return `<option value="${user.usuario}" ${selected}>${user.nome || user.usuario}</option>`;
        }).join('');
        
        const formatarDataParaInput = (dataString) => {
            if (!dataString) return '';
            return dataString.split('T')[0];
        };
        
        const statusAtividade = atividadeExistente ? atividadeExistente.status : 'nao_iniciado';
        
        let atividadesVinculadasHTML = '';
        if (this.atividadesDisponiveis.length > 0) {
            const atividadesParaVincular = this.atividadesDisponiveis.filter(atv => 
                !atividadeExistente || atv.id !== atividadeExistente.id
            );
            
            const atividadesVinculadasIds = atividadeExistente && atividadeExistente.atividadesVinculadas 
                ? atividadeExistente.atividadesVinculadas 
                : [];
            
            atividadesVinculadasHTML = `
                <div class="form-group">
                    <label for="vinculosAtividade">
                        <i class="fas fa-link"></i> Vincular Atividades (opcional)
                        <small class="form-text">Quando esta atividade for concluída, as atividades vinculadas serão alteradas para "Pendente"</small>
                    </label>
                    <div class="vinculos-container" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 10px;">
                        ${atividadesParaVincular.map(atv => {
                            const checked = atividadesVinculadasIds.includes(atv.id) ? 'checked' : '';
                            return `
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" value="${atv.id}" id="vinculo-${atv.id}" ${checked}>
                                    <label class="form-check-label" for="vinculo-${atv.id}" style="font-size: 14px;">
                                        <strong>${atv.titulo}</strong>
                                        <small class="text-muted"> (${atv.tarefaNome || 'Tarefa'}) - ${getLabelStatus(atv.status)}</small>
                                    </label>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    ${atividadesParaVincular.length === 0 ? 
                        '<p class="text-muted small">Não há outras atividades disponíveis para vínculo</p>' : ''}
                </div>
            `;
        }
        
        document.getElementById('modalAtividadeBody').innerHTML = `
            <form id="formAtividade" onsubmit="event.preventDefault(); salvarAtividade('${tarefaId}', '${tipo}');">
                <div class="form-group">
                    <label for="tituloAtividade">Título *</label>
                    <input type="text" id="tituloAtividade" class="form-control" required 
                           value="${atividadeExistente ? atividadeExistente.titulo : ''}">
                </div>
                <div class="form-group">
                    <label for="descricaoAtividade">Descrição</label>
                    <textarea id="descricaoAtividade" class="form-control" rows="3">${atividadeExistente ? (atividadeExistente.descricao || '') : ''}</textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="responsavelAtividade">Responsável *</label>
                        <select id="responsavelAtividade" class="form-control" required>
                            <option value="">Selecione um responsável</option>
                            ${usuariosOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="dataPrevista">Data Prevista</label>
                        <input type="date" id="dataPrevista" class="form-control" 
                               value="${atividadeExistente ? formatarDataParaInput(atividadeExistente.dataPrevista) : new Date().toISOString().split('T')[0]}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="prioridadeAtividade">Prioridade</label>
                        <select id="prioridadeAtividade" class="form-control">
                            <option value="baixa" ${atividadeExistente && atividadeExistente.prioridade === 'baixa' ? 'selected' : ''}>Baixa</option>
                            <option value="media" ${(!atividadeExistente || atividadeExistente.prioridade === 'media') ? 'selected' : ''}>Média</option>
                            <option value="alta" ${atividadeExistente && atividadeExistente.prioridade === 'alta' ? 'selected' : ''}>Alta</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="statusAtividade">Status</label>
                        <select id="statusAtividade" class="form-control" onchange="verificarConclusaoVinculos()">
                            <option value="nao_iniciado" ${statusAtividade === 'nao_iniciado' ? 'selected' : ''}>Não Iniciado</option>
                            <option value="pendente" ${statusAtividade === 'pendente' ? 'selected' : ''}>Pendente</option>
                            <option value="andamento" ${statusAtividade === 'andamento' ? 'selected' : ''}>Em Andamento</option>
                            <option value="concluido" ${statusAtividade === 'concluido' ? 'selected' : ''}>Concluído</option>
                        </select>
                    </div>
                </div>
                
                ${atividadesVinculadasHTML}
                
                <div class="alert alert-info" id="alertVinculos" style="display: none; margin-top: 15px;">
                    <i class="fas fa-info-circle"></i> 
                    <span id="alertVinculosText"></span>
                </div>
                
                <div class="modal-footer" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                    <button type="button" class="btn btn-outline" onclick="fecharModalAtividade()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> ${atividadeExistente ? 'Atualizar' : 'Salvar'} Atividade
                    </button>
                </div>
            </form>
        `;
        
        modal.style.display = 'flex';
        
        verificarConclusaoVinculos();
    }
}

// ==================== fim da classe

// ... (restante do código permanece igual)

// Instanciar e inicializar o gestor
const gestorAtividades = new GestorAtividades();

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    gestorAtividades.init();

    setTimeout(() => {
        configurarListenerConclusoes();
    }, 3000);
});
