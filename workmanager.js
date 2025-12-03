// workmanager.js - Sistema de Grupos de Trabalho com Firebase

console.log('=== WORK MANAGER INICIANDO ===');

// Sistema de Gerenciamento de Grupos
class WorkManager {
    constructor() {
        this.grupos = [];
        this.usuarios = [];
        this.tarefasGrupo = [];
        this.usuarioAtual = null;
        this.grupoEditando = null;
        this.filtroAtual = 'meus';
        this.unsubscribeListeners = [];
    }

    async init() {
        console.log('🚀 Inicializando Work Manager...');
        
        try {
            // 1. Verificar autenticação
            await this.verificarAutenticacao();
            
            // 2. Carregar dados iniciais
            await this.carregarDadosIniciais();
            
            // 3. Configurar listeners em tempo real
            this.configurarListeners();
            
            // 4. Configurar eventos da interface
            this.configurarEventos();
            
            console.log('✅ Work Manager inicializado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            this.mostrarErro('Erro ao inicializar o sistema');
        }
    }

    async verificarAutenticacao() {
        const usuarioLogado = localStorage.getItem('usuarioLogado');
        
        if (!usuarioLogado) {
            console.log('❌ Usuário não autenticado');
            window.location.href = 'login.html';
            return;
        }
        
        this.usuarioAtual = JSON.parse(usuarioLogado);
        
        // Atualizar interface
        if (document.getElementById('userName')) {
            document.getElementById('userName').textContent = 
                this.usuarioAtual.nome || this.usuarioAtual.usuario;
        }
        
        // Esconder loading e mostrar conteúdo
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
        }, 500);
    }

    async carregarDadosIniciais() {
        console.log('📊 Carregando dados iniciais...');
        
        try {
            // 1. Carregar todos os usuários do sistema
            const usuariosSnapshot = await db.collection('usuarios').get();
            this.usuarios = usuariosSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(`✅ ${this.usuarios.length} usuários carregados`);

            // 2. Atualizar status de sincronização
            this.atualizarStatusSincronizacao('✅ Conectado');
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            this.atualizarStatusSincronizacao('❌ Erro de conexão');
            throw error;
        }
    }

    configurarListeners() {
        console.log('📡 Configurando listeners do Firestore...');
        
        // 1. Listener para grupos onde o usuário é membro
        const gruposListener = db.collection('grupos')
            .where('membros', 'array-contains', this.usuarioAtual.usuario)
            .onSnapshot(
                (snapshot) => {
                    console.log('🔄 Grupos atualizados:', snapshot.size);
                    this.processarGrupos(snapshot);
                },
                (error) => {
                    console.error('❌ Erro no listener de grupos:', error);
                    this.atualizarStatusSincronizacao('⚠️ Sincronização interrompida');
                }
            );
        
        this.unsubscribeListeners.push(gruposListener);

        // 2. Listener para convites pendentes
        const convitesListener = db.collection('grupos')
            .where('convites', 'array-contains', this.usuarioAtual.usuario)
            .onSnapshot(
                (snapshot) => {
                    this.atualizarBadgeConvites(snapshot.size);
                },
                (error) => {
                    console.error('❌ Erro no listener de convites:', error);
                }
            );
        
        this.unsubscribeListeners.push(convitesListener);
    }

    configurarEventos() {
        // Busca em tempo real
        document.getElementById('searchGroups').addEventListener('input', (e) => {
            this.filtrarGrupos(this.filtroAtual, e.target.value);
        });

        // Fechar modais clicando fora
        window.onclick = (event) => {
            const modals = ['modalGrupo', 'modalMembros', 'modalDetalhesGrupo'];
            modals.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (event.target === modal) {
                    this[`fecharModal${modalId.replace('modal', '')}`]();
                }
            });
        };
    }

    processarGrupos(snapshot) {
        this.grupos = snapshot.docs.map(doc => {
            const data = doc.data();
            const membro = data.membros?.find(m => m.usuarioId === this.usuarioAtual.usuario);
            
            return {
                id: doc.id,
                ...data,
                minhaPermissao: membro?.permissao || 'pendente',
                membroAtual: membro
            };
        });
        
        this.atualizarInterfaceGrupos();
        this.atualizarBadgeConvites();
    }

    atualizarInterfaceGrupos() {
        const container = document.getElementById('groupsContainer');
        const gruposFiltrados = this.filtrarGrupos(this.filtroAtual);
        
        if (gruposFiltrados.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users-slash"></i>
                    <h3>Nenhum grupo encontrado</h3>
                    <p>Clique em "Novo Grupo" para começar ou aguarde convites</p>
                </div>
            `;
            return;
        }

        container.innerHTML = gruposFiltrados.map(grupo => {
            const permissaoClass = grupo.minhaPermissao === 'pendente' ? 'convite-pendente' : grupo.minhaPermissao;
            const membrosCount = grupo.membros?.length || 0;
            const tarefasCount = grupo.tarefas?.length || 0;
            
            return `
                <div class="group-card permissao-${permissaoClass}">
                    <div class="group-header">
                        <div class="group-title">
                            <h3>${grupo.nome}</h3>
                            <span class="permissao-badge ${grupo.minhaPermissao}">
                                ${grupo.minhaPermissao === 'pendente' ? 'Convite' : grupo.minhaPermissao}
                            </span>
                        </div>
                        <div class="group-desc">${grupo.descricao || 'Sem descrição'}</div>
                        <div class="group-meta">
                            <div class="group-stats">
                                <div class="group-stat">
                                    <i class="fas fa-users"></i>
                                    <span>${membrosCount} membro${membrosCount !== 1 ? 's' : ''}</span>
                                </div>
                                <div class="group-stat">
                                    <i class="fas fa-tasks"></i>
                                    <span>${tarefasCount} tarefa${tarefasCount !== 1 ? 's' : ''}</span>
                                </div>
                            </div>
                            <small><i class="fas fa-calendar"></i> ${this.formatarData(grupo.dataCriacao)}</small>
                        </div>
                    </div>
                    <div class="group-actions">
                        ${grupo.minhaPermissao === 'pendente' ? `
                            <button class="btn btn-success btn-sm" onclick="workManager.responderConvite('${grupo.id}', 'aceitar')">
                                <i class="fas fa-check"></i> Aceitar
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="workManager.responderConvite('${grupo.id}', 'recusar')">
                                <i class="fas fa-times"></i> Recusar
                            </button>
                        ` : `
                            <button class="btn btn-outline btn-sm" onclick="workManager.verDetalhesGrupo('${grupo.id}')">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                            ${this.getBotoesPorPermissao(grupo)}
                        `}
                    </div>
                </div>
            `;
        }).join('');
    }

    getBotoesPorPermissao(grupo) {
        const baseBotoes = `
            <button class="btn btn-primary btn-sm" onclick="workManager.gerenciarMembros('${grupo.id}')">
                <i class="fas fa-users-cog"></i> Membros
            </button>
        `;
        
        if (grupo.minhaPermissao === 'admin') {
            return baseBotoes + `
                <button class="btn btn-warning btn-sm" onclick="workManager.editarGrupo('${grupo.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-danger btn-sm" onclick="workManager.excluirGrupo('${grupo.id}')">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            `;
       
