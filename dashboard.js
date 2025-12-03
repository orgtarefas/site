// Sistema de Monitoramento Dinâmico com Firebase
class SistemaMonitoramento {
    constructor() {
        this.sistemas = [];
        this.usuarios = [];
        this.usuario = null;
        this.charts = {};
        
        // Sistemas padrão
        this.sistemasPadrao = [
            {
                id: 'siscriacao',
                nome: 'SISCRIAÇÃO',
                descricao: 'Sistema de criação e gerenciamento',
                cor: '#3498db',
                tipo: 'sistema',
                dataCriacao: new Date().toISOString()
            },
            {
                id: 'sisreset',
                nome: 'SISRESET',
                descricao: 'Sistema de reset e recuperação',
                cor: '#9b59b6',
                tipo: 'sistema',
                dataCriacao: new Date().toISOString()
            },
            {
                id: 'macro-convenios',
                nome: 'Macro convênios PKL',
                descricao: 'Macro para gestão de convênios PKL',
                cor: '#2ecc71',
                tipo: 'sistema',
                dataCriacao: new Date().toISOString()
            }
        ];
    }

    async init() {
        console.log('🚀 Inicializando Sistema de Monitoramento...');
        
        // Verificar autenticação
        await this.verificarAutenticacao();
        
        // Carregar usuários
        await this.carregarUsuarios();
        
        // Carregar dados do Firebase
        await this.carregarSistemas();
        await this.carregarAtividades();
        
        // Inicializar gráficos
        this.inicializarGraficos();
        
        // Renderizar sistemas
        this.renderizarSistemas();
        
        // Configurar listeners
        this.configurarListeners();
        
        console.log('✅ Sistema inicializado com sucesso!');
        
        // Atualizar status para Pronto
        document.getElementById('status-sincronizacao').innerHTML = 
            '<i class="fas fa-check-circle"></i> Pronto';
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

    async carregarUsuarios() {
        console.log('👥 Carregando usuários...');
        
        try {
            const snapshot = await db.collection("usuarios").get();
            
            this.usuarios = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log('✅ Usuários carregados:', this.usuarios.length);

        } catch (error) {
            console.error('❌ Erro ao carregar usuários:', error);
            this.usuarios = [];
        }
    }

    async carregarSistemas() {
        console.log('📊 Carregando sistemas...');
        
        try {
            const snapshot = await db.collection('sistemas').get();
            
            if (!snapshot.empty) {
                this.sistemas = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log('✅ Sistemas carregados do Firebase:', this.sistemas.length);
            } else {
                console.log('📂 Firebase vazio, criando sistemas padrão...');
                
                // Criar sistemas padrão no Firebase
                for (const sistema of this.sistemasPadrao) {
                    await db.collection('sistemas').doc(sistema.id).set(sistema);
                }
                
                this.sistemas = this.sistemasPadrao;
                console.log('✅ Sistemas padrão criados');
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar sistemas:', error);
            this.sistemas = this.sistemasPadrao;
        }
    }

    async carregarAtividades() {
        console.log('📋 Carregando atividades...');
        
        try {
            const snapshot = await db.collection('atividades').get();
            
            if (!snapshot.empty) {
                const atividades = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // Agrupar atividades por sistema
                this.sistemas.forEach(sistema => {
                    sistema.atividades = atividades.filter(a => a.sistemaId === sistema.id);
                });
                
                console.log('✅ Atividades carregadas:', atividades.length);
                return true;
            } else {
                console.log('📂 Nenhuma atividade encontrada');
                return true;
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar atividades:', error);
            // Atualizar status para Erro
            document.getElementById('status-sincronizacao').innerHTML = 
                '<i class="fas fa-exclamation-triangle"></i> Erro de conexão';
            return false;
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
        
        try {
            const hoje = new Date();
            const dataPrevista = new Date(atividade.dataPrevista.split('/').reverse().join('-'));
            
            return atividade.status !== 'concluido' && dataPrevista < hoje;
        } catch (error) {
            return false;
        }
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
                        <span><i class="fas fa-calendar"></i> ${atividade.dataCriacao || ''}</span>
                        ${atividade.dataPrevista ? `<span><i class="fas fa-flag"></i> ${atividade.dataPrevista}</span>` : ''}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-icon btn-toggle" onclick="toggleStatusAtividade('${atividade.id}')">
                        <i class="fas fa-${this.getIconStatus(atividade.status)}"></i>
                    </button>
                    <button class="btn-icon btn-edit" onclick="editarAtividade('${atividade.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="excluirAtividade('${atividade.id}')">
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
        // Atualizar status para Conectado
        document.getElementById('status-sincronizacao').innerHTML = 
            '<i class="fas fa-check-circle"></i> Conectado';
        
        // Configurar listener em tempo real para atividades
        db.collection('atividades')
            .onSnapshot((snapshot) => {
                console.log('📡 Atualização em tempo real das atividades');
                
                // Atualizar status para Sincronizado
                document.getElementById('status-sincronizacao').innerHTML = 
                    '<i class="fas fa-bolt"></i> Sincronizado';
                
                this.carregarAtividades().then(() => {
                    this.renderizarSistemas();
                    this.atualizarEstatisticas();
                    this.atualizarGraficos();
                });
            }, (error) => {
                console.error('❌ Erro no listener:', error);
                // Atualizar status para Erro
                document.getElementById('status-sincronizacao').innerHTML = 
                    '<i class="fas fa-exclamation-triangle"></i> Offline';
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

    async adicionarAtividade(dados) {
        try {
            const atividadeCompleta = {
                ...dados,
                dataCriacao: new Date().toLocaleDateString('pt-BR'),
                criadoPor: this.usuario.usuario,
                dataRegistro: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'pendente'
            };

            const docRef = await db.collection('atividades').add(atividadeCompleta);
            console.log('✅ Atividade criada com ID:', docRef.id);
            
            mostrarNotificacao('Atividade criada com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Erro ao criar atividade:', error);
            mostrarNotificacao('Erro ao criar atividade: ' + error.message, 'error');
        }
    }

    async atualizarAtividade(atividadeId, dados) {
        try {
            await db.collection('atividades').doc(atividadeId).update({
                ...dados,
                dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✅ Atividade atualizada:', atividadeId);
            mostrarNotificacao('Atividade atualizada com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Erro ao atualizar atividade:', error);
            mostrarNotificacao('Erro ao atualizar atividade: ' + error.message, 'error');
        }
    }

    async excluirAtividade(atividadeId) {
        try {
            await db.collection('atividades').doc(atividadeId).delete();
            console.log('🗑️ Atividade excluída:', atividadeId);
            mostrarNotificacao('Atividade excluída com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Erro ao excluir atividade:', error);
            mostrarNotificacao('Erro ao excluir atividade: ' + error.message, 'error');
        }
    }

    async toggleStatusAtividade(atividadeId) {
        try {
            const atividadeDoc = await db.collection('atividades').doc(atividadeId).get();
            if (!atividadeDoc.exists) return;
            
            const atividade = atividadeDoc.data();
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
            
            await this.atualizarAtividade(atividadeId, { status: novoStatus });
            
        } catch (error) {
            console.error('❌ Erro ao alterar status:', error);
        }
    }

    async buscarAtividade(atividadeId) {
        try {
            const doc = await db.collection('atividades').doc(atividadeId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('❌ Erro ao buscar atividade:', error);
            return null;
        }
    }
}

// Instanciar e inicializar o sistema
const monitoramento = new SistemaMonitoramento();

// Variáveis globais para o modal
let modalTipo = null;
let modalSistemaId = null;
let modalAtividadeId = null;

// Funções globais
function logout() {
    localStorage.removeItem('usuarioLogado');
    window.location.href = 'login.html';
}

function toggleSistema(sistemaId) {
    const elemento = document.getElementById(`sistema-${sistemaId}`);
    if (elemento.style.display === 'none') {
        elemento.style.display = 'block';
    } else {
        elemento.style.display = 'none';
    }
}

// dashboard.js - Apenas a função abrirModalAtividade precisa ser corrigida
function abrirModalAtividade(sistemaId, tipo) {
    const modal = document.getElementById('modalDetalhes');
    const tituloMap = {
        'execucao': 'Execução das Atividades',
        'monitoramento': 'Monitoramento',
        'conclusao': 'Conclusão e Revisão'
    };

    document.getElementById('modalTitulo').textContent = `Nova Atividade - ${tituloMap[tipo]}`;
    
    // Gerar opções de usuários
    const usuariosOptions = monitoramento.usuarios.map(user => 
        `<option value="${user.usuario}">${user.nome || user.usuario}</option>`
    ).join('');
    
    document.getElementById('modalDetalhesBody').innerHTML = `
        <form id="formAtividade" onsubmit="event.preventDefault(); salvarAtividade();">
            <div class="form-group">
                <label for="tituloAtividade">Título *</label>
                <input type="text" id="tituloAtividade" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="descricaoAtividade">Descrição</label>
                <textarea id="descricaoAtividade" class="form-control" rows="3"></textarea>
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
                    <input type="date" id="dataPrevista" class="form-control">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="statusAtividade">Status</label>
                    <select id="statusAtividade" class="form-control">
                        <option value="pendente">Pendente</option>
                        <option value="andamento">Em Andamento</option>
                        <option value="concluido">Concluído</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="prioridadeAtividade">Prioridade</label>
                    <select id="prioridadeAtividade" class="form-control">
                        <option value="baixa">Baixa</option>
                        <option value="media" selected>Média</option>
                        <option value="alta">Alta</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer" style="margin-top: 20px; padding: 20px 0 0 0; border-top: 1px solid #dee2e6;">
                <button type="button" class="btn btn-outline" onclick="fecharModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> Gravar Atividade
                </button>
            </div>
        </form>
    `;

    modal.style.display = 'flex';
    
    // Salvar referências para uso posterior
    modalSistemaId = sistemaId;
    modalTipo = tipo;
    modalAtividadeId = null;
    
    // Preencher data atual como padrão
    const hoje = new Date();
    const dataFormatada = hoje.toISOString().split('T')[0];
    document.getElementById('dataPrevista').value = dataFormatada;
}

async function editarAtividade(atividadeId) {
    const atividade = await monitoramento.buscarAtividade(atividadeId);
    if (!atividade) return;

    const modal = document.getElementById('modalDetalhes');
    document.getElementById('modalTitulo').textContent = 'Editar Atividade';

    // Gerar opções de usuários
    const usuariosOptions = monitoramento.usuarios.map(user => 
        `<option value="${user.usuario}" ${user.usuario === atividade.responsavel ? 'selected' : ''}>${user.nome || user.usuario}</option>`
    ).join('');

    document.getElementById('modalDetalhesBody').innerHTML = `
        <form id="formAtividade">
            <div class="form-group">
                <label for="tituloAtividade">Título *</label>
                <input type="text" id="tituloAtividade" class="form-control" value="${atividade.titulo || ''}" required>
            </div>
            <div class="form-group">
                <label for="descricaoAtividade">Descrição</label>
                <textarea id="descricaoAtividade" class="form-control" rows="3">${atividade.descricao || ''}</textarea>
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
                    <input type="date" id="dataPrevista" class="form-control" value="${atividade.dataPrevista || ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="statusAtividade">Status</label>
                    <select id="statusAtividade" class="form-control">
                        <option value="pendente" ${atividade.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="andamento" ${atividade.status === 'andamento' ? 'selected' : ''}>Em Andamento</option>
                        <option value="concluido" ${atividade.status === 'concluido' ? 'selected' : ''}>Concluído</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="prioridadeAtividade">Prioridade</label>
                    <select id="prioridadeAtividade" class="form-control">
                        <option value="baixa" ${atividade.prioridade === 'baixa' ? 'selected' : ''}>Baixa</option>
                        <option value="media" ${atividade.prioridade === 'media' ? 'selected' : ''}>Média</option>
                        <option value="alta" ${atividade.prioridade === 'alta' ? 'selected' : ''}>Alta</option>
                    </select>
                </div>
            </div>
        </form>
        <div class="modal-footer" id="modalFooter">
            <button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="atualizarAtividade()">
                <i class="fas fa-save"></i> Atualizar Atividade
            </button>
        </div>
    `;

    modal.style.display = 'flex';
    
    // Salvar referências para uso posterior
    modalSistemaId = atividade.sistemaId;
    modalTipo = atividade.tipo;
    modalAtividadeId = atividadeId;
}

function salvarAtividade() {
    if (!modalSistemaId || !modalTipo) return;
    
    const atividade = {
        sistemaId: modalSistemaId,
        tipo: modalTipo,
        titulo: document.getElementById('tituloAtividade').value,
        descricao: document.getElementById('descricaoAtividade').value,
        responsavel: document.getElementById('responsavelAtividade').value,
        dataPrevista: document.getElementById('dataPrevista').value,
        prioridade: document.getElementById('prioridadeAtividade').value
    };

    monitoramento.adicionarAtividade(atividade);
    fecharModal();
}

async function atualizarAtividade() {
    if (!modalAtividadeId) return;
    
    const dados = {
        titulo: document.getElementById('tituloAtividade').value,
        descricao: document.getElementById('descricaoAtividade').value,
        responsavel: document.getElementById('responsavelAtividade').value,
        dataPrevista: document.getElementById('dataPrevista').value,
        status: document.getElementById('statusAtividade').value,
        prioridade: document.getElementById('prioridadeAtividade').value
    };

    await monitoramento.atualizarAtividade(modalAtividadeId, dados);
    fecharModal();
}

async function excluirAtividade(atividadeId) {
    if (confirm('Tem certeza que deseja excluir esta atividade?')) {
        await monitoramento.excluirAtividade(atividadeId);
    }
}

async function toggleStatusAtividade(atividadeId) {
    await monitoramento.toggleStatusAtividade(atividadeId);
}

function fecharModal() {
    document.getElementById('modalDetalhes').style.display = 'none';
    modalSistemaId = null;
    modalTipo = null;
    modalAtividadeId = null;
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
        background: ${tipo === 'success' ? '#27ae60' : '#e74c3c'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    notification.innerHTML = `
        <i class="fas fa-${tipo === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${mensagem}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Adicionar estilos de animação
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
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

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
