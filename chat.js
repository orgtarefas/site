// Configuração do Firebase - REALTIME DATABASE
const firebaseConfig = {
    apiKey: "AIzaSyAYROPCh-558mNXPrO7onAXFvfBe13q5Js",
    authDomain: "orgtarefas-chat.firebaseapp.com",
    databaseURL: "https://orgtarefas-chat-default-rtdb.firebaseio.com",
    projectId: "orgtarefas-chat",
    storageBucket: "orgtarefas-chat.firebasestorage.app",
    messagingSenderId: "380919096800",
    appId: "1:380919096800:web:7b54e7e341c9266c207785"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database(); // RTDB
const storage = firebase.storage();

// Variáveis globais
let currentUser = null;
let messagesRef = null;
let usersRef = null;

// Elementos DOM
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const emailInput = document.getElementById('email');
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

// Inicializar
function init() {
    setupEventListeners();
    checkAuthState();
}

// Configurar listeners
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

// Verificar autenticação
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            setupUser(user);
            showChatScreen();
            setupRealtimeListeners();
        } else {
            showLoginScreen();
            disconnectListeners();
        }
    });
}

// Configurar usuário
async function setupUser(user) {
    currentUserName.textContent = user.displayName || 'Usuário';
    
    // Avatar
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=667eea&color=fff`;
    userAvatar.src = avatarUrl;
    
    // Salvar/atualizar no RTDB
    const userRef = db.ref(`users/${user.uid}`);
    
    await userRef.set({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: avatarUrl,
        isOnline: true,
        lastSeen: Date.now()
    });
    
    // Configurar desconexão automática
    userRef.child('isOnline').onDisconnect().set(false);
    userRef.child('lastSeen').onDisconnect().set(Date.now());
}

// Login
async function handleLogin() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        showStatus('Preencha e-mail e senha', 'error');
        return;
    }
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showStatus('Login realizado!', 'success');
        clearLoginForm();
    } catch (error) {
        showStatus(getAuthErrorMessage(error), 'error');
    }
}

// Cadastro
async function handleSignup() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const displayName = displayNameInput.value.trim();
    
    if (!email || !password || !displayName) {
        showStatus('Preencha todos os campos', 'error');
        return;
    }
    
    if (password.length < 6) {
        showStatus('Senha precisa de 6+ caracteres', 'error');
        return;
    }
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await userCredential.user.updateProfile({ displayName });
        showStatus('Cadastrado com sucesso!', 'success');
        clearLoginForm();
    } catch (error) {
        showStatus(getAuthErrorMessage(error), 'error');
    }
}

// Logout
async function handleLogout() {
    if (currentUser) {
        // Marcar como offline
        await db.ref(`users/${currentUser.uid}`).update({
            isOnline: false,
            lastSeen: Date.now()
        });
        
        await auth.signOut();
    }
}

// Configurar listeners em tempo real
function setupRealtimeListeners() {
    // Mensagens
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
    
    // Usuários online
    usersRef = db.ref('users');
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

// Desconectar listeners
function disconnectListeners() {
    if (messagesRef) messagesRef.off();
    if (usersRef) usersRef.off();
}

// Enviar mensagem
async function sendMessage() {
    const text = messageInput.value.trim();
    
    if (!text && !fileInput.files[0]) {
        return;
    }
    
    try {
        const messageId = db.ref('messages').push().key;
        const messageData = {
            id: messageId,
            senderId: currentUser.uid,
            senderName: currentUser.displayName,
            text: text || '',
            timestamp: Date.now()
        };
        
        await db.ref(`messages/${messageId}`).set(messageData);
        messageInput.value = '';
        scrollToBottom();
    } catch (error) {
        console.error('Erro:', error);
        showStatus('Erro ao enviar', 'error');
    }
}

// Renderizar mensagens
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
        const isSent = msg.senderId === currentUser.uid;
        const time = new Date(msg.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', minute: '2-digit' 
        });
        
        div.className = `message ${isSent ? 'sent' : 'received'}`;
        div.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${msg.senderName}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-text">${formatMessageText(msg.text)}</div>
            ${msg.imageUrl ? `<img src="${msg.imageUrl}" class="message-image">` : ''}
        `;
        
        messagesContainer.appendChild(div);
    });
    
    scrollToBottom();
}

// Funções auxiliares
function showStatus(message, type) {
    loginStatus.textContent = message;
    loginStatus.style.color = type === 'error' ? '#f44336' : '#4caf50';
    setTimeout(() => loginStatus.textContent = '', 3000);
}

function getAuthErrorMessage(error) {
    const messages = {
        'auth/invalid-email': 'E-mail inválido',
        'auth/user-disabled': 'Conta desativada',
        'auth/user-not-found': 'Usuário não encontrado',
        'auth/wrong-password': 'Senha incorreta',
        'auth/email-already-in-use': 'E-mail já em uso',
        'auth/weak-password': 'Senha muito fraca'
    };
    return messages[error.code] || error.message;
}

function formatMessageText(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
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
}

function clearLoginForm() {
    emailInput.value = '';
    passwordInput.value = '';
    displayNameInput.value = '';
}

// Upload de arquivo (simplificado)
async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showStatus('Arquivo muito grande (máx 5MB)', 'error');
        return;
    }
    
    // Implementar upload aqui se quiser
    showStatus('Upload ainda não implementado', 'info');
    fileInput.value = '';
}

// Iniciar app
document.addEventListener('DOMContentLoaded', init);
