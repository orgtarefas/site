// workmanager.js - Sistema com Firebase v12 - VERSÃO CORRIGIDA
console.log('=== WORK MANAGER v12 INICIANDO ===');

// Sistema de Gerenciamento de Grupos com Firebase v12
class WorkManagerV12 {
    constructor() {
        this.modules = null;
        this.db = null;
        this.dbLogins = null;
        this.grupos = [];
        this.usuarios = [];
        this.tarefasGrupo = [];
        this.usuarioAtual = null;
        this.grupoEditando = null;
        this.filtroAtual = 'meus';
        this.unsubscribeListeners = [];
        this.grupoSelecionado = null;
        this.usuarioParaConvitar = null;
        this.acaoConfirmacao = null;
        this.dadosConfirmacao = null;
        this.membrosSelecionados = new Set();
        
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
        this.db = this.modules.db; // Banco ORGTAREFAS
        this.dbLogins = this.modules.dbLogins; // Banco LOGINS
        
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
            // 1. Carregar todos os usuários do banco LOGINS
            await this.carregarUsuariosLogins();
            
            console.log(`✅ ${this.usuarios.length} usuários carregados do banco LOGINS`);
            
            // 2. Esconder loading e mostrar interface
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
            
            this.atualizarStatusSincronizacao('✅ On line');
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            this.atualizarStatusSincronizacao('❌ Erro de conexão');
            throw error;
        }
    }

    async carregarUsuariosLogins() {
        try {
            console.log('🔍 Carregando usuários do documento LOGINS_ORGTAREFAS...');
            
            // Acessar especificamente o documento LOGINS_ORGTAREFAS
            const docRef = this.modules.doc(this.dbLogins, 'logins', 'LOGINS_ORGTAREFAS');
            const docSnap = await this.modules.getDoc(docRef);
            
            this.usuarios = [];
            
            if (docSnap.exists()) {
                console.log('✅ Documento LOGINS_ORGTAREFAS encontrado!');
                const data = docSnap.data();
                
                // Processar cada userX_uid no documento
                Object.keys(data).forEach(key => {
                    // Verificar se é um campo userX_uid (ex: user1_uid, user2_uid, etc.)
                    if (key.startsWith('user') && (key.includes('_uid') || /\d/.test(key))) {
                        const userData = data[key];
                        
                        if (userData && userData.login) {
                            const displayName = userData.displayName || userData.login;
                            
                            const usuario = {
                                id: key,
                                login: userData.login,
                                nome: displayName,
                                displayName: displayName,
                                email: userData.email || '',
                                senha: userData.senha || '',
                                perfil: userData.perfil || '',
                                isOnline: userData.isOnline || false,
                                dadosCompletos: userData
                            };
                            
                            // IMPORTANTE: NÃO filtrar o usuário atual
                            // Precisamos dos dados dele também para mostrar o nome completo
                            this.usuarios.push(usuario);
                            
                            console.log(`👤 Usuário adicionado: ${usuario.displayName} (${usuario.login})`);
                        }
                    }
                });
                
                console.log(`✅ ${this.usuarios.length} usuários carregados do LOGINS_ORGTAREFAS`);
                
            } else {
                console.error('❌ Documento LOGINS_ORGTAREFAS não encontrado!');
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar usuários:', error);
            this.usuarios = [];
        }
    }
            

    // Nova função para processar estrutura userX_uid (LOGINS_ORGTAREFAS)
    processarEstruturaUid(data) {
        console.log('🔄 Processando estrutura userX_uid (LOGINS_ORGTAREFAS)');
        
        Object.keys(data).forEach(key => {
            if (key.includes('user') && key.includes('uid')) {
                const userData = data[key];
                
                if (userData && userData.login) {
                    const usuario = {
                        id: key, // user1_uid, user2_uid, etc.
                        login: userData.login,
                        nome: userData.displayName || userData.login,
                        displayName: userData.displayName || userData.login,
                        email: userData.email || '',
                        senha: userData.senha || '',
                        perfil: userData.perfil || '',
                        isOnline: userData.isOnline || false
                    };
                    
                    // Não adicionar o usuário atual se estiver logado
                    if (this.usuarioAtual && 
                        usuario.login === this.usuarioAtual.usuario) {
                        console.log('👤 Filtrando usuário atual:', usuario.login);
                    } else {
                        this.usuarios.push(usuario);
                    }
                }
            }
        });
    }

    // Nova função para processar estrutura individual (LOGINS_AVERBSYS)
    processarEstruturaIndivual(data) {
        console.log('🔄 Processando estrutura individual (LOGINS_AVERBSYS)');
        
        // Encontrar todos os campos de login no documento
        const userFields = Object.keys(data).filter(key => key.includes('_logiin'));
        
        userFields.forEach(field => {
            // Extrair número do usuário (ex: user_1_logiin -> 1)
            const match = field.match(/user_(\d+)_logiin/);
            if (match) {
                const userNum = match[1];
                const login = data[field];
                
                if (login) {
                    // Buscar outros dados do mesmo usuário
                    const nomeField = `user_${userNum}_nome_completo`;
                    const perfilField = `user_${userNum}_perfil`;
                    const statusField = `user_${userNum}_status`;
                    
                    const usuario = {
                        id: `user_${userNum}`,
                        login: login,
                        nome: data[nomeField] || login,
                        displayName: data[nomeField] || login,
                        perfil: data[perfilField] || '',
                        status: data[statusField] || '',
                        // Mapear para estrutura compatível
                        senha: data[`user_${userNum}_senha`] || ''
                    };
                    
                    // Não adicionar o usuário atual se estiver logado
                    if (this.usuarioAtual && 
                        usuario.login === this.usuarioAtual.usuario) {
                        console.log('👤 Filtrando usuário atual:', usuario.login);
                    } else {
                        this.usuarios.push(usuario);
                    }
                }
            }
        });
    }

    configurarListeners() {
        console.log('📡 Configurando listeners v12...');
        
        // 1. Listener para TODOS os grupos (não apenas os que o usuário é membro)
        try {
            const gruposRef = this.modules.collection(this.db, 'grupos');
            
            // Usar query sem filtro para pegar todos os grupos
            const q = this.modules.query(gruposRef);
            
            const unsubscribe = this.modules.onSnapshot(q, 
                (snapshot) => {
                    console.log('🔄 Todos os grupos atualizados:', snapshot.size);
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
            const gruposFiltrados = this.filtrarGruposPorFiltroEBusca(this.filtroAtual, e.target.value);
            this.atualizarInterfaceComGrupos(gruposFiltrados);
        });
    
        // Fechar modais clicando fora
        window.onclick = (event) => {
            const modals = ['modalGrupo', 'modalMembros', 'modalDetalhesGrupo', 'modalConfirmacao'];
            modals.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (event.target === modal) {
                    if (modalId === 'modalGrupo') this.fecharModalGrupo();
                    else if (modalId === 'modalMembros') this.fecharModalMembros();
                    else if (modalId === 'modalConfirmacao') this.fecharModalConfirmacao();
                }
            });
        };
    }

    atualizarInterfaceComGrupos(gruposFiltrados) {
        const container = document.getElementById('groupsContainer');
        
        if (gruposFiltrados.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users-slash"></i>
                    <h3>Nenhum grupo encontrado</h3>
                    <p>Nenhum grupo corresponde à busca</p>
                </div>
            `;
            return;
        }
    
        container.innerHTML = this.renderizarGrupos(gruposFiltrados);
    }

    processarGrupos(snapshot) {
        this.grupos = snapshot.docs.map(doc => {
            const data = doc.data();
            let minhaPermissao = 'membro'; // Padrão é membro
            let pertenceAoGrupo = false;
            
            // Verificar se o usuário está no grupo
            if (data.membros) {
                for (const membro of data.membros) {
                    if (typeof membro === 'string' && membro === this.usuarioAtual.usuario) {
                        minhaPermissao = 'membro';
                        pertenceAoGrupo = true;
                        break;
                    } else if (membro && typeof membro === 'object' && membro.usuarioId === this.usuarioAtual.usuario) {
                        minhaPermissao = membro.permissao || 'membro';
                        pertenceAoGrupo = true;
                        break;
                    }
                }
            }
            
            return {
                id: doc.id,
                ...data,
                minhaPermissao: minhaPermissao,
                pertenceAoGrupo: pertenceAoGrupo
            };
        });
        
        this.atualizarInterfaceGrupos();
        // Remova a chamada para atualizarBadgeConvites
    }

    atualizarInterfaceGrupos() {
        const container = document.getElementById('groupsContainer');
        const gruposFiltrados = this.filtrarGruposPorFiltroEBusca(this.filtroAtual);
        
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
    
        container.innerHTML = this.renderizarGrupos(gruposFiltrados);
    }

    filtrarGruposPorFiltroEBusca(filtro, termoBusca = '') {
        let gruposFiltrados = this.grupos;
        
        // Aplicar filtro principal
        switch(filtro) {
            case 'meus':
                // Mostrar apenas grupos onde o usuário é membro
                gruposFiltrados = gruposFiltrados.filter(g => 
                    g.pertenceAoGrupo
                );
                break;
            case 'todos':
                // Mostrar todos os grupos sem filtrar
                gruposFiltrados = gruposFiltrados;
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

    // Adicionar método auxiliar para renderizar grupos
    renderizarGrupos(gruposFiltrados) {
        return gruposFiltrados.map(grupo => {
            const permissaoClass = grupo.pertenceAoGrupo ? grupo.minhaPermissao : 'externo';
            const membrosCount = Array.isArray(grupo.membros) ? grupo.membros.length : 0;
            const tarefasCount = Array.isArray(grupo.tarefas) ? grupo.tarefas.length : 0;
            
            return `
                <div class="group-card permissao-${permissaoClass}">
                    <div class="group-header">
                        <div class="group-title">
                            <h3>${grupo.nome}</h3>
                            ${grupo.pertenceAoGrupo ? `
                                <span class="permissao-badge ${grupo.minhaPermissao}">
                                    ${grupo.minhaPermissao === 'admin' ? 'Admin' : 'Membro'}
                                </span>
                            ` : `
                                <span class="permissao-badge externo">
                                    Externo
                                </span>
                            `}
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
                        ${grupo.pertenceAoGrupo ? `
                            <!-- Botões completos para membros do grupo -->
                            <button class="btn btn-outline btn-sm" onclick="workManager.verDetalhesGrupo('${grupo.id}')">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                            <button class="btn btn-primary btn-sm" onclick="workManager.gerenciarMembros('${grupo.id}')">
                                <i class="fas fa-users-cog"></i> Membros
                            </button>
                            ${grupo.minhaPermissao === 'admin' ? `
                                <button class="btn btn-warning btn-sm" onclick="workManager.editarGrupo('${grupo.id}')">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="workManager.excluirGrupo('${grupo.id}')">
                                    <i class="fas fa-trash"></i> Excluir
                                </button>
                            ` : `
                                <button class="btn btn-danger btn-sm" onclick="workManager.sairGrupo('${grupo.id}')">
                                    <i class="fas fa-sign-out-alt"></i> Sair
                                </button>
                            `}
                        ` : `
                            <!-- Apenas botão VER para grupos externos -->
                            <button class="btn btn-outline btn-sm" onclick="workManager.verDetalhesGrupo('${grupo.id}')">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    }

    // ========== FUNÇÕES PARA MODAL DE GRUPO ==========
    
    async abrirModalGrupo(grupoId = null) {
        this.grupoEditando = grupoId;
        this.membrosSelecionados.clear();
        
        const modal = document.getElementById('modalGrupo');
        const titulo = document.getElementById('modalGrupoTitulo');
        const btnSalvar = document.querySelector('#modalGrupo .btn-primary');
        
        if (grupoId) {
            // Modo edição
            const grupo = this.grupos.find(g => g.id === grupoId);
            if (!grupo) return;
            
            titulo.textContent = 'Editar Grupo';
            btnSalvar.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
            
            document.getElementById('grupoNome').value = grupo.nome || '';
            document.getElementById('grupoDescricao').value = grupo.descricao || '';
            document.getElementById('grupoCor').value = grupo.cor || '#4a6fa5';
            
            // Carregar membros já existentes
            if (grupo.membros && Array.isArray(grupo.membros)) {
                for (const membro of grupo.membros) {
                    if (typeof membro === 'string' && membro !== this.usuarioAtual.usuario) {
                        this.membrosSelecionados.add(membro);
                    } else if (membro && typeof membro === 'object' && membro.usuarioId !== this.usuarioAtual.usuario) {
                        this.membrosSelecionados.add(membro.usuarioId);
                    }
                }
            }
            
        } else {
            // Modo criação
            titulo.textContent = 'Novo Grupo de Trabalho';
            btnSalvar.innerHTML = '<i class="fas fa-save"></i> Criar Grupo';
            
            document.getElementById('grupoNome').value = '';
            document.getElementById('grupoDescricao').value = '';
            document.getElementById('grupoCor').value = '#4a6fa5';
        }
        
        // Atualizar lista de usuários e membros selecionados
        await this.carregarUsuariosLogins();
        this.exibirUsuarios();
        this.atualizarListaMembrosSelecionados();
        
        modal.style.display = 'flex';
    }

    fecharModalGrupo() {
        document.getElementById('modalGrupo').style.display = 'none';
        this.grupoEditando = null;
        this.membrosSelecionados.clear();
    }

    async salvarGrupo() {
        try {
            const modules = this.modules;
            if (!modules || !modules.db) {
                throw new Error('Firebase não disponível');
            }
            
            const nome = document.getElementById('grupoNome').value.trim();
            if (!nome) {
                this.mostrarNotificacao('⚠️ Por favor, informe um nome para o grupo', 'warning');
                return;
            }
            
            const descricao = document.getElementById('grupoDescricao').value.trim();
            const cor = document.getElementById('grupoCor').value;
            
            if (this.grupoEditando) {
                // Editar grupo existente
                await this.editarGrupoFirebase(this.grupoEditando, nome, descricao, cor);
                this.mostrarNotificacao('✅ Grupo atualizado com sucesso!', 'success');
            } else {
                // Criar novo grupo
                const grupoData = {
                    nome: nome,
                    descricao: descricao || '',
                    cor: cor,
                    criador: this.usuarioAtual.usuario,
                    criadorNome: this.usuarioAtual.nome || this.usuarioAtual.usuario,
                    dataCriacao: modules.serverTimestamp(),
                    dataAtualizacao: modules.serverTimestamp(),
                    membros: [
                        this.usuarioAtual.usuario // Criador como primeiro membro (string simples)
                    ],
                    tarefas: []
                };
                
                // Adicionar outros membros selecionados
                for (const usuarioId of this.membrosSelecionados) {
                    grupoData.membros.push(usuarioId);
                }
                
                console.log('📝 Salvando grupo:', grupoData);
                
                const gruposRef = modules.collection(this.db, 'grupos');
                const docRef = await modules.addDoc(gruposRef, grupoData);
                
                console.log('✅ Grupo criado com ID:', docRef.id);
                this.mostrarNotificacao('✅ Grupo criado com sucesso!', 'success');
            }
            
            this.fecharModalGrupo();
            
        } catch (error) {
            console.error('❌ Erro ao salvar grupo:', error);
            this.mostrarNotificacao(`❌ Erro: ${error.message}`, 'error');
        }
    }
    
    async editarGrupoFirebase(grupoId, nome, descricao, cor) {
        const modules = this.modules;
        const grupoRef = modules.doc(this.db, 'grupos', grupoId);
        
        await modules.updateDoc(grupoRef, {
            nome: nome,
            descricao: descricao || '',
            cor: cor,
            dataAtualizacao: modules.serverTimestamp()
        });
    }

    // ========== FUNÇÕES PARA USUÁRIOS ==========
    
    exibirUsuarios(termoBusca = '') {
        const container = document.getElementById('usuariosLista');
        if (!container) return;
        
        let usuariosFiltrados = this.usuarios;
        
        if (termoBusca) {
            const termo = termoBusca.toLowerCase();
            usuariosFiltrados = usuariosFiltrados.filter(usuario =>
                (usuario.nome && usuario.nome.toLowerCase().includes(termo)) ||
                (usuario.displayName && usuario.displayName.toLowerCase().includes(termo)) ||
                (usuario.login && usuario.login.toLowerCase().includes(termo))
            );
        }
        
        if (usuariosFiltrados.length === 0) {
            container.innerHTML = `
                <div class="empty-membros">
                    <i class="fas fa-search"></i>
                    <span>Nenhum usuário encontrado</span>
                </div>
            `;
            return;
        }
        
        container.innerHTML = usuariosFiltrados.map(usuario => {
            const estaSelecionado = this.membrosSelecionados.has(usuario.login) || 
                                    this.membrosSelecionados.has(usuario.id);
            
            return `
                <div class="usuario-item ${estaSelecionado ? 'selecionado' : ''}" 
                     onclick="workManager.toggleSelecaoUsuario('${usuario.login}')">
                    <i class="fas fa-user${estaSelecionado ? '-check' : ''}"></i>
                    <div class="usuario-info">
                        <strong>${usuario.displayName || usuario.nome || usuario.login}</strong>
                        <small>${usuario.login}</small>
                    </div>
                    ${estaSelecionado ? '<i class="fas fa-check-circle" style="color: #28a745;"></i>' : ''}
                </div>
            `;
        }).join('');
    }

    toggleSelecaoUsuario(usuarioId) {
        if (this.membrosSelecionados.has(usuarioId)) {
            this.membrosSelecionados.delete(usuarioId);
        } else {
            this.membrosSelecionados.add(usuarioId);
        }
        
        this.exibirUsuarios(document.getElementById('buscarUsuario')?.value || '');
        this.atualizarListaMembrosSelecionados();
    }

    atualizarListaMembrosSelecionados() {
        const container = document.getElementById('listaMembrosSelecionados');
        if (!container) return;
        
        if (this.membrosSelecionados.size === 0) {
            container.innerHTML = `
                <div class="empty-membros">
                    <i class="fas fa-users"></i>
                    <span>Nenhum membro selecionado</span>
                </div>
            `;
            return;
        }
        
        container.innerHTML = Array.from(this.membrosSelecionados).map(usuarioId => {
            const usuario = this.usuarios.find(u => u.login === usuarioId || u.id === usuarioId);
            return `
                <div class="membro-selecionado-item">
                    <i class="fas fa-user"></i>
                    <span>${usuario ? (usuario.displayName || usuario.nome || usuario.login) : usuarioId}</span>
                    <button type="button" class="btn-remover" onclick="workManager.removerMembroSelecionado('${usuarioId}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');
    }

    removerMembroSelecionado(usuarioId) {
        this.membrosSelecionados.delete(usuarioId);
        this.exibirUsuarios(document.getElementById('buscarUsuario')?.value || '');
        this.atualizarListaMembrosSelecionados();
    }

    filtrarUsuarios(termo) {
        this.exibirUsuarios(termo);
    }

    // ========== CONVIDAR USUÁRIOS ==========
    
    async convidarUsuarioSelecionado() {
        console.log('📨 Convidando usuário...');
        
        if (!this.usuarioParaConvitar) {
            this.mostrarNotificacao('⚠️ Por favor, selecione um usuário primeiro', 'warning');
            return;
        }
        
        if (!this.grupoSelecionado) {
            this.mostrarNotificacao('❌ Nenhum grupo selecionado', 'error');
            return;
        }
        
        try {
            const modules = this.modules;
            const grupoRef = modules.doc(this.db, 'grupos', this.grupoSelecionado);
            const grupoDoc = await modules.getDoc(grupoRef);
            const grupoData = grupoDoc.data();
            
            // Verificar se o usuário já está no grupo
            let jaEstaNoGrupo = false;
            if (grupoData.membros) {
                for (const membro of grupoData.membros) {
                    if (typeof membro === 'string' && membro === this.usuarioParaConvitar) {
                        jaEstaNoGrupo = true;
                        break;
                    } else if (membro && membro.usuarioId === this.usuarioParaConvitar) {
                        jaEstaNoGrupo = true;
                        break;
                    }
                }
            }
            
            if (jaEstaNoGrupo) {
                this.mostrarNotificacao('⚠️ Este usuário já está no grupo', 'warning');
                return;
            }
            
            // Adicionar usuário como membro pendente (string simples)
            await modules.updateDoc(grupoRef, {
                membros: modules.arrayUnion(this.usuarioParaConvitar),
                dataAtualizacao: modules.serverTimestamp()
            });
            
            this.mostrarNotificacao('✅ Convite enviado com sucesso!', 'success');
            
            // Limpar seleção
            this.usuarioParaConvitar = null;
            const input = document.getElementById('buscarUsuarioParaConvite');
            if (input) input.value = '';
            
            // Atualizar lista de usuários para convite
            this.exibirUsuariosParaConvite('');
            
        } catch (error) {
            console.error('❌ Erro ao convidar usuário:', error);
            this.mostrarNotificacao(`❌ Erro: ${error.message}`, 'error');
        }
    }



    // ========== GERENCIAR MEMBROS ==========
    
    async gerenciarMembros(grupoId) {
        this.grupoSelecionado = grupoId;
        const grupo = this.grupos.find(g => g.id === grupoId);
        
        if (!grupo) {
            this.mostrarNotificacao('❌ Grupo não encontrado', 'error');
            return;
        }
        
        // Garantir que temos os usuários carregados
        if (this.usuarios.length === 0) {
            await this.carregarUsuariosLogins();
        }
        
        const modal = document.getElementById('modalMembros');
        
        // Carregar membros do grupo
        let membrosHTML = '<h3>Membros do Grupo</h3>';
        
        if (grupo.membros && grupo.membros.length > 0) {
            membrosHTML += '<div class="lista-membros">';
            
            for (const membro of grupo.membros) {
                let usuarioId, permissao;
                
                if (typeof membro === 'string') {
                    usuarioId = membro;
                    permissao = 'membro';
                } else {
                    usuarioId = membro.usuarioId;
                    permissao = membro.permissao || 'membro';
                }
                
                // Buscar informações do usuário
                let nomeCompleto = usuarioId; // Fallback inicial
                const usuarioInfo = this.buscarUsuarioPorId(usuarioId);
                
                if (usuarioInfo) {
                    // Usar displayName direto do Firebase
                    nomeCompleto = usuarioInfo.displayName || usuarioInfo.nome || usuarioId;
                    console.log(`✅ Nome encontrado para ${usuarioId}: ${nomeCompleto}`);
                } else {
                    console.warn(`⚠️ Usuário ${usuarioId} não encontrado na lista carregada`);
                    
                    // Se não encontrou mas é o usuário atual, tentar buscar diretamente
                    if (usuarioId === this.usuarioAtual?.usuario) {
                        console.log('🔍 Buscando dados do usuário atual...');
                        
                        // Buscar dados do usuário atual nos usuários carregados
                        const usuarioAtualInfo = this.usuarios.find(u => u.login === usuarioId);
                        if (usuarioAtualInfo) {
                            nomeCompleto = usuarioAtualInfo.displayName || usuarioAtualInfo.nome || usuarioId;
                            console.log(`✅ Dados do usuário atual encontrados: ${nomeCompleto}`);
                        }
                    }
                }
                
                const isCurrentUser = usuarioId === this.usuarioAtual?.usuario;
                
                membrosHTML += `
                    <div class="membro-item ${isCurrentUser ? 'membro-atual' : ''}">
                        <i class="fas fa-user${permissao === 'admin' ? '-shield' : permissao === 'pendente' ? '-clock' : ''}"></i>
                        <div class="membro-info">
                            <strong>${nomeCompleto}</strong>
                            <small>${usuarioId}</small>
                        </div>
                        <span class="permissao-badge ${permissao}">
                            ${permissao === 'admin' ? 'Administrador' : permissao === 'pendente' ? 'Pendente' : 'Membro'}
                        </span>
                        ${!isCurrentUser && grupo.minhaPermissao === 'admin' ? `
                            <div class="membro-acoes">
                                ${permissao !== 'pendente' ? `
                                    <button class="btn-icon" onclick="workManager.alterarPermissaoMembro('${grupoId}', '${usuarioId}', '${permissao === 'admin' ? 'membro' : 'admin'}')">
                                        <i class="fas fa-${permissao === 'admin' ? 'user' : 'user-shield'}"></i>
                                    </button>
                                ` : ''}
                                <button class="btn-icon btn-danger" onclick="workManager.removerMembroGrupo('${grupoId}', '${usuarioId}')">
                                    <i class="fas fa-user-times"></i>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `;
            }
            
            membrosHTML += '</div>';
        } else {
            membrosHTML += '<p>Nenhum membro no grupo</p>';
        }
        
        document.getElementById('membrosAtuaisLista').innerHTML = membrosHTML;
        
        // Atualizar lista de usuários para convite
        this.exibirUsuariosParaConvite('');
        
        modal.style.display = 'flex';
    }

        
    buscarUsuarioPorId(usuarioId) {
        // Primeiro tentar por login
        let usuario = this.usuarios.find(u => u.login === usuarioId);
        
        // Se não encontrou, tentar por ID
        if (!usuario) {
            usuario = this.usuarios.find(u => u.id === usuarioId);
        }
        
        // DEBUG: Verificar o que encontrou
        if (usuario) {
            console.log(`🔍 Usuário encontrado: ${usuario.login} -> "${usuario.displayName}"`);
        } else {
            console.log(`🔍 Usuário não encontrado: ${usuarioId}`);
            
            // Verificar se está na lista de usuários
            console.log('Usuários disponíveis:', this.usuarios.map(u => u.login));
        }
        
        return usuario;
    }
    
    exibirUsuariosParaConvite(termoBusca = '') {
        const container = document.getElementById('usuariosParaConvite');
        if (!container || !this.grupoSelecionado) {
            console.log('❌ Container ou grupo não disponível');
            return;
        }
        
        const grupo = this.grupos.find(g => g.id === this.grupoSelecionado);
        if (!grupo) {
            console.log('❌ Grupo não encontrado');
            return;
        }
        
        console.log('🔍 Buscando usuários para convite...');
        console.log('👥 Usuários totais no sistema:', this.usuarios.length);
        console.log('👤 Usuário atual:', this.usuarioAtual.usuario);
        
        // Obter membros atuais do grupo (tanto strings quanto objetos)
        const membrosAtuais = new Set();
        if (grupo.membros && Array.isArray(grupo.membros)) {
            grupo.membros.forEach(membro => {
                if (typeof membro === 'string') {
                    membrosAtuais.add(membro);
                } else if (membro && typeof membro === 'object') {
                    membrosAtuais.add(membro.usuarioId);
                }
            });
        }
        
        console.log('📋 Membros atuais no grupo:', Array.from(membrosAtuais));
        
        // Filtrar usuários que NÃO são membros do grupo
        let usuariosFiltrados = this.usuarios.filter(usuario => {
            const naoEMembro = !membrosAtuais.has(usuario.login) && 
                              !membrosAtuais.has(usuario.id);
            const naoEUsuarioAtual = usuario.login !== this.usuarioAtual.usuario && 
                                    usuario.id !== this.usuarioAtual.usuario;
            return naoEMembro && naoEUsuarioAtual;
        });
        
        console.log('👥 Usuários após filtrar membros:', usuariosFiltrados.length);
        
        // Aplicar busca por termo
        if (termoBusca) {
            const termo = termoBusca.toLowerCase();
            usuariosFiltrados = usuariosFiltrados.filter(usuario => {
                return (
                    (usuario.nome && usuario.nome.toLowerCase().includes(termo)) ||
                    (usuario.displayName && usuario.displayName.toLowerCase().includes(termo)) ||
                    (usuario.login && usuario.login.toLowerCase().includes(termo))
                );
            });
            console.log('🔍 Usuários após busca:', usuariosFiltrados.length);
        }
        
        // Debug: mostrar todos os usuários filtrados
        console.log('📊 Usuários disponíveis para convite:');
        usuariosFiltrados.forEach(u => {
            console.log(`  - ${u.displayName || u.nome || u.login} (Login: ${u.login})`);
        });
        
        if (usuariosFiltrados.length === 0) {
            console.log('⚠️ Nenhum usuário encontrado após filtragem');
            container.innerHTML = `
                <div class="empty-membros">
                    <i class="fas fa-search"></i>
                    <span>Nenhum usuário disponível para convite</span>
                    <small style="display: block; margin-top: 5px; font-size: 11px;">
                        Todos os usuários do sistema já estão no grupo
                    </small>
                </div>
            `;
            return;
        }
        
        console.log('✅ Exibindo', usuariosFiltrados.length, 'usuários para convite');
        
        container.innerHTML = usuariosFiltrados.map(usuario => {
            const estaSelecionado = this.usuarioParaConvitar === usuario.login || 
                                   this.usuarioParaConvitar === usuario.id;
            
            return `
                <div class="usuario-item ${estaSelecionado ? 'selecionado' : ''}" 
                     onclick="workManager.selecionarUsuarioParaConvite('${usuario.login}')">
                    <i class="fas fa-user-plus"></i>
                    <div class="usuario-info">
                        <strong>${usuario.displayName || usuario.nome || usuario.login}</strong>
                        <small>${usuario.login}</small>
                    </div>
                    ${estaSelecionado ? '<i class="fas fa-check-circle" style="color: #28a745;"></i>' : ''}
                </div>
            `;
        }).join('');
    }

    debugUsuarios() {
        console.log('=== DEBUG DE USUÁRIOS ===');
        console.log('👥 Total de usuários carregados:', this.usuarios.length);
        console.log('👤 Usuário atual:', this.usuarioAtual ? this.usuarioAtual.usuario : 'Não autenticado');
        
        this.usuarios.forEach((usuario, index) => {
            console.log(`${index + 1}. ID: ${usuario.id}, Login: ${usuario.login}, Nome: ${usuario.displayName || usuario.nome}`);
        });
        
        if (this.grupoSelecionado) {
            const grupo = this.grupos.find(g => g.id === this.grupoSelecionado);
            console.log('=== GRUPO SELECIONADO ===');
            console.log('Nome:', grupo?.nome);
            console.log('Membros:', grupo?.membros);
        }
    }
    
    selecionarUsuarioParaConvite(usuarioId) {
        this.usuarioParaConvitar = usuarioId;
        const input = document.getElementById('buscarUsuarioParaConvite');
        if (input) {
            const usuario = this.usuarios.find(u => u.login === usuarioId);
            input.value = usuario ? (usuario.displayName || usuario.nome || usuario.login) : usuarioId;
        }
        
        // Atualizar visualização
        this.exibirUsuariosParaConvite(document.getElementById('buscarUsuarioParaConvite')?.value || '');
    }

    // ========== FUNÇÕES DE GRUPOS ==========
    
    async excluirGrupo(grupoId) {
        this.mostrarConfirmacao(
            'Excluir Grupo',
            'Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.',
            async () => {
                try {
                    const grupoRef = this.modules.doc(this.db, 'grupos', grupoId);
                    await this.modules.deleteDoc(grupoRef);
                    
                    this.mostrarNotificacao('✅ Grupo excluído com sucesso', 'success');
                    
                } catch (error) {
                    console.error('❌ Erro ao excluir grupo:', error);
                    this.mostrarNotificacao(`❌ Erro: ${error.message}`, 'error');
                }
            }
        );
    }
    
    async sairGrupo(grupoId) {
        this.mostrarConfirmacao(
            'Sair do Grupo',
            'Tem certeza que deseja sair deste grupo?',
            async () => {
                try {
                    const grupoRef = this.modules.doc(this.db, 'grupos', grupoId);
                    const grupoDoc = await this.modules.getDoc(grupoRef);
                    const grupoData = grupoDoc.data();
                    
                    // Remover o usuário da lista de membros
                    let membrosAtualizados = [];
                    
                    if (grupoData.membros) {
                        membrosAtualizados = grupoData.membros.filter(membro => {
                            if (typeof membro === 'string') {
                                return membro !== this.usuarioAtual.usuario;
                            } else if (membro && typeof membro === 'object') {
                                return membro.usuarioId !== this.usuarioAtual.usuario;
                            }
                            return true;
                        });
                    }
                    
                    // Se não houver mais membros, excluir o grupo
                    if (membrosAtualizados.length === 0) {
                        await this.modules.deleteDoc(grupoRef);
                        this.mostrarNotificacao('✅ Grupo excluído (sem membros)', 'info');
                    } else {
                        await this.modules.updateDoc(grupoRef, {
                            membros: membrosAtualizados,
                            dataAtualizacao: this.modules.serverTimestamp()
                        });
                        this.mostrarNotificacao('✅ Você saiu do grupo', 'success');
                    }
                    
                } catch (error) {
                    console.error('❌ Erro ao sair do grupo:', error);
                    this.mostrarNotificacao(`❌ Erro: ${error.message}`, 'error');
                }
            }
        );
    }

    // ========== OUTRAS FUNÇÕES ==========
    
    async alterarPermissaoMembro(grupoId, usuarioId, novaPermissao) {
        try {
            const grupoRef = this.modules.doc(this.db, 'grupos', grupoId);
            const grupoDoc = await this.modules.getDoc(grupoRef);
            const grupoData = grupoDoc.data();
            
            if (!grupoData.membros) return;
            
            // Atualizar a permissão do membro
            const membrosAtualizados = grupoData.membros.map(membro => {
                if (typeof membro === 'string' && membro === usuarioId) {
                    return { usuarioId: usuarioId, permissao: novaPermissao };
                } else if (membro && typeof membro === 'object' && membro.usuarioId === usuarioId) {
                    return { ...membro, permissao: novaPermissao };
                }
                return membro;
            });
            
            await this.modules.updateDoc(grupoRef, {
                membros: membrosAtualizados,
                dataAtualizacao: this.modules.serverTimestamp()
            });
            
            this.mostrarNotificacao(`✅ Permissão alterada para ${novaPermissao === 'admin' ? 'administrador' : 'membro'}`, 'success');
            
            // Atualizar a lista de membros
            this.gerenciarMembros(grupoId);
            
        } catch (error) {
            console.error('❌ Erro ao alterar permissão:', error);
            this.mostrarNotificacao(`❌ Erro: ${error.message}`, 'error');
        }
    }
    
    async removerMembroGrupo(grupoId, usuarioId) {
        this.mostrarConfirmacao(
            'Remover Membro',
            'Tem certeza que deseja remover este membro do grupo?',
            async () => {
                try {
                    const grupoRef = this.modules.doc(this.db, 'grupos', grupoId);
                    const grupoDoc = await this.modules.getDoc(grupoRef);
                    const grupoData = grupoDoc.data();
                    
                    // Remover o membro da lista
                    let membrosAtualizados = [];
                    
                    if (grupoData.membros) {
                        membrosAtualizados = grupoData.membros.filter(membro => {
                            if (typeof membro === 'string') {
                                return membro !== usuarioId;
                            } else if (membro && typeof membro === 'object') {
                                return membro.usuarioId !== usuarioId;
                            }
                            return true;
                        });
                    }
                    
                    await this.modules.updateDoc(grupoRef, {
                        membros: membrosAtualizados,
                        dataAtualizacao: this.modules.serverTimestamp()
                    });
                    
                    this.mostrarNotificacao('✅ Membro removido com sucesso', 'success');
                    
                    // Recarregar a lista de membros
                    this.gerenciarMembros(grupoId);
                    
                } catch (error) {
                    console.error('❌ Erro ao remover membro:', error);
                    this.mostrarNotificacao(`❌ Erro: ${error.message}`, 'error');
                }
            }
        );
    }

    // ========== MODAL DE CONFIRMAÇÃO ==========
    
    mostrarConfirmacao(titulo, mensagem, callback) {
        this.acaoConfirmacao = callback;
        
        document.getElementById('confirmacaoTitulo').textContent = titulo;
        document.getElementById('confirmacaoMensagem').textContent = mensagem;
        
        const modal = document.getElementById('modalConfirmacao');
        modal.style.display = 'flex';
    }
    
    fecharModalConfirmacao() {
        const modal = document.getElementById('modalConfirmacao');
        modal.style.display = 'none';
        this.acaoConfirmacao = null;
    }
    
    confirmarAcao() {
        if (this.acaoConfirmacao) {
            this.acaoConfirmacao();
        }
        this.fecharModalConfirmacao();
    }

    // ========== FUNÇÕES AUXILIARES ==========
    
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
            background: ${tipo === 'success' ? '#27ae60' : tipo === 'error' ? '#e74c3c' : tipo === 'warning' ? '#f39c12' : '#3498db'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        notification.innerHTML = `<i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-triangle' : tipo === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i> ${mensagem}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3000);
    }

    // ========== MODAIS ==========
    
    fecharModalMembros() {
        document.getElementById('modalMembros').style.display = 'none';
        this.grupoSelecionado = null;
        this.usuarioParaConvitar = null;
    }

    verDetalhesGrupo(grupoId) {
        const grupo = this.grupos.find(g => g.id === grupoId);
        if (!grupo) return;
        
        // SEMPRE mostrar membros, mesmo quando não pertence ao grupo
        let membrosHTML = '';
        if (grupo.membros && grupo.membros.length > 0) {
            membrosHTML += '<h4 style="margin-top: 15px;">Membros do Grupo:</h4>';
            membrosHTML += '<div style="max-height: 300px; overflow-y: auto; border: 1px solid #eee; padding: 10px; border-radius: 5px; background: #f9f9f9;">';
            
            // Processar e mostrar TODOS os membros
            grupo.membros.forEach((membro, index) => {
                let nomeUsuario, tipoUsuario, loginUsuario;
                
                if (typeof membro === 'string') {
                    // Membro como string simples (apenas login)
                    loginUsuario = membro;
                    
                    // Buscar informações completas do usuário
                    const usuarioInfo = this.buscarUsuarioPorId(membro);
                    nomeUsuario = usuarioInfo ? (usuarioInfo.displayName || usuarioInfo.nome || membro) : membro;
                    tipoUsuario = 'Membro';
                } else if (membro && typeof membro === 'object') {
                    // Membro como objeto
                    loginUsuario = membro.usuarioId || 'Desconhecido';
                    
                    // Buscar informações completas do usuário
                    const usuarioInfo = this.buscarUsuarioPorId(membro.usuarioId);
                    nomeUsuario = usuarioInfo ? (usuarioInfo.displayName || usuarioInfo.nome || loginUsuario) : loginUsuario;
                    tipoUsuario = membro.permissao === 'admin' ? 'Administrador' : 'Membro';
                } else {
                    loginUsuario = 'Desconhecido';
                    nomeUsuario = 'Desconhecido';
                    tipoUsuario = 'Membro';
                }
                
                // Verificar se é o usuário atual
                const isCurrentUser = this.usuarioAtual && 
                                     ((typeof membro === 'string' && membro === this.usuarioAtual.usuario) ||
                                      (membro && typeof membro === 'object' && membro.usuarioId === this.usuarioAtual.usuario));
                
                // Verificar se é o criador do grupo
                const isCriador = loginUsuario === grupo.criador;
                
                membrosHTML += `
                    <div style="padding: 8px; border-bottom: 1px solid #e0e0e0; ${isCurrentUser ? 'background-color: #e8f4ff;' : ''}">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${nomeUsuario}</strong>
                                <small style="display: block; color: #666; font-size: 12px;">${loginUsuario}</small>
                            </div>
                            <div>
                                ${isCriador ? `
                                    <span style="background: #3498db; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-right: 5px;">
                                        Criador
                                    </span>
                                ` : ''}
                                <span style="background: ${tipoUsuario === 'Administrador' ? '#e74c3c' : '#2ecc71'}; 
                                    color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px;">
                                    ${tipoUsuario}
                                </span>
                            </div>
                        </div>
                        ${isCurrentUser ? `
                            <small style="color: #3498db; font-style: italic;">
                                <i class="fas fa-user"></i> Você
                            </small>
                        ` : ''}
                    </div>
                `;
            });
            
            membrosHTML += '</div>';
            
            // Adicionar resumo
            membrosHTML += `
                <div style="margin-top: 10px; font-size: 13px; color: #666;">
                    <i class="fas fa-info-circle"></i> Total: ${grupo.membros.length} membro${grupo.membros.length !== 1 ? 's' : ''}
                </div>
            `;
        } else {
            membrosHTML = `
                <div style="padding: 20px; text-align: center; color: #999;">
                    <i class="fas fa-users-slash" style="font-size: 24px; margin-bottom: 10px;"></i>
                    <p>Nenhum membro neste grupo</p>
                </div>
            `;
        }
        
        // Informações do grupo
        const criadorInfo = grupo.criador ? this.buscarUsuarioPorId(grupo.criador) : null;
        const nomeCriador = criadorInfo ? (criadorInfo.displayName || criadorInfo.nome || grupo.criador) : grupo.criador;
        
        const detalhes = `
            <div style="padding: 20px;">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                    <div style="width: 40px; height: 40px; background: ${grupo.cor || '#4a6fa5'}; border-radius: 8px; margin-right: 15px;"></div>
                    <h2 style="color: ${grupo.cor || '#4a6fa5'}; margin: 0;">${grupo.nome}</h2>
                </div>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p><strong><i class="fas fa-align-left"></i> Descrição:</strong><br>${grupo.descricao || 'Sem descrição'}</p>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                        <div style="background: white; padding: 10px; border-radius: 6px; border-left: 4px solid #4a6fa5;">
                            <small style="color: #666;">Criado em</small><br>
                            <strong>${this.formatarData(grupo.dataCriacao)}</strong>
                        </div>
                        <div style="background: white; padding: 10px; border-radius: 6px; border-left: 4px solid #27ae60;">
                            <small style="color: #666;">Total de Tarefas</small><br>
                            <strong>${Array.isArray(grupo.tarefas) ? grupo.tarefas.length : 0}</strong>
                        </div>
                    </div>
                    
                    <div style="margin-top: 15px; background: white; padding: 10px; border-radius: 6px; border-left: 4px solid #e74c3c;">
                        <small style="color: #666;">Criador do Grupo</small><br>
                        <strong><i class="fas fa-crown" style="color: #f39c12;"></i> ${nomeCriador || grupo.criador || 'Não informado'}</strong>
                    </div>
                </div>
                
                ${membrosHTML}
                
                <div style="margin-top: 20px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
                    <button onclick="workManager.fecharDetalhes()" class="btn btn-outline">
                        <i class="fas fa-times"></i> Fechar
                    </button>
                    ${grupo.pertenceAoGrupo ? `
                        <button onclick="workManager.gerenciarMembros('${grupo.id}')" class="btn btn-primary" style="margin-left: 10px;">
                            <i class="fas fa-users-cog"></i> Gerenciar Membros
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Criar modal de detalhes
        const modalDetalhes = document.createElement('div');
        modalDetalhes.className = 'modal';
        modalDetalhes.id = 'modalDetalhes';
        modalDetalhes.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2><i class="fas fa-info-circle"></i> Detalhes do Grupo</h2>
                    <button class="close" onclick="workManager.fecharDetalhes()">&times;</button>
                </div>
                ${detalhes}
            </div>
        `;
        
        document.body.appendChild(modalDetalhes);
        modalDetalhes.style.display = 'block';
    }
    
    fecharDetalhes() {
        const modal = document.getElementById('modalDetalhes');
        if (modal) {
            modal.style.display = 'none';
            setTimeout(() => {
                if (modal.parentNode) {
                    document.body.removeChild(modal);
                }
            }, 300);
        }
    }

    editarGrupo(grupoId) {
        this.abrirModalGrupo(grupoId);
    }

    // ========== FILTRAR GRUPOS ==========
    filtrarGrupos(filtro) {
        this.filtroAtual = filtro;
        
        // Obter o termo de busca do input
        const termo = document.getElementById('searchGroups').value;
        
        // Filtrar e atualizar interface
        const gruposFiltrados = this.filtrarGruposPorFiltroEBusca(filtro, termo);
        
        if (gruposFiltrados.length === 0) {
            document.getElementById('groupsContainer').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users-slash"></i>
                    <h3>Nenhum grupo encontrado</h3>
                    <p>${filtro === 'convidados' ? 'Você não tem convites pendentes' : 'Nenhum grupo corresponde aos filtros'}</p>
                </div>
            `;
        } else {
            // Atualizar interface com grupos filtrados
            const container = document.getElementById('groupsContainer');
            container.innerHTML = this.renderizarGrupos(gruposFiltrados);
        }
        
        // Atualizar tabs ativas
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        // Não podemos usar event.target aqui porque pode ser chamado sem evento
        // Em vez disso, vamos encontrar o botão pelo filtro
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            const text = tab.textContent.toLowerCase().trim();
            if (text.includes(filtro)) {
                tab.classList.add('active');
            }
        });
    }
} // FIM DA CLASSE WorkManagerV12

// ========== FORA DA CLASSE - CRIAR INSTÂNCIA GLOBAL ==========

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
window.filtrarGrupos = (filtro) => {
    workManager.filtrarGrupos(filtro);
};
window.convidarUsuarioSelecionado = () => workManager.convidarUsuarioSelecionado();
window.alterarPermissaoMembro = (grupoId, usuarioId, permissao) => workManager.alterarPermissaoMembro(grupoId, usuarioId, permissao);
window.removerMembroGrupo = (grupoId, usuarioId) => workManager.removerMembroGrupo(grupoId, usuarioId);
window.verDetalhesGrupo = (grupoId) => workManager.verDetalhesGrupo(grupoId);
window.editarGrupo = (grupoId) => workManager.editarGrupo(grupoId);
window.excluirGrupo = (grupoId) => workManager.excluirGrupo(grupoId);
window.gerenciarMembros = (grupoId) => workManager.gerenciarMembros(grupoId);
window.sairGrupo = (grupoId) => workManager.sairGrupo(grupoId);
window.fecharModalMembros = () => workManager.fecharModalMembros();
window.fecharModalConfirmacao = () => workManager.fecharModalConfirmacao();
window.confirmarAcao = () => workManager.confirmarAcao();
window.filtrarUsuarios = (termo) => workManager.filtrarUsuarios(termo);
window.filtrarUsuariosParaConvite = (termo) => workManager.exibirUsuariosParaConvite(termo);
window.carregarUsuarios = () => workManager.carregarUsuariosLogins().then(() => workManager.exibirUsuarios());
window.toggleSelecaoUsuario = (usuarioId) => workManager.toggleSelecaoUsuario(usuarioId);
window.selecionarUsuarioParaConvite = (usuarioId) => workManager.selecionarUsuarioParaConvite(usuarioId);
window.removerMembroSelecionado = (usuarioId) => workManager.removerMembroSelecionado(usuarioId);
window.fecharDetalhes = () => workManager.fecharDetalhes();
