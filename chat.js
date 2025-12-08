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
    onDisconnect,
    query,
    orderByChild,
    limitToLast
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
let unsubscribeLogins = null;
let unsubscribeConversations = null;
let unsubscribeMessages = null;

// ========== INICIALIZAÇÃO ==========
async function init() {
    console.log('🚀 Inicializando Chat (auto-login)...');
    
    try {
        // Inicializar os dois projetos Firebase
        const loginsApp = initializeApp(loginsConfig, 'loginsApp');
        const chatApp = initializeApp(chatConfig, 'chatApp');
        
        loginsDb = getFirestore(loginsApp);
        chatDb = getDatabase(chatApp);
        
        console.log('✅ Firebase inicializado com sucesso!');
        
        // Fazer auto-login automaticamente
        await autoLogin();
        
    } catch (error) {
        console.error('❌ Erro ao inicializar:', error);
        showNotification('Erro ao conectar com o servidor', 'error');
        // Se der erro, redireciona para index após 3 segundos
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
    }
}

// ========== AUTO-LOGIN AUTOMÁTICO ==========
async function autoLogin() {
    console.log('🔐 Tentando auto-login...');
    
    try {
        // Buscar usuário logado do localStorage (do login.html)
        const usuarioLogadoStr = localStorage.getItem('usuarioLogado');
        
        if (!usuarioLogadoStr) {
            console.log('⚠️ Nenhum usuário logado encontrado');
            showNotification('Usuário não logado. Redirecionando...', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return;
        }
        
        const usuarioLogado = JSON.parse(usuarioLogadoStr);
        console.log('👤 Usuário encontrado:', usuarioLogado.usuario);
        
        // Buscar usuário no Firestore (logins)
        const loginsRef = doc(loginsDb, 'logins', 'LOGINS_ORGTAREFAS');
        const docSnap = await getDoc(loginsRef);
        
        if (!docSnap.exists()) {
            console.log('❌ Documento de logins não encontrado');
            showNotification('Erro no sistema de logins', 'error');
            return;
        }
        
        const loginsData = docSnap.data();
        let userFound = null;
        let userUid = null;
        
        // Procurar usuário pelo login
        for (const [uid, userData] of Object.entries(loginsData)) {
            if (userData && userData.login === usuarioLogado.usuario) {
                userFound = userData;
                userUid = uid;
                break;
            }
        }
        
        if (!userFound) {
            console.log('❌ Usuário não encontrado no sistema');
            showNotification('Usuário não autorizado', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return;
        }
        
        // Criar objeto do usuário para o chat
        const userData = {
            uid: userUid,
            login: userFound.login,
            nome: userFound.displayName || userFound.login,
            perfil: userFound.perfil || 'usuario'
        };
        
        console.log('✅ Auto-login bem-sucedido:', userData.nome);
        
        // Fazer login automático
        await loginUser(userData);
        
    } catch (error) {
        console.error('❌ Erro no auto-login:', error);
        showNotification('Erro no login automático', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }
}

// ========== LOGIN DO USUÁRIO ==========
async function loginUser(userData) {
    try {
        currentUser = userData;
        
        // Atualizar status online no Firestore (logins)
        const loginsRef = doc(loginsDb, 'logins', 'LOGINS_ORGTAREFAS');
        await updateDoc(loginsRef, {
            [`${userData.uid}.isOnline`]: true
        });
        
        // Configurar usuário no Realtime Database (chat)
        const userRef = ref(chatDb, `users/${userData.uid}`);
        await set(userRef, {
            uid: userData.uid,
            login: userData.login,
            nome: userData.nome,
            perfil: userData.perfil,
            isOnline: true,
            lastSeen: Date.now()
        });
        
        // Configurar desconexão automática
        onDisconnect(ref(chatDb, `users/${userData.uid}/isOnline`)).set(false);
        onDisconnect(ref(chatDb, `users/${userData.uid}/lastSeen`)).set(Date.now());
        
        // Atualizar interface
        updateUIAfterLogin();
        
        // Configurar listeners do chat
        setupChatListeners();
        
        showNotification(`✅ Olá, ${userData.nome}!`, 'success');
        
        // Fechar sidebar em mobile
        if (window.innerWidth < 768) {
            document.getElementById('sidebar').classList.remove('active');
        }
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        showNotification('Erro ao conectar ao chat', 'error');
    }
}

// ========== ATUALIZAR INTERFACE APÓS LOGIN ==========
function updateUIAfterLogin() {
    // Atualizar informações do usuário
    document.getElementById('current-user-name').textContent = currentUser.nome;
    document.getElementById('current-user-status').classList.add('online');
    
    // Remover estados de loading
    document.querySelectorAll('.loading-state').forEach(el => {
        el.style.display = 'none';
    });
}

// ========== LOGOUT (ao voltar) ==========
async function logout() {
    if (!currentUser) return;
    
    try {
        // Atualizar status offline no Firestore (logins)
        const loginsRef = doc(loginsDb, 'logins', 'LOGINS_ORGTAREFAS');
        await updateDoc(loginsRef, {
            [`${currentUser.uid}.isOnline`]: false
        });
        
        // Atualizar no Realtime Database (chat)
        const userRef = ref(chatDb, `users/${currentUser.uid}`);
        await update(userRef, {
            isOnline: false,
            lastSeen: Date.now()
        });
        
        // Parar listeners
        if (unsubscribeLogins) unsubscribeLogins();
        if (unsubscribeConversations) unsubscribeConversations();
        if (unsubscribeMessages) unsubscribeMessages();
        
        console.log('👋 Usuário desconectado:', currentUser.login);
        
    } catch (error) {
        console.error('❌ Erro no logout:', error);
    }
}

// ========== CONFIGURAR LISTENERS DO CHAT ==========
function setupChatListeners() {
    if (!currentUser) return;
    
    // 1. Ouvir usuários online (Firestore - logins)
    const loginsRef = doc(loginsDb, 'logins', 'LOGINS_ORGTAREFAS');
    unsubscribeLogins = onSnapshot(loginsRef, (doc) => {
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
    
    // 2. Ouvir conversas (Realtime Database - chat)
    const conversationsRef = ref(chatDb, `userConversations/${currentUser.uid}`);
    unsubscribeConversations = onValue(conversationsRef, (snapshot) => {
        const conversations = snapshot.val();
        renderConversations(conversations);
    });
}

// ========== RENDERIZAR USUÁRIOS ONLINE ==========
function renderOnlineUsers(users) {
    const container = document.getElementById('online-users');
    const count = document.getElementById('online-count');
    
    count.textContent = users.length;
    count.style.display = users.length > 0 ? 'flex' : 'none';
    
    if (users.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-slash"></i>
                <p>Nenhum colega online</p>
            </div>`;
        return;
    }
    
    let html = '';
    users.forEach(user => {
        html += `
            <div class="user-item" onclick="startConversation('${user.uid}')">
                <div class="user-avatar">
                    ${user.nome.charAt(0).toUpperCase()}
                </div>
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

// ========== RENDERIZAR CONVERSAS ==========
function renderConversations(conversations) {
    const container = document.getElementById('conversations');
    
    if (!conversations || Object.keys(conversations).length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <p>Nenhuma conversa</p>
                <small>Inicie uma conversa com um colega online</small>
            </div>`;
        return;
    }
    
    // Ordenar conversas por última mensagem
    const sortedConversations = Object.entries(conversations)
        .sort(([, a], [, b]) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));
    
    let html = '';
    sortedConversations.forEach(([conversationId, conversationData]) => {
        const otherUserId = getOtherUserId(conversationData.participants);
        
        // Buscar informações do outro usuário
        getOtherUserInfo(otherUserId).then(otherUser => {
            if (otherUser) {
                const isActive = currentConversation === conversationId;
                const time = conversationData.lastTimestamp ? 
                    formatTime(conversationData.lastTimestamp) : '';
                
                const conversationElement = document.createElement('div');
                conversationElement.className = `conversation-item ${isActive ? 'active' : ''}`;
                conversationElement.innerHTML = `
                    <div class="conversation-avatar">
                        ${otherUser.nome.charAt(0).toUpperCase()}
                    </div>
                    <div class="conversation-info">
                        <div class="conversation-header">
                            <span class="conversation-name">${otherUser.nome}</span>
                            <span class="conversation-time">${time}</span>
                        </div>
                        <div class="conversation-preview">
                            ${conversationData.lastMessage || 'Nova conversa'}
                        </div>
                    </div>`;
                
                conversationElement.onclick = () => openConversation(conversationId, otherUserId);
                container.appendChild(conversationElement);
            }
        });
    });
}

// ========== INICIAR CONVERSA ==========
window.startConversation = async function(otherUserId) {
    if (!currentUser || !otherUserId) return;
    
    const conversationId = [currentUser.uid, otherUserId].sort().join('_');
    currentConversation = conversationId;
    
    try {
        // Buscar informações do outro usuário
        const otherUser = await getOtherUserInfo(otherUserId);
        if (!otherUser) return;
        
        // Atualizar interface
        document.getElementById('other-user-name').textContent = otherUser.nome;
        document.getElementById('no-conversation').classList.add('hidden');
        document.getElementById('active-conversation').classList.remove('hidden');
        document.getElementById('message-input-area').classList.remove('hidden');
        
        // Criar/verificar conversa
        const conversationRef = ref(chatDb, `userConversations/${currentUser.uid}/${conversationId}`);
        
        onValue(conversationRef, (snapshot) => {
            if (!snapshot.exists()) {
                const conversationData = {
                    participants: {
                        [currentUser.uid]: true,
                        [otherUserId]: true
                    },
                    lastMessage: '',
                    lastTimestamp: Date.now(),
                    unreadCount: 0
                };
                
                // Criar conversa para ambos os usuários
                set(conversationRef, conversationData);
                set(ref(chatDb, `userConversations/${otherUserId}/${conversationId}`), conversationData);
            }
            
            // Carregar mensagens
            loadMessages(conversationId);
            
        }, { onlyOnce: true });
        
        // Fechar sidebar em mobile
        if (window.innerWidth < 768) {
            document.getElementById('sidebar').classList.remove('active');
        }
        
    } catch (error) {
        console.error('❌ Erro ao iniciar conversa:', error);
        showNotification('Erro ao iniciar conversa', 'error');
    }
};

// ========== ABRIR CONVERSA ==========
async function openConversation(conversationId, otherUserId) {
    currentConversation = conversationId;
    
    try {
        const otherUser = await getOtherUserInfo(otherUserId);
        if (!otherUser) return;
        
        // Atualizar interface
        document.getElementById('other-user-name').textContent = otherUser.nome;
        document.getElementById('no-conversation').classList.add('hidden');
        document.getElementById('active-conversation').classList.remove('hidden');
        document.getElementById('message-input-area').classList.remove('hidden');
        
        // Carregar mensagens
        loadMessages(conversationId);
        
        // Fechar sidebar em mobile
        if (window.innerWidth < 768) {
            document.getElementById('sidebar').classList.remove('active');
        }
        
    } catch (error) {
        console.error('❌ Erro ao abrir conversa:', error);
    }
}

// ========== CARREGAR MENSAGENS ==========
function loadMessages(conversationId) {
    // Limpar listener anterior
    if (unsubscribeMessages) unsubscribeMessages();
    
    const messagesRef = ref(chatDb, `messages/${conversationId}`);
    const container = document.getElementById('messages-container');
    
    unsubscribeMessages = onValue(query(messagesRef, orderByChild('timestamp'), limitToLast(100)), (snapshot) => {
        const messagesData = snapshot.val();
        
        if (!messagesData || Object.keys(messagesData).length === 0) {
            container.innerHTML = `
                <div class="empty-conversation">
                    <i class="fas fa-comment-slash"></i>
                    <h4>Nenhuma mensagem ainda</h4>
                    <p>Envie a primeira mensagem!</p>
                </div>`;
            return;
        }
        
        // Converter e ordenar mensagens
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
    
    let lastDate = null;
    
    messages.forEach(msg => {
        const messageDate = new Date(msg.timestamp).toLocaleDateString('pt-BR');
        const isCurrentUser = msg.senderId === currentUser.uid;
        
        // Adicionar separador de data se necessário
        if (messageDate !== lastDate) {
            const dateDiv = document.createElement('div');
            dateDiv.className = 'date-separator';
            dateDiv.textContent = formatDate(msg.timestamp);
            container.appendChild(dateDiv);
            lastDate = messageDate;
        }
        
        // Criar elemento da mensagem
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
        
        const time = formatTime(msg.timestamp);
        const formattedDate = formatDateTime(msg.timestamp);
        
        messageDiv.innerHTML = `
            <div class="message-content">
                ${!isCurrentUser ? `<div class="message-sender">${msg.senderName}</div>` : ''}
                <div class="message-text">${msg.text}</div>
                <div class="message-time" title="${formattedDate}">${time}</div>
            </div>`;
        
        container.appendChild(messageDiv);
    });
}

// ========== ENVIAR MENSAGEM ==========
async function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    
    if (!text || !currentUser || !currentConversation) return;
    
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
        
        // Atualizar última mensagem na conversa
        const conversationUpdate = {
            lastMessage: text.length > 50 ? text.substring(0, 47) + '...' : text,
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
        
    } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        showNotification('Erro ao enviar mensagem', 'error');
    }
}

// ========== FUNÇÕES AUXILIARES ==========
async function getOtherUserInfo(otherUserId) {
    try {
        const loginsRef = doc(loginsDb, 'logins', 'LOGINS_ORGTAREFAS');
        const docSnap = await getDoc(loginsRef);
        
        if (docSnap.exists()) {
            const loginsData = docSnap.data();
            const userData = loginsData[otherUserId];
            
            if (userData) {
                return {
                    uid: otherUserId,
                    login: userData.login,
                    nome: userData.displayName || userData.login,
                    perfil: userData.perfil || 'usuario'
                };
            }
        }
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
    }
    return null;
}

function getOtherUserId(participants) {
    if (!participants) return null;
    const participantIds = Object.keys(participants);
    return participantIds.find(id => id !== currentUser.uid);
}

function getOtherUserIdFromConversation(conversationId) {
    if (!conversationId) return null;
    const parts = conversationId.split('_');
    return parts.find(part => part !== currentUser.uid);
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Ontem';
    } else {
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
}

function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
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
    // Enviar mensagem
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Menu toggle
    document.getElementById('menu-toggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });
    
    // Logout quando a página for fechada
    window.addEventListener('beforeunload', logout);
    
    // Logout ao clicar no botão voltar
    document.getElementById('logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        await logout();
        window.location.href = 'index.html';
    });
}

// ========== RESPONSIVIDADE ==========
function setupResponsive() {
    // Fechar sidebar ao clicar fora (mobile)
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const menuToggle = document.getElementById('menu-toggle');
        
        if (window.innerWidth < 768 && 
            sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) && 
            !menuToggle.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });
    
    // Ajustar layout no resize
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) {
            document.getElementById('sidebar').classList.add('active');
        } else {
            document.getElementById('sidebar').classList.remove('active');
        }
    });
}

// ========== MOSTRAR NOTIFICAÇÃO ==========
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    
    // Limpar notificação anterior
    notification.textContent = '';
    notification.className = 'notification';
    
    // Definir tipo
    const typeClasses = {
        error: 'error',
        success: 'success',
        info: 'info'
    };
    
    notification.classList.add(typeClasses[type] || 'info');
    
    // Adicionar ícone
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    notification.textContent = `${icon} ${message}`;
    notification.classList.remove('hidden');
    
    // Auto-esconder
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// ========== INICIAR APLICAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
    init();
    setupEventListeners();
    setupResponsive();
});
