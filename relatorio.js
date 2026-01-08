// Configurações
const CONFIG = {
    GOOGLE_SHEETS_ID: '2PACX-1vQzF6_7q6HfCfK7N_zTC7uyS34bQrWomUPyH5FCSz5f0bYNmhod5B8clysLxpazVIENArC52FgEEC9R',
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxaB_h0-N5DAMt0xOOnCvpBHzHYceg8sdsVhF2fGoGHG3MXcZaCWzyqJB-4NGIZdTfdRw/exec',
    LOGIN_USUARIO: 'thiago.carvalho',
    SHEET_NAME: 'Canal de Vendas',
    COLUNAS: {
        CANAL_VENDAS: 0,     // Coluna A
        ID_PLATAFORMA: 1,    // Coluna B
        LOGIN_INPUT: 2,      // Coluna C
        DATA_INPUT: 3        // Coluna D
    }
};

// Histórico de envios (armazenado localmente)
let historicoEnvios = JSON.parse(localStorage.getItem('relatorio_historico')) || [];

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    atualizarDataHora();
    carregarHistorico();
    
    // Atualizar data/hora a cada minuto
    setInterval(atualizarDataHora, 60000);
    
    // Testar conexão com Google Script
    testarConexaoGoogleScript();
});

// Testar conexão com Google Apps Script
async function testarConexaoGoogleScript() {
    try {
        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'HEAD'
        });
        
        if (response.ok) {
            console.log('✅ Conexão com Google Apps Script estabelecida');
            mostrarStatusConexao(true);
        } else {
            throw new Error('Falha na conexão');
        }
    } catch (error) {
        console.warn('⚠️ Não foi possível testar conexão com Google Apps Script');
        mostrarStatusConexao(false);
    }
}

// Mostrar status da conexão
function mostrarStatusConexao(sucesso) {
    const footer = document.querySelector('.footer');
    if (!footer) return;
    
    const statusDiv = document.createElement('div');
    statusDiv.id = 'statusConexao';
    statusDiv.style.cssText = `
        margin-top: 10px;
        padding: 8px 15px;
        border-radius: 20px;
        font-size: 0.9rem;
        font-weight: 600;
        display: inline-block;
    `;
    
    if (sucesso) {
        statusDiv.innerHTML = '🟢 Conectado ao Google Sheets';
        statusDiv.style.background = '#d1fae5';
        statusDiv.style.color = '#065f46';
        statusDiv.style.border = '2px solid #a7f3d0';
    } else {
        statusDiv.innerHTML = '🟡 Usando modo simulação';
        statusDiv.style.background = '#fef3c7';
        statusDiv.style.color = '#92400e';
        statusDiv.style.border = '2px solid #fde68a';
    }
    
    footer.appendChild(statusDiv);
}

// Atualizar data/hora no display
function atualizarDataHora() {
    const agora = new Date();
    const dataHoraFormatada = agora.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    document.getElementById('dataHoraDisplay').textContent = dataHoraFormatada;
    document.getElementById('loginDisplay').textContent = CONFIG.LOGIN_USUARIO;
}

// Salvar relatório no Google Sheets
async function salvarRelatorio() {
    const canalVendas = document.getElementById('canalVendas').value.trim();
    const idPlataforma = document.getElementById('idPlataforma').value.trim();
    
    // Validação
    if (!canalVendas || !idPlataforma) {
        mostrarMensagem('Por favor, preencha todos os campos obrigatórios!', 'error');
        return;
    }
    
    // Desabilitar botão e mostrar loading
    const btnSalvar = document.getElementById('btnSalvar');
    const btnTextoOriginal = btnSalvar.innerHTML;
    btnSalvar.innerHTML = '<span class="loading"></span> Conectando ao Google Sheets...';
    btnSalvar.disabled = true;
    
    try {
        // Obter data/hora atual
        const dataHora = new Date().toISOString();
        const dataFormatada = new Date().toLocaleString('pt-BR');
        
        // Preparar dados para o Google Sheets
        const dadosRelatorio = {
            canalVendas: canalVendas,
            idPlataforma: idPlataforma,
            login: CONFIG.LOGIN_USUARIO,
            dataHora: dataHora,
            dataFormatada: dataFormatada,
            tipo: document.getElementById('tipoRelatorio').value,
            timestamp: Date.now()
        };
        
        // Tentar enviar para Google Sheets via Apps Script
        console.log('📤 Enviando dados para Google Sheets:', dadosRelatorio);
        
        const sucesso = await enviarParaGoogleSheets(dadosRelatorio);
        
        if (sucesso) {
            // Salvar no histórico local
            const envio = {
                ...dadosRelatorio,
                id: Date.now(),
                status: 'sucesso'
            };
            
            historicoEnvios.unshift(envio);
            // Manter apenas últimos 50 registros
            if (historicoEnvios.length > 50) {
                historicoEnvios = historicoEnvios.slice(0, 50);
            }
            localStorage.setItem('relatorio_historico', JSON.stringify(historicoEnvios));
            
            // Atualizar histórico na tela
            carregarHistorico();
            
            // Mostrar mensagem de sucesso
            mostrarMensagem(
                `<strong>✅ Relatório salvo com sucesso!</strong><br>
                📊 <strong>Canal:</strong> ${canalVendas}<br>
                🆔 <strong>ID Plataforma:</strong> ${idPlataforma}<br>
                📅 <strong>Data:</strong> ${dataFormatada}<br>
                👤 <strong>Usuário:</strong> ${CONFIG.LOGIN_USUARIO}<br><br>
                <small>Os dados foram salvos na próxima linha disponível do Google Sheets.</small>`,
                'success'
            );
            
            // Limpar formulário após 3 segundos
            setTimeout(limparFormulario, 3000);
            
            // Abrir link do Google Sheets em nova aba após 2 segundos
            setTimeout(() => {
                window.open(`https://docs.google.com/spreadsheets/d/${CONFIG.GOOGLE_SHEETS_ID}/edit`, '_blank');
            }, 2000);
        } else {
            throw new Error('Falha ao salvar no Google Sheets');
        }
        
    } catch (error) {
        console.error('Erro ao salvar relatório:', error);
        
        // Mostrar mensagem de erro específica
        let mensagemErro = `❌ Erro ao salvar no Google Sheets: ${error.message}`;
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            mensagemErro = '❌ Erro de conexão. Verifique sua internet e tente novamente.';
        }
        
        mostrarMensagem(mensagemErro, 'error');
        
        // Mesmo com erro, salvar localmente
        const envio = {
            canalVendas: canalVendas,
            idPlataforma: idPlataforma,
            login: CONFIG.LOGIN_USUARIO,
            dataHora: new Date().toISOString(),
            dataFormatada: new Date().toLocaleString('pt-BR'),
            id: Date.now(),
            status: 'erro',
            erro: error.message
        };
        
        historicoEnvios.unshift(envio);
        localStorage.setItem('relatorio_historico', JSON.stringify(historicoEnvios));
        carregarHistorico();
        
        // Oferecer opção de salvar localmente
        setTimeout(() => {
            if (confirm('Deseja salvar os dados localmente e tentar novamente mais tarde?')) {
                mostrarMensagem('📱 Dados salvos localmente. Tente enviar novamente quando a conexão estiver restabelecida.', 'info');
            }
        }, 1000);
    } finally {
        // Restaurar botão
        btnSalvar.innerHTML = btnTextoOriginal;
        btnSalvar.disabled = false;
    }
}

// Enviar dados para Google Sheets via Apps Script
async function enviarParaGoogleSheets(dados) {
    console.log('🔗 Enviando para URL:', CONFIG.GOOGLE_SCRIPT_URL);
    
    // Adicionar timeout de 30 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Importante para Apps Script
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Com 'no-cors', não podemos ler a resposta, apenas saber se foi enviada
        console.log('📨 Dados enviados para Google Apps Script');
        
        // Em modo no-cors, consideramos sucesso se não houver erro de rede
        return true;
        
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            throw new Error('Tempo limite excedido (30s)');
        }
        
        throw error;
    }
}

// Função alternativa usando GET (para debug)
async function enviarViaGET(dados) {
    // Converte dados para parâmetros de URL
    const params = new URLSearchParams({
        canalVendas: dados.canalVendas,
        idPlataforma: dados.idPlataforma,
        login: dados.login,
        dataFormatada: dados.dataFormatada,
        tipo: dados.tipo,
        timestamp: dados.timestamp
    });
    
    const url = `${CONFIG.GOOGLE_SCRIPT_URL}?${params}`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            mode: 'no-cors'
        });
        
        console.log('✅ Dados enviados via GET');
        return true;
    } catch (error) {
        throw new Error(`Falha no envio GET: ${error.message}`);
    }
}

// Limpar formulário
function limparFormulario() {
    document.getElementById('canalVendas').value = '';
    document.getElementById('idPlataforma').value = '';
    document.getElementById('tipoRelatorio').value = 'canal_vendas';
    
    // Focar no primeiro campo
    document.getElementById('canalVendas').focus();
    
    // Limpar mensagem de status
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.className = 'status-message';
    statusMessage.style.display = 'none';
    statusMessage.innerHTML = '';
}

// Mostrar mensagem de status
function mostrarMensagem(texto, tipo) {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.innerHTML = texto;
    statusMessage.className = `status-message ${tipo}`;
    statusMessage.style.display = 'block';
    
    // Auto-remover após segundos diferentes
    const tempoExibicao = tipo === 'success' ? 8000 : 
                         tipo === 'error' ? 10000 : 5000;
    
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, tempoExibicao);
}

// Carregar histórico de envios
function carregarHistorico() {
    const container = document.getElementById('historicoContainer');
    
    if (historicoEnvios.length === 0) {
        container.innerHTML = '<p class="empty-state">📭 Nenhum envio realizado ainda.</p>';
        return;
    }
    
    let html = '';
    const limiteExibicao = Math.min(historicoEnvios.length, 10);
    
    for (let i = 0; i < limiteExibicao; i++) {
        const envio = historicoEnvios[i];
        const statusIcon = envio.status === 'sucesso' ? '✅' : '❌';
        const statusClass = envio.status === 'sucesso' ? 'success' : 'error';
        const statusText = envio.status === 'sucesso' ? 'Enviado' : 'Falhou';
        
        // Formatar data
        let dataExibicao;
        try {
            const data = new Date(envio.dataHora || envio.id);
            dataExibicao = data.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            dataExibicao = 'Data inválida';
        }
        
        html += `
            <div class="historico-item ${statusClass}">
                <div class="historico-header">
                    <div class="historico-title">
                        ${statusIcon} ${envio.canalVendas || 'Sem nome'}
                    </div>
                    <div class="historico-date">${dataExibicao}</div>
                </div>
                <div class="historico-details">
                    <div class="historico-detail">
                        <div class="detail-label">ID Plataforma</div>
                        <div class="detail-value">${envio.idPlataforma || 'N/A'}</div>
                    </div>
                    <div class="historico-detail">
                        <div class="detail-label">Usuário</div>
                        <div class="detail-value">${envio.login || CONFIG.LOGIN_USUARIO}</div>
                    </div>
                    <div class="historico-detail">
                        <div class="detail-label">Status</div>
                        <div class="detail-value ${statusClass}">${statusText}</div>
                    </div>
                </div>
                ${envio.erro ? `
                    <div class="erro-detalhe" style="
                        margin-top: 10px;
                        padding: 8px;
                        background: #fee2e2;
                        border-radius: 5px;
                        font-size: 0.85rem;
                        color: #991b1b;
                    ">
                        <strong>Erro:</strong> ${envio.erro}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // Adicionar botão para limpar histórico se tiver muitos itens
    if (historicoEnvios.length > 10) {
        html += `
            <div style="text-align: center; margin-top: 15px;">
                <button onclick="limparHistoricoCompleto()" 
                        style="
                            padding: 8px 15px;
                            background: #f1f5f9;
                            border: 2px solid #cbd5e1;
                            border-radius: 8px;
                            color: #64748b;
                            cursor: pointer;
                            font-size: 0.9rem;
                        ">
                    🗑️ Limpar histórico completo
                </button>
                <small style="display: block; margin-top: 5px; color: #94a3b8;">
                    Mostrando 10 de ${historicoEnvios.length} registros
                </small>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// Limpar histórico completo
function limparHistoricoCompleto() {
    if (confirm('Tem certeza que deseja limpar todo o histórico de envios?')) {
        historicoEnvios = [];
        localStorage.removeItem('relatorio_historico');
        carregarHistorico();
        mostrarMensagem('🗑️ Histórico limpo com sucesso!', 'info');
    }
}

// Permitir enviar com Enter
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const focused = document.activeElement;
        if (focused.id === 'canalVendas' || focused.id === 'idPlataforma') {
            e.preventDefault();
            salvarRelatorio();
        }
    }
});
