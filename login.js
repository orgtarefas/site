// login.js - VERSÃO 100% FUNCIONAL COM FIREBASE MODULAR
console.log('=== LOGIN INICIADO ===');

// Sistema de login com Firebase Modular v12
async function fazerLogin(usuarioInput, senhaInput) {
    console.log('🚀 Tentando login:', usuarioInput);
    
    const btnLogin = document.getElementById('btnLogin');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('spinner');
    
    try {
        // Validação
        if (!usuarioInput || !senhaInput) {
            alert('⚠️ Preencha usuário e senha');
            return;
        }

        // Mostrar loading
        btnLogin.disabled = true;
        btnText.textContent = 'Autenticando...';
        spinner.classList.remove('hidden');
        
        // Acessar Firebase CORRETAMENTE
        const { db, firebaseModules } = window.firebaseApp;
        const { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, increment } = firebaseModules;
        
        console.log('✅ Firebase acessado corretamente');
        
        // Buscar usuário
        const usuariosRef = collection(db, 'usuarios');
        const q = query(usuariosRef, where('usuario', '==', usuarioInput.trim()));
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            throw new Error('Usuário não encontrado');
        }
        
        const usuarioDoc = querySnapshot.docs[0];
        const userData = usuarioDoc.data();
        
        console.log('📋 Usuário encontrado:', userData.usuario);
        
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
        
        // Atualizar último login (opcional)
        try {
            await updateDoc(doc(db, 'usuarios', usuarioDoc.id), {
                ultimoLogin: serverTimestamp(),
                sessoesAtivas: increment(1)
            });
            console.log('🔄 Último login atualizado');
        } catch (updateError) {
            console.log('⚠️ Não atualizou último login:', updateError);
        }
        
        // Redirecionar
        btnText.textContent = '✅ Sucesso! Redirecionando...';
        
        setTimeout(() => {
            console.log('🔗 Redirecionando para index.html');
            window.location.href = 'index.html';
        }, 800);
        
    } catch (error) {
        console.error('❌ ERRO NO LOGIN:', error);
        
        // Mensagens amigáveis
        let mensagem = 'Erro ao fazer login';
        if (error.message.includes('Usuário não encontrado')) mensagem = 'Usuário não encontrado';
        if (error.message.includes('Senha incorreta')) mensagem = 'Senha incorreta';
        
        alert('❌ ' + mensagem);
        
        // Restaurar botão
        btnLogin.disabled = false;
        btnText.textContent = 'Entrar no Sistema';
        spinner.classList.add('hidden');
        
        // Focar na senha para corrigir
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
    
    // Adicionar botão de teste (remove depois)
    setTimeout(() => {
        if (window.location.href.includes('login.html')) {
            const testBtn = document.createElement('button');
            testBtn.innerHTML = '🔧 TESTE RÁPIDO';
            testBtn.style.cssText = `
                position: fixed;
                bottom: 70px;
                right: 20px;
                background: #ff9800;
                color: white;
                border: none;
                padding: 8px 15px;
                border-radius: 20px;
                cursor: pointer;
                font-size: 12px;
                z-index: 9999;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            `;
            testBtn.onclick = () => {
                document.getElementById('loginUsuario').value = 'thiago.barbosa';
                document.getElementById('loginPassword').value = '123456';
                alert('✅ Dados preenchidos! Clique em "Entrar no Sistema"');
            };
            document.body.appendChild(testBtn);
        }
    }, 1000);
    
    console.log('✅ Sistema de login pronto');
});
