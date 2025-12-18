// login.js - VERSÃO CORRIGIDA
console.log('=== LOGIN INICIANDO (NOVA ESTRUTURA) ===');

// Sistema de login para estrutura de campos dinâmicos
// Substitua a função fazerLogin por esta versão:
async function fazerLogin(usuario, senha) {
    console.log('🔐 Tentando login na coleção LOGINS_ORGTAREFAS:', usuario);
    
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
        
        // Acesso ao Firebase
        const { db, firebaseModules } = window.firebaseApp;
        const { collection, query, where, getDocs } = firebaseModules;
        
        console.log('📊 Acessando coleção LOGINS_ORGTAREFAS...');
        
        // 1. ACESSAR A COLEÇÃO CORRETA: LOGINS_ORGTAREFAS
        const usuariosRef = collection(db, 'LOGINS_ORGTAREFAS');
        
        // 2. BUSCAR USUÁRIO PELO CAMPO 'login'
        const q = query(usuariosRef, where('login', '==', usuario));
        const querySnapshot = await getDocs(q);
        
        console.log('🔍 Resultados encontrados:', querySnapshot.size);
        
        if (querySnapshot.empty) {
            // Tentar buscar por 'usuario' também (para compatibilidade)
            const q2 = query(usuariosRef, where('usuario', '==', usuario));
            const querySnapshot2 = await getDocs(q2);
            
            if (querySnapshot2.empty) {
                throw new Error('Usuário não encontrado na coleção LOGINS_ORGTAREFAS');
            }
            
            // Usar o segundo resultado
            const usuarioDoc = querySnapshot2.docs[0];
            const userData = usuarioDoc.data();
            const userId = usuarioDoc.id;
            
            console.log('✅ Usuário encontrado pelo campo "usuario":', userData);
            
            // Verificar senha
            if (userData.senha !== senha) {
                throw new Error('Senha incorreta');
            }
            
            // Verificar status
            if (userData.status && userData.status.toLowerCase() !== 'ativo') {
                throw new Error('Usuário inativo. Contate o administrador.');
            }
            
            // Salvar dados
            salvarDadosUsuario(userId, userData, usuario);
            
        } else {
            // Usar o primeiro resultado
            const usuarioDoc = querySnapshot.docs[0];
            const userData = usuarioDoc.data();
            const userId = usuarioDoc.id;
            
            console.log('✅ Usuário encontrado pelo campo "login":', userData);
            
            // Verificar senha
            if (userData.senha !== senha) {
                throw new Error('Senha incorreta');
            }
            
            // Verificar status
            if (userData.status && userData.status.toLowerCase() !== 'ativo') {
                throw new Error('Usuário inativo. Contate o administrador.');
            }
            
            // Salvar dados
            salvarDadosUsuario(userId, userData, usuario);
        }
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        
        let mensagemErro = error.message;
        
        alert('Erro: ' + mensagemErro);
        
        // Restaurar botão
        btnLogin.disabled = false;
        btnText.textContent = 'Entrar no Sistema';
        spinner.classList.add('hidden');
    }
}

// Função auxiliar para salvar dados do usuário
function salvarDadosUsuario(userId, userData, usuario) {
    const usuarioLogado = {
        id: userId,
        uid: userId,
        usuario: userData.login || userData.usuario || usuario,
        nome: userData.displayName || userData.nome || userData.login || usuario,
        perfil: userData.perfil || userData.nivel || 'usuario',
        email: userData.email || '',
        status: userData.status || 'ativo',
        isOnline: userData.isOnline || false,
        dataLogin: new Date().toISOString(),
        colecao: 'LOGINS_ORGTAREFAS'
    };
    
    localStorage.setItem('usuarioLogado', JSON.stringify(usuarioLogado));
    
    // Salvar para lembrar usuário
    const rememberMe = document.getElementById('rememberMe').checked;
    if (rememberMe) {
        localStorage.setItem('savedUser', usuario);
    } else {
        localStorage.removeItem('savedUser');
    }
    
    console.log('✅ Login realizado com sucesso!');
    console.log('📋 Dados salvos:', usuarioLogado);
    
    // Redirecionar
    document.getElementById('btnText').textContent = '✅ Redirecionando...';
    
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 500);
}

// Adicione também esta função para verificar a estrutura da coleção LOGINS_ORGTAREFAS:
window.verificarEstruturaLOGINS = async function() {
    try {
        const { db, firebaseModules } = window.firebaseApp;
        const { collection, getDocs } = firebaseModules;
        
        console.log('🔍 VERIFICANDO ESTRUTURA DA COLEÇÃO LOGINS_ORGTAREFAS');
        
        // Verificar LOGINS_ORGTAREFAS
        const ref = collection(db, 'LOGINS_ORGTAREFAS');
        const snapshot = await getDocs(ref);
        
        console.log(`📊 LOGINS_ORGTAREFAS: ${snapshot.size} documentos`);
        
        if (snapshot.size > 0) {
            // Mostrar todos os documentos
            snapshot.forEach((doc, index) => {
                console.log(`\n📄 Documento ${index + 1} (ID: ${doc.id}):`);
                const data = doc.data();
                console.log('Dados:', data);
                console.log('Campos:', Object.keys(data));
            });
        } else {
            console.log('⚠️ Coleção LOGINS_ORGTAREFAS está vazia ou não existe!');
            
            // Verificar se existe com nome diferente
            const colecoesParaTestar = [
                'LOGINS_ORGTAREFAS',
                'Logins_Orgtarefas', 
                'logins_orgtarefas',
                'logins',
                'usuarios',
                'Users'
            ];
            
            console.log('\n🔍 Testando outras coleções possíveis...');
            for (const colecaoNome of colecoesParaTestar) {
                try {
                    const testRef = collection(db, colecaoNome);
                    const testSnapshot = await getDocs(testRef);
                    console.log(`${colecaoNome}: ${testSnapshot.size} documentos`);
                    
                    if (testSnapshot.size > 0) {
                        console.log('📄 Primeiro documento:', testSnapshot.docs[0].data());
                    }
                } catch (error) {
                    console.log(`${colecaoNome}: Erro - ${error.message}`);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar estrutura:', error);
    }
};

// CONFIGURAÇÃO DO FORMULÁRIO
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== FORMULÁRIO PRONTO ===');
    
    // Configurar formulário
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const usuario = document.getElementById('loginUsuario').value.trim();
            const senha = document.getElementById('loginPassword').value;
            
            console.log('Formulário enviado:', { usuario });
            fazerLogin(usuario, senha);
        });
    }
    
    // Verificar se há usuário lembrado
    const savedUser = localStorage.getItem('savedUser');
    if (savedUser) {
        document.getElementById('loginUsuario').value = savedUser;
        document.getElementById('rememberMe').checked = true;
        document.getElementById('loginPassword').focus();
    } else {
        document.getElementById('loginUsuario').focus();
    }
    
    console.log('=== SISTEMA CONFIGURADO ===');
    console.log('🎯 Estrutura: logins/LOGINS_AVERBSYS (campos dinâmicos)');
});

// Função para debug - pode executar no console
window.listarUsuariosDisponiveis = async function() {
    try {
        const { db, firebaseModules } = window.firebaseApp;
        const { doc, getDoc } = firebaseModules;
        
        const docRef = doc(db, 'logins', 'LOGINS_AVERBSYS');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const dados = docSnap.data();
            console.log('📋 USUÁRIOS DISPONÍVEIS NO SISTEMA:');
            
            const usuarios = [];
            for (let i = 1; i <= 50; i++) {
                const login1 = dados[`user_${i}_logiin`];
                const login2 = dados[`user_${i}_login`];
                const login = login1 || login2;
                
                if (login) {
                    usuarios.push({
                        número: i,
                        login: login,
                        nome: dados[`user_${i}_nome_completo`] || 'Não informado',
                        perfil: dados[`user_${i}_perfil`] || 'Não informado'
                    });
                }
            }
            
            console.table(usuarios);
            return usuarios;
        }
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
    }
};
