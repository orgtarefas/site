// dashboard.js - VERSÃO CORRIGIDA
console.log('=== DASHBOARD INICIANDO ===');

// Sistema de Monitoramento Dinâmico
class SistemaMonitoramento {
    constructor() {
        this.sistemas = [];
        this.usuarios = [];
        this.usuario = null;
        this.charts = {};
    }

    async init() {
        console.log('🚀 Inicializando Dashboard...');
        
        // Verificar autenticação
        await this.verificarAutenticacao();
        
        // Carregar dados
        await this.carregarDados();
        
        // Inicializar gráficos
        this.inicializarGraficos();
        
        // Renderizar sistemas
        this.renderizarSistemas();
        
        // Configurar listeners
        this.configurarListeners();
        
        console.log('✅ Dashboard inicializado com sucesso!');
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
                ...doc.data()
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
                    backgroundColor: ['#f39c12', '#3498db', '#27ae60', '#e74c3c'],
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
                    backgroundColor: this.sistemas.map(s => s.cor || '#3498db')
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
        });

        // Atualizar estatísticas na interface
        document.getElementById('total-atividades').textContent = total;
        document.getElementById('pendentes').textContent = pendentes;
        document.getElementById('andamento').textContent = andamento;
        document.getElementById('concluidas').textContent = concluidas;
        document.getElementById('atrasadas').textContent = atrasadas;

        return { total, pendentes, andamento, concluidas, atrasadas };
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
                        <i class="fas fa-project-diagram" style="color: ${sistema.cor || '#3498db'}"></i>
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
                    <p class="system-desc">${sistema.descricao || 'Sem descrição'}</p>
                    <div class="activities-grid">
                        ${this.renderizarAtividadesSistema(sistema)}
                    </div>
                </div>
            </div>
        `).join('');
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
                            atividadesTipo.map(atividade => `
                                <div class="checklist-item">
                                    <div class="item-info">
                                        <div class="item-title">${atividade.titulo}</div>
                                        ${atividade.descricao ? `<div class="item-desc">${atividade.descricao}</div>` : ''}
                                        <div class="item-meta">
                                            <span><i class="fas fa-user"></i> ${atividade.responsavel || 'Não definido'}</span>
                                            <span><i class="fas fa-calendar"></i> ${atividade.dataPrevista || 'Sem data'}</span>
                                            <span class="badge status-${atividade.status}">
                                                ${atividade.status === 'pendente' ? 'Pendente' : 
                                                  atividade.status === 'andamento' ? 'Em Andamento' : 'Concluído'}
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
                            `).join('') :
                            '<div class="checklist-item"><div class="item-desc">Nenhuma atividade cadastrada</div></div>'
                        }
                    </div>
                </div>
            `;
        }).join('');
    }

    getStatusSistema(sistema) {
        const atividades = sistema.atividades || [];
        if (atividades.length === 0) return 'pendente';
        
        const concluidas = atividades.filter(a => a.status === 'concluido').length;
        if (concluidas === atividades.length) return 'concluido';
        
        const emAndamento = atividades.filter(a => a.status === 'andamento').length;
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
    if (elemento.style.display === 'none') {
        elemento.style.display = 'block';
    } else {
        elemento.style.display = 'none';
    }
}

function abrirModalSistema() {
    document.getElementById('modalSistema').style.display = 'flex';
    document.getElementById('modalSistemaTitulo').textContent = 'Novo Sistema';
    document.getElementById('formSistema').reset();
    document.getElementById('sistemaCor').value = '#3498db';
}

function fecharModalSistema() {
    document.getElementById('modalSistema').style.display = 'none';
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
        await db.collection('sistemas').add({
            nome: nome,
            descricao: descricao,
            cor: cor,
            dataCriacao: firebase.firestore.FieldValue.serverTimestamp(),
            criadoPor: monitoramento.usuario.usuario
        });
        
        fecharModalSistema();
        alert('✅ Sistema criado com sucesso!');
        
        // Recarregar dados
        await monitoramento.carregarDados();
        monitoramento.renderizarSistemas();
        monitoramento.atualizarGraficos();
        
    } catch (error) {
        console.error('❌ Erro ao criar sistema:', error);
        alert('Erro ao criar sistema: ' + error.message);
    }
}

function abrirModalAtividade(sistemaId, tipo = 'execucao') {
    const modal = document.getElementById('modalAtividade');
    const titulos = {
        'execucao': 'Execução das Atividades',
        'monitoramento': 'Monitoramento',
        'conclusao': 'Conclusão e Revisão'
    };
    
    document.getElementById('modalAtividadeTitulo').textContent = 
        `Nova Atividade - ${titulos[tipo]}`;
    
    // Gerar opções de usuários
    const usuariosOptions = monitoramento.usuarios.map(user => 
        `<option value="${user.usuario}">${user.nome || user.usuario}</option>`
    ).join('');
    
    document.getElementById('modalAtividadeBody').innerHTML = `
        <form id="formAtividade" onsubmit="event.preventDefault(); salvarAtividade('${sistemaId}', '${tipo}');">
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
                    <label for="prioridadeAtividade">Prioridade</label>
                    <select id="prioridadeAtividade" class="form-control">
                        <option value="baixa">Baixa</option>
                        <option value="media" selected>Média</option>
                        <option value="alta">Alta</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="statusAtividade">Status</label>
                    <select id="statusAtividade" class="form-control">
                        <option value="pendente">Pendente</option>
                        <option value="andamento">Em Andamento</option>
                        <option value="concluido">Concluído</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                <button type="button" class="btn btn-outline" onclick="fecharModalAtividade()">Cancelar</button>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> Salvar Atividade
                </button>
            </div>
        </form>
    `;
    
    // Preencher data atual como padrão
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('dataPrevista').value = hoje;
    
    modal.style.display = 'flex';
}

function fecharModalAtividade() {
    document.getElementById('modalAtividade').style.display = 'none';
}

async function salvarAtividade(sistemaId, tipo) {
    const titulo = document.getElementById('tituloAtividade').value;
    const responsavel = document.getElementById('responsavelAtividade').value;
    
    if (!titulo || !responsavel) {
        alert('Preencha todos os campos obrigatórios');
        return;
    }
    
    const atividade = {
        sistemaId: sistemaId,
        tipo: tipo,
        titulo: titulo,
        descricao: document.getElementById('descricaoAtividade').value,
        responsavel: responsavel,
        dataPrevista: document.getElementById('dataPrevista').value,
        prioridade: document.getElementById('prioridadeAtividade').value,
        status: document.getElementById('statusAtividade').value,
        dataRegistro: firebase.firestore.FieldValue.serverTimestamp(),
        criadoPor: monitoramento.usuario.usuario
    };
    
    try {
        await db.collection('atividades').add(atividade);
        fecharModalAtividade();
        alert('✅ Atividade criada com sucesso!');
        
        // Recarregar dados
        await monitoramento.carregarDados();
        monitoramento.renderizarSistemas();
        monitoramento.atualizarGraficos();
        
    } catch (error) {
        console.error('❌ Erro ao criar atividade:', error);
        alert('Erro ao criar atividade: ' + error.message);
    }
}

function editarAtividade(atividadeId) {
    alert('Funcionalidade de edição será implementada em breve!');
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
