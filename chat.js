// ========== CONFIGURAÇÃO DOS DOIS PROJETOS FIREBASE ==========

// 1. PROJETO DE LOGIN (Firestore)
const loginFirebaseConfig = {
    apiKey: "AIzaSyCJpyAouZtwoWC0QDmTtpJxn0_j_w8DlvU",
    authDomain: "logins-c3407.firebaseapp.com",
    projectId: "logins-c3407",
    storageBucket: "logins-c3407.firebasestorage.app",
    messagingSenderId: "809861058230",
    appId: "1:809861058230:web:e6e41bf1db9b3cfd887e77"
};

// 2. PROJETO DO CHAT (Realtime Database)
const chatFirebaseConfig = {
    apiKey: "AIzaSyAYROPCh-558mNXPrO7onAXFvfBe13q5Js",
    authDomain: "orgtarefas-chat.firebaseapp.com",
    databaseURL: "https://orgtarefas-chat-default-rtdb.firebaseio.com",
    projectId: "orgtarefas-chat",
    storageBucket: "orgtarefas-chat.firebasestorage.app",
    messagingSenderId: "380919096800",
    appId: "1:380919096800:web:7b54e7e341c9266c207785"
};

// ========== INICIALIZAR OS DOIS APPS ==========
const loginApp = firebase.initializeApp(loginFirebaseConfig, 'loginApp');
const chatApp = firebase.initializeApp(chatFirebaseConfig);

// ========== OBTER REFERÊNCIAS DOS SERVIÇOS ==========
const loginDb = firebase.firestore(loginApp);
const chatDb = firebase.database();
const storage = firebase.storage();

// ========== ELEMENTOS DOM DO CHAT ==========
// REMOVA TODOS OS ELEMENTOS DE LOGIN QUE NÃO EXISTEM MAIS
const chatScreen = document.getElementById('chat-screen');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages-container');
const onlineUsersContainer = document.getElementById('online-users');
const currentUserName = document.getElementById('current-user-name');
const currentUserPerfil = document.getElementById('current-user-perfil');
const userAvatar = document.getElementById('user-avatar');
const onlineCount = document.getElementById('online-count');
const attachBtn = document.getElementById('attach-btn');
const fileInput = document.getElementById('file-input');
const logoutBtn = document.getElementById('logout-btn');

// ========== VARIÁVEIS GLOBAIS ==========
let currentUser = null;
let messagesRef = null;
let usersRef = null;

// ========== CONFIGURAÇÃO INICIAL ==========
async function init() {
    try {
        // 1. REMOVA A TELA DE LOGIN DO HTML OU ESCONDA-A
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
            loginScreen.style.display = 'none';
        }
        
        // 2. MOSTRAR O CHAT DIRETAMENTE
        chatScreen.classList.remove('hidden');
        
        // 3. DEFINIR UM USUÁRIO FIXO PARA TESTE (REMOVA DEPOIS)
        currentUser = {
            uid: 'test_user_1',
            login: 'usuarioteste',
            nome: 'Usuário Teste',
            perfil: 'Teste',
            email: 'teste@exemplo.com'
        };
        
        // 4. CONFIGURAR O USUÁRIO
        await setupChatUser(currentUser);
        
        // 5. CONFIGURAR EVENT LISTENERS DO CHAT
        setupChatEventListeners();
        
        // 6. INICIAR LISTENERS EM TEMPO REAL
        setupRealtimeListeners();
        
        console.log('✅ Chat inicializado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao inicializar chat:', error);
        alert('Erro ao carregar o chat. Recarregue a página.');
    }
}

// ========== CONFIGURAR USUÁRIO NO CHAT ==========
async function setupChatUser(userData) {
    // Atualizar interface
    if (currentUserName) currentUserName.textContent = userData.nome || userData.login;
    if (currentUserPerfil) currentUserPerfil.textContent = userData.perfil || 'Usuário';
    
    // Gerar avatar
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.nome || userData.login)}&background=667eea&color=fff`;
    if (userAvatar) userAvatar.src = avatarUrl;
    
    // Salvar no RTDB do chat
    const userRef = chatDb.ref(`users/${userData.uid}`);
    
    await userRef.set({
        uid: userData.uid,
        login: userData.login,
        email: userData.email || '',
        displayName: userData.nome || userData.login,
        perfil: userData.perfil || 'Usuário',
        avatarUrl: avatarUrl,
        isOnline: true,
        lastSeen: Date.now()
    });
    
    // Configurar desconexão automática
    userRef.child('isOnline').onDisconnect().set(false);
    userRef.child('lastSeen').onDisconnect().set(Date.now());
    
    return userData;
}

// ========== EVENT LISTENERS DO CHAT ==========
function setupChatEventListeners() {
    // Botão de enviar mensagem
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    
    // Enter para enviar mensagem
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // Botão de logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Botão de anexar arquivo
    if (attachBtn) {
        attachBtn.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });
    }
    
    // Upload de arquivo
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
}

// ========== LISTENERS EM TEMPO REAL ==========
function setupRealtimeListeners() {
    if (!currentUser) return;
    
    // Mensagens
    messagesRef = chatDb.ref('messages');
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
    
    // Usuários online
    usersRef = chatDb.ref('users');
    usersRef.orderByChild('isOnline').equalTo(true).on('value', (snapshot) => {
        const usersData = snapshot.val();
        const users = [];
        
        if (usersData) {
            Object.keys(usersData).forEach(key => {
                if (key !== currentUser.uid) {
                    users.push({ id: key, ...usersData[key] });
                }
            });
            renderOnlineUsers(users);
            if (onlineCount) onlineCount.textContent = `${users.length + 1} online`;
        }
    });
}

// ========== ENVIAR MENSAGEM ==========
async function sendMessage() {
    if (!currentUser || !messageInput) return;
    
    const text = messageInput.value.trim();
    
    if (!text && !fileInput.files[0]) {
        return;
    }
    
    try {
        const messageId = chatDb.ref('messages').push().key;
        const messageData = {
            id: messageId,
            senderId: currentUser.uid,
            senderName: currentUser.nome || currentUser.login,
            senderLogin: currentUser.login,
            senderPerfil: currentUser.perfil,
            text: text || '',
            timestamp: Date.now()
        };
        
        await chatDb.ref(`messages/${messageId}`).set(messageData);
        messageInput.value = '';
        scrollToBottom();
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao enviar mensagem');
    }
}

// ========== LOGOUT ==========
async function handleLogout() {
    if (currentUser) {
        try {
            // Marcar como offline no chat
            await chatDb.ref(`users/${currentUser.uid}`).update({
                isOnline: false,
                lastSeen: Date.now()
            });
            
            // Recarregar a página (simula logout)
            location.reload();
        } catch (error) {
            console.error('Erro no logout:', error);
        }
    }
}

// ========== RENDERIZAR MENSAGENS ==========
function renderMessages(messages) {
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = '';
    
    if (messages.length === 0) {
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-comment-alt"></i>
                <h3>Bem-vindo ao Chat!</h3>
                <p>Envie sua primeira mensagem.</p>
            </div>`;
        return;
    }
    
    messages.forEach(msg => {
        const div = document.createElement('div');
        const isSent = msg.senderId === currentUser?.uid;
        const time = new Date(msg.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', minute: '2-digit' 
        });
        
        div.className = `message ${isSent ? 'sent' : 'received'}`;
        
        let senderInfo = msg.senderName;
        if (msg.senderPerfil) {
            senderInfo += ` <small>(${msg.senderPerfil})</small>`;
        }
        
        div.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${senderInfo}</span>
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
    if (!onlineUsersContainer) return;
    
    onlineUsersContainer.innerHTML = '';
    
    if (users.length === 0) {
        onlineUsersContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-user-friends"></i>
                <p>Você está sozinho no chat</p>
            </div>`;
        return;
    }
    
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        userElement.innerHTML = `
            <img src="${user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=667eea&color=fff`}" 
                 alt="${user.displayName}" class="user-avatar">
            <div class="user-details">
                <div class="user-name">${user.displayName}</div>
                <div class="user-status">${user.perfil || 'Usuário'}</div>
            </div>
            <div class="status-indicator"></div>
        `;
        onlineUsersContainer.appendChild(userElement);
    });
}

// ========== FUNÇÕES AUXILIARES ==========
function formatMessageText(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: #667eea;">$1</a>');
}

function scrollToBottom() {
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        alert('Arquivo muito grande (máx 5MB)');
        return;
    }
    
    alert('Upload em desenvolvimento...');
    fileInput.value = '';
}

// ========== INICIAR O CHAT ==========
// Aguardar o DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
