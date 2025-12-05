// Configuração do Firebase - REALTIME DATABASE
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    databaseURL: "https://SEU_PROJETO-default-rtdb.firebaseio.com", // IMPORTANTE: URL do RTDB
    projectId: "SEU_PROJETO",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "SEU_SENDER_ID",
    appId: "SEU_APP_ID"
};

// Inicializar Firebase com RTDB
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database(); // RTDB aqui
const storage = firebase.storage();

// Estado da aplicação
const AppState = {
    currentUser: null,
    isTyping: false,
    typingTimeout: null,
    messagesListener: null,
    usersListener: null,
    connectionListener: null,
    userStatusRef: null
};

// Elementos DOM
const DOM = {
    // Tela de Login
    loginScreen: document.getElementById('login-screen'),
    chatScreen: document.getElementById('chat-screen'),
    emailInput: document.getElementById('email'),
    passwordInput: document.getElementById('password'),
    displayNameInput: document.getElementById('displayName'),
    loginBtn: document.getElementById('login-btn'),
    signupBtn: document.getElementById('signup-btn'),
    loginStatus: document.getElementById('login-status'),
    
    // Tela do Chat
    logoutBtn: document.getElementById('logout-btn'),
    messageInput: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    messagesContainer: document.getElementById('messages-container'),
    onlineUsersContainer: document.getElementById('online-users'),
    currentUserName: document.getElementById('current-user-name'),
    userAvatar: document.getElementById('user-avatar'),
    onlineCount: document.getElementById('online-count'),
    
    // Upload
    attachBtn: document.getElementById('attach-btn'),
    fileInput: document.getElementById('file-input'),
    uploadProgress: document.getElementById('upload-progress'),
    progressFill: document.querySelector('.progress-fill'),
    progressText: document.querySelector('.progress-text'),
    
    // Modal
    imageModal: document.getElementById('image-modal'),
    modalImage: document.getElementById('modal-image'),
    closeModal: document.querySelector('.close-modal')
};

// Inicialização
class ChatApp {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthState();
        this.setupModal();
    }

    setupEventListeners() {
        // Autenticação
        DOM.loginBtn.addEventListener('click', () => this.handleLogin());
        DOM.signupBtn.addEventListener('click', () => this.handleSignup());
        DOM.logoutBtn.addEventListener('click', () => this.handleLogout());
        
        // Enter para login
        DOM.emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        
        DOM.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        // Mensagens
        DOM.sendBtn.addEventListener('click', () => this.sendMessage());
        DOM.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Typing indicator (opcional)
        DOM.messageInput.addEventListener('input', () => this.handleTyping());

        // Upload
        DOM.attachBtn.addEventListener('click', () => DOM.fileInput.click());
        DOM.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }

    setupModal() {
        DOM.closeModal.addEventListener('click', () => {
            DOM.imageModal.classList.add('hidden');
        });
        
        DOM.imageModal.addEventListener('click', (e) => {
            if (e.target === DOM.imageModal) {
                DOM.imageModal.classList.add('hidden');
            }
        });
    }

    // ========== AUTENTICAÇÃO ==========
    async handleLogin() {
        const email = DOM.emailInput.value.trim();
        const password = DOM.passwordInput.value;

        if (!this.validateEmail(email)) {
            this.showStatus('E-mail inválido', 'error');
            return;
        }

        if (password.length < 6) {
            this.showStatus('Senha deve ter pelo menos 6 caracteres', 'error');
            return;
        }

        try {
            await auth.signInWithEmailAndPassword(email, password);
            this.showStatus('Login realizado!', 'success');
            this.clearLoginForm();
        } catch (error) {
            this.showStatus(this.getAuthErrorMessage(error), 'error');
        }
    }

    async handleSignup() {
        const email = DOM.emailInput.value.trim();
        const password = DOM.passwordInput.value;
        const displayName = DOM.displayNameInput.value.trim();

        if (!this.validateEmail(email)) {
            this.showStatus('E-mail inválido', 'error');
            return;
        }

        if (password.length < 6) {
            this.showStatus('Senha deve ter pelo menos 6 caracteres', 'error');
            return;
        }

        if (displayName.length < 2) {
            this.showStatus('Nome deve ter pelo menos 2 caracteres', 'error');
            return;
        }

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({ displayName });
            
            // Salvar usuário no RTDB
            await this.saveUserToDatabase(userCredential.user, displayName);
            
            this.showStatus('Cadastro realizado!', 'success');
            this.clearLoginForm();
        } catch (error) {
            this.showStatus(this.getAuthErrorMessage(error), 'error');
        }
    }

    async handleLogout() {
        try {
            // Atualizar status offline
            if (AppState.currentUser) {
                await db.ref(`users/${AppState.currentUser.uid}`).update({
                    isOnline: false,
                    lastSeen: Date.now()
                });
            }
            
            // Limpar listeners
            this.cleanupListeners();
            
            // Fazer logout
            await auth.signOut();
            AppState.currentUser = null;
            
            this.showLoginScreen();
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    }

    // ========== BANCO DE DADOS (RTDB) ==========
    async saveUserToDatabase(user, displayName) {
        const userData = {
            uid: user.uid,
            email: user.email,
            displayName: displayName,
            avatarUrl: this.generateAvatarUrl(displayName),
            createdAt: Date.now(),
            lastSeen: Date.now(),
            isOnline: true
        };

        await db.ref(`users/${user.uid}`).set(userData);
        
        // Configurar onDisconnect
        const userRef = db.ref(`users/${user.uid}`);
        userRef.child('isOnline').onDisconnect().set(false);
        userRef.child('lastSeen').onDisconnect().set(Date.now());
    }

    setupRealtimeListeners() {
        if (!AppState.currentUser) return;

        // 1. Ouvir mensagens (limitado às últimas 100)
        AppState.messagesListener = db.ref('messages')
            .orderByChild('timestamp')
            .limitToLast(100)
            .on('value', (snapshot) => {
                this.handleNewMessages(snapshot.val());
            });

        // 2. Ouvir usuários online
        AppState.usersListener = db.ref('users')
            .orderByChild('isOnline')
            .equalTo(true)
            .on('value', (snapshot) => {
                this.handleOnlineUsers(snapshot.val());
            });

        // 3. Monitorar conexão
        AppState.connectionListener = db.ref('.info/connected').on('value', (snapshot) => {
            if (snapshot.val() === true && AppState.currentUser) {
                // Reconectado - atualizar status
                db.ref(`users/${AppState.currentUser.uid}`).update({
                    isOnline: true,
                    lastSeen: Date.now()
                });
            }
        });

        // 4. Configurar presence do usuário
        this.setupUserPresence();
    }

    cleanupListeners() {
        if (AppState.messagesListener) {
            db.ref('messages').off('value', AppState.messagesListener);
            AppState.messagesListener = null;
        }
        
        if (AppState.usersListener) {
            db.ref('users').off('value', AppState.usersListener);
            AppState.usersListener = null;
        }
        
        if (AppState.connectionListener) {
            db.ref('.info/connected').off('value', AppState.connectionListener);
            AppState.connectionListener = null;
        }
        
        if (AppState.userStatusRef) {
            AppState.userStatusRef.remove();
            AppState.userStatusRef = null;
        }
    }

    setupUserPresence() {
        const uid = AppState.currentUser.uid;
        const userStatusRef = db.ref(`status/${uid}`);
        
        // Estou online
        userStatusRef.set({
            isOnline: true,
            lastChanged: Date.now(),
            uid: uid
        });
        
        // Quando desconectar
        userStatusRef.onDisconnect().set({
            isOnline: false,
            lastChanged: Date.now(),
            uid: uid
        });
        
        AppState.userStatusRef = userStatusRef;
    }

    // ========== MENSAGENS ==========
    async sendMessage() {
        if (!AppState.currentUser) return;

        const text = DOM.messageInput.value.trim();
        const hasFile = DOM.fileInput.files.length > 0;

        if (!text && !hasFile) {
            DOM.messageInput.focus();
            return;
        }

        try {
            const messageId = db.ref('messages').push().key;
            const messageData = {
                id: messageId,
                senderId: AppState.currentUser.uid,
                senderName: AppState.currentUser.displayName,
                text: text || '',
                timestamp: Date.now(),
                type: hasFile ? 'file' : 'text'
            };

            // Se tem arquivo, processa primeiro
            if (hasFile) {
                await this.processFileUpload(messageId, messageData);
            } else {
                await db.ref(`messages/${messageId}`).set(messageData);
            }

            DOM.messageInput.value = '';
            this.scrollToBottom();
            
            // Parar typing indicator
            this.stopTyping();
            
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            this.showStatus('Erro ao enviar mensagem', 'error');
        }
    }

    handleNewMessages(messagesData) {
        if (!messagesData) {
            this.renderEmptyMessages();
            return;
        }

        const messages = Object.values(messagesData)
            .sort((a, b) => a.timestamp - b.timestamp);
        
        this.renderMessages(messages);
        this.scrollToBottom();
    }

    renderMessages(messages) {
        DOM.messagesContainer.innerHTML = '';
        
        messages.forEach(msg => {
            const messageElement = this.createMessageElement(msg);
            DOM.messagesContainer.appendChild(messageElement);
        });
    }

    createMessageElement(msg) {
        const div = document.createElement('div');
        const isSent = msg.senderId === AppState.currentUser?.uid;
        const time = this.formatTime(msg.timestamp);
        
        div.className = `message ${isSent ? 'sent' : 'received'}`;
        div.dataset.id = msg.id;
        
        let content = `
            <div class="message-header">
                <span class="message-sender">${msg.senderName}</span>
                <span class="message-time">${time}</span>
            </div>`;
        
        if (msg.text) {
            content += `<div class="message-text">${this.formatMessageText(msg.text)}</div>`;
        }
        
        if (msg.imageUrl) {
            content += `
                <img src="${msg.imageUrl}" alt="Imagem" class="message-image" 
                     onclick="chatApp.openImageModal('${msg.imageUrl}')">
            `;
        } else if (msg.fileUrl) {
            content += this.createFileElement(msg);
        }
        
        div.innerHTML = content;
        return div;
    }

    createFileElement(msg) {
        const icon = this.getFileIcon(msg.fileName);
        const size = msg.fileSize ? this.formatFileSize(msg.fileSize) : '';
        
        return `
            <a href="${msg.fileUrl}" target="_blank" class="message-file">
                <i class="fas ${icon}"></i>
                <div class="file-info">
                    <div class="file-name">${msg.fileName || 'Arquivo'}</div>
                    ${size ? `<div class="file-size">${size}</div>` : ''}
                </div>
                <i class="fas fa-download"></i>
            </a>
        `;
    }

    // ========== UPLOAD DE ARQUIVOS ==========
    async processFileUpload(messageId, messageData) {
        const file = DOM.fileInput.files[0];
        if (!file) return;

        // Validações
        if (!this.validateFile(file)) {
            DOM.fileInput.value = '';
            return;
        }

        try {
            DOM.uploadProgress.classList.remove('hidden');
            
            const filePath = `chat/${AppState.currentUser.uid}/${Date.now()}_${file.name}`;
            const storageRef = storage.ref(filePath);
            const uploadTask = storageRef.put(file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    DOM.progressFill.style.width = `${progress}%`;
                    DOM.progressText.textContent = `Enviando... ${Math.round(progress)}%`;
                },
                (error) => {
                    console.error('Upload error:', error);
                    this.showStatus('Erro ao enviar arquivo', 'error');
                    DOM.uploadProgress.classList.add('hidden');
                },
                async () => {
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    
                    // Atualizar dados da mensagem
                    messageData.fileUrl = downloadURL;
                    messageData.fileName = file.name;
                    messageData.fileSize = file.size;
                    
                    if (file.type.startsWith('image/')) {
                        messageData.imageUrl = downloadURL;
                        messageData.type = 'image';
                    } else {
                        messageData.type = 'file';
                    }
                    
                    // Salvar mensagem no RTDB
                    await db.ref(`messages/${messageId}`).set(messageData);
                    
                    // Limpar
                    DOM.fileInput.value = '';
                    DOM.uploadProgress.classList.add('hidden');
                    DOM.progressFill.style.width = '0%';
                }
            );
        } catch (error) {
            console.error('Erro no upload:', error);
            this.showStatus('Erro ao processar arquivo', 'error');
            DOM.uploadProgress.classList.add('hidden');
        }
    }

    validateFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (file.size > maxSize) {
            this.showStatus('Arquivo muito grande (máx. 10MB)', 'error');
            return false;
        }

        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|txt|doc|docx)$/i)) {
            this.showStatus('Tipo de arquivo não permitido', 'error');
            return false;
        }

        return true;
    }

    // ========== USUÁRIOS ONLINE ==========
    handleOnlineUsers(usersData) {
        if (!usersData) {
            DOM.onlineUsersContainer.innerHTML = '<div class="loading">Nenhum usuário online</div>';
            DOM.onlineCount.textContent = '1 online';
            return;
        }

        const users = Object.values(usersData)
            .filter(user => user.uid !== AppState.currentUser?.uid)
            .sort((a, b) => a.displayName?.localeCompare(b.displayName));

        this.renderOnlineUsers(users);
        DOM.online
