// ========== CONFIGURAÇÃO FIREBASE ==========
const chatFirebaseConfig = {
    apiKey: "AIzaSyAYROPCh-558mNXPrO7onAXFvfBe13q5Js",
    authDomain: "orgtarefas-chat.firebaseapp.com",
    databaseURL: "https://orgtarefas-chat-default-rtdb.firebaseio.com",
    projectId: "orgtarefas-chat",
    storageBucket: "orgtarefas-chat.firebasestorage.app",
    messagingSenderId: "380919096800",
    appId: "1:380919096800:web:7b54e7e341c9266c207785"
};

// ========== INICIALIZAR FIREBASE ==========
firebase.initializeApp(chatFirebaseConfig);
const db = firebase.database();

// ========== ELEMENTOS DOM ==========
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages-container');
const onlineUsersContainer = document.getElementById('online-users');
const currentUserName = document.getElementById('current-user-name');
const userAvatar = document.getElementById('user-avatar');
const onlineCount = document.getElementById('online-count');

// ========== VARIÁVEIS GLOBAIS ==========
let currentUser = null;
let messagesRef = null;

// ========== INICIALIZAÇÃO ==========
function init() {
    console.log('🚀 Inicializando chat...');
    
    // Criar usuário de teste
    createTestUser();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Conectar ao banco de dados
    connectToDatabase();
    
    console.log('✅ Chat pronto!');
}

// ========== CRIAR USUÁRIO DE TESTE ==========
function createTestUser() {
    const userId = 'user_' + Math.random().toString(36).substr(2, 9);
    const nomes = ['Ana Silva', 'Carlos Santos', 'Maria Oliveira', 'João Pereira'];
    const nome = nomes[Math.floor(Math.random() * nomes.length)];
    
    currentUser = {
        uid: userId,
        nome: nome,
        perfil: 'Convidado',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=667eea&color=fff`
    };
    
    // Atualizar interface
    currentUserName.textContent = currentUser.nome;
    userAvatar.src = currentUser.avatar;
}

// ========== CONECTAR AO BANCO DE DADOS ==========
function connectToDatabase() {
    try {
        // Salvar usuário online
        db.ref(`users/${currentUser.uid}`).set({
            uid: currentUser.uid,
            displayName: currentUser.nome,
            perfil: currentUser.perfil,
            avatarUrl: currentUser.avatar,
            isOnline: true,
            lastSeen: Date.now()
        });

        // Configurar desconexão automática
        db.ref(`users/${currentUser.uid}/isOnline`).onDisconnect().set(false);
        db.ref(`users/${currentUser.uid}/lastSeen`).onDisconnect().set(Date.now());

        // Iniciar listeners
        setupRealtimeListeners();
        
    } catch (error) {
        console.error('❌ Erro ao conectar:', error);
        showError('Erro ao conectar ao chat: ' + error.message);
    }
}

// ========== LISTENERS EM TEMPO REAL ==========
function setupRealtimeListeners() {
    // Ouvir mensagens
    messagesRef = db.ref('messages');
    messagesRef.orderByChild('timestamp').limitToLast(50).on('value', (snapshot) => {
        const messagesData = snapshot.val();
        const messages = [];
        
        if (messagesData) {
            Object.keys(messagesData).forEach(key => {
                messages.push({ id: key, ...messagesData[key] });
            });
            messages.sort((a, b) => a.timestamp - b.timestamp);
            renderMessages(messages);
        }
    });

    // Ouvir usuários online
    db.ref('users').orderByChild('isOnline').equalTo(true).on('value', (snapshot) => {
        const usersData = snapshot.val();
        const users = [];
        
        if (usersData) {
            Object.keys(usersData).forEach(key => {
                users.push({ id: key, ...usersData[key] });
            });
            renderOnlineUsers(users);
            onlineCount.textContent = `${users.length} online`;
        }
    });
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    // Enviar mensagem
    sendBtn.addEventListener('click', sendMessage);
    
    // Enter para enviar
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// ========== ENVIAR MENSAGEM ==========
function sendMessage() {
    const text = messageInput.value.trim();
    
    if (!text) {
        messageInput.focus();
        return;
    }

    try {
        const messageId = db.ref('messages').push().key;
        const messageData = {
            id: messageId,
            senderId: currentUser.uid,
            senderName: currentUser.nome,
            senderPerfil: currentUser.perfil,
            text: text,
            timestamp: Date.now()
        };

        db.ref(`messages/${messageId}`).set(messageData);
        messageInput.value = '';
        scrollToBottom();
        
    } catch (error) {
        console.error('❌ Erro ao enviar:', error);
        showError('Erro ao enviar mensagem');
    }
}

// ========== RENDERIZAR MENSAGENS ==========
function renderMessages(messages) {
    messagesContainer.innerHTML = '';
    
    if (messages.length === 0) {
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-comment-alt"></i>
                <h3>Bem-vindo ao Chat!</h3>
                <p>Seja o primeiro a enviar uma mensagem!</p>
            </div>`;
        return;
    }

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

// ========== RENDERIZAR USUÁRIOS ONLINE ==========
function renderOnlineUsers(users) {
    onlineUsersContainer.innerHTML = '';
    
    if (users.length === 0) {
        onlineUsersContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-user-friends"></i>
                <p>Nenhum usuário online</p>
            </div>`;
        return;
    }

    users.forEach(user => {
        if (user.isOnline) {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.innerHTML = `
                <img src="${user.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'U') + '&background=667eea&color=fff'}" 
                     alt="${user.displayName}" class="user-avatar">
                <div class="user-details">
                    <div class="user-name">${user.displayName || 'Usuário'}</div>
                    <div class="user-status">${user.perfil || 'Online'}</div>
                </div>
                <div class="status-indicator"></div>
            `;
            onlineUsersContainer.appendChild(userElement);
        }
    });
}

// ========== FUNÇÕES AUXILIARES ==========
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
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${message}</span>
    `;
    
    // Adicionar ao chat
    const chatHeader = document.querySelector('.chat-header');
    chatHeader.parentNode.insertBefore(errorDiv, chatHeader.nextSibling);
    
    // Remover após 5 segundos
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// ========== INICIAR ==========
document.addEventListener('DOMContentLoaded', init);
