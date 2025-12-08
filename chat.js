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

// ========== INICIALIZAÇÃO ==========
async function init() {
    console.log('🚀 Inicializando Chat...');
    
    try {
        // Inicializar Firebase
        const loginsApp = initializeApp(loginsConfig, 'loginsApp');
        const chatApp = initializeApp(chatConfig, 'chatApp');
        
        loginsDb = getFirestore(loginsApp);
        chatDb = getDatabase(chatApp);
        
        console.log('✅ Firebase inicializado');
        
        // Fazer auto-login
        await autoLogin();
        
        // Configurar eventos
        setupEventListeners();
        
    } catch (error) {
        console.error('❌ Erro ao inicializar:', error);
        showNotification('Erro ao conectar', 'error');
    }
}

// ========== AUTO-LOGIN AUTOMÁTICO ==========
async function autoLogin() {
    console.log('🔐 Tentando auto-login...');
    
    const usuarioLogadoStr = localStorage.getItem('usuarioLogado');
    if (!usuarioLogadoStr) {
        console.log('⚠️ Nenhum usuário logado');
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const usuarioLogado = JSON.parse(usuarioLogadoStr);
        console.log('👤 Usuário:', usuarioLogado.usuario);
        
        // Buscar no Firestore
        const loginsRef = doc(loginsDb, 'logins', 'LOGINS_ORGTAREFAS');
        const docSnap = await getDoc(loginsRef);
        
        if (!docSnap.exists()) {
            console.log('❌ Documento não encontrado');
            return;
        }
        
        const loginsData = docSnap.data();
        let userFound = null;
        let userUid = null;
        
        // Encontrar usuário
        for (const [uid, userData] of Object.entries(loginsData)) {
            if (userData && userData.login === usuarioLogado.usuario) {
                userFound = userData;
                userUid = uid;
                break;
            }
        }
        
        if (!userFound) {
            console.log('❌ Usuário não encontrado');
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
        
        // Atualizar interface
        document.getElementById('current-user-name').textContent = currentUser.nome;
        document.getElementById('current-user-status').classList.add('online');
        
        // Atualizar status online
        await updateDoc(loginsRef, {
            [`${currentUser.uid}.isOnline`]: true
        });
        
        // Configurar no Realtime Database
        const userRef = ref(chatDb, `users/${currentUser.uid}`);
        await set(userRef, {
            uid: currentUser.uid,
            login: currentUser.login,
            nome: currentUser.nome,
            perfil: currentUser.perfil,
            isOnline: true,
            lastSeen: Date.now()
        });
        
        // Desconexão automática
        onDisconnect(ref(chatDb, `users/${currentUser.uid}/isOnline`)).set(false);
        onDisconnect(ref(chatDb, `users/${currentUser.uid}/lastSeen`)).set(Date.now());
        
        // Carregar usuários online
        loadOnlineUsers();
        loadConversations();
        
        // Mostrar notificação
        showNotification(`✅ Olá, ${currentUser.nome}!`, 'success');
        
    } catch (error) {
        console.error('❌ Erro no auto-login:', error);
    }
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
                    onlineUsers.push({
                        uid: uid,
                        nome: userData.displayName || userData.login,
                        login: userData.login,
                        perfil: userData.perfil || 'usuario'
                    });
                }
            }
            
            renderOnlineUsers(onlineUsers);
        }
    });
}

// ========== RENDERIZAR USUÁRIOS ONLINE ==========
function renderOnlineUsers(users) {
    const container = document.getElementById('online-users');
    const count = document.getElementById('online-count');
    
    count.textContent = users.length;
    count.style.display = 'flex';
    
    if (users.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum colega online</div>';
        return;
    }
    
    let html = '';
    users.forEach(user => {
        html += `
            <div class="user-item" onclick="startConversation('${user.uid}')">
                <div class="user-avatar">${user.nome.charAt(0)}</div>
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
}

// ========== CARREGAR CONVERSAS ==========
function loadConversations() {
    const conversationsRef = ref(chatDb, `userConversations/${currentUser.uid}`);
    
    onValue(conversationsRef, (snapshot) => {
        const conversations = snapshot.val();
        renderConversations(conversations);
    });
}

// ========== RENDERIZAR CONVERSAS ==========
function renderConversations(conversations) {
    const container = document.getElementById('conversations');
    
    if (!conversations) {
        container.innerHTML = '<div class="empty-state">Nenhuma conversa</div>';
        return;
    }
    
    let html = '';
    Object.entries(conversations).forEach(([conversationId, conversationData]) => {
        const otherUserId = getOtherUserId(conversationData.participants);
        
        // Tentar buscar informações do outro usuário
        if (otherUserId) {
            html += `
                <div class="conversation-item" onclick="openConversation('${conversationId}', '${otherUserId}')">
                    <div class="conversation-avatar">U</div>
                    <div class="conversation-info">
                        <div class="conversation-header">
                            <span class="conversation-name">Usuário ${otherUserId.substring(0, 8)}</span>
                            <span class="conversation-time">${formatTime(conversationData.lastTimestamp || Date.now())}</span>
                        </div>
                        <div class="conversation-preview">
                            ${conversationData.lastMessage || 'Nova conversa'}
                        </div>
                    </div>
                </div>`;
        }
    });
    
    container.innerHTML = html || '<div class="empty-state">Nenhuma conversa</div>';
}

// ========== INICIAR CONVERSA ==========
window.startConversation = async function(otherUserId) {
    if (!currentUser || !otherUserId) return;
    
    currentConversation = [currentUser.uid, otherUserId].sort().join('_');
    
    console.log('💬 Iniciando conversa com:', otherUserId);
    
    // Atualizar interface
    document.getElementById('other-user-name').textContent = 'Usuário';
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
    
    console.log('📂 Abrindo conversa:', conversationId);
    
    // Atualizar interface
    document.getElementById('other-user-name').textContent = 'Usuário';
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
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
        
        messageDiv.innerHTML = `
            <div class="message-content">
                ${!isCurrentUser ? `<div class="message-sender">${msg.senderName}</div>` : ''}
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
        console.log('⚠️ Não pode enviar:', { text, currentUser, currentConversation });
        return;
    }
    
    console.log('📤 Enviando mensagem:', text);
    
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
        
        console.log('✅ Mensagem enviada!');
        
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
    
    // Log ao configurar
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
