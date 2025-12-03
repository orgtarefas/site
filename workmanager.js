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

    // FUNÇÕES DE GRUPOS
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
                dataCriacao: firebase.firestore.FieldValue.serverTimestamp(),
                membros: [{
                    usuarioId: this.usuarioAtual.usuario,
                    permissao: 'admin',
                    dataEntrada: firebase.firestore.FieldValue.serverTimestamp(),
                    nome: this.usuarioAtual.nome || this.usuarioAtual.usuario
                }],
                tarefas: []
            };
            
            if (this.grupoEditando) {
                // Editar grupo existente
                await db.collection('grupos').doc(this.grupoEditando).update(grupoData);
                this.mostrarNotificacao('✅ Grupo atualizado com sucesso!', 'success');
            } else {
                // Criar novo grupo
                await db.collection('grupos').add(grupoData);
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
            await db.collection('grupos').doc(grupoId).delete();
            this.mostrarNotificacao('✅ Grupo excluído com sucesso!', 'success');
        } catch (error) {
            console.error('❌ Erro ao excluir grupo:', error);
            this.mostrarNotificacao('Erro ao excluir grupo', 'error');
        }
    }

    // FUNÇÕES DE MEMBROS
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
            
            // Adicionar ao grupo
            await db.collection('grupos').doc(this.grupoEditando).update({
                membros: firebase.firestore.FieldValue.arrayUnion({
                    usuarioId: usuario.usuario,
                    permissao: permissao,
                    dataEntrada: firebase.firestore.FieldValue.serverTimestamp(),
                    nome: usuario.nome || usuario.usuario
                })
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
            const grupoRef = db.collection('grupos').doc(grupoId);
            const grupo = this.grupos.find(g => g.id === grupoId);
            
            if (resposta === 'aceitar') {
                // Atualizar membro de pendente para observador
                const membro = grupo.membros.find(m => m.usuarioId === this.usuarioAtual.usuario);
                if (membro) {
                    membro.permissao = 'observador';
                    membro.dataEntrada = firebase.firestore.FieldValue.serverTimestamp();
                    
                    await grupoRef.update({
                        membros: grupo.membros
                    });
                }
                
                this.mostrarNotificacao('✅ Convite aceito com sucesso!', 'success');
            } else {
                // Remover do array de membros
                await grupoRef.update({
                    membros: firebase.firestore.FieldValue.arrayRemove(
                        grupo.membros.find(m => m.usuarioId === this.usuarioAtual.usuario)
                    )
                });
                
                this.mostrarNotificacao('Convite recusado', 'info');
            }
            
        } catch (error) {
            console.error('❌ Erro ao responder convite:', error);
            this.mostrarNotificacao('Erro ao processar convite', 'error');
        }
    }

    // FUNÇÕES DE TAREFAS
    async verDetalhesGrupo(grupoId) {
        try {
            const grupo = this.grupos.find(g => g.id === grupoId);
            
            // Carregar tarefas do grupo
            const tarefasSnapshot = await db.collection('tarefas_grupo')
                .where('grupoId', '==', grupoId)
                .orderBy('dataCriacao', 'desc')
                .get();
            
            const tarefas = tarefasSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Montar HTML do modal
            let tarefasHTML = '';
            
            if (tarefas.length > 0) {
                tarefasHTML = tarefas.map(tarefa => {
                    const podeVer = this.verificarPermissaoTarefa(tarefa, grupo.minhaPermissao);
                    
                    if (!podeVer) return '';
                    
                    const podeEditar = this.verificarPermissaoEdicao(tarefa, grupo.minhaPermissao);
                    
                    return `
                        <div class="tarefa-item">
                            <div class="tarefa-header">
                                <div class="tarefa-titulo">${tarefa.titulo}</div>
                                <span class="tarefa-visibilidade">${tarefa.visibilidade}</span>
                            </div>
                            <div class="tarefa-desc">${tarefa.descricao || ''}</div>
                            <div class="tarefa-meta">
                                <small><i class="fas fa-user"></i> ${tarefa.criador}</small>
                                <small><i class="fas fa-calendar"></i> ${this.formatarData(tarefa.dataCriacao)}</small>
                                <small><i class="fas fa-tag"></i> ${tarefa.status}</small>
                            </div>
                            ${podeEditar ? `
                                <div class="tarefa-acoes">
                                    <button class="btn btn-sm btn-outline" onclick="workManager.editarTarefaGrupo('${tarefa.id}')">
                                        <i class="fas fa-edit"></i> Editar
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('');
            } else {
                tarefasHTML = '<p class="text-center">Nenhuma tarefa no grupo</p>';
            }
            
            // Montar modal completo
            document.getElementById('modalDetalhesTitulo').textContent = grupo.nome;
            document.getElementById('modalDetalhesBody').innerHTML = `
                <div class="grupo-info">
                    <h3><i class="fas fa-info-circle"></i> Informações do Grupo</h3>
                    <p><strong>Descrição:</strong> ${grupo.descricao || 'Sem descrição'}</p>
                    <p><strong>Sua permissão:</strong> <span class="permissao-badge ${grupo.minhaPermissao}">${grupo.minhaPermissao}</span></p>
                    <p><strong>Criado por:</strong> ${grupo.criador}</p>
                    <p><strong>Criado em:</strong> ${this.formatarData(grupo.dataCriacao)}</p>
                </div>
                
                <div class="tarefas-container">
                    <div class="tarefas-header">
                        <h3><i class="fas fa-tasks"></i> Tarefas do Grupo</h3>
                        ${this.podeCriarTarefa(grupo.minhaPermissao) ? `
                            <button class="btn btn-primary btn-sm" onclick="workManager.novaTarefaGrupo('${grupoId}')">
                                <i class="fas fa-plus"></i> Nova Tarefa
                            </button>
                        ` : ''}
                    </div>
                    <div id="listaTarefasGrupo">
                        ${tarefasHTML}
                    </div>
                </div>
            `;
            
            document.getElementById('modalDetalhesGrupo').style.display = 'flex';
            
        } catch (error) {
            console.error('❌ Erro ao carregar detalhes do grupo:', error);
            this.mostrarNotificacao('Erro ao carregar grupo', 'error');
        }
    }

    // SISTEMA DE PERMISSÕES
    podeCriarTarefa(permissao) {
        return ['atuador', 'admin'].includes(permissao);
    }

    verificarPermissaoTarefa(tarefa, permissaoUsuario) {
        if (permissaoUsuario === 'admin') return true;
        
        switch(tarefa.visibilidade) {
            case 'todos':
                return true;
            case 'atuadores+admin':
                return ['atuador', 'admin'].includes(permissaoUsuario);
            case 'apenas-admin':
                return permissaoUsuario === 'admin';
            default:
                return false;
        }
    }

    verificarPermissaoEdicao(tarefa, permissaoUsuario) {
        if (permissaoUsuario === 'admin') return true;
        if (permissaoUsuario === 'atuador' && tarefa.editores?.includes('atuadores+admin')) return true;
        if (tarefa.criador === this.usuarioAtual.usuario) return true;
        
        return false;
    }

    // UTILITÁRIOS
    atualizarStatusSincronizacao(status) {
        const syncElement = document.getElementById('syncStatus');
        if (!syncElement) return;
        
        syncElement.innerHTML = `
            <i class="fas fa-${status.includes('✅') ? 'check-circle' : status.includes('❌') ? 'exclamation-triangle' : 'sync-alt'} ${!status.includes('✅') && !status.includes('❌') ? 'fa-spin' : ''}"></i>
            <span>${status}</span>
        `;
        
        syncElement.className = `sync-status ${status.includes('✅') ? 'connected' : status.includes('❌') ? 'error' : ''}`;
    }

    atualizarBadgeConvites(count) {
        const badge = document.getElementById('badgeConvites');
        if (!badge) return;
        
        const convitesPendentes = this.grupos.filter(g => g.minhaPermissao === 'pendente').length;
        badge.textContent = convitesPendentes;
        badge.style.display = convitesPendentes > 0 ? 'inline-block' : 'none';
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
            animation: slideIn 0.3s ease-out;
        `;
        
        const icon = tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-triangle' : 'info-circle';
        notification.innerHTML = `<i class="fas fa-${icon}"></i> ${mensagem}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    mostrarErro(mensagem) {
        this.mostrarNotificacao(mensagem, 'error');
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
                document.getElementById('grupoVisibilidade').value = grupo.visibilidade || 'privado';
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

    fecharModalDetalhes() {
        document.getElementById('modalDetalhesGrupo').style.display = 'none';
    }

    // FUNÇÕES GLOBAIS (chamadas pelo HTML)
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

    editarGrupo(grupoId) {
        this.abrirModalGrupo(grupoId);
    }

    novaTarefaGrupo(grupoId) {
        this.mostrarNotificacao('Funcionalidade de nova tarefa será implementada em breve!', 'info');
        // TODO: Implementar criação de tarefas no grupo
    }

    async alterarPermissao(usuarioId, novaPermissao) {
        if (!this.grupoEditando) return;
        
        try {
            const grupoRef = db.collection('grupos').doc(this.grupoEditando);
            const grupo = this.grupos.find(g => g.id === this.grupoEditando);
            
            // Encontrar e atualizar o membro
            const membrosAtualizados = grupo.membros.map(membro => {
                if (membro.usuarioId === usuarioId) {
                    return { ...membro, permissao: novaPermissao };
                }
                return membro;
            });
            
            await grupoRef.update({ membros: membrosAtualizados });
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
            const grupoRef = db.collection('grupos').doc(this.grupoEditando);
            const grupo = this.grupos.find(g => g.id === this.grupoEditando);
            
            // Encontrar o membro
            const membro = grupo.membros.find(m => m.usuarioId === usuarioId);
            if (!membro) return;
            
            // Remover do array
            await grupoRef.update({
                membros: firebase.firestore.FieldValue.arrayRemove(membro)
            });
            
            this.mostrarNotificacao('✅ Membro removido com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Erro ao remover membro:', error);
            this.mostrarNotificacao('Erro ao remover membro', 'error');
        }
    }

    // Limpeza ao sair
    destruir() {
        this.unsubscribeListeners.forEach(unsubscribe => unsubscribe());
        this.unsubscribeListeners = [];
    }
}

// Instanciar o Work Manager globalmente
const workManager = new WorkManager();

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    workManager.init();
});

// Expor funções globais
window.abrirModalGrupo = (grupoId) => workManager.abrirModalGrupo(grupoId);
window.fecharModalGrupo = () => workManager.fecharModalGrupo();
window.salvarGrupo = () => workManager.salvarGrupo();
window.filtrarGrupos = (filtro) => workManager.filtrarGrupos(filtro);
window.convidarMembro = () => workManager.convidarMembro();

// Adicionar animações CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .group-card {
        animation: fadeIn 0.3s ease-out;
    }
`;
document.head.appendChild(style);
