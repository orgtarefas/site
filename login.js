// login.js - VERSÃO FUNCIONAL
console.log('=== LOGIN INICIADO ===');

// Sistema de login DIRETO
async function fazerLogin(usuarioInput, senhaInput) {
    console.log('Tentando login:', usuarioInput);
    
    const btnLogin = document.getElementById('btnLogin');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('spinner');
    
    try {
        if (!usuarioInput || !senhaInput) {
            alert('Preencha usuário e senha');
            return;
        }

        btnLogin.disabled = true;
        btnText.textContent = 'Autenticando...';
        spinner.classList.remove('hidden');
        
        // Acesso direto ao Firebase já configurado
        const { db } = window.firebaseApp;
        
        // Buscar usuário pelo campo "usuario" (não pelo ID do documento)
        const usuariosRef = db.collection('usuarios');
        const querySnapshot = await usuariosRef
            .where('usuario', '==', usuarioInput.trim())
            .get();
        
        console.log('Resultados encontrados:', querySnapshot.size);
        
        if (querySnapshot.empty) {
            throw new Error('Usuário não encontrado');
        }
        
        const usuarioDoc = querySnapshot.docs[0];
        const userData = usuarioDoc.data();
        
        console.log('Dados do usuário:', userData);
        
        // Verificar senha
        if (userData.senha !== senhaInput) {
            throw new Error('Senha incorreta');
        }
        
        // Verificar se usuário está ativo
        if (userData.ativo === false) {
            throw new Error('Usuário inativo');
        }
        
        // Salvar informações do usuário no localStorage
        localStorage.setItem('usuarioLogado', JSON.stringify({
            id: usuarioDoc.id,
            usuario: userData.usuario,
            nome: userData.nome || userData.usuario,
            nivel: userData.nivel || 'usuario',
            email: userData.email || '',
            sessaoAtiva: userData.sessaoAtiva || '',
            dataCriacao: userData.dataCriacao ? userData.dataCriacao.toDate().toISOString() : new Date().toISOString()
        }));
        
        console.log('✅ Login realizado com sucesso!');
        
        // Atualizar último login
        try {
            await usuariosRef.doc(usuarioDoc.id).update({
                ultimoLogin: firebase.firestore.FieldValue.serverTimestamp(),
                sessoesAtivas: firebase.firestore.FieldValue.increment(1)
            });
        } catch (updateError) {
            console.log('⚠️ Não foi possível atualizar último login:', updateError);
        }
        
        // Redirecionar
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        alert('Erro: ' + error.message);
        
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
    
    // Focar no campo correto
    setTimeout(() => {
        const inputUsuario = document.getElementById('loginUsuario');
        if (inputUsuario && !inputUsuario.value) {
            inputUsuario.focus();
        } else if (inputUsuario && inputUsuario.value) {
            document.getElementById('loginPassword').focus();
        }
    }, 300);
    
    console.log('=== SISTEMA PRONTO PARA LOGIN ===');
    
    // Teste rápido do Firebase
    if (window.firebaseApp) {
        console.log('✅ Firebase configurado:', window.firebaseApp.db ? 'Sim' : 'Não');
    } else {
        console.error('❌ Firebase não configurado!');
    }
});
