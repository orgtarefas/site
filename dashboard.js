// dashboard.js - VERSÃO COMPLETA COM EDIÇÃO
console.log('=== DASHBOARD INICIANDO ===');

// Sistema de Monitoramento Dinâmico
class SistemaMonitoramento {
    constructor() {
        this.sistemas = [];
        this.usuarios = [];
        this.usuario = null;
        this.charts = {};
        this.sistemaEditando = null;
        this.atividadeEditando = null;
        this.atividadesDisponiveis = []; // Todas as atividades para vínculos
    }


    async init() {
        console.log('🚀 Inicializando Dashboard...');
        
        // Verificar autenticação
        await this.verificarAutenticacao();
        
        // Carregar dados PRIMEIRO
        await this.carregarDados();
        
        // Carregar atividades disponíveis para vínculos
        await this.carregarAtividadesParaVinculo();
        
        // Inicializar gráficos DEPOIS de carregar dados
        this.inicializarGraficos();
        
        // Renderizar sistemas
        this.renderizarSistemas();
        
        // Configurar listeners
        this.configurarListeners();
        
        console.log('✅ Dashboard inicializado com sucesso!');
    }

    async carregarAtividadesParaVinculo() {
        try {
            const snapshot = await db.collection('atividades').get();
            this.atividadesDisponiveis = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                sistemaNome: this.getNomeSistema(doc.data().sistemaId)
            }));
            console.log(`✅ ${this.atividadesDisponiveis.length} atividades disponíveis para vínculo`);
        } catch (error) {
            console.error('❌ Erro ao carregar atividades para vínculo:', error);
        }
    }

    getNomeSistema(sistemaId) {
        const sistema = this.sistemas.find(s => s.id === sistemaId);
        return sistema ? sistema.nome : 'Sistema não encontrado';
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

            // Carregar sistemas
            const sistemasSnapshot = await db.collection('sistemas').get();
            this.sistemas = sistemasSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(`✅ ${this.sistemas.length} sistemas carregados`);

            // Carregar atividades
            const atividadesSnapshot = await db.collection('atividades').get();
            const todasAtividades = atividadesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                sistemaNome: this.getNomeSistema(doc.data().sistemaId)
            }));
            
            // Agrupar atividades por sistema
            this.sistemas.forEach(sistema => {
                sistema.atividades = todasAtividades.filter(a => a.sistemaId === sistema.id);
            });
            
            console.log(`✅ ${todasAtividades.length} atividades carregadas`);

            // Atualizar status
            document.getElementById('status-sincronizacao').innerHTML = 
                '<i class="fas fa-check-circle"></i> Sincronizado';

        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            document.getElementById('status-sincronizacao').innerHTML = 
                '<i class="fas fa-exclamation-triangle"></i> Offline';
        }
    }

    async processarConclusaoAtividade(atividadeId) {
        try {
            // Buscar a atividade
            const atividadeDoc = await db.collection('atividades').doc(atividadeId).get();
            if (!atividadeDoc.exists) return;

            const atividade = atividadeDoc.data();
            
            // Verificar se há atividades vinculadas
            if (atividade.atividadesVinculadas && atividade.atividadesVinculadas.length > 0) {
                console.log(`🔄 Processando conclusão da atividade ${atividadeId}`);
                console.log(`📋 Atividades vinculadas: ${atividade.atividadesVinculadas.join(', ')}`);
                
                // Atualizar todas as atividades vinculadas para "pendente"
                const batch = db.batch();
                
                for (const vinculadaId of atividade.atividadesVinculadas) {
                    const atividadeVinculadaRef = db.collection('atividades').doc(vinculadaId);
                    
                    // Verificar se a atividade existe
                    const vinculadaDoc = await atividadeVinculadaRef.get();
                    if (vinculadaDoc.exists) {
                        batch.update(atividadeVinculadaRef, {
                            status: 'pendente',
                            dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        console.log(`✅ Atividade ${vinculadaId} atualizada para pendente`);
                    }
                }
                
                await batch.commit();
                console.log(`✅ Todas as atividades vinculadas atualizadas`);
                
                // Recarregar dados após atualização
                setTimeout(() => {
                    this.carregarDados().then(() => {
                        this.renderizarSistemas();
                        this.atualizarGraficos();
                    });
                }, 1000);
            }
            
        } catch (error) {
            console.error('❌ Erro ao processar conclusão:', error);
        }
    }


    inicializarGraficos() {
        this.inicializarGraficoStatus();
        this.inicializarGraficoProgresso();
        this.inicializarGraficoTimeline();
    }

    inicializarGraficoStatus() {
        const ctx = document.getElementById('statusChart').getContext('2d');
        const dados = this.calcularEstatisticas();
        
        // DEBUG: Verificar dados que estão sendo usados no gráfico
        console.log('Dados para gráfico:', dados);
        
        this.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Não Iniciadas', 'Pendentes', 'Em Andamento', 'Concluídas', 'Atrasadas'],
                datasets: [{
                    data: [
                        dados.naoIniciadas,  // Deve ser 3
                        dados.pendentes,     // Deve ser 1  
                        dados.andamento,     // Deve ser 1
                        dados.concluidas,    // Deve ser 2
                        dados.atrasadas      // Deve ser 0
                    ],
                    backgroundColor: [
                        '#6c757d',   // Cinza para Não Iniciadas
                        '#f39c12',   // Laranja para Pendentes
                        '#3498db',   // Azul para Em Andamento
                        '#27ae60',   // Verde para Concluídas
                        '#e74c3c'    // Vermelho para Atrasadas
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
    }

    inicializarGraficoProgresso() {
        const ctx = document.getElementById('progressChart').getContext('2d');
        
        const sistemasNomes = this.sistemas.map(s => s.nome);
        const sistemasProgresso = this.sistemas.map(sistema => {
            const atividades = sistema.atividades || [];
            if (atividades.length === 0) return 0;
            const concluidas = atividades.filter(a => a.status === 'concluido').length;
            return (concluidas / atividades.length) * 100;
        });

        this.charts.progress = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sistemasNomes,
                datasets: [{
                    label: 'Progresso (%)',
                    data: sistemasProgresso,
                    backgroundColor: this.sistemas.map(s => s.cor || '#2C3E50')
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
    }

    inicializarGraficoTimeline() {
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
    }

    calcularEstatisticas() {
        let total = 0;
        let naoIniciadas = 0;
        let pendentes = 0;
        let andamento = 0;
        let concluidas = 0;
        let atrasadas = 0;
    
        this.sistemas.forEach(sistema => {
            const atividades = sistema.atividades || [];
            total += atividades.length;
            
            // DEBUG: Mostrar atividades de cada sistema
            console.log(`Sistema: ${sistema.nome}`);
            console.log(`- Total atividades: ${atividades.length}`);
            console.log(`- Atividades:`, atividades);
            
            // Verificar status CORRETAMENTE
            atividades.forEach(atividade => {
                const status = atividade.status ? atividade.status.toLowerCase().trim() : '';
                console.log(`  Atividade: ${atividade.titulo}, Status: ${status}`);
                
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
    
        // DEBUG: Mostrar estatísticas calculadas
        console.log('Estatísticas calculadas:', {
            total,
            naoIniciadas,
            pendentes,
            andamento,
            concluidas,
            atrasadas
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

    renderizarSistemas() {
        const container = document.getElementById('sistemas-container');
        
        if (this.sistemas.length === 0) {
            container.innerHTML = `
                <div class="empty-sistemas">
                    <i class="fas fa-project-diagram"></i>
                    <h3>Nenhum sistema cadastrado</h3>
                    <p>Clique em "Novo Sistema" para começar</p>
                </div>
            `;
            return;
        }
    
        container.innerHTML = this.sistemas.map(sistema => `
            <div class="system-card">
                <div class="system-header" onclick="toggleSistema('${sistema.id}')">
                    <h2>
                        <i class="fas fa-project-diagram" style="color: ${sistema.cor || '#2C3E50'}"></i>
                        ${sistema.nome}
                    </h2>
                    <div class="system-status">
                        <div class="status-badges-container">
                            ${this.getTextoStatusSistema(sistema)}
                        </div>
                        <i class="fas fa-chevron-down"></i>
                        <div class="system-actions">
                            <button class="btn-icon" onclick="event.stopPropagation(); editarSistema('${sistema.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon btn-danger" onclick="event.stopPropagation(); excluirSistema('${sistema.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <!-- IMPORTANTE: Iniciar com display: none para recolhido -->
                <div class="system-body" id="sistema-${sistema.id}" style="display: none;">
                    <p class="system-desc">${sistema.descricao || 'Sem descrição'}</p>
                    <div class="activities-grid">
                        ${this.renderizarAtividadesSistema(sistema)}
                    </div>
                </div>
            </div>
        `).join('');
    }

    calcularEstatisticasSistema(sistema) {
        const atividades = sistema.atividades || [];
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
        
    renderizarAtividadesSistema(sistema) {
        const atividades = sistema.atividades || [];
        
        if (atividades.length === 0) {
            return `
                <div class="empty-activities">
                    <p>Nenhuma atividade cadastrada para este sistema</p>
                    <button class="btn btn-primary btn-sm" onclick="abrirModalAtividade('${sistema.id}')">
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
                        <button class="btn btn-primary btn-sm" onclick="abrirModalAtividade('${sistema.id}', '${tipo}')">
                            <i class="fas fa-plus"></i> Nova Atividade
                        </button>
                    </div>
                    <div class="checklist">
                        ${atividadesTipo.length > 0 ? 
                            atividadesTipo.map(atividade => {
                                // Garantir que o status tenha um valor
                                const status = atividade.status || 'nao_iniciado';
                                
                                return `
                                    <div class="checklist-item">
                                        <div class="item-info">
                                            <div class="item-title">${atividade.titulo}</div>
                                            ${atividade.descricao ? `<div class="item-desc">${atividade.descricao}</div>` : ''}
                                            <div class="item-meta">
                                                <span><i class="fas fa-user"></i> ${atividade.responsavel || 'Não definido'}</span>
                                                <span><i class="fas fa-calendar"></i> ${atividade.dataPrevista || 'Sem data'}</span>
                                                <span class="badge status-${status}">
                                                    ${getLabelStatus(status)}
                                                </span>
                                            </div>
                                        </div>
                                        <div class="item-actions">
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
    
    getStatusSistema(sistema) {
        const stats = this.calcularEstatisticasSistema(sistema);
        
        if (stats.total === 0) return 'pendente'; // Sem atividades
        
        // Lógica para determinar o status principal do sistema
        if (stats.concluidas === stats.total) return 'concluido';
        if (stats.andamento > 0) return 'andamento';
        if (stats.pendentes > 0) return 'pendente';
        if (stats.naoIniciadas > 0) return 'nao_iniciado';
        
        return 'pendente';
    }

    getTextoStatusSistema(sistema) {
        const stats = this.calcularEstatisticasSistema(sistema);
        const total = stats.total;
        
        // Se não houver atividades
        if (total === 0) {
            return '<span class="status-mini-badge badge-sem-atividades">Sem atividades</span>';
        }
        
        // Criar HTML para cada status que tem atividades
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
        
        // Retornar todos os badges sem container externo
        return badges.join(' ');
    }

    configurarListeners() {
        // Configurar listener em tempo real
        db.collection('atividades').onSnapshot(() => {
            console.log('🔄 Atualizando dados em tempo real...');
            this.carregarDados().then(() => {
                this.renderizarSistemas();
                this.atualizarGraficos();
            });
        });
    }

    atualizarGraficos() {
        if (this.charts.status) {
            const dados = this.calcularEstatisticas();
            
            // Atualizar dados do gráfico de status
            this.charts.status.data.datasets[0].data = [
                dados.naoIniciadas,
                dados.pendentes,
                dados.andamento,
                dados.concluidas,
                dados.atrasadas
            ];
            
            // Atualizar labels (opcional, se você quiser garantir que estão corretos)
            this.charts.status.data.labels = [
                'Não Iniciadas',
                'Pendentes',
                'Em Andamento',
                'Concluídas',
                'Atrasadas'
            ];
            
            this.charts.status.update();
        }
    
        if (this.charts.progress) {
            const sistemasProgresso = this.sistemas.map(sistema => {
                const atividades = sistema.atividades || [];
                if (atividades.length === 0) return 0;
                const concluidas = atividades.filter(a => a.status === 'concluido').length;
                const naoIniciadas = atividades.filter(a => a.status === 'nao_iniciado').length;
                const andamento = atividades.filter(a => a.status === 'andamento').length;
                const pendentes = atividades.filter(a => a.status === 'pendente').length;
                
                // Calcular progresso: (concluídas + em andamento) / total
                const total = atividades.length;
                const progresso = concluidas + andamento;
                return (progresso / total) * 100;
            });
            
            this.charts.progress.data.datasets[0].data = sistemasProgresso;
            this.charts.progress.update();
        }
    }

    // NOVOS MÉTODOS PARA EDIÇÃO
    abrirModalEditarSistema(sistemaId) {
        this.sistemaEditando = sistemaId;
        const sistema = this.sistemas.find(s => s.id === sistemaId);
        
        if (!sistema) {
            alert('Sistema não encontrado');
            return;
        }
        
        document.getElementById('modalSistema').style.display = 'flex';
        document.getElementById('modalSistemaTitulo').textContent = 'Editar Sistema';
        
        // Preencher formulário
        document.getElementById('sistemaNome').value = sistema.nome;
        document.getElementById('sistemaDescricao').value = sistema.descricao || '';
        document.getElementById('sistemaCor').value = sistema.cor || '#2C3E50';
    }

    async editarAtividade(atividadeId) {
        this.atividadeEditando = atividadeId;
        
        // Buscar atividade no Firebase
        const atividadeDoc = await db.collection('atividades').doc(atividadeId).get();
        
        if (!atividadeDoc.exists) {
            alert('Atividade não encontrada');
            return;
        }
        
        const atividade = atividadeDoc.data();
        const sistema = this.sistemas.find(s => s.id === atividade.sistemaId);
        
        if (!sistema) {
            alert('Sistema não encontrado');
            return;
        }
        
        this.abrirModalAtividade(atividade.sistemaId, atividade.tipo, atividade);
    }
}

// Instanciar e inicializar o sistema
const monitoramento = new SistemaMonitoramento();

// ========== FUNÇÕES GLOBAIS COMPLETAS ==========

function logout() {
    localStorage.removeItem('usuarioLogado');
    window.location.href = 'login.html';
}

function toggleSistema(sistemaId) {
    const elemento = document.getElementById(`sistema-${sistemaId}`);
    const header = elemento.previousElementSibling;
    const chevron = header.querySelector('.fa-chevron-down, .fa-chevron-up');
    
    if (!elemento || !chevron) return;
    
    if (elemento.style.display === 'none') {
        // Abrir
        elemento.style.display = 'block';
        chevron.classList.remove('fa-chevron-down');
        chevron.classList.add('fa-chevron-up');
    } else {
        // Fechar
        elemento.style.display = 'none';
        chevron.classList.remove('fa-chevron-up');
        chevron.classList.add('fa-chevron-down');
    }
    
    // Prevenir propagação para não fechar imediatamente
    event.stopPropagation();
}

function abrirModalSistema() {
    monitoramento.sistemaEditando = null;
    document.getElementById('modalSistema').style.display = 'flex';
    document.getElementById('modalSistemaTitulo').textContent = 'Novo Sistema';
    document.getElementById('formSistema').reset();
    document.getElementById('sistemaCor').value = '#2C3E50';
}

function fecharModalSistema() {
    document.getElementById('modalSistema').style.display = 'none';
}

async function editarSistema(sistemaId) {
    monitoramento.sistemaEditando = sistemaId;
    const sistema = monitoramento.sistemas.find(s => s.id === sistemaId);
    
    if (!sistema) {
        alert('Sistema não encontrado');
        return;
    }
    
    document.getElementById('modalSistema').style.display = 'flex';
    document.getElementById('modalSistemaTitulo').textContent = 'Editar Sistema';
    
    // Preencher formulário
    document.getElementById('sistemaNome').value = sistema.nome;
    document.getElementById('sistemaDescricao').value = sistema.descricao || '';
    document.getElementById('sistemaCor').value = sistema.cor || '#2C3E50';
}

async function salvarSistema() {
    const nome = document.getElementById('sistemaNome').value;
    const descricao = document.getElementById('sistemaDescricao').value;
    const cor = document.getElementById('sistemaCor').value;
    
    if (!nome) {
        alert('Preencha o nome do sistema');
        return;
    }
    
    try {
        const sistemaData = {
            nome: nome,
            descricao: descricao,
            cor: cor,
            dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (monitoramento.sistemaEditando) {
            // EDITAR sistema existente
            await db.collection('sistemas').doc(monitoramento.sistemaEditando).update(sistemaData);
            alert('✅ Sistema atualizado com sucesso!');
        } else {
            // CRIAR novo sistema
            await db.collection('sistemas').add({
                ...sistemaData,
                dataCriacao: firebase.firestore.FieldValue.serverTimestamp(),
                criadoPor: monitoramento.usuario.usuario
            });
            alert('✅ Sistema criado com sucesso!');
        }
        
        fecharModalSistema();
        monitoramento.sistemaEditando = null;
        
        // Recarregar dados
        await monitoramento.carregarDados();
        monitoramento.renderizarSistemas();
        monitoramento.atualizarGraficos();
        
    } catch (error) {
        console.error('❌ Erro ao salvar sistema:', error);
        alert('Erro ao salvar sistema: ' + error.message);
    }
}

async function excluirSistema(sistemaId) {
    if (!confirm('ATENÇÃO: Tem certeza que deseja excluir este sistema? Todas as atividades vinculadas também serão excluídas!')) {
        return;
    }
    
    try {
        // Buscar e excluir todas as atividades do sistema
        const atividadesSnapshot = await db.collection('atividades')
            .where('sistemaId', '==', sistemaId)
            .get();
        
        // Excluir todas as atividades
        const batch = db.batch();
        atividadesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
        // Excluir o sistema
        await db.collection('sistemas').doc(sistemaId).delete();
        
        alert('✅ Sistema e atividades excluídos com sucesso!');
        
        // Recarregar dados
        await monitoramento.carregarDados();
        monitoramento.renderizarSistemas();
        monitoramento.atualizarGraficos();
        
    } catch (error) {
        console.error('❌ Erro ao excluir sistema:', error);
        alert('Erro ao excluir sistema: ' + error.message);
    }
}

function formatarDataRegistro(dataRegistro) {
    try {
        if (dataRegistro && dataRegistro.toDate) {
            // Se for um timestamp do Firebase
            return dataRegistro.toDate().toLocaleString('pt-BR');
        } else if (dataRegistro) {
            // Se for uma string ou outro formato
            return new Date(dataRegistro).toLocaleString('pt-BR');
        } else {
            return 'Não disponível';
        }
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return 'Data inválida';
    }
}

function abrirModalAtividade(sistemaId, tipo = 'execucao', atividadeExistente = null) {
    monitoramento.atividadeEditando = atividadeExistente ? atividadeExistente.id : null;
    
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
    
    // Gerar opções de usuários
    const usuariosOptions = monitoramento.usuarios.map(user => {
        const selected = atividadeExistente && atividadeExistente.responsavel === user.usuario ? 'selected' : '';
        return `<option value="${user.usuario}" ${selected}>${user.nome || user.usuario}</option>`;
    }).join('');
    
    // Formatação de data para input
    const formatarDataParaInput = (dataString) => {
        if (!dataString) return '';
        return dataString.split('T')[0];
    };
    
    // Verificar qual status está selecionado
    const statusAtividade = atividadeExistente ? atividadeExistente.status : 'nao_iniciado';
    
    // Preparar lista de atividades disponíveis para vínculo
    let atividadesVinculadasHTML = '';
    if (monitoramento.atividadesDisponiveis.length > 0) {
        // Filtrar para não mostrar a própria atividade (se for edição)
        const atividadesParaVincular = monitoramento.atividadesDisponiveis.filter(atv => 
            !atividadeExistente || atv.id !== atividadeExistente.id
        );
        
        // Verificar quais atividades já estão vinculadas
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
                                    <small class="text-muted"> (${atv.sistemaNome || 'Sistema'}) - ${getLabelStatus(atv.status)}</small>
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
        <form id="formAtividade" onsubmit="event.preventDefault(); salvarAtividade('${sistemaId}', '${tipo}');">
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
    
    // Verificar se há alerta para mostrar
    verificarConclusaoVinculos();
}

function verificarConclusaoVinculos() {
    const statusSelecionado = document.getElementById('statusAtividade').value;
    const checkboxes = document.querySelectorAll('.vinculos-container input[type="checkbox"]:checked');
    const alertDiv = document.getElementById('alertVinculos');
    const alertText = document.getElementById('alertVinculosText');
    
    if (statusSelecionado === 'concluido' && checkboxes.length > 0) {
        alertText.textContent = `Ao salvar, ${checkboxes.length} atividade(s) vinculada(s) será(ão) alterada(s) para "Pendente".`;
        alertDiv.style.display = 'block';
    } else {
        alertDiv.style.display = 'none';
    }
}

function getLabelStatus(status) {
    switch(status) {
        case 'nao_iniciado': return 'Não Iniciado';
        case 'pendente': return 'Pendente';
        case 'andamento': return 'Em Andamento';
        case 'concluido': return 'Concluído';
        default: return status || 'Não definido';
    }
}

function fecharModalAtividade() {
    document.getElementById('modalAtividade').style.display = 'none';
    monitoramento.atividadeEditando = null;
}

async function salvarAtividade(sistemaId, tipo) {
    const titulo = document.getElementById('tituloAtividade').value;
    const responsavel = document.getElementById('responsavelAtividade').value;
    
    if (!titulo || !responsavel) {
        alert('Preencha todos os campos obrigatórios');
        return;
    }
    
    const status = document.getElementById('statusAtividade').value;
    
    const atividade = {
        sistemaId: sistemaId,
        tipo: tipo,
        titulo: titulo,
        descricao: document.getElementById('descricaoAtividade').value,
        responsavel: responsavel,
        dataPrevista: document.getElementById('dataPrevista').value,
        prioridade: document.getElementById('prioridadeAtividade').value,
        status: status, // Novo status
        dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Se for nova atividade e status não foi definido, define como "Não Iniciado"
    if (!monitoramento.atividadeEditando && !status) {
        atividade.status = 'nao_iniciado';
    }
    
    try {
        if (monitoramento.atividadeEditando) {
            // EDITAR atividade existente
            await db.collection('atividades').doc(monitoramento.atividadeEditando).update(atividade);
            alert('✅ Atividade atualizada com sucesso!');
        } else {
            // CRIAR nova atividade
            await db.collection('atividades').add({
                ...atividade,
                dataRegistro: firebase.firestore.FieldValue.serverTimestamp(),
                criadoPor: monitoramento.usuario.usuario
            });
            alert('✅ Atividade criada com sucesso!');
        }
        
        fecharModalAtividade();
        monitoramento.atividadeEditando = null;
        
        // Recarregar dados
        await monitoramento.carregarDados();
        monitoramento.renderizarSistemas();
        monitoramento.atualizarGraficos();
        
    } catch (error) {
        console.error('❌ Erro ao salvar atividade:', error);
        alert('Erro ao salvar atividade: ' + error.message);
    }
}

async function editarAtividade(atividadeId) {
    try {
        // Atualizar lista de atividades para vínculo
        await monitoramento.carregarAtividadesParaVinculo();
        
        // Buscar atividade no Firebase
        const atividadeDoc = await db.collection('atividades').doc(atividadeId).get();
        
        if (!atividadeDoc.exists) {
            alert('Atividade não encontrada');
            return;
        }
        
        const atividade = {
            id: atividadeDoc.id,
            ...atividadeDoc.data()
        };
        
        abrirModalAtividade(atividade.sistemaId, atividade.tipo, atividade);
        
    } catch (error) {
        console.error('❌ Erro ao buscar atividade:', error);
        alert('Erro ao carregar atividade: ' + error.message);
    }
}

// Listener para monitorar mudanças de status
function configurarListenerConclusoes() {
    db.collection('atividades').onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified') {
                const atividadeAntiga = change.doc._previousData;
                const atividadeNova = change.doc.data();
                
                // Verificar se o status mudou para "concluido"
                if (atividadeAntiga.status !== 'concluido' && 
                    atividadeNova.status === 'concluido') {
                    
                    console.log(`🔄 Atividade ${change.doc.id} foi concluída!`);
                    
                    // Processar atividades vinculadas
                    setTimeout(() => {
                        monitoramento.processarConclusaoAtividade(change.doc.id);
                    }, 500);
                }
            }
        });
    });
}

async function excluirAtividade(atividadeId) {
    if (!confirm('Tem certeza que deseja excluir esta atividade?')) return;
    
    try {
        await db.collection('atividades').doc(atividadeId).delete();
        alert('✅ Atividade excluída com sucesso!');
        
        // Recarregar dados
        await monitoramento.carregarDados();
        monitoramento.renderizarSistemas();
        monitoramento.atualizarGraficos();
        
    } catch (error) {
        console.error('❌ Erro ao excluir atividade:', error);
        alert('Erro ao excluir atividade: ' + error.message);
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    monitoramento.init();

    // Iniciar listener para conclusões após um delay
    setTimeout(() => {
        configurarListenerConclusoes();
    }, 3000);
});

// Fechar modais clicando fora
window.onclick = function(event) {
    const modalSistema = document.getElementById('modalSistema');
    const modalAtividade = document.getElementById('modalAtividade');
    
    if (event.target === modalSistema) {
        fecharModalSistema();
    }
    if (event.target === modalAtividade) {
        fecharModalAtividade();
    }
};
