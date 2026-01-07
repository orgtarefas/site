// ========== CONFIGURAÇÃO FIREBASE ==========
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    updateDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { 
    getDatabase, 
    ref, 
    set, 
    update, 
    push, 
    onValue,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

// PROJETO 1: LOGINS (Firestore)
const loginsConfig = {
    apiKey: "AIzaSyCJpyAouZtwoWC0QDmTtpJxn0_j_w8DlvU",
    authDomain: "logins-c3407.firebaseapp.com",
    projectId: "logins-c3407",
    storageBucket: "logins-c3407.firebasestorage.app",
    messagingSenderId: "809861558230",
    appId: "1:809861558230:web:e6e41bf1db9b3cfd887e77"
};

// PROJETO 2: CHAT (Realtime Database)
const chatConfig = {
    apiKey: "AIzaSyAYROPCh-558mNXPrO7onAXFvfBe13q5Js",
    authDomain: "orgtarefas-chat.firebaseapp.com",
    databaseURL: "https://orgtarefas-chat-default-rtdb.firebaseio.com",
    projectId: "orgtarefas-chat",
    storageBucket: "orgtarefas-chat.firebasestorage.app",
    messagingSenderId: "380919096800",
    appId: "1:380919096800:web:7b54e7e341c9266c207785"
};

// ========== VARIÁVEIS GLOBAIS ==========
let loginsDb, chatDb, currentUser = null;
let currentConversation = null;
let allUsers = {}; // Cache de todos os usuários

// ========== INICIALIZAÇÃO ==========
async function init() {
    console.log('🚀 Inicializando Chat...');
    
    try {
        // ========== 1. INICIALIZAR FIREBASE ==========
        const loginsApp = initializeApp(loginsConfig, 'loginsApp');
        const chatApp = initializeApp(chatConfig, 'chatApp');
        
        loginsDb = getFirestore(loginsApp);
        chatDb = getDatabase(chatApp);
        
        console.log('✅ Firebase inicializado');
        
        // ========== 2. LOGIN DO USUÁRIO ==========
        await autoLogin();
        
        // ========== 3. CONFIGURAR INTERAÇÃO ==========
        setupEventListeners();
        
        // ========== 4. CONFIGURAR CACHE EM TEMPO REAL ==========
        setupUsersCache();
        
        // ========== 5. INICIALIZAR BOTÕES DE EXPANDIR/RECOLHER ==========
        initSectionToggles();
        
        // ========== 6. CARREGAR DADOS INICIAIS ==========
        loadOnlineUsers();       // Lista de usuários online
        loadAllUsers();          // Cache completo
        loadAllUsersList();      // Lista todos usuários
        loadConversations();     // Conversas anteriores
        setupUsersStatusUpdates(); // ATUALIZAR STATUS EM TEMPO REAL
        
        console.log('✅ Chat inicializado com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao inicializar:', error);
        showNotification('Erro ao conectar', 'error');
        
        // Tentar recarregar após 5 segundos se houver erro
        setTimeout(() => {
            console.log('🔄 Tentando reconectar...');
            init();
        }, 5000);
    }
}

// ========== AUTO-LOGIN AUTOMÁTICO ==========
async function autoLogin() {
    console.log('🔐 Tentando auto-login...');
    
    const usuarioLogadoStr = localStorage.getItem('usuarioLogado');
    if (!usuarioLogadoStr) {
        console.log('⚠️ Nenhum usuário logado, redirecionando...');
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const usuarioLogado = JSON.parse(usuarioLogadoStr);
        console.log('👤 Usuário encontrado no localStorage:', usuarioLogado.usuario);
        
        // Buscar no Firestore
        const loginsRef = doc(loginsDb, 'logins', 'LOGINS_ORGTAREFAS');
        const docSnap = await getDoc(loginsRef);
        
        if (!docSnap.exists()) {
            console.log('❌ Documento de logins não encontrado');
            showNotification('Erro de conexão com o banco', 'error');
            return;
        }
        
        const loginsData = docSnap.data();
        let userFound = null;
        let userUid = null;
        
        // Encontrar usuário pelo login
        console.log('🔍 Procurando usuário no banco...');
        for (const [uid, userData] of Object.entries(loginsData)) {
            if (userData && userData.login === usuarioLogado.usuario) {
                userFound = userData;
                userUid = uid;
                console.log(`✅ Usuário encontrado: ${userData.displayName || userData.login}`);
                break;
            }
        }
        
        if (!userFound) {
            console.log('❌ Usuário não encontrado no sistema');
            showNotification('Usuário não cadastrado', 'error');
            localStorage.removeItem('usuarioLogado');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return;
        }
        
        // Criar objeto do usuário
        currentUser = {
            uid: userUid,
            login: userFound.login,
            nome: userFound.displayName || userFound.login,
            perfil: userFound.perfil || 'usuario'
        };
        
        console.log('✅ Auto-login bem-sucedido:', currentUser.nome);
        
        // Inicializar cache de usuários
        allUsers = loginsData;
        console.log(`📊 ${Object.keys(allUsers).length} usuários carregados no cache`);
        
        // Configurar cache em tempo real
        setupUsersCache();
        
        // ATUALIZAR INTERFACE - CORREÇÃO AQUI
        const currentUserNameElement = document.getElementById('current-user-name');
        if (currentUserNameElement) {
            currentUserNameElement.textContent = currentUser.nome;
            console.log('✅ Nome do usuário atualizado na interface');
        } else {
            console.warn('⚠️ Elemento current-user-name não encontrado - buscando alternativas...');
            
            // Tentar encontrar por classe
            const usernameElements = document.querySelectorAll('.username');
            usernameElements.forEach(el => {
                if (el.id !== 'current-user-name') {
                    el.textContent = currentUser.nome;
                    console.log('✅ Nome atualizado via classe .username');
                }
            });
            
            // Tentar atualizar no header
            const headerUserName = document.querySelector('.header-right .username');
            if (headerUserName) {
                headerUserName.textContent = currentUser.nome;
                console.log('✅ Nome atualizado no header');
            }
        }
        
        // REMOVIDA a linha problemática com current-user-status
        // O elemento não existe no HTML atualizado
        
        // Atualizar status online no Firestore
        try {
            await updateDoc(loginsRef, {
                [`${currentUser.uid}.isOnline`]: true,
                [`${currentUser.uid}.lastSeen`]: new Date().toISOString()
            });
            console.log('✅ Status online atualizado no Firestore');
        } catch (firestoreError) {
            console.error('❌ Erro ao atualizar status:', firestoreError);
        }
        
        // Configurar no Realtime Database
        try {
            const userRef = ref(chatDb, `users/${currentUser.uid}`);
            await set(userRef, {
                uid: currentUser.uid,
                login: currentUser.login,
                nome: currentUser.nome,
                perfil: currentUser.perfil,
                isOnline: true,
                lastSeen: Date.now(),
                updatedAt: new Date().toISOString()
            });
            console.log('✅ Dados salvos no Realtime Database');
            
            // Desconexão automática
            onDisconnect(ref(chatDb, `users/${currentUser.uid}/isOnline`)).set(false);
            onDisconnect(ref(chatDb, `users/${currentUser.uid}/lastSeen`)).set(Date.now());
            console.log('✅ Configuração de desconexão automática ativada');
            
        } catch (rtdbError) {
            console.error('❌ Erro no Realtime Database:', rtdbError);
        }
        
        // Carregar dados do chat
        try {
            await loadOnlineUsers();
            await loadConversations();
            console.log('✅ Dados do chat carregados');
        } catch (loadError) {
            console.error('❌ Erro ao carregar dados:', loadError);
        }
        
        // Mostrar notificação de boas-vindas
        showNotification(`✅ Olá, ${currentUser.nome}! Bem-vindo ao chat.`, 'success');
        
        console.log('🎉 Auto-login completado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro crítico no auto-login:', error);
        console.error('Detalhes do erro:', error.message);
        showNotification('Erro ao conectar ao chat', 'error');
    }
}

// ========== CARREGAR TODOS OS USUÁRIOS (CACHE) ==========
async function loadAllUsers() {
    try {
        const loginsRef = doc(loginsDb, 'logins', 'LOGINS_ORGTAREFAS');
        const docSnap = await getDoc(loginsRef);
        
        if (docSnap.exists()) {
            allUsers = docSnap.data();
            //console.log(`📊 ${Object.keys(allUsers).length} usuários carregados no cache`);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar usuários:', error);
    }
}

// ========== FUNÇÃO PARA EXPANDIR/RECOLHER SEÇÕES ==========
window.toggleSection = function(sectionId) {
    const section = document.getElementById(sectionId);
    const toggleButton = event.currentTarget;
    const sectionParent = toggleButton.closest('.sidebar-section');
    
    if (!section) return;
    
    // Alternar classes
    section.classList.toggle('collapsed');
    section.classList.toggle('expanded');
    if (sectionParent) {
        sectionParent.classList.toggle('collapsed');
    }
    
    // Rotacionar ícone
    const icon = toggleButton.querySelector('i');
    if (icon) {
        if (section.classList.contains('collapsed')) {
            icon.style.transform = 'rotate(180deg)';
        } else {
            icon.style.transform = 'rotate(0deg)';
        }
    }
    
    // Se for a lista de usuários e estiver expandindo, recarregar se vazia
    if (section.id === 'all-users' && section.classList.contains('expanded')) {
        const hasContent = section.querySelector('.user-item, .empty-state') !== null;
        const isLoading = section.querySelector('.loading-state') !== null;
        if (!hasContent && !isLoading) {
            console.log('🔄 Expandindo "Todos os Usuários" - recarregando...');
            loadAllUsersList();
        }
    }
    
    // Se for online users e estiver expandindo, recarregar
    if (section.id === 'online-users' && section.classList.contains('expanded')) {
        const hasContent = section.querySelector('.user-item, .empty-state') !== null;
        const isLoading = section.querySelector('.loading-state') !== null;
        if (!hasContent && !isLoading) {
            console.log('🔄 Expandindo "Online" - recarregando...');
            loadOnlineUsers();
        }
    }
    
    // Se for conversas e estiver expandindo, recarregar
    if (section.id === 'conversations' && section.classList.contains('expanded')) {
        const hasContent = section.querySelector('.conversation-item, .empty-state') !== null;
        const isLoading = section.querySelector('.loading-state') !== null;
        if (!hasContent && !isLoading && currentUser) {
            console.log('🔄 Expandindo "Conversas" - recarregando...');
            loadConversations();
        }
    }
    
    console.log(`📂 Seção ${sectionId} ${section.classList.contains('collapsed') ? 'recolhida' : 'expandida'}`);
};


// ========== EXPANDIR/RECOLHER TODAS AS SEÇÕES ==========
window.toggleAllSections = function(action) {
    const sections = ['online-users', 'all-users', 'conversations'];
    
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        const toggleButton = document.querySelector(`.section-toggle[onclick*="${sectionId}"]`);
        const sectionParent = toggleButton ? toggleButton.closest('.sidebar-section') : null;
        
        if (section && toggleButton && sectionParent) {
            if (action === 'expand') {
                section.classList.remove('collapsed');
                section.classList.add('expanded');
                sectionParent.classList.remove('collapsed');
                const icon = toggleButton.querySelector('i');
                if (icon) icon.style.transform = 'rotate(0deg)';
                console.log(`↕️ Expandindo seção: ${sectionId}`);
            } else if (action === 'collapse') {
                section.classList.remove('expanded');
                section.classList.add('collapsed');
                sectionParent.classList.add('collapsed');
                const icon = toggleButton.querySelector('i');
                if (icon) icon.style.transform = 'rotate(180deg)';
                console.log(`↕️ Recolhendo seção: ${sectionId}`);
            } else {
                // toggle
                section.classList.toggle('collapsed');
                section.classList.toggle('expanded');
                sectionParent.classList.toggle('collapsed');
                const icon = toggleButton.querySelector('i');
                if (icon) {
                    if (section.classList.contains('collapsed')) {
                        icon.style.transform = 'rotate(180deg)';
                    } else {
                        icon.style.transform = 'rotate(0deg)';
                    }
                }
                console.log(`↕️ Alternando seção: ${sectionId}`);
            }
        }
    });
};

// ========== INICIALIZAR ESTADO DAS SEÇÕES ==========
function initSectionToggles() {
    // Por padrão, todas as seções começam expandidas
    const sections = ['online-users', 'all-users', 'conversations'];
    
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        const toggleButton = document.querySelector(`.section-toggle[onclick*="${sectionId}"]`);
        
        if (section && toggleButton) {
            section.classList.add('expanded');
            
            // Configurar clique no header também
            const header = toggleButton.closest('.section-header');
            if (header) {
                header.addEventListener('click', (e) => {
                    if (!e.target.closest('.section-toggle') && 
                        !e.target.closest('.badge') &&
                        !e.target.closest('i.fa-chevron-up')) {
                        toggleSection(sectionId);
                    }
                });
            }
        }
    });
    
    console.log('✅ Seções configuradas para expandir/recolher');
}

// ========== OBTER INFORMAÇÕES DO USUÁRIO ==========
function getUserInfo(userId) {
    // Se for o usuário atual
    if (currentUser && userId === currentUser.uid) {
        return {
            nome: currentUser.nome,
            login: currentUser.login,
            perfil: currentUser.perfil
        };
    }
    
    // Buscar no cache de usuários
    if (allUsers[userId]) {
        const userData = allUsers[userId];
        return {
            nome: userData.displayName || userData.login,
            login: userData.login,
            perfil: userData.perfil || 'usuario',
            isOnline: userData.isOnline || false
        };
    }
    
    // Se não encontrou, tentar buscar no Firestore em tempo real
    //console.log(`🔍 Buscando informações do usuário: ${userId}`);
    
    // Retornar valores padrão enquanto busca
    return {
        nome: `Usuário ${userId.substring(0, 8)}`,
        login: userId,
        perfil: 'desconhecido',
        isOnline: false
    };
}

// ========== CARREGAR TODOS OS USUÁRIOS ==========
function loadAllUsersList() {
    const loginsRef = doc(loginsDb, 'logins', 'LOGINS_ORGTAREFAS');
    
    onSnapshot(loginsRef, (doc) => {
        if (doc.exists()) {
            const loginsData = doc.data();
            const allUsersList = [];
            
            for (const [uid, userData] of Object.entries(loginsData)) {
                if (userData && uid !== currentUser.uid) {
                    const userInfo = getUserInfo(uid);
                    allUsersList.push({
                        uid: uid,
                        nome: userInfo.nome,
                        login: userInfo.login,
                        perfil: userInfo.perfil,
                        isOnline: userData.isOnline || false,
                        lastSeen: userData.lastSeen || Date.now()
                    });
                }
            }
            
            renderAllUsers(allUsersList);
        }
    });
}

// ========== ATUALIZAR CACHE DE USUÁRIOS EM TEMPO REAL ==========
async function setupUsersCache() {
    const loginsRef = doc(loginsDb, 'logins', 'LOGINS_ORGTAREFAS');
    
    // Listener para atualizações em tempo real
    onSnapshot(loginsRef, (doc) => {
        if (doc.exists()) {
            allUsers = doc.data();
            //console.log(`📊 Cache de usuários atualizado: ${Object.keys(allUsers).length} usuários`);
            
            // Atualizar interface se houver mudanças
            if (currentUser) {
                loadOnlineUsers();
                loadConversations();
            }
        }
    });
}

// ========== CARREGAR USUÁRIOS ONLINE ==========
function loadOnlineUsers() {
    const loginsRef = doc(loginsDb, 'logins', 'LOGINS_ORGTAREFAS');
    
    onSnapshot(loginsRef, (doc) => {
        if (doc.exists()) {
            const loginsData = doc.data();
            const onlineUsers = [];
            
            for (const [uid, userData] of Object.entries(loginsData)) {
                if (userData && userData.isOnline && uid !== currentUser.uid) {
                    const userInfo = getUserInfo(uid);
                    onlineUsers.push({
                        uid: uid,
                        nome: userInfo.nome,
                        login: userInfo.login,
                        perfil: userInfo.perfil
                    });
                }
            }
            
            renderOnlineUsers(onlineUsers);
        }
    });
}

// ========== RENDERIZAR TODOS OS USUÁRIOS ==========
function renderAllUsers(users) {
    const container = document.getElementById('all-users');
    const count = document.getElementById('all-users-count');
    
    if (!container || !count) {
        console.warn('⚠️ Elementos de all-users não encontrados');
        return;
    }
    
    count.textContent = users.length;
    
    if (users.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum usuário encontrado</div>';
        return;
    }
    
    // Ordenar: online primeiro, depois offline por nome
    users.sort((a, b) => {
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        return a.nome.localeCompare(b.nome);
    });
    
    let html = '';
    users.forEach(user => {
        const lastSeen = user.lastSeen ? formatLastSeen(user.lastSeen) : 'Nunca';
        const statusClass = user.isOnline ? 'online' : 'offline';
        const statusText = user.isOnline ? 'Online' : `Visto ${lastSeen}`;
        
        html += `
            <div class="user-item" onclick="startConversation('${user.uid}')">
                <div class="user-avatar">${user.nome.charAt(0).toUpperCase()}</div>
                <div class="user-info">
                    <div class="user-name">${user.nome}</div>
                    <div class="user-details">
                        <span class="user-login">@${user.login}</span>
                        <span class="user-perfil">${user.perfil}</span>
                    </div>
                    <div class="user-status-text ${statusClass}">${statusText}</div>
                </div>
                <div class="user-status ${statusClass}"></div>
            </div>`;
    });
    
    container.innerHTML = html;
    
    // Garantir que a seção esteja visível se há usuários
    if (users.length > 0 && container.classList.contains('collapsed')) {
        console.log('📈 Carregando todos os usuários - expandindo seção automaticamente');
        container.classList.remove('collapsed');
        container.classList.add('expanded');
        const sectionHeader = container.closest('.sidebar-section')?.querySelector('.section-header');
        if (sectionHeader) {
            const toggleBtn = sectionHeader.querySelector('.section-toggle');
            if (toggleBtn) {
                toggleBtn.querySelector('i').style.transform = 'rotate(0deg)';
            }
        }
    }
    
    console.log(`✅ ${users.length} usuários renderizados na lista completa`);
}

// ========== FORMATAR "ÚLTIMA VEZ VISTO" ==========
function formatLastSeen(timestamp) {
    if (!timestamp) return 'nunca';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'agora mesmo';
    if (minutes < 60) return `há ${minutes} min`;
    if (hours < 24) return `há ${hours} h`;
    if (days < 7) return `há ${days} d`;
    
    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
    });
}

// ========== RENDERIZAR USUÁRIOS ONLINE ==========
function renderOnlineUsers(users) {
    const container = document.getElementById('online-users');
    const count = document.getElementById('online-count');
    
    if (!container || !count) {
        console.warn('⚠️ Elementos de online-users não encontrados');
        return;
    }
    
    count.textContent = users.length;
    
    if (users.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum colega online</div>';
        
        // Se não há usuários online e a seção está expandida, manter expandida
        if (container.classList.contains('expanded')) {
            console.log('ℹ️ Nenhum usuário online, mantendo seção expandida');
        }
        return;
    }
    
    let html = '';
    users.forEach(user => {
        html += `
            <div class="user-item" onclick="startConversation('${user.uid}')">
                <div class="user-avatar">${user.nome.charAt(0).toUpperCase()}</div>
                <div class="user-info">
                    <div class="user-name">${user.nome}</div>
                    <div class="user-details">
                        <span class="user-login">@${user.login}</span>
                        <span class="user-perfil">${user.perfil}</span>
                    </div>
                </div>
                <div class="user-status online"></div>
            </div>`;
    });
    
    container.innerHTML = html;
    
    // Garantir que a seção esteja visível se há usuários
    if (users.length > 0 && container.classList.contains('collapsed')) {
        console.log('📈 Há usuários online - expandindo seção automaticamente');
        container.classList.remove('collapsed');
        container.classList.add('expanded');
        const sectionHeader = container.closest('.sidebar-section')?.querySelector('.section-header');
        if (sectionHeader) {
            const toggleBtn = sectionHeader.querySelector('.section-toggle');
            if (toggleBtn) {
                toggleBtn.querySelector('i').style.transform = 'rotate(0deg)';
            }
        }
    }
    
    console.log(`✅ ${users.length} usuários online renderizados`);
}


// ========== CARREGAR CONVERSAS ==========
function loadConversations() {
    const conversationsRef = ref(chatDb, `userConversations/${currentUser.uid}`);
    
    onValue(conversationsRef, (snapshot) => {
        const conversations = snapshot.val();
        renderConversations(conversations);
    });
}

// ========== ATUALIZAR STATUS EM TEMPO REAL ==========
function setupUsersStatusUpdates() {
    const usersRef = ref(chatDb, 'users');
    
    onValue(usersRef, (snapshot) => {
        const usersData = snapshot.val();
        
        if (!usersData) return;
        
        // Atualizar status no cache
        Object.entries(usersData).forEach(([uid, userData]) => {
            if (allUsers[uid] && userData) {
                allUsers[uid].isOnline = userData.isOnline || false;
                allUsers[uid].lastSeen = userData.lastSeen || Date.now();
            }
        });
        
        // Recarregar listas se necessário
        if (currentUser) {
            loadOnlineUsers();
            loadAllUsersList();
        }
    });
}

// ========== RENDERIZAR CONVERSAS ==========
function renderConversations(conversations) {
    const container = document.getElementById('conversations');
    
    if (!container) {
        console.warn('⚠️ Elemento de conversas não encontrado');
        return;
    }
    
    if (!conversations || Object.keys(conversations).length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhuma conversa</div>';
        
        // Se não há conversas e a seção está expandida, manter expandida
        if (container.classList.contains('expanded')) {
            console.log('ℹ️ Nenhuma conversa, mantendo seção expandida');
        }
        return;
    }
    
    // Limpar container
    container.innerHTML = '';
    
    // Ordenar conversas por última mensagem (mais recente primeiro)
    const sortedConversations = Object.entries(conversations)
        .sort(([, a], [, b]) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));
    
    sortedConversations.forEach(([conversationId, conversationData]) => {
        const otherUserId = getOtherUserId(conversationData.participants);
        
        if (otherUserId) {
            // Criar elemento de conversa
            const conversationItem = document.createElement('div');
            conversationItem.className = 'conversation-item';
            conversationItem.onclick = () => openConversation(conversationId, otherUserId);
            
            // Buscar informações do usuário
            const userInfo = getUserInfo(otherUserId);
            const time = formatTime(conversationData.lastTimestamp || Date.now());
            
            // Preencher com informações corretas
            conversationItem.innerHTML = `
                <div class="conversation-avatar">${userInfo.nome.charAt(0).toUpperCase()}</div>
                <div class="conversation-info">
                    <div class="conversation-header">
                        <span class="conversation-name">${userInfo.nome}</span>
                        <span class="conversation-time">${time}</span>
                    </div>
                    <div class="conversation-preview">
                        ${conversationData.lastMessage || 'Nova conversa'}
                    </div>
                </div>`;
            
            container.appendChild(conversationItem);
        }
    });
    
    // Se não houver conversas, mostrar mensagem
    if (container.children.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhuma conversa</div>';
    } else {
        // Garantir que a seção esteja visível se há conversas
        if (container.classList.contains('collapsed')) {
            console.log('📈 Há conversas - expandindo seção automaticamente');
            container.classList.remove('collapsed');
            container.classList.add('expanded');
            const sectionHeader = container.closest('.sidebar-section')?.querySelector('.section-header');
            if (sectionHeader) {
                const toggleBtn = sectionHeader.querySelector('.section-toggle');
                if (toggleBtn) {
                    toggleBtn.querySelector('i').style.transform = 'rotate(0deg)';
                }
            }
        }
    }
    
    console.log(`✅ ${container.children.length} conversas renderizadas`);
}
    

// ========== INICIAR CONVERSA ==========
window.startConversation = async function(otherUserId) {
    if (!currentUser || !otherUserId) return;
    
    currentConversation = [currentUser.uid, otherUserId].sort().join('_');
    
    //console.log('💬 Iniciando conversa com:', otherUserId);
    
    // Obter informações do usuário
    const userInfo = getUserInfo(otherUserId);
    
    // Atualizar interface
    document.getElementById('other-user-name').textContent = userInfo.nome;
    
    // Atualizar status no header
    const userData = allUsers[otherUserId];
    const isOnline = userData ? (userData.isOnline || false) : false;
    
    const statusElement = document.querySelector('#active-conversation .user-status');
    if (statusElement) {
        statusElement.className = `user-status ${isOnline ? 'online' : 'offline'}`;
    }
    
    document.getElementById('no-conversation').classList.add('hidden');
    document.getElementById('active-conversation').classList.remove('hidden');
    
    // Criar conversa se não existir
    const conversationRef = ref(chatDb, `userConversations/${currentUser.uid}/${currentConversation}`);
    
    onValue(conversationRef, (snapshot) => {
        if (!snapshot.exists()) {
            const conversationData = {
                participants: {
                    [currentUser.uid]: true,
                    [otherUserId]: true
                },
                lastMessage: '',
                lastTimestamp: Date.now()
            };
            
            set(conversationRef, conversationData);
            set(ref(chatDb, `userConversations/${otherUserId}/${currentConversation}`), conversationData);
        }
        
        // Carregar mensagens
        loadMessages(currentConversation);
        
    }, { onlyOnce: true });
    
    // Focar no input
    setTimeout(() => {
        const input = document.getElementById('message-input');
        if (input) input.focus();
    }, 300);
};

// ========== ABRIR CONVERSA ==========
window.openConversation = function(conversationId, otherUserId) {
    currentConversation = conversationId;
    
    //console.log('📂 Abrindo conversa:', conversationId);
    
    // Obter informações do usuário
    const userInfo = getUserInfo(otherUserId);
    
    // Atualizar interface
    document.getElementById('other-user-name').textContent = userInfo.nome;
    document.getElementById('no-conversation').classList.add('hidden');
    document.getElementById('active-conversation').classList.remove('hidden');
    
    // Carregar mensagens
    loadMessages(conversationId);
    
    // Focar no input
    setTimeout(() => {
        const input = document.getElementById('message-input');
        if (input) input.focus();
    }, 300);
};

// ========== CARREGAR MENSAGENS ==========
function loadMessages(conversationId) {
    const messagesRef = ref(chatDb, `messages/${conversationId}`);
    const container = document.getElementById('messages-container');
    
    onValue(messagesRef, (snapshot) => {
        const messagesData = snapshot.val();
        
        if (!messagesData) {
            container.innerHTML = `
                <div class="empty-conversation">
                    <i class="fas fa-comment-slash"></i>
                    <h4>Nenhuma mensagem ainda</h4>
                    <p>Envie a primeira mensagem!</p>
                </div>`;
            return;
        }
        
        const messages = Object.values(messagesData)
            .sort((a, b) => a.timestamp - b.timestamp);
        
        renderMessages(messages);
        scrollToBottom();
    });
}

// ========== RENDERIZAR MENSAGENS ==========
function renderMessages(messages) {
    const container = document.getElementById('messages-container');
    container.innerHTML = '';
    
    messages.forEach(msg => {
        const isCurrentUser = msg.senderId === currentUser.uid;
        const time = formatTime(msg.timestamp);
        
        // Obter nome do remetente
        const senderInfo = getUserInfo(msg.senderId);
        const senderName = senderInfo.nome;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
        
        messageDiv.innerHTML = `
            <div class="message-content">
                ${!isCurrentUser ? `<div class="message-sender">${senderName}</div>` : ''}
                <div class="message-text">${msg.text}</div>
                <div class="message-time">${time}</div>
            </div>`;
        
        container.appendChild(messageDiv);
    });
}

// ========== ENVIAR MENSAGEM ==========
async function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    
    if (!text || !currentUser || !currentConversation) {
        //console.log('⚠️ Não pode enviar:', { text, currentUser, currentConversation });
        return;
    }
    
    //console.log('📤 Enviando mensagem:', text);
    
    try {
        const messageId = push(ref(chatDb, 'messages')).key;
        const timestamp = Date.now();
        
        // Enviar mensagem
        await set(ref(chatDb, `messages/${currentConversation}/${messageId}`), {
            id: messageId,
            senderId: currentUser.uid,
            senderName: currentUser.nome,
            text: text,
            timestamp: timestamp,
            read: false
        });
        
        // Atualizar conversa
        const conversationUpdate = {
            lastMessage: text,
            lastTimestamp: timestamp
        };
        
        const otherUserId = getOtherUserIdFromConversation(currentConversation);
        if (otherUserId) {
            await update(ref(chatDb, `userConversations/${currentUser.uid}/${currentConversation}`), conversationUpdate);
            await update(ref(chatDb, `userConversations/${otherUserId}/${currentConversation}`), conversationUpdate);
        }
        
        // Limpar input
        input.value = '';
        input.focus();
        
        //console.log('✅ Mensagem enviada!');
        
    } catch (error) {
        console.error('❌ Erro ao enviar:', error);
        showNotification('Erro ao enviar mensagem', 'error');
    }
}

// ========== FUNÇÕES AUXILIARES ==========
function getOtherUserId(participants) {
    if (!participants || !currentUser) return null;
    const participantIds = Object.keys(participants);
    return participantIds.find(id => id !== currentUser.uid);
}

function getOtherUserIdFromConversation(conversationId) {
    if (!conversationId || !currentUser) return null;
    const parts = conversationId.split('_');
    return parts.find(part => part !== currentUser.uid);
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit'
    });
}

function scrollToBottom() {
    const container = document.getElementById('messages-container');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    console.log('🔧 Configurando listeners...');
    
    // Botão enviar
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
        console.log('✅ Botão enviar configurado');
    }
    
    // Input Enter
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        console.log('✅ Input configurado');
    }
    
    // Menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
    }
    
    // Botão voltar
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (currentUser) {
                const loginsRef = doc(loginsDb, 'logins', 'LOGINS_ORGTAREFAS');
                await updateDoc(loginsRef, {
                    [`${currentUser.uid}.isOnline`]: false
                });
            }
            window.location.href = 'index.html';
        });
    }
    
    console.log('📝 Listeners configurados');
}

// ========== NOTIFICAÇÃO ==========
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// ========== INICIAR ==========
document.addEventListener('DOMContentLoaded', init);
