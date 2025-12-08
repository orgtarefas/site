// ========== CONFIGURAÇÃO FIREBASE ==========

// Usando a mesma configuração do sistema principal
const firebaseConfig = {
    apiKey: "AIzaSyAs0Ke4IBfBWDrfH0AXaOhCEjtfpPtR_Vg",
    authDomain: "orgtarefas-85358.firebaseapp.com",
    projectId: "orgtarefas-85358",
    storageBucket: "orgtarefas-85358.firebasestorage.app",
    messagingSenderId: "1023569488575",
    appId: "1:1023569488575:web:18f9e201115a1a92ccb40a"
};

// Configuração do Chat (Realtime Database)
const chatFirebaseConfig = {
    apiKey: "AIzaSyAYROPCh-558mNXPrO7onAXFvfBe13q5Js",
    authDomain: "orgtarefas-chat.firebaseapp.com",
    databaseURL: "https://orgtarefas-chat-default-rtdb.firebaseio.com",
    projectId: "orgtarefas-chat",
    storageBucket: "orgtarefas-chat.firebasestorage.app",
    messagingSenderId: "380919096800",
    appId: "1:380919096800:web:7b54e7e341c9266c207785"
};

// ========== INICIALIZAR APPS ==========
const mainApp = firebase.initializeApp(firebaseConfig, 'mainApp');
const chatApp = firebase.initializeApp(chatFirebaseConfig);

// ========== REFERÊNCIAS ==========
const db = firebase.firestore(mainApp);
const chatDb = firebase.database();

// ========== ELEMENTOS DOM ==========
// Seletor de Usuário (removida a tela de login)
const userSelect = document.getElementById('user-select');
const confirmUserBtn = document.getElementById('confirm-user-btn');
const loginStatus = document.getElementById('login-status');
const backBtn = document.getElementById('back-btn');

// Área do usuário logado
const loggedUserArea = document.getElementById('logged-user-area');
const currentUserName = document.getElementById('current-user-name');
const currentUserLogin = document.getElementById('current-user-login');
const userAvatar = document.getElementById('user-avatar');
const onlineStatus = document.getElementById('online-status');

// Seções da sidebar
const userSelectorContainer = document.querySelector('.user-selector-container');
const searchSection = document.getElementById('search-section');
const conversationsHeader = document.getElementById('conversations-header');
const conversationsList = document.getElementById('conversations-list');
const onlineUsersHeader = document.getElementById('online-users-header');
const onlineUsersList = document.getElementById('online-users-list');

// Chat principal
const chatInfoDefault = document.getElementById('chat-info-default');
const chatInfoActive = document.getElementById('chat-info-active');
const activeUserName = document.getElementById('active-user-name');
const activeUserAvatar = document.getElementById('active-user-avatar');
const activeUserPerfil = document.getElementById('active-user-perfil');
const activeUserStatus = document.getElementById('active-user-status');

// Mensagens
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messageInputArea = document.getElementById('message-input-area');
const welcomeScreen = document.getElementById('welcome-screen');

// ========== VARIÁVEIS GLOBAIS ==========
let currentUser = null;
let currentConversation = null;
let conversationsRef = null;
let usersRef = null;
let messagesRef = null;
let allRealUsers = [];
let onlineUsersCache = {};

// ========== INICIALIZAÇÃO ==========
async function init() {
    console.log('🚀 Inicializando chat...');
    setupEventListeners();
    await loadUsersFromFirestore();
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    // Seletor de usuário
    if (userSelect) {
        userSelect.addEventListener('change', (e) => {
            if (confirmUserBtn) {
                confirmUserBtn.disabled = !e.target.value;
            }
        });
    }
    
    if (confirmUserBtn) {
        confirmUserBtn.addEventListener('click', handleUserSelection);
    }
    
    // Botão voltar
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    // Mensagens
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
}

// ========== CARREGAR USUÁRIOS DO FIRESTORE ==========
async function loadUsersFromFirestore() {
    try {
        console.log('🔍 Buscando usuários reais...');
        showStatus('Buscando usuários...', 'info');
        
        const querySnapshot = await db.collection('LOGINS_ORGTAREFAS').get();
        console.log(`📄 Total de documentos: ${querySnapshot.size}`);
        
        let usuariosReais = [];
        
        querySnapshot.forEach(doc => {
            const docId = doc.id;
            const dados = doc.data();
            
            // Verificar TODOS os campos do documento
            Object.keys(dados).forEach(campo => {
                const valor = dados[campo];
                
                if (typeof valor === 'object' && valor !== null) {
                    // Se tem login e displayName, é um usuário
                    if (valor.login && valor.displayName) {
                        console.log(`✅ ENCONTROU USUÁRIO: ${valor.login}`);
                        
                        const usuario = {
                            uid: `${docId}_${campo}`,
                            docId: docId,
                            campo: campo,
                            login: valor.login,
                            nome: valor.displayName,
                            perfil: valor.perfil || 'Usuário',
                            email: valor.email || '',
                            status: valor.status || 'Ativo',
                            senha: valor.senha || ''
                        };
                        
                        usuariosReais.push(usuario);
                    }
                }
            });
        });
        
        console.log(`🎯 Total de usuários reais encontrados: ${usuariosReais.length}`);
        
        if (usuariosReais.length > 0) {
            // Ordenar por nome
            usuariosReais.sort((a, b) => a.nome.localeCompare(b.nome));
            
            // Adicionar ao select
            usuariosReais.forEach(usuario => {
                const option = document.createElement('option');
                option.value = JSON.stringify(usuario);
                option.textContent = `${usuario.nome} (${usuario.login}) - ${usuario.perfil}`;
                if (userSelect) {
                    userSelect.appendChild(option);
                }
            });
            
            showStatus(`${usuariosReais.length} usuário(s) carregado(s)`, 'success');
        } else {
            showStatus('Nenhum usuário encontrado na coleção LOGINS_ORGTAREFAS', 'error');
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar usuários:', error);
        showStatus('Erro: ' + error.message, 'error');
    }
}

// ========== SELEÇÃO DE USUÁRIO ==========
async function handleUserSelection() {
    if (!userSelect || !userSelect.value) return;
    
    try {
        const userData = JSON.parse(userSelect.value);
        console.log('👤 Usuário selecionado:', userData);
        showStatus('Conectando ao chat...', 'info');
        
        currentUser = userData;
        
        // 1. Carregar TODOS os usuários reais
        await loadAllRealUsers();
        
        // 2. Configurar usuário no chat
        await setupChatUser(currentUser);
        
        // 3. Atualizar interface
        updateUserInterface();
        
        // 4. Configurar listeners em tempo real
        setupRealtimeListeners();
        
        showStatus(`✅ Bem-vindo, ${currentUser.nome}!`, 'success');
        
    } catch (error) {
        console.error('❌ Erro ao selecionar usuário:', error);
        showStatus('Erro: ' + error.message, 'error');
    }
}

// ========== CARREGAR TODOS OS USUÁRIOS REAIS ==========
async function loadAllRealUsers() {
    try {
        console.log('🔍 Carregando TODOS os usuários...');
        const snapshot = await db.collection('LOGINS_ORGTAREFAS').get();
        allRealUsers = [];
        
        snapshot.forEach(doc => {
            const dados = doc.data();
            
            // Percorrer todos os campos do documento
            for (const [campo, valor] of Object.entries(dados)) {
                if (typeof valor === 'object' && valor !== null && valor.login) {
                    const usuario = {
                        uid: `${doc.id}_${campo}`,
                        docId: doc.id,
                        campo: campo,
                        login: valor.login,
                        nome: valor.displayName || valor.login,
                        perfil: valor.perfil || 'Usuário',
                        email: valor.email || '',
                        status: valor.status || 'Ativo'
                    };
                    
                    // Adicionar apenas se for diferente do usuário atual
                    if (usuario.uid !== currentUser.uid) {
                        allRealUsers.push(usuario);
                        console.log(`👤 Usuário carregado: ${usuario.nome} (${usuario.login})`);
                    }
                }
            }
        });
        
        console.log(`📊 Total de usuários reais carregados: ${allRealUsers.length}`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar usuários:', error);
    }
}

// ========== CONFIGURAR USUÁRIO NO CHAT ==========
async function setupChatUser(userData) {
    console.log('⚙️ Configurando usuário no chat:', userData);
    
    // Atualizar interface do usuário logado
    if (currentUserName) currentUserName.textContent = userData.nome;
    if (currentUserLogin) currentUserLogin.textContent = userData.login;
    
    // Gerar avatar
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.nome)}&background=667eea&color=fff`;
    if (userAvatar) userAvatar.src = avatarUrl;
    
    // Salvar no RTDB do chat
    const userRef = chatDb.ref(`users/${userData.uid}`);
    
    try {
        await userRef.set({
            uid: userData.uid,
            login: userData.login,
            nome: userData.nome,
            perfil: userData.perfil,
            avatarUrl: avatarUrl,
            isOnline: true,
            lastSeen: Date.now()
        });
        
        console.log('✅ Usuário salvo no RTDB');
        
        // Configurar desconexão automática
        userRef.child('isOnline').onDisconnect().set(false);
        userRef.child('lastSeen').onDisconnect().set(Date.now());
        
    } catch (error) {
        console.error('❌ Erro ao salvar usuário no RTDB:', error);
    }
    
    return userData;
}

// ========== ATUALIZAR INTERFACE DO USUÁRIO ==========
function updateUserInterface() {
    if (!currentUser) return;
    
    // Mostrar área do usuário logado
    if (userSelectorContainer) userSelectorContainer.classList.add('hidden');
    if (loggedUserArea) loggedUserArea.classList.remove('hidden');
    if (searchSection) searchSection.classList.remove('hidden');
    if (conversationsHeader) conversationsHeader.classList.remove('hidden');
    if (conversationsList) conversationsList.classList.remove('hidden');
    if (onlineUsersHeader) onlineUsersHeader.classList.remove('hidden');
    if (onlineUsersList) onlineUsersList.classList.remove('hidden');
    
    // Atualizar status online
    if (onlineStatus) {
        onlineStatus.textContent = 'online';
        onlineStatus.style.color = '#4caf50';
    }
}

// ========== LISTENERS EM TEMPO REAL ==========
function setupRealtimeListeners() {
    if (!currentUser) return;
    
    console.log('📡 Configurando listeners em tempo real...');
    
    // 1. Ouvir conversas do usuário atual
    conversationsRef = chatDb.ref(`userConversations/${currentUser.uid}`);
    conversationsRef.on('value', (snapshot) => {
        const conversationsData = snapshot.val();
        renderConversations(conversationsData);
    });
    
    // 2. Ouvir usuários online no chat
    usersRef = chatDb.ref('users');
    usersRef.orderByChild('isOnline').equalTo(true).on('value', (snapshot) => {
        const usersData = snapshot.val();
        onlineUsersCache = usersData || {};
        renderOnlineUsers(usersData);
    });
}

// ========== RENDERIZAR CONVERSAS ==========
function renderConversations(conversationsData) {
    if (!conversationsList) return;
    
    console.log('💬 Renderizando conversas...', conversationsData);
    
    if (!conversationsData || Object.keys(conversationsData).length === 0) {
        conversationsList.innerHTML = `
            <div class="no-conversations">
                <i class="fas fa-comments"></i>
                <p>Nenhuma conversa ainda</p>
                <small>Selecione um usuário online para começar</small>
            </div>`;
        return;
    }
    
    let html = '';
    const conversations = Object.entries(conversationsData);
    
    conversations.forEach(([conversationId, conversationData]) => {
        // Encontrar o outro usuário da conversa
        const otherUserId = getOtherUserId(conversationData.participants);
        
        // Buscar informações REAIS do usuário
        const otherUser = allRealUsers.find(u => u.uid === otherUserId);
        
        if (otherUser) {
            const isActive = currentConversation === conversationId;
            const time = conversationData.lastTimestamp ? 
                formatTime(conversationData.lastTimestamp) : '';
            
            html += `
                <div class="conversation-item ${isActive ? 'active' : ''}" 
                     data-conversation="${conversationId}"
                     data-user="${otherUserId}">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.nome)}&background=667eea&color=fff" 
                         class="conversation-avatar" alt="${otherUser.nome}">
                    <div class="conversation-details">
                        <div class="conversation-name">${otherUser.nome}</div>
                        <div class="conversation-last-message">${conversationData.lastMessage || ''}</div>
                    </div>
                    <div class="conversation-time">${time}</div>
                    ${conversationData.unreadCount > 0 ? 
                        `<div class="unread-badge">${conversationData.unreadCount}</div>` : ''}
                </div>`;
        }
    });
    
    conversationsList.innerHTML = html;
    
    // Adicionar listeners para conversas
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.addEventListener('click', () => {
            const conversationId = item.dataset.conversation;
            const userId = item.dataset.user;
            openConversation(conversationId, userId);
        });
    });
}

// ========== RENDERIZAR USUÁRIOS ONLINE ==========
function renderOnlineUsers(usersData) {
    if (!onlineUsersList) return;
    
    console.log('👥 Renderizando usuários online...', usersData);
    
    if (!usersData) {
        onlineUsersList.innerHTML = '<div class="loading">Carregando...</div>';
        return;
    }
    
    let html = '';
    const onlineUsers = [];
    
    // Filtrar usuários que estão online E são diferentes do usuário atual
    Object.keys(usersData).forEach(uid => {
        const user = usersData[uid];
        if (user.isOnline && uid !== currentUser.uid) {
            onlineUsers.push({
                uid: uid,
                login: user.login,
                nome: user.nome || 'Usuário',
                perfil: user.perfil || 'Online',
                avatarUrl: user.avatarUrl
            });
        }
    });
    
    if (onlineUsers.length === 0) {
        html = '<div class="no-users">Nenhum usuário online</div>';
    } else {
        onlineUsers.forEach(user => {
            // Tentar encontrar informações mais completas nos usuários reais
            const realUser = allRealUsers.find(u => u.uid === user.uid);
            const displayName = realUser ? realUser.nome : user.nome;
            const perfil = realUser ? realUser.perfil : user.perfil;
            
            html += `
                <div class="user-online-item" data-user="${user.uid}">
                    <img src="${user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=667eea&color=fff`}" 
                         class="user-online-avatar" alt="${displayName}">
                    <div>
                        <div class="user-online-name">${displayName}</div>
                        <div class="user-online-perfil">${perfil}</div>
                    </div>
                    <div class="status-indicator online"></div>
                </div>`;
        });
    }
    
    onlineUsersList.innerHTML = html;
    
    // Adicionar listeners para usuários online
    document.querySelectorAll('.user-online-item').forEach(item => {
        item.addEventListener('click', () => {
            const userId = item.dataset.user;
            startNewConversation(userId);
        });
    });
}

// ========== INICIAR NOVA CONVERSA ==========
async function startNewConversation(otherUserId) {
    console.log('💬 Iniciando nova conversa com:', otherUserId);
    
    // Encontrar informações REAIS do outro usuário
    const otherUser = allRealUsers.find(u => u.uid === otherUserId);
    
    if (!otherUser) {
        console.error('❌ Usuário não encontrado:', otherUserId);
        showError('Usuário não encontrado');
        return;
    }
    
    // Criar ID da conversa (ordenado para ser único)
    const conversationId = [currentUser.uid, otherUserId].sort().join('_');
    
    console.log('ID da conversa:', conversationId);
    
    try {
        // Verificar se conversa já existe
        const conversationRef = chatDb.ref(`userConversations/${currentUser.uid}/${conversationId}`);
        const snapshot = await conversationRef.once('value');
        
        if (!snapshot.exists()) {
            // Criar conversa para ambos os usuários
            const conversationData = {
                participants: {
                    [currentUser.uid]: true,
                    [otherUserId]: true
                },
                lastMessage: '',
                lastTimestamp: Date.now(),
                unreadCount: 0
            };
            
            await conversationRef.set(conversationData);
            await chatDb.ref(`userConversations/${otherUserId}/${conversationId}`).set(conversationData);
            
            console.log('✅ Nova conversa criada');
        }
        
        // Abrir a conversa
        openConversation(conversationId, otherUserId);
        
    } catch (error) {
        console.error('❌ Erro ao criar conversa:', error);
        showError('Erro ao iniciar conversa');
    }
}

// ========== ABRIR CONVERSA ==========
function openConversation(conversationId, otherUserId) {
    console.log('📂 Abrindo conversa:', conversationId, 'com usuário:', otherUserId);
    
    currentConversation = conversationId;
    
    // Encontrar informações REAIS do outro usuário
    const otherUser = allRealUsers.find(u => u.uid === otherUserId);
    
    if (!otherUser) {
        console.error('❌ Usuário não encontrado para conversa');
        return;
    }
    
    // Ativar item na lista
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-conversation="${conversationId}"]`)?.classList.add('active');
    
    // Atualizar cabeçalho
    if (chatInfoDefault) chatInfoDefault.classList.add('hidden');
    if (chatInfoActive) chatInfoActive.classList.remove('hidden');
    
    if (activeUserName) activeUserName.textContent = otherUser.nome;
    if (activeUserPerfil) activeUserPerfil.textContent = otherUser.perfil;
    
    // Verificar se está online
    const isOnline = onlineUsersCache[otherUserId]?.isOnline;
    if (activeUserStatus) {
        activeUserStatus.textContent = isOnline ? '● online' : '● offline';
        activeUserStatus.style.color = isOnline ? '#4caf50' : '#999';
    }
    
    // Gerar avatar
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.nome)}&background=667eea&color=fff`;
    if (activeUserAvatar) activeUserAvatar.src = avatarUrl;
    
    // Mostrar área de input
    if (messageInputArea) {
        messageInputArea.classList.remove('hidden');
        if (welcomeScreen) welcomeScreen.style.display = 'none';
    }
    
    if (messageInput) messageInput.focus();
    
    // Carregar mensagens
    loadMessages(conversationId);
}

// ========== CARREGAR MENSAGENS ==========
function loadMessages(conversationId) {
    console.log('📨 Carregando mensagens da conversa:', conversationId);
    
    // Remover listener anterior
    if (messagesRef) {
        messagesRef.off();
    }
    
    // Ouvir mensagens desta conversa
    messagesRef = chatDb.ref(`messages/${conversationId}`);
    messagesRef.orderByChild('timestamp').limitToLast(50).on('value', (snapshot) => {
        const messagesData = snapshot.val();
        const messages = [];
        
        if (messagesData) {
            Object.keys(messagesData).forEach(key => {
                messages.push({ id: key, ...messagesData[key] });
            });
            messages.sort((a, b) => a.timestamp - b.timestamp);
            renderMessages(messages);
            console.log(`📊 ${messages.length} mensagens carregadas`);
        } else {
            if (messagesContainer) {
                messagesContainer.innerHTML = `
                    <div class="no-messages">
                        <i class="fas fa-comment-slash"></i>
                        <p>Nenhuma mensagem ainda</p>
                        <small>Envie a primeira mensagem!</small>
                    </div>`;
            }
            console.log('📭 Nenhuma mensagem nesta conversa');
        }
    });
}

// ========== ENVIAR MENSAGEM ==========
async function sendMessage() {
    if (!currentUser || !currentConversation || !messageInput || !messageInput.value.trim()) {
        return;
    }
    
    const text = messageInput.value.trim();
    const messageId = chatDb.ref().push().key;
    const timestamp = Date.now();
    
    console.log('📤 Enviando mensagem:', text);
    
    try {
        // 1. Salvar mensagem
        await chatDb.ref(`messages/${currentConversation}/${messageId}`).set({
            id: messageId,
            senderId: currentUser.uid,
            senderName: currentUser.nome,
            senderLogin: currentUser.login,
            text: text,
            timestamp: timestamp,
            read: false
        });
        
        // 2. Encontrar o outro usuário da conversa
        const otherUserId = getOtherUserIdFromConversation(currentConversation);
        
        if (!otherUserId) {
            throw new Error('Não foi possível identificar o destinatário');
        }
        
        // 3. Atualizar conversa para AMBOS os usuários
        const conversationUpdate = {
            lastMessage: text,
            lastTimestamp: timestamp
        };
        
        await chatDb.ref(`userConversations/${currentUser.uid}/${currentConversation}`).update(conversationUpdate);
        await chatDb.ref(`userConversations/${otherUserId}/${currentConversation}`).update(conversationUpdate);
        
        console.log('✅ Mensagem enviada e conversa atualizada');
        
        // 4. Limpar input
        messageInput.value = '';
        scrollToBottom();
        
    } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        showError('Erro ao enviar mensagem: ' + error.message);
    }
}

// ========== FUNÇÕES AUXILIARES ==========
function getOtherUserId(participants) {
    if (!participants) return null;
    const participantIds = Object.keys(participants);
    return participantIds.find(id => id !== currentUser.uid);
}

function getOtherUserIdFromConversation(conversationId) {
    const parts = conversationId.split('_');
    return parts.find(part => part !== currentUser.uid);
}

function renderMessages(messages) {
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = '';
    
    messages.forEach(msg => {
        const div = document.createElement('div');
        const isSent = msg.senderId === currentUser.uid;
        const time = formatTime(msg.timestamp);
        
        div.className = `message ${isSent ? 'sent' : 'received'}`;
        div.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${msg.senderName}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-text">${formatMessageText(msg.text)}</div>
        `;
        
        messagesContainer.appendChild(div);
    });
    
    scrollToBottom();
}

function showStatus(message, type) {
    if (!loginStatus) return;
    
    loginStatus.textContent = message;
    loginStatus.style.color = type === 'error' ? '#f44336' : 
                              type === 'success' ? '#4caf50' : '#2196f3';
    loginStatus.style.display = 'block';
    
    setTimeout(() => {
        loginStatus.style.display = 'none';
    }, 3000);
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

function formatMessageText(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: inherit; text-decoration: underline;">$1</a>');
}

function scrollToBottom() {
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${message}</span>
    `;
    
    // Adicionar ao chat
    const chatHeader = document.querySelector('.chat-header');
    if (chatHeader) {
        chatHeader.parentNode.insertBefore(errorDiv, chatHeader.nextSibling);
        
        // Remover após 5 segundos
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

// ========== DESCONEXÃO ==========
async function handleLogout() {
    if (currentUser) {
        try {
            console.log('👋 Fazendo logout...');
            
            // Marcar como offline
            await chatDb.ref(`users/${currentUser.uid}`).update({
                isOnline: false,
                lastSeen: Date.now()
            });
            
            // Limpar listeners
            if (conversationsRef) conversationsRef.off();
            if (usersRef) usersRef.off();
            if (messagesRef) messagesRef.off();
            
            // Limpar estado
            currentUser = null;
            currentConversation = null;
            allRealUsers = [];
            onlineUsersCache = {};
            
            // Recarregar a página
            window.location.reload();
            
        } catch (error) {
            console.error('❌ Erro no logout:', error);
        }
    }
}

// ========== INICIAR APP ==========
document.addEventListener('DOMContentLoaded', init);
