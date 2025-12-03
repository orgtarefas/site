// Sistema de Monitoramento Dinâmico
class SistemaMonitoramento {
    constructor() {
        this.sistemas = [];
        this.usuario = null;
        this.charts = {};
        this.sistemasOriginais = [
            {
                id: 'siscriacao',
                nome: 'SISCRIAÇÃO',
                descricao: 'Sistema de criação e gerenciamento',
                cor: '#3498db',
                atividades: [
                    {
                        id: 'analise-estrutura',
                        titulo: 'Análise da estrutura atual X Macro existente',
                        descricao: 'Comparar estrutura atual com macro existente',
                        status: 'pendente',
                        responsavel: 'thiago.barbosa',
                        dataCriacao: '03/12/2025',
                        dataPrevista: '10/12/2025'
                    },
                    {
                        id: 'definir-linguagem',
                        titulo: 'Definir linguagem e criar esboço',
                        descricao: 'Definir linguagem de programação e criar protótipo',
                        status: 'pendente',
                        responsavel: 'thiago.barbosa',
                        dataCriacao: '03/12/2025',
                        dataPrevista: '15/12/2025'
                    },
                    {
                        id: 'testar-homolog',
                        titulo: 'Testar em ambiente de Homolog e ajustar',
                        descricao: 'Testes no ambiente de homologação',
                        status: 'pendente',
                        responsavel: 'thiago.barbosa',
                        dataCriacao: '03/12/2025',
                        dataPrevista: '20/12/2025'
                    },
                    {
                        id: 'testar-producao',
                        titulo: 'Testar em ambiente de Produção controlada',
                        descricao: 'Testes em produção controlada',
                        status: 'pendente',
                        responsavel: 'thiago.barbosa',
                        dataCriacao: '03/12/2025',
                        dataPrevista: '28/12/2025'
                    }
                ]
            },
            {
                id: 'sisreset',
                nome: 'SISRESET',
                descricao: 'Sistema de reset e recuperação',
                cor: '#9b59b6',
                atividades: []
            },
            {
                id: 'macro-convenios',
                nome: 'Macro convênios PKL',
                descricao: 'Macro para gestão de convênios PKL',
                cor: '#2ecc71',
                atividades: []
            }
        ];
    }

    async init() {
        console.log('🚀 Inicializando Sistema de Monitoramento...');
        
        // Verificar autenticação
        await this.verificarAutenticacao();
        
        // Carregar dados do Firebase
        await this.carregarDados();
        
        // Inicializar gráficos
        this.inicializarGraficos();
        
        // Renderizar sistemas
        this.renderizarSistemas();
        
        // Configurar listeners
        this.configurarListeners();
        
        console.log('✅ Sistema inicializado com sucesso!');
    }

    async verificarAutenticacao() {
        const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
        
        if (!usuarioLogado) {
            console.log('❌ Usuário não autenticado, redirecionando...');
            window.location.href = 'login.html';
            return;
        }
        
        this.usuario = usuarioLogado;
        document.getElementById('userName').textContent = usuarioLogado.nome;
        document.getElementById('data-atual').textContent = new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
    }

    async carregarDados() {
        try {
            // Tentar carregar do Firebase
            const snapshot = await db.collection('sistemas').get();
            
            if (!snapshot.empty) {
                this.sistemas = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log('📊 Dados carregados do Firebase:', this.sistemas.length, 'sistemas');
            } else {
                // Usar dados originais se Firebase estiver vazio
                console.log('📂 Firebase vazio, usando dados originais');
                this.sistemas = this.sistemasOriginais;
                await this.salvarSistemasNoFirebase();
            }
            
            // Atualizar status de sincronização
            document.getElementById('status-sincronizacao').innerHTML = 
                '<i class="fas fa-bolt"></i> Sincronizado';
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            document.getElementById('status-sincronizacao').innerHTML = 
                '<i class="fas fa-exclamation-triangle"></i> Offline';
            
            // Usar dados locais em caso de erro
            this.sistemas = this.sistemasOriginais;
        }
    }

    async salvarSistemasNoFirebase() {
        try {
            for (const sistema of this.sistemasOriginais) {
                await db.collection('sistemas').doc(sistema.id).set(sistema);
            }
            console.log('💾 Dados salvos no Firebase');
        } catch (error) {
            console.error('❌ Erro ao salvar no Firebase:', error);
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
        
        this.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pendentes', 'Em Andamento', 'Concluídas', 'Atrasadas'],
                datasets: [{
                    data: [dados.pendentes, dados.andamento, dados.concluidas, dados.atrasadas],
                    backgroundColor: [
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
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw} atividades`;
                            }
                        }
                    }
                }
            }
        });
    }

    inicializarGraficoProgresso() {
        const ctx = document.getElementById('progressChart').getContext('2d');
        
        const sistemasProgresso = this.sistemas.map(sistema => {
            const atividades = sistema.atividades || [];
            if (atividades.length === 0) return 0;
            
            const concluidas = atividades.filter(a => a.status === 'concluido').length;
            return (concluidas / atividades.length) * 100;
        });

        this.charts.progress = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.sistemas.map(s => s.nome),
                datasets: [{
                    label: 'Progresso (%)',
                    data: sistemasProgresso,
                    backgroundColor: this.sistemas.map(s => s.cor),
                    borderColor: this.sistemas.map(s => s.cor),
                    borderWidth: 1
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
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Progresso: ${Math.round(context.raw)}%`;
                            }
                        }
                    }
                }
            }
        });
    }

    inicializarGraficoTimeline() {
        const ctx = document.getElementById('timelineChart').getContext('2d');
        
        // Gerar dados fictícios para a linha do tempo
        const ultimos7Dias = Array.from({length: 7}, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        });

        const dadosTimeline = ultimos7Dias.map(() => Math.floor(Math.random() * 10) + 5);

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
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Número de Atividades'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Data'
                        }
                    }
                }
            }
        });
    }

    calcularEstatisticas() {
        let total = 0;
        let pendentes = 0;
        let andamento = 0;
        let concluidas = 0;
        let atrasadas = 0;

        this.sistemas.forEach(sistema => {
            const atividades = sistema.atividades || [];
            total += atividades.length;
            pendentes += atividades.filter(a => a.status === 'pendente').length;
            andamento += atividades.filter(a => a.status === 'andamento').length;
            concluidas += atividades.filter(a => a.status === 'concluido').length;
            atrasadas += atividades.filter(a => this.estaAtrasada(a)).length;
        });

        return { total, pendentes, andamento, concluidas, atrasadas };
    }

    estaAtrasada(atividade) {
        if (!atividade.dataPrevista) return false;
        
        const hoje = new Date();
        const dataPrevista = new Date(atividade.dataPrevista.split('/').reverse().join('-'));
        
        return atividade.status !== 'concluido' && dataPrevista < hoje;
    }

    renderizarSistemas() {
        const container = document.getElementById('sistemas-container');
        const estatisticas = this.calcularEstatisticas();

        // Atualizar estatísticas
        document.getElementById('total-atividades').textContent = estatisticas.total;
        document.getElementById('pendentes').textContent = estatisticas.pendentes;
        document.getElementById('andamento').textContent = estatisticas.andamento;
        document.getElementById('concluidas').textContent = estatisticas.concluidas;
        document.getElementById('atrasadas').textContent = estatisticas.atrasadas;

        // Renderizar sistemas
        container.innerHTML = this.sistemas.map(sistema => `
            <div class="system-card">
                <div class="system-header" onclick="toggleSistema('${sistema.id}')">
                    <h2>
                        <i class="fas fa-project-diagram"></i>
                        ${sistema.nome}
                    </h2>
                    <div class="system-status">
                        <span class="status-badge badge-${this.getStatusSistema(sistema)}">
                            ${this.getTextoStatusSistema(sistema)}
                        </span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
                <div class="system-body" id="sistema-${sistema.id}">
                    <p class="system-desc">${sistema.descricao}</p>
                    <div class="activities-grid">
                        <div class="activity-section">
                            <div class="section-header">
                                <h3><i class="fas fa-list-check"></i> Execução das Atividades</h3>
                                <button class="btn btn-primary btn-sm" onclick="abrirModalAtividade('${sistema.id}', 'execucao')">
                                    <i class="fas fa-plus"></i> Nova Atividade
                                </button>
                            </div>
                            <div class="checklist" id="checklist-${sistema.id}-execucao">
                                ${this.renderizarChecklist(sistema, 'execucao')}
                            </div>
                        </div>
                        
                        <div class="activity-section">
                            <div class="section-header">
                                <h3><i class="fas fa-chart-line"></i> Monitoramento</h3>
                                <button class="btn btn-primary btn-sm" onclick="abrirModalAtividade('${sistema.id}', 'monitoramento')">
                                    <i class="fas fa-plus"></i> Nova Atividade
                                </button>
                            </div>
                            <div class="checklist" id="checklist-${sistema.id}-monitoramento">
                                ${this.renderizarChecklist(sistema, 'monitoramento')}
                            </div>
                        </div>
                        
                        <div class="activity-section">
                            <div class="section-header">
                                <h3><i class="fas fa-clipboard-check"></i> Conclusão e Revisão</h3>
                                <button class="btn btn-primary btn-sm" onclick="abrirModalAtividade('${sistema.id}', 'conclusao')">
                                    <i class="fas fa-plus"></i> Nova Atividade
                                </button>
                            </div>
                            <div class="checklist" id="checklist-${sistema.id}-conclusao">
                                ${this.renderizarChecklist(sistema, 'conclusao')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderizarChecklist(sistema, tipo) {
        const atividades = (sistema.atividades || []).filter(a => a.tipo === tipo);
        
        if (atividades.length === 0) {
            return `
                <div class="checklist-item">
                    <div class="item-info">
                        <div class="item-desc">Nenhuma atividade cadastrada</div>
                    </div>
                </div>
            `;
        }

        return atividades.map(atividade => `
            <div class="checklist-item ${this.estaAtrasada(atividade) ? 'atrasado' : ''}">
                <div class="item-info">
                    <div class="item-title">${atividade.titulo}</div>
                    ${atividade.descricao ? `<div class="item-desc">${atividade.descricao}</div>` : ''}
                    <div class="item-meta">
                        <span><i class="fas fa-user"></i> ${atividade.responsavel}</span>
                        <span><i class="fas fa-calendar"></i> ${atividade.dataCriacao}</span>
                        ${atividade.dataPrevista ? `<span><i class="fas fa-flag"></i> ${atividade.dataPrevista}</span>` : ''}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-icon btn-toggle" onclick="toggleStatusAtividade('${sistema.id}', '${atividade.id}')">
                        <i class="fas fa-${this.getIconStatus(atividade.status)}"></i>
                    </button>
                    <button class="btn-icon btn-edit" onclick="editarAtividade('${sistema.id}', '${atividade.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="excluirAtividade('${sistema.id}', '${atividade.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    getStatusSistema(sistema) {
        const atividades = sistema.atividades || [];
        if (atividades.length === 0) return 'pendente';
        
        const concluidas = atividades.filter(a => a.status === 'concluido').length;
        const emAndamento = atividades.filter(a => a.status === 'andamento').length;
        
        if (concluidas === atividades.length) return 'concluido';
        if (emAndamento > 0 || concluidas > 0) return 'andamento';
        return 'pendente';
    }

    getTextoStatusSistema(sistema) {
        const status = this.getStatusSistema(sistema);
        const atividades = sistema.atividades || [];
        
        switch(status) {
            case 'concluido': 
                return `Concluído (${atividades.filter(a => a.status === 'concluido').length}/${atividades.length})`;
            case 'andamento':
                return `Em Andamento (${atividades.filter(a => a.status === 'andamento').length}/${atividades.length})`;
            default:
                return `Pendente (${atividades.length})`;
        }
    }

    getIconStatus(status) {
        switch(status) {
            case 'pendente': return 'clock';
            case 'andamento': return 'spinner';
            case 'concluido': return 'check';
            default: return 'question';
        }
    }

    configurarListeners() {
        // Atualizar estatísticas quando dados mudarem
        window.addEventListener('sistemaAtualizado', () => {
            this.atualizarEstatisticas();
            this.atualizarGraficos();
        });
    }

    atualizarEstatisticas() {
        const estatisticas = this.calcularEstatisticas();
        
        document.getElementById('total-atividades').textContent = estatisticas.total;
        document.getElementById('pendentes').textContent = estatisticas.pendentes;
        document.getElementById('andamento').textContent = estatisticas.andamento;
        document.getElementById('concluidas').textContent = estatisticas.concluidas;
        document.getElementById('atrasadas').textContent = estatisticas.atrasadas;
    }

    atualizarGraficos() {
        if (this.charts.status) {
            const dados = this.calcularEstatisticas();
            this.charts.status.data.datasets[0].data = [
                dados.pendentes,
                dados.andamento,
                dados.concluidas,
                dados.atrasadas
            ];
            this.charts.status.update();
        }

        if (this.charts.progress) {
            const sistemasProgresso = this.sistemas.map(sistema => {
                const atividades = sistema.atividades || [];
                if (atividades.length === 0) return 0;
                
                const concluidas = atividades.filter(a => a.status === 'concluido').length;
                return (concluidas / atividades.length) * 100;
            });
            
            this.charts.progress.data.datasets[0].data = sistemasProgresso;
            this.charts.progress.update();
        }
    }

    async salvarSistema(sistemaId) {
        const sistema = this.sistemas.find(s => s.id === sistemaId);
        if (!sistema) return;

        try {
            await db.collection('sistemas').doc(sistemaId).set(sistema);
            console.log('💾 Sistema salvo:', sistemaId);
        } catch (error) {
            console.error('❌ Erro ao salvar sistema:', error);
        }
    }

    async adicionarAtividade(sistemaId, tipo, atividade) {
        const sistema = this.sistemas.find(s => s.id === sistemaId);
        if (!sistema) return;

        if (!sistema.atividades) sistema.atividades = [];
        
        const novaAtividade = {
            id: Date.now().toString(),
            tipo: tipo,
            ...atividade,
            dataCriacao: new Date().toLocaleDateString('pt-BR'),
            status: 'pendente'
        };

        sistema.atividades.push(novaAtividade);
        await this.salvarSistema(sistemaId);
        
        this.renderizarSistemas();
        this.atualizarGraficos();
        
        window.dispatchEvent(new Event('sistemaAtualizado'));
    }

    async atualizarAtividade(sistemaId, atividadeId, dados) {
        const sistema = this.sistemas.find(s => s.id === sistemaId);
        if (!sistema || !sistema.atividades) return;

        const index = sistema.atividades.findIndex(a => a.id === atividadeId);
        if (index === -1) return;

        sistema.atividades[index] = { ...sistema.atividades[index], ...dados };
        await this.salvarSistema(sistemaId);
        
        this.renderizarSistemas();
        this.atualizarGraficos();
        
        window.dispatchEvent(new Event('sistemaAtualizado'));
    }

    async excluirAtividade(sistemaId, atividadeId) {
        const sistema = this.sistemas.find(s => s.id === sistemaId);
        if (!sistema || !sistema.atividades) return;

        sistema.atividades = sistema.atividades.filter(a => a.id !== atividadeId);
        await this.salvarSistema(sistemaId);
        
        this.renderizarSistemas();
        this.atualizarGraficos();
        
        window.dispatchEvent(new Event('sistemaAtualizado'));
    }

    async toggleStatusAtividade(sistemaId, atividadeId) {
        const sistema = this.sistemas.find(s => s.id === sistemaId);
        if (!sistema || !sistema.atividades) return;

        const atividade = sistema.atividades.find(a => a.id === atividadeId);
        if (!atividade) return;

        let novoStatus;
        switch(atividade.status) {
            case 'pendente':
                novoStatus = 'andamento';
                break;
            case 'andamento':
                novoStatus = 'concluido';
                break;
            case 'concluido':
                novoStatus = 'pendente';
                break;
            default:
                novoStatus = 'pendente';
        }

        await this.atualizarAtividade(sistemaId, atividadeId, { status: novoStatus });
    }
}

// Instanciar e inicializar o sistema
const monitoramento = new SistemaMonitoramento();

// Funções globais
function logout() {
    localStorage.removeItem('usuarioLogado');
    window.location.href = 'login.html';
}

function toggleSistema(sistemaId) {
    const elemento = document.getElementById(`sistema-${sistemaId}`);
    elemento.style.display = elemento.style.display === 'none' ? 'block' : 'none';
}

function abrirModalAtividade(sistemaId, tipo) {
    const modal = document.getElementById('modalDetalhes');
    const tituloMap = {
        'execucao': 'Execução das Atividades',
        'monitoramento': 'Monitoramento',
        'conclusao': 'Conclusão e Revisão'
    };

    document.getElementById('modalTitulo').textContent = `Nova Atividade - ${tituloMap[tipo]}`;
    
    document.getElementById('modalDetalhesBody').innerHTML = `
        <form id="formAtividade">
            <div class="form-group">
                <label for="tituloAtividade">Título *</label>
                <input type="text" id="tituloAtividade" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="descricaoAtividade">Descrição</label>
                <textarea id="descricaoAtividade" class="form-control"></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="responsavelAtividade">Responsável *</label>
                    <input type="text" id="responsavelAtividade" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="dataPrevista">Data Prevista</label>
                    <input type="date" id="dataPrevista" class="form-control">
                </div>
            </div>
            <div class="form-group">
                <label for="prioridadeAtividade">Prioridade</label>
                <select id="prioridadeAtividade" class="form-control">
                    <option value="baixa">Baixa</option>
                    <option value="media" selected>Média</option>
                    <option value="alta">Alta</option>
                </select>
            </div>
        </form>
    `;

    modal.style.display = 'flex';
    
    // Salvar referências para uso posterior
    window.modalSistemaId = sistemaId;
    window.modalTipo = tipo;
}

function salvarAtividade() {
    const sistemaId = window.modalSistemaId;
    const tipo = window.modalTipo;
    
    const atividade = {
        titulo: document.getElementById('tituloAtividade').value,
        descricao: document.getElementById('descricaoAtividade').value,
        responsavel: document.getElementById('responsavelAtividade').value,
        dataPrevista: document.getElementById('dataPrevista').value,
        prioridade: document.getElementById('prioridadeAtividade').value
    };

    monitoramento.adicionarAtividade(sistemaId, tipo, atividade);
    fecharModal();
}

function editarAtividade(sistemaId, atividadeId) {
    const sistema = monitoramento.sistemas.find(s => s.id === sistemaId);
    if (!sistema || !sistema.atividades) return;

    const atividade = sistema.atividades.find(a => a.id === atividadeId);
    if (!atividade) return;

    const modal = document.getElementById('modalDetalhes');
    document.getElementById('modalTitulo').textContent = 'Editar Atividade';

    document.getElementById('modalDetalhesBody').innerHTML = `
        <form id="formAtividade">
            <div class="form-group">
                <label for="tituloAtividade">Título *</label>
                <input type="text" id="tituloAtividade" class="form-control" value="${atividade.titulo}" required>
            </div>
            <div class="form-group">
                <label for="descricaoAtividade">Descrição</label>
                <textarea id="descricaoAtividade" class="form-control">${atividade.descricao || ''}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="responsavelAtividade">Responsável *</label>
                    <input type="text" id="responsavelAtividade" class="form-control" value="${atividade.responsavel}" required>
                </div>
                <div class="form-group">
                    <label for="dataPrevista">Data Prevista</label>
                    <input type="date" id="dataPrevista" class="form-control" value="${atividade.dataPrevista || ''}">
                </div>
            </div>
            <div class="form-group">
                <label for="statusAtividade">Status</label>
                <select id="statusAtividade" class="form-control">
                    <option value="pendente" ${atividade.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                    <option value="andamento" ${atividade.status === 'andamento' ? 'selected' : ''}>Em Andamento</option>
                    <option value="concluido" ${atividade.status === 'concluido' ? 'selected' : ''}>Concluído</option>
                </select>
            </div>
        </form>
    `;

    modal.style.display = 'flex';
    
    // Salvar referências para uso posterior
    window.modalSistemaId = sistemaId;
    window.modalAtividadeId = atividadeId;
}

function atualizarAtividade() {
    const sistemaId = window.modalSistemaId;
    const atividadeId = window.modalAtividadeId;
    
    const dados = {
        titulo: document.getElementById('tituloAtividade').value,
        descricao: document.getElementById('descricaoAtividade').value,
        responsavel: document.getElementById('responsavelAtividade').value,
        dataPrevista: document.getElementById('dataPrevista').value,
        status: document.getElementById('statusAtividade').value
    };

    monitoramento.atualizarAtividade(sistemaId, atividadeId, dados);
    fecharModal();
}

function excluirAtividade(sistemaId, atividadeId) {
    if (confirm('Tem certeza que deseja excluir esta atividade?')) {
        monitoramento.excluirAtividade(sistemaId, atividadeId);
    }
}

function toggleStatusAtividade(sistemaId, atividadeId) {
    monitoramento.toggleStatusAtividade(sistemaId, atividadeId);
}

function fecharModal() {
    document.getElementById('modalDetalhes').style.display = 'none';
    delete window.modalSistemaId;
    delete window.modalAtividadeId;
    delete window.modalTipo;
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    monitoramento.init();
});

// Fechar modal clicando fora
window.onclick = function(event) {
    const modal = document.getElementById('modalDetalhes');
    if (event.target === modal) {
        fecharModal();
    }
};
