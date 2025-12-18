// login.js - VERSÃO CORRIGIDA
console.log('=== LOGIN INICIANDO (NOVA ESTRUTURA) ===');

// Sistema de login para estrutura de campos dinâmicos
async function fazerLogin(usuario, senha) {
    console.log('🔐 Tentando login:', usuario);
    
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
        const { doc, getDoc } = firebaseModules;
        
        console.log('📊 Acessando estrutura especial...');
        console.log('Firebase Modules disponíveis:', Object.keys(firebaseModules));
        
        // 1. ACESSAR O DOCUMENTO ESPECIAL
        const docRef = doc(db, 'logins', 'LOGINS_AVERBSYS');
        console.log('Documento ref criado:', docRef);
        
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error('Banco de logins não encontrado');
        }
        
        const dadosCompletos = docSnap.data();
        console.log('✅ Documento carregado. Total de campos:', Object.keys(dadosCompletos).length);
        
        // 2. PROCURAR O USUÁRIO NOS CAMPOS DINÂMICOS
        let usuarioEncontrado = null;
        let numeroUsuario = null;
        
        // Primeiro, mostrar todos os campos disponíveis para debug
        console.log('🔍 Campos disponíveis (primeiros 20):', 
            Object.keys(dadosCompletos).slice(0, 20));
        
        // Procurar em user_1_logiin, user_2_logiin, etc.
        for (let i = 1; i <= 50; i++) { // Aumentei para 50 para garantir
            const campoLogin1 = `user_${i}_logiin`;  // Com "logiin" (com dois i)
            const campoLogin2 = `user_${i}_login`;   // Com "login" (um i)
            const campoSenha = `user_${i}_senha`;
            const campoNome = `user_${i}_nome_completo`;
            const campoPerfil = `user_${i}_perfil`;
            const campoStatus = `user_${i}_status`;
            
            // Verificar primeiro campo (logiin com dois i)
            if (dadosCompletos[campoLogin1] === usuario) {
                console.log(`✅ Usuário encontrado no campo: ${campoLogin1}`);
                
                usuarioEncontrado = {
                    numero: i,
                    login: dadosCompletos[campoLogin1],
                    senha: dadosCompletos[campoSenha],
                    nome: dadosCompletos[campoNome],
                    perfil: dadosCompletos[campoPerfil],
                    status: dadosCompletos[campoStatus] || 'ativo'
                };
                numeroUsuario = i;
                break;
            }
            
            // Verificar segundo campo (login com um i)
            if (dadosCompletos[campoLogin2] === usuario) {
                console.log(`✅ Usuário encontrado no campo: ${campoLogin2}`);
                
                usuarioEncontrado = {
                    numero: i,
                    login: dadosCompletos[campoLogin2],
                    senha: dadosCompletos[campoSenha],
                    nome: dadosCompletos[campoNome],
                    perfil: dadosCompletos[campoPerfil],
                    status: dadosCompletos[campoStatus] || 'ativo'
                };
                numeroUsuario = i;
                break;
            }
        }
        
        // Se ainda não encontrou, fazer busca avançada
        if (!usuarioEncontrado) {
            console.log('🔍 Busca avançada em todos os campos...');
            
            // Procurar em TODOS os campos que contenham "logiin" ou "login"
            const camposLogin = Object.keys(dadosCompletos).filter(campo => 
                campo.includes('logiin') || campo.includes('login')
            );
            
            console.log('Campos de login encontrados:', camposLogin);
            
            for (const campo of camposLogin) {
                if (dadosCompletos[campo] === usuario) {
                    console.log(`🎯 Encontrado no campo: ${campo}`);
                    
                    // Extrair número do campo (user_X_)
                    const match = campo.match(/user_(\d+)_/);
                    if (match) {
                        const num = match[1];
                        usuarioEncontrado = {
                            numero: parseInt(num),
                            login: dadosCompletos[campo],
                            senha: dadosCompletos[`user_${num}_senha`],
                            nome: dadosCompletos[`user_${num}_nome_completo`],
                            perfil: dadosCompletos[`user_${num}_perfil`],
                            status: dadosCompletos[`user_${num}_status`] || 'ativo'
                        };
                        numeroUsuario = num;
                        break;
                    }
                }
            }
        }
        
        if (!usuarioEncontrado) {
            console.log('❌ Usuário não encontrado. Campos disponíveis:');
            
            // Listar todos os usuários disponíveis para ajudar
            const usuariosDisponiveis = [];
            for (let i = 1; i <= 50; i++) {
                const login1 = dadosCompletos[`user_${i}_logiin`];
                const login2 = dadosCompletos[`user_${i}_login`];
                const login = login1 || login2;
                if (login) {
                    usuariosDisponiveis.push({
                        numero: i,
                        login: login,
                        nome: dadosCompletos[`user_${i}_nome_completo`]
                    });
                }
            }
            
            console.log('👥 Usuários disponíveis no sistema:', usuariosDisponiveis);
            throw new Error(`Usuário "${usuario}" não encontrado.`);
        }
        
        console.log('🎯 Dados do usuário encontrado:', usuarioEncontrado);
        
        // 3. VERIFICAÇÕES
        if (usuarioEncontrado.status && usuarioEncontrado.status !== 'ativo') {
            throw new Error('Usuário inativo. Contate o administrador.');
        }
        
        if (!usuarioEncontrado.senha) {
            console.error('Campo de senha não encontrado para usuário:', usuarioEncontrado);
            throw new Error('Configuração incorreta no banco de dados.');
        }
        
        if (usuarioEncontrado.senha !== senha) {
            throw new Error('Senha incorreta');
        }
        
        // 4. SALVAR DADOS NO LOCALSTORAGE
        const usuarioLogado = {
            id: `user_${numeroUsuario}`,
            uid: `user_${numeroUsuario}`,
            usuario: usuarioEncontrado.login,
            login: usuarioEncontrado.login,
            nome: usuarioEncontrado.nome || usuarioEncontrado.login,
            displayName: usuarioEncontrado.nome || usuarioEncontrado.login,
            nivel: usuarioEncontrado.perfil || 'usuario',
            perfil: usuarioEncontrado.perfil || 'usuario',
            status: usuarioEncontrado.status || 'ativo',
            numeroUsuario: numeroUsuario,
            estrutura: 'campos_dinamicos',
            colecao: 'logins',
            documento: 'LOGINS_AVERBSYS',
            dataLogin: new Date().toISOString()
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
        
        // 5. REDIRECIONAR
        btnText.textContent = '✅ Sucesso! Redirecionando...';
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 800);
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        
        let mensagemErro = 'Erro ao fazer login';
        
        if (error.message.includes('Usuário não encontrado')) {
            mensagemErro = error.message;
        } else if (error.message.includes('Senha incorreta')) {
            mensagemErro = 'Senha incorreta';
        } else if (error.message.includes('inativo')) {
            mensagemErro = error.message;
        } else if (error.message.includes('Configuração incorreta')) {
            mensagemErro = error.message;
        } else {
            mensagemErro = `Erro: ${error.message}`;
        }
        
        alert(mensagemErro);
        
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
