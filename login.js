// login.js - VERSÃO OTIMIZADA PARA LOGINS-C3407
console.log('=== LOGIN INICIANDO ===');

// Sistema de login para nova base logins-c3407
async function fazerLogin(usuario, senha) {
    console.log('🔐 Tentando login:', usuario);
    
    const btnLogin = document.getElementById('btnLogin');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('spinner');
    
    try {
        // Validação básica
        if (!usuario || !senha) {
            alert('⚠️ Preencha usuário e senha');
            return;
        }

        // Estado de carregamento
        btnLogin.disabled = true;
        btnText.textContent = 'Autenticando...';
        spinner.classList.remove('hidden');
        
        // Acessar Firebase
        const { db, firebaseModules } = window.firebaseApp;
        const { collection, query, where, getDocs, doc, updateDoc } = firebaseModules;
        
        // 1. BUSCAR USUÁRIO NA NOVA COLEÇÃO LOGINS_ORGTAREFAS
        console.log('🔍 Buscando usuário na coleção LOGINS_ORGTAREFAS...');
        const usuariosRef = collection(db, 'LOGINS_ORGTAREFAS');
        const q = query(usuariosRef, where('login', '==', usuario));
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            throw new Error('❌ Usuário não encontrado');
        }
        
        // Pegar o primeiro resultado (deve ser único)
        const usuarioDoc = querySnapshot.docs[0];
        const userData = usuarioDoc.data();
        const userId = usuarioDoc.id;
        
        console.log('✅ Usuário encontrado:', {
            id: userId,
            login: userData.login,
            displayName: userData.displayName,
            perfil: userData.perfil,
            status: userData.status
        });
        
        // 2. VERIFICAÇÕES
        // Verificar status
        if (userData.status !== 'ativo') {
            throw new Error('🚫 Usuário inativo. Contate o administrador.');
        }
        
        // Verificar senha
        if (userData.senha !== senha) {
            throw new Error('🔒 Senha incorreta');
        }
        
        // 3. ATUALIZAR STATUS PARA ONLINE (opcional)
        try {
            const userRef = doc(db, 'LOGINS_ORGTAREFAS', userId);
            await updateDoc(userRef, {
                isOnline: true,
                ultimoLogin: new Date().toISOString()
            });
            console.log('✅ Status atualizado para online');
        } catch (updateError) {
            console.warn('⚠️ Não foi possível atualizar status online:', updateError);
            // Não falhar o login por isso
        }
        
        // 4. SALVAR DADOS NO LOCALSTORAGE
        // Mapeamento dos campos da nova estrutura
        const usuarioLogado = {
            id: userId,
            uid: userId,
            usuario: userData.login,
            login: userData.login, // Para compatibilidade
            nome: userData.displayName || userData.login,
            displayName: userData.displayName || userData.login,
            nivel: userData.perfil || 'usuario',
            perfil: userData.perfil || 'usuario',
            email: userData.email || '',
            status: userData.status || 'ativo',
            isOnline: true,
            grupos: userData.grupos || [], // Se existir na nova estrutura
            dataLogin: new Date().toISOString(),
            projeto: 'logins-c3407' // Identificador da base
        };
        
        localStorage.setItem('usuarioLogado', JSON.stringify(usuarioLogado));
        
        // Salvar para lembrar usuário
        const rememberMe = document.getElementById('rememberMe').checked;
        if (rememberMe) {
            localStorage.setItem('savedUser', usuario);
        } else {
            localStorage.removeItem('savedUser');
        }
        
        console.log('🎉 Login realizado com sucesso!');
        console.log('📋 Dados do usuário:', {
            nome: usuarioLogado.nome,
            perfil: usuarioLogado.perfil,
            projeto: usuarioLogado.projeto
        });
        
        // 5. REDIRECIONAR
        btnText.textContent = '✅ Sucesso! Redirecionando...';
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 800);
        
    } catch (error) {
        console.error('💥 Erro no login:', error);
        
        // Mensagens amigáveis de erro
        let mensagemErro = 'Erro ao fazer login';
        
        if (error.message.includes('Usuário não encontrado')) {
            mensagemErro = 'Usuário não encontrado. Verifique o nome de usuário.';
        } else if (error.message.includes('Senha incorreta')) {
            mensagemErro = 'Senha incorreta. Tente novamente.';
        } else if (error.message.includes('inativo')) {
            mensagemErro = error.message;
        } else if (error.message.includes('permission-denied') || error.message.includes('permission')) {
            mensagemErro = 'Sem permissão para acessar o sistema. Contate o administrador.';
        } else {
            mensagemErro = `Erro: ${error.message}`;
        }
        
        // Mostrar alerta
        alert(mensagemErro);
        
        // Restaurar botão
        btnLogin.disabled = false;
        btnText.textContent = 'Entrar no Sistema';
        spinner.classList.add('hidden');
        
        // Focar no campo de senha para tentar novamente
        setTimeout(() => {
            document.getElementById('loginPassword').focus();
        }, 100);
    }
}

// CONFIGURAÇÃO DO FORMULÁRIO
document.addEventListener('DOMContentLoaded', function() {
    console.log('📝 FORMULÁRIO DE LOGIN PRONTO');
    
    // Configurar formulário
    const form = document.getElementById('loginForm');
    const usuarioInput = document.getElementById('loginUsuario');
    const senhaInput = document.getElementById('loginPassword');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const usuario = usuarioInput.value.trim();
            const senha = senhaInput.value;
            
            console.log('📤 Formulário enviado:', { usuario: usuario });
            fazerLogin(usuario, senha);
        });
    }
    
    // Enter para avançar entre campos
    usuarioInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            senhaInput.focus();
        }
    });
    
    senhaInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            form.dispatchEvent(new Event('submit'));
        }
    });
    
    // Verificar se há usuário lembrado
    const savedUser = localStorage.getItem('savedUser');
    if (savedUser) {
        usuarioInput.value = savedUser;
        document.getElementById('rememberMe').checked = true;
        senhaInput.focus(); // Foca na senha automaticamente
    } else {
        usuarioInput.focus(); // Foca no usuário se não tiver salvo
    }
    
    console.log('🚀 SISTEMA DE LOGIN CONFIGURADO');
    console.log('📊 Usando base: logins-c3407');
    console.log('📁 Coleção: LOGINS_ORGTAREFAS');
});

// Função de logout para limpar dados (se necessário em outras páginas)
function fazerLogout() {
    // Tentar atualizar status para offline
    try {
        const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
        if (usuarioLogado && window.firebaseApp) {
            const { db, firebaseModules } = window.firebaseApp;
            const { doc, updateDoc } = firebaseModules;
            
            const userRef = doc(db, 'LOGINS_ORGTAREFAS', usuarioLogado.id);
            updateDoc(userRef, {
                isOnline: false,
                ultimoLogout: new Date().toISOString()
            }).catch(e => console.warn('Não foi possível atualizar logout:', e));
        }
    } catch (error) {
        console.warn('Erro ao tentar logout remoto:', error);
    }
    
    // Limpar localStorage
    localStorage.removeItem('usuarioLogado');
    console.log('👋 Logout realizado');
}
