// ========== CONFIGURAÇÃO DOS DOIS PROJETOS FIREBASE ==========

// 1. PROJETO DE LOGIN (Firestore)
const loginFirebaseConfig = {
    apiKey: "AIzaSyCJpyAouZtwoWC0QDmTtpJxn0_j_w8DlvU",
    authDomain: "logins-c3407.firebaseapp.com",
    projectId: "logins-c3407",
    storageBucket: "logins-c3407.firebasestorage.app",
    messagingSenderId: "809861558230",
    appId: "1:809861558230:web:e6e41bf1db9b3cfd887e77"
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

// ========== ELEMENTOS DOM ==========
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const emailInput = document.getElementById('email'); // Vamos reutilizar como "usuário"
const passwordInput = document.getElementById('password');
const displayNameInput = document.getElementById('displayName');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const loginStatus = document.getElementById('login-status');
const logoutBtn = document.getElementById('logout-btn');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages-container');
const onlineUsersContainer = document.getElementById('online-users');
const currentUserName = document.getElementById('current-user-name');
const userAvatar = document.getElementById('user-avatar');
const onlineCount = document.getElementById('online-count');
const attachBtn = document.getElementById('attach-btn');
const fileInput = document.getElementById('file-input');

// ========== VARIÁVEIS GLOBAIS ==========
let currentUser = null;
let messagesRef = null;
let usersRef = null;

// ========== FUNÇÕES DE AUTENTICAÇÃO ==========
async function handleLogin() {
    const usuario = emailInput.value.trim(); // Agora é "usuário", não "email"
    const senha = passwordInput.value;
    
    if (!usuario || !senha) {
        showStatus('Preencha usuário e senha', 'error');
        return;
    }
    
    try {
        console.log('Buscando usuário:', usuario);
        const querySnapshot = await loginDb.collection('LOGINS_ORGTAREFAS').get();
        console.log('Total de documentos:', querySnapshot.size);
        
        let usuarioEncontrado = null;
        let encontrou = false;
        
        querySnapshot.forEach(doc => {
            if (encontrou) return; // Se já encontrou, para
        
            const dados = doc.data();
            console.log('Analisando documento:', doc.id);
            
            // Procurar por qualquer campo que termine com _login
            for (const [chave, valor] of Object.entries(dados)) {
                if (chave.endsWith('_login') && valor === usuario) {
                    console.log('Login encontrado no campo:', chave);
                    
                    const prefixo = chave.replace('_login', '');
                    console.log('Prefixo identificado:', prefixo);
                    
                    // Construir nomes dos outros campos
                    const senhaKey = `${prefixo}_senha`;
                    const statusKey = `${prefixo}_status`;
                    const emailKey = `${prefixo}_email`;
                    const nomeKey = `${prefixo}_nome`;
                    const perfilKey = `${prefixo}_perfil`;
                    
                    console.log('Campos a verificar:', {
                        senhaKey,
                        statusKey,
                        emailKey,
                        nomeKey,
                        perfilKey
                    });
                    
                    // Verificar se os campos existem
                    if (!dados[senhaKey]) {
                        console.log('Campo de senha não encontrado:', senhaKey);
                        continue;
                    }
                    
                    // Verificar senha
                    if (dados[senhaKey] === senha) {
                        console.log('Senha correta!');
                        
                        // Verificar status
                        if (dados[statusKey] === 'Ativo') {
                            console.log('Usuário ativo!');
                            
                            usuarioEncontrado = {
                                uid: `${doc.id}_${prefixo}`,
                                docId: doc.id,
                                prefixo: prefixo,
                                login: valor, // nome de usuário
                                email: dados[emailKey] || '', // e-mail (se existir)
                                nome: dados[nomeKey] || valor, // nome completo ou login
                                perfil: dados[perfilKey] || '',
                                status: dados[statusKey]
                            };
                            
                            console.log('Usuário montado:', usuarioEncontrado);
                            encontrou = true;
                            return;
                        } else {
                            showStatus('Usuário inativo', 'error');
                            encontrou = true;
                            return;
                        }
                    } else {
                        console.log('Senha incorreta');
                        showStatus('Senha incorreta', 'error');
                        encontrou = true;
                        return;
                    }
                }
            }
        });
        
        if (!usuarioEncontrado && !encontrou) {
            showStatus('Usuário não encontrado', 'error');
            return;
        }
        
        if (usuarioEncontrado) {
            currentUser = usuarioEncontrado;
            await setupChatUser(currentUser);
            
            showStatus(`Bem-vindo, ${currentUser.nome}!`, 'success');
            clearLoginForm();
            showChatScreen();
            setupRealtimeListeners();
        }
        
    } catch (error) {
        console.error('Erro no login:', error);
        showStatus('Erro no sistema: ' + error.message, 'error');
    }
}

// Função para buscar por email também (opcional)
async function buscarPorEmail(email) {
    const querySnapshot = await loginDb.collection('LOGINS_ORGTAREFAS').get();
    
    let usuarioEncontrado = null;
    
    querySnapshot.forEach(doc => {
        const dados = doc.data();
        
        for (const [chave, valor] of Object.entries(dados)) {
            if (chave.endsWith('_email') && valor === email) {
                const prefixo = chave.replace('_email', '');
                
                const loginKey = `${prefixo}_login`;
                const senhaKey = `${prefixo}_senha`;
                const statusKey = `${prefixo}_status`;
                const nomeKey = `${prefixo}_nome`;
                const perfilKey = `${prefixo}_perfil`;
                
                if (dados[statusKey] === 'Ativo') {
                    usuarioEncontrado = {
                        uid: `${doc.id}_${prefixo}`,
                        docId: doc.id,
                        prefixo: prefixo,
                        login: dados[loginKey] || '',
                        email: valor,
                        nome: dados[nomeKey] || dados[loginKey] || '',
                        perfil: dados[perfilKey] || '',
                        status: dados[statusKey]
                    };
                    return;
                }
            }
        }
    });
    
    return usuarioEncontrado;
}

async function handleSignup() {
    showStatus('Cadastro apenas via sistema principal', 'info');
}

// ========== FUNÇÕES DO CHAT ==========
async function setupChatUser(userData) {
    currentUserName.textContent = userData.nome || userData.login;
    
    // Gerar avatar baseado no nome
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.nome || userData.login)}&background=667eea&color=fff`;
    userAvatar.src = avatarUrl;
    
    // Salvar/atualizar usuário no RTDB do chat
    const userRef = chatDb.ref(`users/${userData.uid}`);
    
    await userRef.set({
        uid: userData.uid,
        login: userData.login,
        email: userData.email || '',
        displayName: userData.nome || userData.login,
        perfil: userData.perfil || '',
        avatarUrl: avatarUrl,
        isOnline: true,
        lastSeen: Date.now()
    });
    
    // Configurar desconexão automática
    userRef.child('isOnline').onDisconnect().set(false);
    userRef.child('lastSeen').onDisconnect().set(Date.now());
    
    return userData;
}

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
            onlineCount.textContent = `${users.length + 1} online`;
        }
    });
}

async function sendMessage() {
    if (!currentUser) return;
    
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
        showStatus('Erro ao enviar mensagem', 'error');
    }
}

async function handleLogout() {
    if (currentUser) {
        // Marcar como offline no chat
        await chatDb.ref(`users/${currentUser.uid}`).update({
            isOnline: false,
            lastSeen: Date.now()
        });
        
        // Limpar sessão
        currentUser = null;
        disconnectListeners();
        showLoginScreen();
    }
}

// ========== FUNÇÕES AUXILIARES ==========
function checkAuthState() {
    // Verificar se há sessão salva
    const savedUser = localStorage.getItem('chatUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showChatScreen();
            setupRealtimeListeners();
        } catch (e) {
            localStorage.removeItem('chatUser');
            showLoginScreen();
        }
    } else {
        showLoginScreen();
    }
}

function showStatus(message, type) {
    loginStatus.textContent = message;
    loginStatus.style.color = type === 'error' ? '#f44336' : 
                              type === 'success' ? '#4caf50' : '#2196f3';
    loginStatus.style.display = 'block';
    
    setTimeout(() => {
        loginStatus.style.display = 'none';
    }, 3000);
}

function clearLoginForm() {
    emailInput.value = '';
    passwordInput.value = '';
    displayNameInput.value = '';
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showChatScreen() {
    loginScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    messageInput.focus();
}

function showLoginScreen() {
    loginScreen.classList.remove('hidden');
    chatScreen.classList.add('hidden');
    emailInput.focus();
}

function disconnectListeners() {
    if (messagesRef) messagesRef.off();
    if (usersRef) usersRef.off();
}

function renderMessages(messages) {
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

function formatMessageText(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
}

function renderOnlineUsers(users) {
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

// Inicializar app
function init() {
    setupEventListeners();
    checkAuthState();
}

// Event listeners
function setupEventListeners() {
    loginBtn.addEventListener('click', handleLogin);
    signupBtn.addEventListener('click', handleSignup);
    logoutBtn.addEventListener('click', handleLogout);
    
    emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);
}

// Upload de arquivo
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showStatus('Arquivo muito grande (máx 5MB)', 'error');
        return;
    }
    
    showStatus('Upload em desenvolvimento...', 'info');
    fileInput.value = '';
}

// Iniciar quando o DOM carregar
document.addEventListener('DOMContentLoaded', init);
