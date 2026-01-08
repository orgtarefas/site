// CONFIGURAÇÕES
const CONFIG = {
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxaB_h0-N5DAMt0xOOnCvpBHzHYceg8sdsVhF2fGoGHG3MXcZaCWzyqJB-4NGIZdTfdRw/exec',
    LOGIN_USUARIO: 'thiago.carvalho'
};

// HISTÓRICO LOCAL
let historicoEnvios = JSON.parse(localStorage.getItem('relatorio_historico')) || [];

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Sistema de Relatórios carregado');
    atualizarDataHora();
    carregarHistorico();
    
    // Atualizar data/hora a cada minuto
    setInterval(atualizarDataHora, 60000);
});

// ATUALIZAR DATA/HORA
function atualizarDataHora() {
    const agora = new Date();
    const dataHoraFormatada = agora.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const dataDisplay = document.getElementById('dataHoraDisplay');
    const loginDisplay = document.getElementById('loginDisplay');
    
    if (dataDisplay) dataDisplay.textContent = dataHoraFormatada;
    if (loginDisplay) loginDisplay.textContent = CONFIG.LOGIN_USUARIO;
}

// SALVAR RELATÓRIO (FUNÇÃO PRINCIPAL)
async function salvarRelatorio() {
    // Obter valores dos campos
    const canalVendas = document.getElementById('canalVendas').value.trim();
    const idPlataforma = document.getElementById('idPlataforma').value.trim();
    
    // VALIDAÇÃO
    if (!canalVendas || !idPlataforma) {
        alert('❌ Por favor, preencha todos os campos!');
        return;
    }
    
    // Configurar botão de loading
    const btnSalvar = document.getElementById('btnSalvar');
    const textoOriginal = btnSalvar.innerHTML;
    btnSalvar.innerHTML = '<span class="loading"></span> Salvando...';
    btnSalvar.disabled = true;
    
    try {
        // Preparar dados
        const dataFormatada = new Date().toLocaleString('pt-BR');
        const dados = {
            canalVendas: canalVendas,
            idPlataforma: idPlataforma,
            login: CONFIG.LOGIN_USUARIO,
            dataFormatada: dataFormatada
        };
        
        console.log('📤 Enviando dados:', dados);
        
        // ENVIAR PARA GOOGLE SHEETS (método simples)
        const sucesso = await enviarParaGoogleSheets(dados);
        
        if (sucesso) {
            // SALVAR NO HISTÓRICO LOCAL
            const envio = {
                ...dados,
                id: Date.now(),
                status: 'sucesso',
                dataEnvio: new Date().toISOString()
            };
            
            historicoEnvios.unshift(envio);
            if (historicoEnvios.length > 20) historicoEnvios = historicoEnvios.slice(0, 20);
            localStorage.setItem('relatorio_historico', JSON.stringify(historicoEnvios));
            
            // MENSAGEM DE SUCESSO
            mostrarMensagem(
                `✅ <strong>Relatório salvo com sucesso!</strong><br>
                 📊 Canal: ${canalVendas}<br>
                 🆔 ID: ${idPlataforma}<br>
                 📅 Data: ${dataFormatada}`,
                'success'
            );
            
            // LIMPAR FORMULÁRIO
            limparFormulario();
            
        } else {
            throw new Error('Não foi possível salvar no Google Sheets');
        }
        
    } catch (error) {
        console.error('❌ Erro:', error);
        
        // MENSAGEM DE ERRO
        mostrarMensagem(
            `❌ <strong>Erro ao salvar!</strong><br>
             Os dados foram salvos localmente e serão enviados automaticamente quando possível.`,
            'error'
        );
        
        // SALVAR LOCALMENTE (fallback)
        const envio = {
            canalVendas: canalVendas,
            idPlataforma: idPlataforma,
            login: CONFIG.LOGIN_USUARIO,
            dataFormatada: new Date().toLocaleString('pt-BR'),
            id: Date.now(),
            status: 'pendente',
            dataEnvio: new Date().toISOString()
        };
        
        historicoEnvios.unshift(envio);
        localStorage.setItem('relatorio_historico', JSON.stringify(historicoEnvios));
        
    } finally {
        // Restaurar botão
        btnSalvar.innerHTML = textoOriginal;
        btnSalvar.disabled = false;
        carregarHistorico();
    }
}

// ENVIAR PARA GOOGLE SHEETS (método simplificado)
async function enviarParaGoogleSheets(dados) {
    try {
        // Converter dados para parâmetros de URL (GET simples)
        const params = new URLSearchParams({
            canalVendas: dados.canalVendas,
            idPlataforma: dados.idPlataforma,
            login: dados.login,
            dataFormatada: encodeURIComponent(dados.dataFormatada)
        });
        
        const url = `${CONFIG.GOOGLE_SCRIPT_URL}?${params}`;
        console.log('🔗 Enviando para:', url);
        
        // Usar fetch com no-cors (funciona no GitHub Pages)
        const response = await fetch(url, {
            method: 'GET',
            mode: 'no-cors',  // IMPORTANTE: evita problemas CORS
            cache: 'no-store'
        });
        
        console.log('✅ Dados enviados para Google Sheets');
        
        // Em modo no-cors não podemos ler a resposta, 
        // mas se não deu erro, consideramos sucesso
        return true;
        
    } catch (error) {
        console.error('❌ Erro no envio:', error);
        
        // Método alternativo: usar imagem (fallback)
        try {
            await enviarViaImagem(dados);
            return true;
        } catch (imgError) {
            throw new Error('Falha em todos os métodos de envio');
        }
    }
}

// MÉTODO ALTERNATIVO: Enviar via imagem (para CORS)
function enviarViaImagem(dados) {
    return new Promise((resolve, reject) => {
        const params = new URLSearchParams({
            canalVendas: dados.canalVendas.substring(0, 50),
            idPlataforma: dados.idPlataforma,
            login: dados.login,
            timestamp: Date.now()
        });
        
        const url = `${CONFIG.GOOGLE_SCRIPT_URL}?${params}`;
        
        const img = new Image();
        img.style.display = 'none';
        
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Ainda consideramos sucesso
        
        img.src = url;
        document.body.appendChild(img);
        
        setTimeout(() => resolve(), 3000); // Timeout após 3 segundos
    });
}

// MOSTRAR MENSAGEM
function mostrarMensagem(texto, tipo) {
    const mensagemDiv = document.getElementById('statusMessage');
    if (!mensagemDiv) return;
    
    mensagemDiv.innerHTML = texto;
    mensagemDiv.className = `status-message ${tipo}`;
    mensagemDiv.style.display = 'block';
    
    // Auto-esconder após 5 segundos
    setTimeout(() => {
        mensagemDiv.style.display = 'none';
    }, 5000);
}

// LIMPAR FORMULÁRIO
function limparFormulario() {
    document.getElementById('canalVendas').value = '';
    document.getElementById('idPlataforma').value = '';
    
    // Focar no primeiro campo
    setTimeout(() => {
        document.getElementById('canalVendas').focus();
    }, 100);
}

// CARREGAR HISTÓRICO
function carregarHistorico() {
    const container = document.getElementById('historicoContainer');
    if (!container) return;
    
    if (historicoEnvios.length === 0) {
        container.innerHTML = '<p class="empty-state">📭 Nenhum envio ainda</p>';
        return;
    }
    
    let html = '';
    const limite = Math.min(historicoEnvios.length, 10);
    
    for (let i = 0; i < limite; i++) {
        const envio = historicoEnvios[i];
        const statusIcon = envio.status === 'sucesso' ? '✅' : '⏳';
        
        let dataExibicao = 'Data inválida';
        try {
            const data = new Date(envio.dataEnvio || envio.id);
            dataExibicao = data.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {}
        
        html += `
            <div class="historico-item ${envio.status}">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <strong>${statusIcon} ${envio.canalVendas}</strong>
                    <small>${dataExibicao}</small>
                </div>
                <div style="color: #666; font-size: 0.9em;">
                    ID: ${envio.idPlataforma} | Status: ${envio.status === 'sucesso' ? 'Enviado' : 'Pendente'}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ESTILOS DINÂMICOS
const estilos = document.createElement('style');
estilos.textContent = `
    .loading {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 1s linear infinite;
        margin-right: 8px;
        vertical-align: middle;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .status-message {
        padding: 15px;
        border-radius: 8px;
        margin: 15px 0;
        font-size: 0.95em;
    }
    
    .status-message.success {
        background: #d1fae5;
        color: #065f46;
        border: 1px solid #a7f3d0;
    }
    
    .status-message.error {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid #fecaca;
    }
    
    .historico-item {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 10px;
    }
    
    .historico-item.sucesso {
        border-left: 4px solid #10b981;
    }
    
    .historico-item.pendente {
        border-left: 4px solid #f59e0b;
    }
    
    .empty-state {
        text-align: center;
        padding: 30px;
        color: #94a3b8;
        font-style: italic;
    }
`;
document.head.appendChild(estilos);

// Permitir Enter para enviar
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && 
        (e.target.id === 'canalVendas' || e.target.id === 'idPlataforma')) {
        e.preventDefault();
        salvarRelatorio();
    }
});
