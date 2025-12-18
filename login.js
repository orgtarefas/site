// login.js - VERSÃO PARA ESTRUTURA DE CAMPOS DINÂMICOS
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
        const { collection, doc, getDoc } = firebaseModules;
        
        console.log('📊 Acessando estrutura especial...');
        
        // 1. ACESSAR O DOCUMENTO ESPECIAL
        const docRef = doc(db, 'logins', 'LOGINS_AVERBSYS');
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error('Banco de logins não encontrado');
        }
        
        const dadosCompletos = docSnap.data();
        console.log('✅ Documento carregado. Campos:', Object.keys(dadosCompletos).length);
        
        // 2. PROCURAR O USUÁRIO NOS CAMPOS DINÂMICOS
        let usuarioEncontrado = null;
        let numeroUsuario = null;
        
        // Procurar em user_1_logiin, user_2_logiin, etc.
        for (let i = 1; i <= 20; i++) { // Ajuste o limite conforme necessário
            const campoLogin = `user_${i}_logiin`;
            const campoSenha = `user_${i}_senha`;
            const campoNome = `user_${i}_nome_completo`;
            const campoPerfil = `user_${i}_perfil`;
            const campoStatus = `user_${i}_status`;
            
            // Verificar se existe o campo de login
            if (dadosCompletos[campoLogin] === usuario) {
                console.log(`✅ Usuário encontrado no campo: ${campoLogin}`);
                
                usuarioEncontrado = {
                    numero: i,
                    login: dadosCompletos[campoLogin],
                    senha: dadosCompletos[campoSenha],
                    nome: dadosCompletos[campoNome],
                    perfil: dadosCompletos[campoPerfil],
                    status: dadosCompletos[campoStatus] || 'ativo'
                };
                numeroUsuario = i;
                break;
            }
            
            // Também verificar campo "login" (sem número)
            const campoLoginSimples = `user_${i}_login`;
            if (dadosCompletos[campoLoginSimples] === usuario) {
                console.log(`✅ Usuário encontrado no campo: ${campoLoginSimples}`);
                
                usuarioEncontrado = {
                    numero: i,
                    login: dadosCompletos[campoLoginSimples],
                    senha: dadosCompletos[campoSenha],
                    nome: dadosCompletos[campoNome],
                    perfil: dadosCompletos[campoPerfil],
                    status: dadosCompletos[campoStatus] || 'ativo'
                };
                numeroUsuario = i;
                break;
            }
        }
        
        // Se não encontrou, procurar por "thiago.barbosa" especificamente
        if (!usuarioEncontrado) {
            console.log('🔍 Buscando usuário específico...');
            
            // Vamos procurar em TODOS os campos que contenham "logiin" ou "login"
            Object.keys(dadosCompletos).forEach(campo => {
                if (campo.includes('logiin') || campo.includes('login')) {
                    if (dadosCompletos[campo] === usuario) {
                        console.log(`✅ Encontrado no campo: ${campo}`);
                        
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
                        }
                    }
                }
            });
        }
        
        if (!usuarioEncontrado) {
            throw new Error('Usuário não encontrado');
        }
        
        console.log('🎯 Dados do usuário:', usuarioEncontrado);
        
        // 3. VERIFICAÇÕES
        if (usuarioEncontrado.status !== 'ativo') {
            throw new Error('Usuário inativo. Contate o administrador.');
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
            estrutura: 'campos_dinamicos', // Identificar a estrutura
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
        console.log('📋 Dados salvos:', {
            nome: usuarioLogado.nome,
            perfil: usuarioLogado.perfil,
            numero: usuarioLogado.numeroUsuario
        });
        
        // 5. REDIRECIONAR
        btnText.textContent = '✅ Sucesso! Redirecionando...';
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 800);
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        
        let mensagemErro = 'Erro ao fazer login';
        
        if (error.message.includes('Usuário não encontrado')) {
            mensagemErro = 'Usuário não encontrado';
        } else if (error.message.includes('Senha incorreta')) {
            mensagemErro = 'Senha incorreta';
        } else if (error.message.includes('inativo')) {
            mensagemErro = error.message;
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

// Função auxiliar para listar todos os usuários (para debug)
async function listarTodosUsuarios() {
    try {
        const { db, firebaseModules } = window.firebaseApp;
        const { collection, doc, getDoc } = firebaseModules;
        
        const docRef = doc(db, 'logins', 'LOGINS_AVERBSYS');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const dados = docSnap.data();
            console.log('📋 LISTA COMPLETA DE USUÁRIOS:');
            
            for (let i = 1; i <= 20; i++) {
                const login = dados[`user_${i}_logiin`] || dados[`user_${i}_login`];
                if (login) {
                    console.log(`${i}. ${login} - ${dados[`user_${i}_nome_completo`]} (${dados[`user_${i}_perfil`]})`);
                }
            }
        }
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
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
    
    // Botão de teste (opcional - pode remover depois)
    console.log('=== SISTEMA CONFIGURADO ===');
    console.log('🎯 Estrutura especial detectada: Campos dinâmicos em logins/LOGINS_AVERBSYS');

});
