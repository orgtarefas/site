// workmanager.js - Sistema com Firebase v12
console.log('=== WORK MANAGER v12 INICIANDO ===');

// Sistema de Gerenciamento de Grupos com Firebase v12
class WorkManagerV12 {
    constructor() {
        this.modules = null;
        this.db = null;
        this.grupos = [];
        this.usuarios = [];
        this.tarefasGrupo = [];
        this.usuarioAtual = null;
        this.grupoEditando = null;
        this.filtroAtual = 'meus';
        this.unsubscribeListeners = [];
        
        // Inicializar quando o Firebase estiver pronto
        if (window.firebaseModules) {
            this.initModules();
        } else {
            window.onFirebaseReady = () => this.initModules();
        }
    }

    initModules() {
        console.log('🔥 Inicializando módulos Firebase v12...');
        this.modules = window.firebaseModules;
        this.db = this.modules.db;
        
        // Iniciar o sistema
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando Work Manager v12...');
        
        try {
            // 1. Verificar autenticação
            await this.verificarAutenticacao();
            
            // 2. Se não estiver autenticado, mostrar modo demo
            if (!this.usuarioAtual) {
                console.log('⚠️ Usuário não autenticado - Modo demonstração');
                this.mostrarModoDemonstracao();
                return;
            }
            
            // 3. Carregar dados iniciais
            await this.carregarDadosIniciais();
            
            // 4. Configurar listeners
            this.configurarListeners();
            
            // 5. Configurar eventos da interface
            this.configurarEventos();
            
            console.log('✅ Work Manager v12 inicializado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            this.mostrarModoDemonstracao();
            this.mostrarNotificacao('Erro ao conectar com o banco de dados', 'error');
        }
    }

    async verificarAutenticacao() {
        try {
            const usuarioLogado = localStorage.getItem('usuarioLogado');
            
            if (!usuarioLogado) {
                console.log('⚠️ Nenhum usuário logado encontrado');
                return;
            }
            
            this.usuarioAtual = JSON.parse(usuarioLogado);
            console.log('👤 Usuário autenticado:', this.usuarioAtual.usuario);
            
            // Atualizar interface
            if (document.getElementById('userName')) {
                document.getElementById('userName').textContent = 
                    this.usuarioAtual.nome || this.usuarioAtual.usuario;
            }
            
        } catch (error) {
            console.error('❌ Erro ao verificar autenticação:', error);
            this.usuarioAtual = null;
        }
    }

    mostrarModoDemonstracao() {
        // Esconder loading
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        
        this.atualizarStatusSincronizacao('🔶 Modo Demonstração');
        
        // Mostrar dados de exemplo
        const container = document.getElementById('groupsContainer');
        container.innerHTML = `
            <div class="group-card permissao-admin">
                <div class="group-header">
                    <div class="group-title">
                        <h3>Projeto Alpha - Demo</h3>
                        <span class="permissao-badge admin">Admin</span>
                    </div>
                    <div class="group-desc">Exemplo de grupo no Work Manager</div>
                    <div class="group-meta">
                        <div class="group-stats">
                            <div class="group-stat">
                                <i class="fas fa-users"></i>
                                <span>3 membros</span>
                            </div>
                            <div class="group-stat">
                                <i class="fas fa-tasks"></i>
                                <span>5 tarefas</span>
                            </div>
                        </div>
                        <small><i class="fas fa-calendar"></i> Hoje</small>
                    </div>
                </div>
                <div class="group-actions">
                    <button class="btn btn-outline btn-sm" onclick="alert('Faça login para usar esta funcionalidade')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="alert('Faça login para gerenciar membros')">
                        <i class="fas fa-users-cog"></i> Membros
                    </button>
                </div>
            </div>
            
            <div class="group-card permissao-atuador">
                <div class="group-header">
                    <div class="group-title">
                        <h3>Time de Desenvolvimento</h3>
                        <span class="permissao-badge atuador">Atuador</span>
                    </div>
                    <div class="group-desc">Equipe de desenvolvimento web</div>
                    <div class="group-meta">
                        <div class="group-stats">
                            <div class="group-stat">
                                <i class="fas fa-users"></i>
                                <span>6 membros</span>
                            </div>
                            <div class="group-stat">
                                <i class="fas fa-tasks"></i>
                                <span>15 tarefas</span>
                            </div>
                        </div>
                        <small><i class="fas fa-calendar"></i> 2 dias</small>
                    </div>
                </div>
                <div class="group-actions">
                    <button class="btn btn-outline btn-sm" onclick="alert('Faça login para usar esta funcionalidade')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="alert('Faça login para gerenciar membros')">
                        <i class="fas fa-users-cog"></i> Membros
                    </button>
                </div>
            </div>
            
            <div class="empty-state" style="grid-column: 1 / -1; margin-top: 30px;">
                <i class="fas fa-info-circle"></i>
                <h3>Work Manager - Modo Demonstração</h3>
                <p>Para usar todas as funcionalidades:</p>
                <ol style="text-align: left; display: inline-block; margin-top: 10px;">
                    <li>Faça login no sistema</li>
                    <li>Os grupos serão sincronizados com o Firebase</li>
                    <li>Você poderá criar grupos e convitar membros</li>
                </ol>
                <button class="btn btn-primary" onclick="window.location.href='login.html'" style="margin-top: 20px;">
                    <i class="fas fa-sign-in-alt"></i> Fazer Login
                </button>
            </div>
        `;
    }

    async carregarDadosIniciais() {
        console.log('📊 Carregando dados iniciais v12...');
        
        try {
            // 1. Carregar todos os usuários
            const usuariosRef = this.modules.collection(this.db, 'usuarios');
            const usuariosSnapshot = await this.modules.getDocs(usuariosRef);
            
            this.usuarios = usuariosSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`✅ ${this.usuarios.length} usuários carregados`);
            
            // 2. Esconder loading e mostrar interface
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
            
            this.atualizarStatusSincronizacao('✅ Conectado ao Firebase');
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            this.atualizarStatusSincronizacao('❌ Erro de conexão');
            throw error;
        }
    }

    configurarListeners() {
        console.log('📡 Configurando listeners v12...');
        
        // 1. Listener para grupos onde o usuário é membro
        try {
            const gruposRef = this.modules.collection(this.db, 'grupos');
            const q = this.modules.query(
                gruposRef,
                this.modules.where('membros', 'array-contains', this.usuarioAtual.usuario)
            );
            
            const unsubscribe = this.modules.onSnapshot(q, 
                (snapshot) => {
                    console.log('🔄 Grupos atualizados:', snapshot.size);
                    this.processarGrupos(snapshot);
                },
                (error) => {
                    console.error('❌ Erro no listener de grupos:', error);
                    this.atualizarStatusSincronizacao('⚠️ Sincronização interrompida');
                }
            );
            
            this.unsubscribeListeners.push(unsubscribe);
            
        } catch (error) {
            console.error('❌ Erro ao configurar listener:', error);
        }
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
            const membro = Array.isArray(data.membros) 
                ? data.membros.find(m => m.usuarioId === this.usuarioAtual.usuario)
                : null;
            
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
            const membrosCount = Array.isArray(grupo.membros) ? grupo.membros.length : 0;
            const tarefasCount = Array.isArray(grupo.tarefas) ? grupo.tarefas.length : 0;
            
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
        }
        
        if (grupo.minhaPermissao === 'atuador') {
            return baseBotoes + `
                <button class="btn btn-primary btn-sm" onclick="workManager.novaTarefaGrupo('${grupo.id}')">
                    <i class="fas fa-plus"></i> Tarefa
                </button>
            `;
        }
        
        return baseBotoes;
    }

    filtrarGrupos(filtro, termoBusca = '') {
        let gruposFiltrados = this.grupos;
        
        // Aplicar filtro principal
        switch(filtro) {
            case 'meus':
                gruposFiltrados = gruposFiltrados.filter(g => 
                    g.minhaPermissao !== 'pendente' && 
                    g.minhaPermissao !== undefined
                );
                break;
            case 'convidados':
                gruposFiltrados = gruposFiltrados.filter(g => 
                    g.minhaPermissao === 'pendente'
                );
                break;
            case 'todos':
                // Mostra todos os grupos onde é membro
                break;
        }
        
        // Aplicar busca
        if (termoBusca) {
            const termo = termoBusca.toLowerCase();
            gruposFiltrados = gruposFiltrados.filter(g => 
                g.nome.toLowerCase().includes(termo) ||
                (g.descricao && g.descricao.toLowerCase().includes(termo))
            );
        }
        
        return gruposFiltrados;
    }

    // FUNÇÕES DE GRUPOS - COM FIREBASE v12
    async salvarGrupo() {
        const nome = document.getElementById('grupoNome').value;
        const descricao = document.getElementById('grupoDescricao').value;
        const cor = document.getElementById('grupoCor').value;
        const visibilidade = document.getElementById('grupoVisibilidade').value;
        
        if (!nome) {
            this.mostrarNotificacao('Preencha o nome do grupo', 'error');
            return;
        }
        
        try {
            const grupoData = {
                nome,
                descricao,
                cor,
                visibilidade,
                criador: this.usuarioAtual.usuario,
                dataCriacao: this.modules.serverTimestamp(),
                membros: [{
                    usuarioId: this.usuarioAtual.usuario,
                    permissao: 'admin',
                    dataEntrada: this.modules.serverTimestamp(),
                    nome: this.usuarioAtual.nome || this.usuarioAtual.usuario
                }],
                tarefas: []
            };
            
            if (this.grupoEditando) {
                // Editar grupo existente - Firebase v12
                const grupoRef = this.modules.doc(this.db, 'grupos', this.grupoEditando);
                await this.modules.updateDoc(grupoRef, grupoData);
                this.mostrarNotificacao('✅ Grupo atualizado com sucesso!', 'success');
            } else {
                // Criar novo grupo - Firebase v12
                const gruposRef = this.modules.collection(this.db, 'grupos');
                await this.modules.addDoc(gruposRef, grupoData);
                this.mostrarNotificacao('✅ Grupo criado com sucesso!', 'success');
            }
            
            this.fecharModalGrupo();
            
        } catch (error) {
            console.error('❌ Erro ao salvar grupo:', error);
            this.mostrarNotificacao('Erro ao salvar grupo: ' + error.message, 'error');
        }
    }

    async excluirGrupo(grupoId) {
        if (!confirm('Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.')) {
            return;
        }
        
        try {
            const grupoRef = this.modules.doc(this.db, 'grupos', grupoId);
            await this.modules.deleteDoc(grupoRef);
            this.mostrarNotificacao('✅ Grupo excluído com sucesso!', 'success');
        } catch (error) {
            console.error('❌ Erro ao excluir grupo:', error);
            this.mostrarNotificacao('Erro ao excluir grupo', 'error');
        }
    }

    // FUNÇÕES DE MEMBROS - COM FIREBASE v12
    async gerenciarMembros(grupoId) {
        this.grupoEditando = grupoId;
        const grupo = this.grupos.find(g => g.id === grupoId);
        
        if (!grupo || grupo.minhaPermissao !== 'admin') {
            this.mostrarNotificacao('Você não tem permissão para gerenciar membros', 'error');
            return;
        }
        
        document.getElementById('modalMembrosTitulo').textContent = `Membros - ${grupo.nome}`;
        
        // Carregar membros do grupo
        let membrosHTML = '';
        
        if (grupo.membros && grupo.membros.length > 0) {
            membrosHTML = grupo.membros.map(membro => {
                const usuario = this.usuarios.find(u => u.usuario === membro.usuarioId);
                const isYou = membro.usuarioId === this.usuarioAtual.usuario;
                
                return `
                    <div class="membro-item">
                        <div class="membro-info">
                            <div class="membro-avatar">
                                ${(usuario?.nome || membro.usuarioId).charAt(0).toUpperCase()}
                            </div>
                            <div class="membro-detalhes">
                                <h4>${usuario?.nome || membro.usuarioId} ${isYou ? '(Você)' : ''}</h4>
                                <small>${membro.permissao} • Entrou em ${this.formatarData(membro.dataEntrada)}</small>
                            </div>
                        </div>
                        <div class="membro-acoes">
                            ${!isYou ? `
                                <select class="select-permissao" data-usuario="${membro.usuarioId}" 
                                        onchange="workManager.alterarPermissao('${membro.usuarioId}', this.value)">
                                    <option value="observador" ${membro.permissao === 'observador' ? 'selected' : ''}>Observador</option>
                                    <option value="atuador" ${membro.permissao === 'atuador' ? 'selected' : ''}>Atuador</option>
                                    <option value="admin" ${membro.permissao === 'admin' ? 'selected' : ''}>Administrador</option>
                                </select>
                                <button class="btn btn-danger btn-sm" onclick="workManager.removerMembro('${membro.usuarioId}')">
                                    <i class="fas fa-user-times"></i>
                                </button>
                            ` : '<small class="text-muted">Administrador do grupo</small>'}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            membrosHTML = '<p class="text-center">Nenhum membro no grupo</p>';
        }
        
        document.getElementById('membrosContainer').innerHTML = membrosHTML;
        document.getElementById('modalMembros').style.display = 'flex';
    }

    async convidarMembro() {
        const usuarioInput = document.getElementById('inputUsuario').value;
        const permissao = document.getElementById('selectPermissao').value;
        
        if (!usuarioInput || !this.grupoEditando) {
            this.mostrarNotificacao('Preencha o nome de usuário', 'error');
            return;
        }
        
        try {
            // Buscar usuário no sistema
            const usuario = this.usuarios.find(u => 
                u.usuario === usuarioInput || 
                u.email === usuarioInput ||
                (u.nome && u.nome.toLowerCase().includes(usuarioInput.toLowerCase()))
            );
            
            if (!usuario) {
                this.mostrarNotificacao('Usuário não encontrado no sistema', 'error');
                return;
            }
            
            // Verificar se já é membro
            const grupo = this.grupos.find(g => g.id === this.grupoEditando);
            const jaMembro = grupo.membros?.find(m => m.usuarioId === usuario.usuario);
            
            if (jaMembro) {
                this.mostrarNotificacao('Este usuário já é membro do grupo', 'warning');
                return;
            }
            
            // Adicionar ao grupo - Firebase v12
            const grupoRef = this.modules.doc(this.db, 'grupos', this.grupoEditando);
            const novoMembro = {
                usuarioId: usuario.usuario,
                permissao: permissao,
                dataEntrada: this.modules.serverTimestamp(),
                nome: usuario.nome || usuario.usuario
            };
            
            await this.modules.updateDoc(grupoRef, {
                membros: this.modules.arrayUnion(novoMembro)
            });
            
            this.mostrarNotificacao(`✅ Convite enviado para ${usuario.nome || usuario.usuario}`, 'success');
            document.getElementById('inputUsuario').value = '';
            
        } catch (error) {
            console.error('❌ Erro ao convidar membro:', error);
            this.mostrarNotificacao('Erro ao convidar membro', 'error');
        }
    }

    async responderConvite(grupoId, resposta) {
        try {
            const grupoRef = this.modules.doc(this.db, 'grupos', grupoId);
            const grupo = this.grupos.find(g => g.id === grupoId);
            
            if (!grupo || !grupo.membros) {
                throw new Error('Grupo não encontrado');
            }
            
            if (resposta === 'aceitar') {
                // Encontrar e atualizar membro
                const membroIndex = grupo.membros.findIndex(m => m.usuarioId === this.usuarioAtual.usuario);
                if (membroIndex !== -1) {
                    grupo.membros[membroIndex].permissao = 'observador';
                    grupo.membros[membroIndex].dataEntrada = this.modules.serverTimestamp();
                    
                    await this.modules.updateDoc(grupoRef, {
                        membros: grupo.membros
                    });
                }
                
                this.mostrarNotificacao('✅ Convite aceito com sucesso!', 'success');
            } else {
                // Remover do array de membros
                const membro = grupo.membros.find(m => m.usuarioId === this.usuarioAtual.usuario);
                if (membro) {
                    await this.modules.updateDoc(grupoRef, {
                        membros: this.modules.arrayRemove(membro)
                    });
                }
                
                this.mostrarNotificacao('Convite recusado', 'info');
            }
            
        } catch (error) {
            console.error('❌ Erro ao responder convite:', error);
            this.mostrarNotificacao('Erro ao processar convite', 'error');
        }
    }

    async alterarPermissao(usuarioId, novaPermissao) {
        if (!this.grupoEditando) return;
        
        try {
            const grupoRef = this.modules.doc(this.db, 'grupos', this.grupoEditando);
            const grupo = this.grupos.find(g => g.id === this.grupoEditando);
            
            if (!grupo || !grupo.membros) return;
            
            // Encontrar e atualizar o membro
            const membrosAtualizados = grupo.membros.map(membro => {
                if (membro.usuarioId === usuarioId) {
                    return { ...membro, permissao: novaPermissao };
                }
                return membro;
            });
            
            await this.modules.updateDoc(grupoRef, { membros: membrosAtualizados });
            this.mostrarNotificacao('✅ Permissão atualizada com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Erro ao alterar permissão:', error);
            this.mostrarNotificacao('Erro ao alterar permissão', 'error');
        }
    }

    async removerMembro(usuarioId) {
        if (!this.grupoEditando || !confirm('Tem certeza que deseja remover este membro?')) {
            return;
        }
        
        try {
            const grupoRef = this.modules.doc(this.db, 'grupos', this.grupoEditando);
            const grupo = this.grupos.find(g => g.id === this.grupoEditando);
            
            // Encontrar o membro
            const membro = grupo.membros.find(m => m.usuarioId === usuarioId);
            if (!membro) return;
            
            // Remover do array
            await this.modules.updateDoc(grupoRef, {
                membros: this.modules.arrayRemove(membro)
            });
            
            this.mostrarNotificacao('✅ Membro removido com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Erro ao remover membro:', error);
            this.mostrarNotificacao('Erro ao remover membro', 'error');
        }
    }

    // FUNÇÕES AUXILIARES
    atualizarStatusSincronizacao(status) {
        const syncElement = document.getElementById('syncStatus');
        if (syncElement) {
            syncElement.innerHTML = `
                <i class="fas fa-${status.includes('✅') ? 'check-circle' : status.includes('❌') ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${status}</span>
            `;
        }
    }

    atualizarBadgeConvites() {
        const badge = document.getElementById('badgeConvites');
        if (badge) {
            const convitesPendentes = this.grupos.filter(g => g.minhaPermissao === 'pendente').length;
            badge.textContent = convitesPendentes;
            badge.style.display = convitesPendentes > 0 ? 'inline-block' : 'none';
        }
    }

    formatarData(timestamp) {
        if (!timestamp) return 'Data não disponível';
        
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('pt-BR');
    }

    mostrarNotificacao(mensagem, tipo = 'info') {
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
            background: ${tipo === 'success' ? '#27ae60' : tipo === 'error' ? '#e74c3c' : '#3498db'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        notification.innerHTML = `<i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i> ${mensagem}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3000);
    }

    // MODAIS
    abrirModalGrupo(grupoId = null) {
        this.grupoEditando = grupoId;
        const modal = document.getElementById('modalGrupo');
        const titulo = document.getElementById('modalGrupoTitulo');
        
        if (grupoId) {
            titulo.textContent = 'Editar Grupo';
            const grupo = this.grupos.find(g => g.id === grupoId);
            if (grupo) {
                document.getElementById('grupoNome').value = grupo.nome;
                document.getElementById('grupoDescricao').value = grupo.descricao || '';
                document.getElementById('grupoCor').value = grupo.cor || '#4a6fa5';
            }
        } else {
            titulo.textContent = 'Novo Grupo de Trabalho';
            document.getElementById('formGrupo').reset();
            document.getElementById('grupoCor').value = '#4a6fa5';
        }
        
        modal.style.display = 'flex';
    }

    fecharModalGrupo() {
        document.getElementById('modalGrupo').style.display = 'none';
        this.grupoEditando = null;
    }

    fecharModalMembros() {
        document.getElementById('modalMembros').style.display = 'none';
        this.grupoEditando = null;
    }

    verDetalhesGrupo(grupoId) {
        alert(`Detalhes do grupo ID: ${grupoId}\n\nFuncionalidade disponível na versão completa.`);
    }

    editarGrupo(grupoId) {
        this.abrirModalGrupo(grupoId);
    }

    novaTarefaGrupo(grupoId) {
        alert(`Nova tarefa no grupo ID: ${grupoId}\n\nFuncionalidade disponível na versão completa.`);
    }

    // FUNÇÕES GLOBAIS
    filtrarGrupos(filtro) {
        this.filtroAtual = filtro;
        
        // Atualizar tabs ativas
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        event.target.classList.add('active');
        
        // Filtrar e atualizar interface
        const termo = document.getElementById('searchGroups').value;
        const gruposFiltrados = this.filtrarGrupos(filtro, termo);
        
        if (gruposFiltrados.length === 0) {
            document.getElementById('groupsContainer').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users-slash"></i>
                    <h3>Nenhum grupo encontrado</h3>
                    <p>${filtro === 'convidados' ? 'Você não tem convites pendentes' : 'Nenhum grupo corresponde aos filtros'}</p>
                </div>
            `;
        } else {
            this.atualizarInterfaceGrupos();
        }
    }
}

// Criar instância global
const workManager = new WorkManagerV12();

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    workManager.init();
});

// Expor funções globais
window.workManager = workManager;
window.abrirModalGrupo = (grupoId) => workManager.abrirModalGrupo(grupoId);
window.fecharModalGrupo = () => workManager.fecharModalGrupo();
window.salvarGrupo = () => workManager.salvarGrupo();
window.filtrarGrupos = (filtro) => workManager.filtrarGrupos(filtro);
window.convidarMembro = () => workManager.convidarMembro();
window.responderConvite = (grupoId, resposta) => workManager.responderConvite(grupoId, resposta);
window.alterarPermissao = (usuarioId, permissao) => workManager.alterarPermissao(usuarioId, permissao);
window.removerMembro = (usuarioId) => workManager.removerMembro(usuarioId);
window.verDetalhesGrupo = (grupoId) => workManager.verDetalhesGrupo(grupoId);
window.editarGrupo = (grupoId) => workManager.editarGrupo(grupoId);
window.novaTarefaGrupo = (grupoId) => workManager.novaTarefaGrupo(grupoId);
window.excluirGrupo = (grupoId) => workManager.excluirGrupo(grupoId);
window.gerenciarMembros = (grupoId) => workManager.gerenciarMembros(grupoId);
