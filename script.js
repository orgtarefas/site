// script.js - VERSÃO ORIGINAL (que funcionava)
// Gerenciamento de Estado
let tarefas = [];
let usuarios = [];
let editandoTarefaId = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando sistema...');
    document.getElementById('loadingText').textContent = 'Verificando autenticação...';
    
    // Verificar se usuário está logado
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    if (!usuarioLogado) {
        console.log('❌ Usuário não logado, redirecionando...');
        window.location.href = 'login.html';
        return;
    }

    console.log('👤 Usuário logado:', usuarioLogado.nome);
    document.getElementById('userName').textContent = usuarioLogado.nome;
    document.getElementById('data-atual').textContent = new Date().toLocaleDateString('pt-BR');
    
    // Inicializar sistema
    inicializarSistema();
});

function inicializarSistema() {
    console.log('🔥 Inicializando Firebase...');
    document.getElementById('loadingText').textContent = 'Conectando ao banco de dados...';
    
    // Aguardar Firebase carregar
    if (!window.db) {
        console.log('⏳ Aguardando Firebase...');
        setTimeout(inicializarSistema, 500);
        return;
    }

    console.log('✅ Firebase carregado!');
    
    try {
        configurarDataMinima();
        carregarUsuarios();
        configurarFirebase();
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        document.getElementById('status-sincronizacao').innerHTML = '<i class="fas fa-exclamation-triangle"></i> Offline';
        mostrarErro('Erro ao conectar com o banco de dados');
    }
}

function configurarDataMinima() {
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('tarefaDataInicio').min = hoje;
    document.getElementById('tarefaDataFim').min = hoje;
}

// ... resto do código ORIGINAL ...
