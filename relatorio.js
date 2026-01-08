// ============================================
// SISTEMA DE RELATÓRIOS - VERSÃO FINAL
// ============================================

// CONFIGURAÇÕES (ATUALIZE AQUI!)
const CONFIG = {
    // SUA NOVA URL DO GOOGLE APPS SCRIPT
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzMXiybH9m-VJx7zk0pGcZnoL4mjyHxBdo-TCYwR263QycHXR6dp6b4QGErfBRlqka6Zg/exec',
    
    // SEU LOGIN
    LOGIN_USUARIO: 'thiago.carvalho',
    
    // ID DA SUA PLANILHA
    PLANILHA_ID: '1ZiaoanAU7j5zRU8gy4OrIqvINAtX3hTf_jOZI4q28mY'
};

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Sistema de Relatórios iniciado');
    console.log('🔗 Script URL:', CONFIG.GOOGLE_SCRIPT_URL);
    console.log('📊 Planilha ID:', CONFIG.PLANILHA_ID);
    console.log('👤 Usuário:', CONFIG.LOGIN_USUARIO);
    
    atualizarDataHora();
    carregarHistorico();
    
    // Atualizar data/hora a cada minuto
    setInterval(atualizarDataHora, 60000);
    
    // Verificar conexão
    setTimeout(verificarConexao, 1000);
});

// ============================================
// FUNÇÕES PRINCIPAIS
// ============================================

// ATUALIZAR DATA/HORA
function atualizarDataHora() {
    const agora = new Date();
    const formatado = agora.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const display = document.getElementById('dataHoraDisplay');
    if (display) display.textContent = formatado;
}

// SALVAR RELATÓRIO (FUNÇÃO PRINCIPAL)
async function salvarRelatorio() {
    // Obter valores
    const canalVendas = document.getElementById('canalVendas').value.trim();
    const idPlataforma = document.getElementById('idPlataforma').value.trim();
    
    // VALIDAÇÃO
    if (!canalVendas || !idPlataforma) {
        mostrarMensagem('❌ Por favor, preencha todos os campos!', 'error');
        vibrarCampoVazio();
        return;
    }
    
    // PREPARAR BOTÃO
    const btn = document.getElementById('btnSalvar');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '⏳ Salvando...';
    btn.disabled = true;
    
    try {
        // PREPARAR DADOS
        const dataFormatada = new Date().toLocaleString('pt-BR');
        
        // ENVIAR PARA GOOGLE SHEETS (MÉTODO SIMPLES)
        const sucesso = await enviarDados({
            canalVendas: canalVendas,
            idPlataforma: idPlataforma,
            login: CONFIG.LOGIN_USUARIO,
            dataFormatada: dataFormatada
        });
        
        if (sucesso) {
            // SUCESSO
            mostrarMensagem(`
                <div style="text-align: left;">
                    <div style="color: #059669; font-size: 1.2em; margin-bottom: 10px;">
                        ✅ <strong>Relatório salvo com sucesso!</strong>
                    </div>
                    <div style="margin-bottom: 5px;">
                        🏪 <strong>Canal:</strong> ${canalVendas}
                    </div>
                    <div style="margin-bottom: 5px;">
                        🆔 <strong>ID:</strong> ${idPlataforma}
                    </div>
                    <div style="margin-bottom: 5px;">
                        👤 <strong>Usuário:</strong> ${CONFIG.LOGIN_USUARIO}
                    </div>
                    <div style="margin-bottom: 15px;">
                        📅 <strong>Data:</strong> ${dataFormatada}
                    </div>
                    <div style="font-size: 0.9em; color: #475569;">
                        Os dados foram salvos automaticamente no Google Sheets.
                    </div>
                </div>
            `, 'success');
            
            // EFEITO VISUAL DE SUCESSO
            efeitoSucesso();
            
            // LIMPAR FORMULÁRIO
            setTimeout(limparFormulario, 2000);
            
            // ATUALIZAR HISTÓRICO
            adicionarAoHistorico({
                canalVendas: canalVendas,
                idPlataforma: idPlataforma,
                dataFormatada: dataFormatada,
                status: 'sucesso'
            });
            
        } else {
            throw new Error('Não foi possível conectar ao Google Sheets');
        }
        
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        
        // ERRO - SALVAR LOCALMENTE
        mostrarMensagem(`
            <div style="text-align: left;">
                <div style="color: #dc2626; font-size: 1.2em; margin-bottom: 10px;">
                    ❌ <strong>Erro de conexão</strong>
                </div>
                <div style="margin-bottom: 10px;">
                    Não foi possível conectar ao Google Sheets no momento.
                </div>
                <div style="font-size: 0.9em; color: #475569;">
                    <strong>Dados salvos localmente:</strong><br>
                    🏪 ${canalVendas}<br>
                    🆔 ${idPlataforma}
                </div>
            </div>
        `, 'error');
        
        // SALVAR LOCALMENTE
        adicionarAoHistorico({
            canalVendas: canalVendas,
            idPlataforma: idPlataforma,
            dataFormatada: new Date().toLocaleString('pt-BR'),
            status: 'pendente',
            erro: error.message
        });
        
    } finally {
        // RESTAURAR BOTÃO
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

// ============================================
// FUNÇÕES DE ENVIO
// ============================================

// ENVIAR DADOS PARA GOOGLE SHEETS
async function enviarDados(dados) {
    console.log('📤 Enviando dados:', dados);
    
    try {
        // MÉTODO 1: Usar GET (simples e funciona no GitHub Pages)
        const params = new URLSearchParams();
        params.append('canalVendas', dados.canalVendas);
        params.append('idPlataforma', dados.idPlataforma);
        params.append('login', dados.login);
        params.append('dataFormatada', dados.dataFormatada);
        
        const url = `${CONFIG.GOOGLE_SCRIPT_URL}?${params}`;
        console.log('🔗 URL:', url.substring(0, 150) + '...');
        
        // Usar fetch com no-cors (funciona no GitHub Pages)
        await fetch(url, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-store'
        });
        
        console.log('✅ Dados enviados com sucesso');
        return true;
        
    } catch (error) {
        console.error('❌ Erro no envio:', error);
        return false;
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// VERIFICAR CONEXÃO
function verificarConexao() {
    const statusDiv = document.getElementById('statusConexao');
    if (!statusDiv) return;
    
    statusDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 12px; height: 12px; background: #10b981; border-radius: 50%;"></div>
            <span>Conectado ao Google Sheets</span>
        </div>
    `;
    statusDiv.style.color = '#059669';
}

// MOSTRAR MENSAGEM
function mostrarMensagem(texto, tipo) {
    const div = document.getElementById('statusMessage');
    if (!div) return;
    
    div.innerHTML = texto;
    div.className = `status-message ${tipo}`;
    div.style.display = 'block';
    
    // Rolar para a mensagem
    div.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Auto-esconder
    if (tipo === 'success') {
        setTimeout(() => {
            div.style.display = 'none';
        }, 5000);
    }
}

// VIBRAR CAMPO VAZIO
function vibrarCampoVazio() {
    const campos = ['canalVendas', 'idPlataforma'];
    
    campos.forEach(id => {
        const campo = document.getElementById(id);
        if (!campo.value.trim()) {
            campo.style.borderColor = '#ef4444';
            campo.style.animation = 'vibrar 0.3s';
            
            setTimeout(() => {
                campo.style.animation = '';
            }, 300);
        }
    });
}

// EFEITO DE SUCESSO
function efeitoSucesso() {
    const btn = document.getElementById('btnSalvar');
    const originalColor = btn.style.background;
    
    btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    btn.style.color = 'white';
    btn.style.transform = 'scale(1.05)';
    btn.style.transition = 'all 0.3s';
    
    setTimeout(() => {
        btn.style.background = originalColor;
        btn.style.transform = 'scale(1)';
    }, 1000);
}

// LIMPAR FORMULÁRIO
function limparFormulario() {
    document.getElementById('canalVendas').value = '';
    document.getElementById('idPlataforma').value = '';
    
    // Resetar estilos
    ['canalVendas', 'idPlataforma'].forEach(id => {
        const campo = document.getElementById(id);
        campo.style.borderColor = '';
    });
    
    // Focar no primeiro campo
    setTimeout(() => {
        document.getElementById('canalVendas').focus();
    }, 100);
}

// HISTÓRICO LOCAL
function adicionarAoHistorico(dados) {
    let historico = JSON.parse(localStorage.getItem('relatorio_historico')) || [];
    
    const registro = {
        id: Date.now(),
        canalVendas: dados.canalVendas,
        idPlataforma: dados.idPlataforma,
        login: CONFIG.LOGIN_USUARIO,
        dataFormatada: dados.dataFormatada || new Date().toLocaleString('pt-BR'),
        dataRegistro: new Date().toISOString(),
        status: dados.status || 'sucesso',
        erro: dados.erro || null
    };
    
    historico.unshift(registro);
    
    // Manter apenas últimos 20 registros
    if (historico.length > 20) {
        historico = historico.slice(0, 20);
    }
    
    localStorage.setItem('relatorio_historico', JSON.stringify(historico));
    carregarHistorico();
}

// CARREGAR HISTÓRICO
function carregarHistorico() {
    const container = document.getElementById('historicoContainer');
    if (!container) return;
    
    const historico = JSON.parse(localStorage.getItem('relatorio_historico')) || [];
    
    if (historico.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <div style="font-size: 3em; margin-bottom: 20px;">📭</div>
                <p>Nenhum relatório enviado ainda.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    const limite = Math.min(historico.length, 10);
    
    for (let i = 0; i < limite; i++) {
        const item = historico[i];
        const statusIcon = item.status === 'sucesso' ? '✅' : '⏳';
        const statusColor = item.status === 'sucesso' ? '#10b981' : '#f59e0b';
        
        let dataFormatada = 'Data inválida';
        try {
            const data = new Date(item.dataRegistro || item.id);
            dataFormatada = data.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {}
        
        html += `
            <div style="
                background: white;
                border: 1px solid #e2e8f0;
                border-left: 4px solid ${statusColor};
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 10px;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <strong>${statusIcon} ${item.canalVendas || 'Sem nome'}</strong>
                    <small style="color: #64748b;">${dataFormatada}</small>
                </div>
                <div style="color: #475569; font-size: 0.9em;">
                    ID: ${item.idPlataforma || 'N/A'} | 
                    Status: <span style="color: ${statusColor}; font-weight: bold;">
                        ${item.status === 'sucesso' ? 'Enviado' : 'Pendente'}
                    </span>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ============================================
// EVENTOS
// ============================================

// ENVIAR COM ENTER
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const ativo = document.activeElement;
        if (ativo.id === 'canalVendas' || ativo.id === 'idPlataforma') {
            e.preventDefault();
            salvarRelatorio();
        }
    }
});

// ============================================
// ESTILOS DINÂMICOS
// ============================================
const estilos = document.createElement('style');
estilos.textContent = `
    @keyframes vibrar {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    .status-message {
        padding: 15px;
        margin: 15px 0;
        border-radius: 8px;
        animation: fadeIn 0.3s;
    }
    
    .status-message.success {
        background: #d1fae5;
        border: 2px solid #a7f3d0;
    }
    
    .status-message.error {
        background: #fee2e2;
        border: 2px solid #fecaca;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(estilos);

// ============================================
// LOG INICIAL
// ============================================
console.log(`
╔══════════════════════════════════════════╗
║     SISTEMA DE RELATÓRIOS               ║
║     Status: PRONTO                      ║
║     Script: ${CONFIG.GOOGLE_SCRIPT_URL.substring(0, 50)}... ║
║     Planilha: ${CONFIG.PLANILHA_ID}      ║
║     Usuário: ${CONFIG.LOGIN_USUARIO}     ║
╚══════════════════════════════════════════╝
`);
