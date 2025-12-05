// ========== CONFIGURAÇÃO FIREBASE ==========

// Projeto de Login (Firestore)
const loginFirebaseConfig = {
    apiKey: "AIzaSyCJpyAouZtwoWC0QDmTtpJxn0_j_w8DlvU",
    authDomain: "logins-c3407.firebaseapp.com",
    projectId: "logins-c3407",
    storageBucket: "logins-c3407.firebasestorage.app",
    messagingSenderId: "809861058230",
    appId: "1:809861058230:web:e6e41bf1db9b3cfd887e77"
};

// Projeto do Chat (Realtime Database)
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
const loginApp = firebase.initializeApp(loginFirebaseConfig, 'loginApp');
const chatApp = firebase.initializeApp(chatFirebaseConfig);

// ========== REFERÊNCIAS ==========
const loginDb = firebase.firestore(loginApp);
const chatDb = firebase.database();

// ========== ELEMENTOS DOM ==========
// Login
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const usuarioInput = document.getElementById('usuario');
const senhaInput = document.getElementById('senha');
const loginBtn = document.getElementById('login-btn');
const loginStatus = document.getElementById('login-status');
const logoutBtn = document.getElementById('logout-btn');

// Chat
const currentUserName = document.getElementById('current-user-name');
const currentUserLogin = document.getElementById('current-user-login');
const userAvatar = document.getElementById('user-avatar');
const conversationsList = document.getElementById('conversations-list');
const onlineUsersList = document.getElementById('online-users-list');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messageInputArea = document.getElementById('message-input-area');
const chatInfo = document.getElementById('chat-info');
const welcomeMessage = document.getElementById('welcome-message');
const onlineStatus = document.getElementById('online-status');

// ========== VARIÁVEIS GLOBAIS ==========
let currentUser = null;
let currentConversation = null;
let conversationsRef = null;
let usersRef = null;
let messagesRef = null;
let allUsers = []; // Cache de todos os usuários

// ========== INICIALIZAÇÃO ==========
function init() {
    setupEventListeners();
    showLoginScreen();
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    // Login
    loginBtn.addEventListener('click', handleLogin);
    usuarioInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    senhaInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Mensagens
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// ========== FUNÇÕES DE LOGIN ==========
async function handleLogin() {
    const login = usuarioInput.value.trim();
    const senha = senhaInput.value;
    
    if (!login || !senha) {
        showStatus('Preencha usuário e senha', 'error');
        return;
    }
    
    try {
        showStatus('Verificando credenciais...', 'info');
        
        // Buscar usuário por login
        const querySnapshot = await loginDb.collection('LOGINS_ORGTAREFAS')
            .where('login', '==', login)
            .limit(1)
            .get();
        
        if (querySnapshot.empty) {
            showStatus('Usuário não encontrado', 'error');
            return;
        }
        
        const doc = querySnapshot.docs[0];
        const userData = doc.data();
        
        // Verificar senha
        if (userData.senha !== senha) {
            showStatus('Senha incorreta', 'error');
            return;
        }
        
        // Verificar status (se existir)
        if (userData.status && userData.status !== 'Ativo') {
            showStatus('Usuário inativo', 'error');
            return;
        }
        
        // Login bem-sucedido
        currentUser = {
            uid: doc.id, // ID do documento
            login: userData.login,
            nome: userData.displayName || userData.login,
            perfil: userData.perfil || 'Usuário',
            email: userData.email || ''
        };
        
        await setupChatUser(currentUser);
        
        showStatus(`Bem-vindo, ${currentUser.nome}!`, 'success');
        clearLoginForm();
        showChatScreen();
        setupRealtimeListeners();
        
    } catch (error) {
        console.error('Erro no login:', error);
        showStatus('Erro: ' + error.message, 'error');
    }
}

async function setupChatUser(userData) {
    // Atualizar interface
    currentUserName.textContent = userData.nome;
    currentUserLogin.textContent = userData.login;
    
    // Gerar avatar
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.nome)}&background=667eea&color=fff`;
    userAvatar.src = avatarUrl;
    
    // Salvar no RTDB do chat
    const userRef = chatDb.ref(`users/${userData.uid}`);
    
    await userRef.set({
        uid: userData.uid,
        login: userData.login,
        nome: userData.nome,
        perfil: userData.perfil,
        avatarUrl: avatarUrl,
        isOnline: true,
        lastSeen: Date.now()
    });
    
    // Configurar desconexão automática
    userRef.child('isOnline').onDisconnect().set(false);
    userRef.child('lastSeen').onDisconnect().set(Date.now());
    
    return userData;
}

// ========== LISTENERS EM TEMPO REAL ==========
function setupRealtimeListeners() {
    if (!currentUser) return;
    
    // Carregar todos os usuários do Firestore
    loadAllUsers();
    
    // Ouvir conversas do usuário atual
    conversationsRef = chatDb.ref(`userConversations/${currentUser.uid}`);
    conversationsRef.on('value', (snapshot) => {
        const conversationsData = snapshot.val();
        renderConversations(conversationsData);
    });
    
    // Ouvir usuários online no chat
    usersRef = chatDb.ref('users');
    usersRef.orderByChild('isOnline').equalTo(true).on('value', (snapshot) => {
        const usersData = snapshot.val();
        renderOnlineUsers(usersData);
    });
}

// ========== CARREGAR TODOS OS USUÁRIOS ==========
async function loadAllUsers() {
    try {
        const snapshot = await loginDb.collection('LOGINS_ORGTAREFAS').get();
        allUsers = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (doc.id !== currentUser.uid) { // Excluir usuário atual
                allUsers.push({
                    uid: doc.id,
                    login: data.login,
                    nome: data.displayName || data.login,
                    perfil: data.perfil || 'Usuário'
                });
            }
        });
        
        console.log('Usuários carregados:', allUsers.length);
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
    }
}

// ========== CONVERSAS ==========
function renderConversations(conversationsData) {
    if (!conversationsData) {
        conversationsList.innerHTML = `
            <div class="no-conversations">
                <i class="fas fa-comments"></i>
                <p>Nenhuma conversa</p>
                <small>Selecione um usuário online para começar</small>
            </div>`;
        return;
    }
    
    let html = '';
    const conversations = Object.entries(conversationsData);
    
    if (conversations.length === 0) {
        html = `
            <div class="no-conversations">
                <i class="fas fa-comments"></i>
                <p>Nenhuma conversa</p>
                <small>Selecione um usuário online para começar</small>
            </div>`;
    } else {
        conversations.forEach(([conversationId, conversationData]) => {
            const otherUserId = getOtherUserId(conversationData.participants);
            const otherUser = allUsers.find(u => u.uid === otherUserId);
            
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
    }
    
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

function getOtherUserId(participants) {
    if (!participants) return null;
    const participantIds = Object.keys(participants);
    return participantIds.find(id => id !== currentUser.uid);
}

// ========== ABRIR CONVERSA ==========
function openConversation(conversationId, otherUserId) {
    currentConversation = conversationId;
    
    // Ativar item na lista
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-conversation="${conversationId}"]`)?.classList.add('active');
    
    // Encontrar informações do outro usuário
    const otherUser = allUsers.find(u => u.uid === otherUserId);
    if (!otherUser) return;
    
    // Atualizar cabeçalho
    chatInfo.innerHTML = `
        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.nome)}&background=667eea&color=fff" 
             style="width: 40px; height: 40px; border-radius: 50%; margin-right: 10px;">
        <div>
            <h2>${otherUser.nome}</h2>
            <small>${otherUser.perfil}</small>
        </div>`;
    
    // Mostrar área de input
    messageInputArea.style.display = 'flex';
    welcomeMessage.style.display = 'none';
    messageInput.focus();
    
    // Carregar mensagens
    loadMessages(conversationId);
}

// ========== CARREGAR MENSAGENS ==========
function loadMessages(conversationId) {
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
        } else {
            messagesContainer.innerHTML = `
                <div class="no-messages">
                    <i class="fas fa-comment-slash"></i>
                    <p>Nenhuma mensagem ainda</p>
                    <small>Envie a primeira mensagem!</small>
                </div>`;
        }
    });
}

// ========== ENVIAR MENSAGEM ==========
async function sendMessage() {
    if (!currentUser || !currentConversation || !messageInput.value.trim()) {
        return;
    }
    
    const text = messageInput.value.trim();
    const messageId = chatDb.ref().push().key;
    const timestamp = Date.now();
    
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
        
        // 2. Atualizar conversa
        const conversationRef = chatDb.ref(`userConversations/${currentUser.uid}/${currentConversation}`);
        const otherUserId = getOtherUserIdFromConversation(currentConversation);
        const otherUserConversationRef = chatDb.ref(`userConversations/${otherUserId}/${currentConversation}`);
        
        const conversationUpdate = {
            lastMessage: text,
            lastTimestamp: timestamp,
            participants: {
                [currentUser.uid]: true,
                [otherUserId]: true
            }
        };
        
        await conversationRef.update(conversationUpdate);
        await otherUserConversationRef.update(conversationUpdate);
        
        // 3. Limpar input
        messageInput.value = '';
        scrollToBottom();
        
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        showError('Erro ao enviar mensagem');
    }
}

function getOtherUserIdFromConversation(conversationId) {
    // Extrair o ID do outro usuário do ID da conversa
    // Formato: uid1_uid2 ou uid2_uid1
    const parts = conversationId.split('_');
    return parts.find(part => part !== currentUser.uid);
}

// ========== INICIAR NOVA CONVERSA ==========
async function startNewConversation(otherUserId) {
    // Criar ID da conversa (ordenado para ser único)
    const conversationId = [currentUser.uid, otherUserId].sort().join('_');
    
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
    }
    
    // Abrir a conversa
    openConversation(conversationId, otherUserId);
}

// ========== RENDERIZAR USUÁRIOS ONLINE ==========
function renderOnlineUsers(usersData) {
    if (!usersData) {
        onlineUsersList.innerHTML = '<div class="loading">Carregando...</div>';
        return;
    }
    
    let html = '';
    const onlineUsers = [];
    
    Object.keys(usersData).forEach(uid => {
        const user = usersData[uid];
        if (user.isOnline && uid !== currentUser.uid) {
            onlineUsers.push({
                uid: uid,
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
            html += `
                <div class="user-online-item" data-user="${user.uid}">
                    <img src="${user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nome)}&background=667eea&color=fff`}" 
                         class="user-online-avatar" alt="${user.nome}">
                    <div class="user-online-name">${user.nome}</div>
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

// ========== RENDERIZAR MENSAGENS ==========
function renderMessages(messages) {
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

// ========== FUNÇÕES AUXILIARES ==========
function showStatus(message, type) {
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
        minute: '2-digit'
    });
}

function formatMessageText(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showError(message) {
    alert(message);
}

function clearLoginForm() {
    usuarioInput.value = '';
    senhaInput.value = '';
}

function showLoginScreen() {
    loginScreen.classList.remove('hidden');
    chatScreen.classList.add('hidden');
}

function showChatScreen() {
    loginScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
}

async function handleLogout() {
    if (currentUser) {
        try {
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
            allUsers = [];
            
            // Mostrar tela de login
            showLoginScreen();
            
        } catch (error) {
            console.error('Erro no logout:', error);
        }
    }
}

// ========== INICIAR APP ==========
document.addEventListener('DOMContentLoaded', init);
