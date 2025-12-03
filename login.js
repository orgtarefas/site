// login.js - VERSÃO FIREBASE v8 (COMPATÍVEL)
console.log('=== LOGIN v8 INICIADO ===');

// Sistema de login SIMPLES com Firebase v8
async function fazerLogin(usuarioInput, senhaInput) {
    console.log('🚀 Tentando login:', usuarioInput);
    
    const btnLogin = document.getElementById('btnLogin');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('spinner');
    
    try {
        if (!usuarioInput || !senhaInput) {
            alert('⚠️ Preencha usuário e senha');
            return;
        }

        // Mostrar loading
        btnLogin.disabled = true;
        btnText.textContent = 'Autenticando...';
        spinner.classList.remove('hidden');
        
        console.log('✅ Firebase v8 disponível');
        
        // Buscar usuário - FORMA SIMPLES v8
        const querySnapshot = await db.collection('usuarios')
            .where('usuario', '==', usuarioInput.trim())
            .get();
        
        console.log('Resultados:', querySnapshot.size);
        
        if (querySnapshot.empty) {
            throw new Error('Usuário não encontrado');
        }
        
        const usuarioDoc = querySnapshot.docs[0];
        const userData = usuarioDoc.data();
        
        console.log('Usuário encontrado:', userData.usuario);
        
        // Verificar senha
        if (userData.senha !== senhaInput) {
            throw new Error('Senha incorreta');
        }
        
        // Salvar no localStorage
        const usuarioLogado = {
            id: usuarioDoc.id,
            usuario: userData.usuario,
            nome: userData.nome || userData.usuario,
            nivel: userData.nivel || 'usuario',
            email: userData.email || '',
            dataLogin: new Date().toISOString()
        };
        
        localStorage.setItem('usuarioLogado', JSON.stringify(usuarioLogado));
        console.log('💾 Usuário salvo no localStorage');
        
        // Lembrar usuário
        if (document.getElementById('rememberMe').checked) {
            localStorage.setItem('savedUser', usuarioInput);
        }
        
        // Atualizar último login
        try {
            await db.collection('usuarios').doc(usuarioDoc.id).update({
                ultimoLogin: firebase.firestore.FieldValue.serverTimestamp(),
                sessoesAtivas: firebase.firestore.FieldValue.increment(1)
            });
            console.log('🔄 Último login atualizado');
        } catch (updateError) {
            console.log('⚠️ Não atualizou último login:', updateError);
        }
        
        // Redirecionar
        btnText.textContent = '✅ Sucesso! Redirecionando...';
        
        setTimeout(() => {
            console.log('🔗 Indo para index.html');
            window.location.href = 'index.html';
        }, 800);
        
    } catch (error) {
        console.error('❌ ERRO NO LOGIN:', error);
        
        let mensagem = 'Erro ao fazer login';
        if (error.message.includes('Usuário não encontrado')) mensagem = 'Usuário não encontrado';
        if (error.message.includes('Senha incorreta')) mensagem = 'Senha incorreta';
        
        alert('❌ ' + mensagem);
        
        // Restaurar botão
        btnLogin.disabled = false;
        btnText.textContent = 'Entrar no Sistema';
        spinner.classList.add('hidden');
        
        // Focar na senha
        document.getElementById('loginPassword').focus();
    }
}

// CONFIGURAÇÃO DO FORMULÁRIO
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 Formulário carregado');
    
    // Configurar submit
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const usuario = document.getElementById('loginUsuario').value;
            const senha = document.getElementById('loginPassword').value;
            fazerLogin(usuario, senha);
        });
    }
    
    // Preencher com dados salvos
    const savedUser = localStorage.getItem('savedUser');
    if (savedUser) {
        document.getElementById('loginUsuario').value = savedUser;
        document.getElementById('rememberMe').checked = true;
    }
    
    // Focar
    setTimeout(() => {
        const input = document.getElementById('loginUsuario');
        if (input && !input.value) input.focus();
    }, 300);
    
    console.log('✅ Sistema de login v8 pronto');
    
    // Verificar Firebase
    setTimeout(() => {
        console.log('Firebase v8 carregado?', window.db ? '✅ SIM' : '❌ NÃO');
        console.log('db.collection é função?', window.db ? typeof window.db.collection : 'N/A');
    }, 1000);
});
