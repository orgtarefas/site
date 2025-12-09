// login.js - VERSÃO ATUALIZADA COM CARREGAMENTO DE GRUPOS
console.log('=== LOGIN INICIADO ===');

// Sistema de login DIRETO com carregamento de grupos
async function fazerLogin(usuario, senha) {
    console.log('Tentando login:', usuario);
    
    const btnLogin = document.getElementById('btnLogin');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('spinner');
    
    try {
        if (!usuario || !senha) {
            alert('Preencha usuário e senha');
            return;
        }

        btnLogin.disabled = true;
        btnText.textContent = 'Autenticando...';
        spinner.classList.remove('hidden');
        
        // Acesso CORRETO ao Firebase v12 modular
        const { db, firebaseModules } = window.firebaseApp;
        
        // Usar as funções MODULARES v12
        const { collection, query, where, getDocs } = firebaseModules;
        
        // Buscar usuário - FORMA CORRETA v12
        const usuariosRef = collection(db, 'usuarios');
        const q = query(usuariosRef, where('usuario', '==', usuario));
        
        const querySnapshot = await getDocs(q);
        
        console.log('Resultados encontrados:', querySnapshot.size);
        
        if (querySnapshot.empty) {
            throw new Error('Usuário não encontrado');
        }
        
        const usuarioDoc = querySnapshot.docs[0];
        const userData = usuarioDoc.data();
        
        console.log('Dados do usuário:', userData);
        
        // Verificar senha
        if (userData.senha !== senha) {
            throw new Error('Senha incorreta');
        }
        
        // CARREGAR GRUPOS DO USUÁRIO
        let gruposUsuario = [];
        if (userData.grupos && Array.isArray(userData.grupos)) {
            // Usuário já tem grupos definidos no documento
            gruposUsuario = userData.grupos;
        } else if (userData.grupo) {
            // Usuário tem um único grupo (para compatibilidade com versões antigas)
            gruposUsuario = [userData.grupo];
        }
        
        console.log('Grupos do usuário:', gruposUsuario);
        
        // Salvar informações do usuário no localStorage COM GRUPOS
        localStorage.setItem('usuarioLogado', JSON.stringify({
            id: usuarioDoc.id,
            usuario: userData.usuario,
            nome: userData.nome || userData.usuario,
            nivel: userData.nivel || 'usuario',
            email: userData.email || '',
            grupos: gruposUsuario, // <-- ADICIONADO: GRUPOS DO USUÁRIO
            dataLogin: new Date().toISOString()
        }));
        
        console.log('✅ Login realizado com sucesso!');
        console.log('📋 Dados salvos no localStorage:', {
            nome: userData.nome || userData.usuario,
            grupos: gruposUsuario
        });
        
        // Verificar se lembrar usuário está marcado
        const rememberMe = document.getElementById('rememberMe').checked;
        if (rememberMe) {
            localStorage.setItem('savedUser', usuario);
        } else {
            localStorage.removeItem('savedUser');
        }
        
        // Redirecionar para index.html
        btnText.textContent = 'Sucesso! Redirecionando...';
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        
        let mensagemErro = 'Erro ao fazer login';
        
        if (error.message.includes('Usuário não encontrado')) {
            mensagemErro = 'Usuário não encontrado';
        } else if (error.message.includes('Senha incorreta')) {
            mensagemErro = 'Senha incorreta';
        } else {
            mensagemErro = error.message;
        }
        
        alert('Erro: ' + mensagemErro);
        
        // Restaurar botão
        btnLogin.disabled = false;
        btnText.textContent = 'Entrar no Sistema';
        spinner.classList.add('hidden');
    }
}

// CONFIGURAÇÃO DO FORMULÁRIO
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== FORMULÁRIO PRONTO ===');
    
    // Configurar formulário
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const usuario = document.getElementById('loginUsuario').value;
            const senha = document.getElementById('loginPassword').value;
            
            console.log('Formulário enviado:', { usuario, senha });
            fazerLogin(usuario, senha);
        });
    }
    
    // Verificar se há usuário lembrado
    const savedUser = localStorage.getItem('savedUser');
    if (savedUser) {
        document.getElementById('loginUsuario').value = savedUser;
        document.getElementById('rememberMe').checked = true;
    }
    
    // Focar no campo usuário
    setTimeout(() => {
        const inputUsuario = document.getElementById('loginUsuario');
        if (inputUsuario) {
            inputUsuario.focus();
        }
    }, 500);
    
    console.log('=== SISTEMA CONFIGURADO ===');
    
    // Verificar Firebase
    console.log('FirebaseApp disponível?', window.firebaseApp ? '✅ SIM' : '❌ NÃO');
});
