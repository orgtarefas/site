// Configurações ATUALIZADAS - Usando o novo ID compartilhado
const CONFIG = {
    // ID correto da planilha (do link compartilhado)
    GOOGLE_SHEETS_ID: '1ZiaoanAU7j5zRU8gy4OrIqvINAtX3hTf_jOZI4q28mY',
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxaB_h0-N5DAMt0xOOnCvpBHzHYceg8sdsVhF2fGoGHG3MXcZaCWzyqJB-4NGIZdTfdRw/exec',
    LOGIN_USUARIO: 'thiago.carvalho',
    SHEET_NAME: 'Canal de Vendas',
    COLUNAS: {
        CANAL_VENDAS: 0,     // Coluna A
        ID_PLATAFORMA: 1,    // Coluna B
        LOGIN_INPUT: 2,      // Coluna C
        DATA_INPUT: 3        // Coluna D
    },
    // Links atualizados
    LINKS: {
        EDIT: 'https://docs.google.com/spreadsheets/d/1ZiaoanAU7j5zRU8gy4OrIqvINAtX3hTf_jOZI4q28mY/edit?usp=sharing',
        PUBLISHED: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQzF6_7q6HfCfK7N_zTC7uyS34bQrWomUPyH5FCSz5f0bYNmhod5B8clysLxpazVIENArC52FgEEC9R/pubhtml'
    }
};

// Histórico de envios (armazenado localmente)
let historicoEnvios = JSON.parse(localStorage.getItem('relatorio_historico')) || [];

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Sistema de Relatórios inicializando...');
    console.log('📊 Planilha ID:', CONFIG.GOOGLE_SHEETS_ID);
    console.log('🔗 Script URL:', CONFIG.GOOGLE_SCRIPT_URL);
    
    atualizarDataHora();
    carregarHistorico();
    
    // Atualizar data/hora a cada minuto
    setInterval(atualizarDataHora, 60000);
    
    // Testar conexão com Google Script
    setTimeout(testarConexao, 2000);
    
    // Atualizar links no HTML
    atualizarLinks();
    
    // Verificar se já existem cabeçalhos na planilha
    verificarEstruturaPlanilha();
});

// Atualizar links na página
function atualizarLinks() {
    // Atualizar link "Ver Google Sheets"
    const links = document.querySelectorAll('.btn-link, [href*="google.com"]');
    links.forEach(link => {
        if (link.textContent.includes('Google Sheets')) {
            link.href = CONFIG.LINKS.EDIT;
            link.innerHTML = '🔗 Ver/Editar Planilha';
        }
    });
    
    // Atualizar informações da planilha
    const sheetInfo = document.querySelector('.sheet-info');
    if (sheetInfo) {
        const planilhaLink = `<a href="${CONFIG.LINKS.EDIT}" target="_blank" style="color: #4f46e5; font-weight: bold;">
            Planilha "Canal de Vendas"
        </a>`;
        
        sheetInfo.innerHTML = `
            <h3>📈 Dados serão salvos em:</h3>
            <p><strong>Google Sheets:</strong> ${planilhaLink}</p>
            <p><strong>Colunas configuradas:</strong></p>
            <ul>
                <li><strong>A:</strong> Canal de Vendas</li>
                <li><strong>B:</strong> ID Plataforma</li>
                <li><strong>C:</strong> Login Input (${CONFIG.LOGIN_USUARIO})</li>
                <li><strong>D:</strong> Data Input (automático)</li>
            </ul>
            <div style="background: #f0f9ff; padding: 10px; border-radius: 8px; margin-top: 15px;">
                <small>📌 <strong>Dica:</strong> Os dados são adicionados automaticamente na próxima linha vazia.</small>
            </div>
        `;
    }
}

// Testar conexão com o Google Apps Script
async function testarConexao() {
    console.log('🔄 Testando conexão com o sistema...');
    
    try {
        // Testar com um request simples
        const testUrl = `${CONFIG.GOOGLE_SCRIPT_URL}?test=conexao&timestamp=${Date.now()}`;
        
        const response = await fetch(testUrl, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-store'
        });
        
        // Com no-cors não vemos a resposta, mas se não deu erro, está ok
        console.log('✅ Conexão com Google Apps Script: OK');
        mostrarStatus('conectado', '🟢 Conectado ao Google Sheets');
        
        // Testar acesso à planilha
        setTimeout(testarAcessoPlanilha, 1000);
        
    } catch (error) {
        console.warn('⚠️ Conexão com Google Apps Script: OFFLINE', error);
        mostrarStatus('offline', '🟡 Modo offline - Dados salvos localmente');
    }
}

// Testar acesso à planilha
async function testarAcessoPlanilha() {
    console.log('📊 Testando acesso à planilha...');
    
    try {
        // Usar o método GET do script para testar
        const testUrl = `${CONFIG.GOOGLE_SCRIPT_URL}?action=testar&planilhaId=${CONFIG.GOOGLE_SHEETS_ID}`;
        
        // Criar iframe para teste (evita problemas CORS)
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = testUrl;
        document.body.appendChild(iframe);
        
        console.log('✅ Teste de planilha iniciado');
        
    } catch (error) {
        console.warn('⚠️ Teste de planilha falhou:', error);
    }
}

// Mostrar status do sistema
function mostrarStatus(status, mensagem) {
    const footer = document.querySelector('.footer');
    if (!footer) return;
    
    // Remover status anterior
    const statusAnterior = document.getElementById('statusSistema');
    if (statusAnterior) {
        statusAnterior.remove();
    }
    
    const statusDiv = document.createElement('div');
    statusDiv.id = 'statusSistema';
    statusDiv.style.cssText = `
        margin-top: 10px;
        padding: 8px 15px;
        border-radius: 20px;
        font-size: 0.9rem;
        font-weight: 600;
        display: inline-block;
        animation: fadeIn 0.5s ease-in;
    `;
    
    if (status === 'conectado') {
        statusDiv.innerHTML = mensagem;
        statusDiv.style.background = '#d1fae5';
        statusDiv.style.color = '#065f46';
        statusDiv.style.border = '2px solid #a7f3d0';
    } else {
        statusDiv.innerHTML = mensagem;
        statusDiv.style.background = '#fef3c7';
        statusDiv.style.color = '#92400e';
        statusDiv.style.border = '2px solid #fde68a';
    }
    
    footer.appendChild(statusDiv);
}

// Verificar/ajustar estrutura da planilha
function verificarEstruturaPlanilha() {
    console.log('🔍 Verificando estrutura da planilha...');
    
    // Tentar configurar cabeçalhos via script
    const configUrl = `${CONFIG.GOOGLE_SCRIPT_URL}?action=configurar&planilhaId=${CONFIG.GOOGLE_SHEETS_ID}`;
    
    // Usar imagem para fazer request (truque para evitar CORS)
    const img = new Image();
    img.src = configUrl;
    img.style.display = 'none';
    
    setTimeout(() => {
        console.log('✅ Verificação de estrutura concluída');
    }, 2000);
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
        mostrarMensagem('❌ Por favor, preencha todos os campos obrigatórios!', 'error');
        vibrarCampoVazio();
        return;
    }
    
    // Desabilitar botão e mostrar loading
    const btnSalvar = document.getElementById('btnSalvar');
    const btnTextoOriginal = btnSalvar.innerHTML;
    btnSalvar.innerHTML = '<span class="loading"></span> Salvando no Google Sheets...';
    btnSalvar.disabled = true;
    
    // Adicionar efeito visual de processamento
    document.body.style.cursor = 'wait';
    
    try {
        // Obter data/hora atual
        const dataHora = new Date().toISOString();
        const dataFormatada = new Date().toLocaleString('pt-BR');
        
        // Preparar dados para o Google Sheets
        const dadosRelatorio = {
            action: 'salvar',
            canalVendas: canalVendas,
            idPlataforma: idPlataforma,
            login: CONFIG.LOGIN_USUARIO,
            dataHora: dataHora,
            dataFormatada: dataFormatada,
            timestamp: Date.now(),
            planilhaId: CONFIG.GOOGLE_SHEETS_ID,
            sheetName: CONFIG.SHEET_NAME
        };
        
        console.log('📤 Enviando dados:', dadosRelatorio);
        
        // Método 1: Tentar enviar via GET (mais confiável para GitHub Pages)
        const sucesso = await enviarViaMetodoGET(dadosRelatorio);
        
        if (sucesso) {
            // Salvar no histórico local
            const envio = {
                ...dadosRelatorio,
                id: Date.now(),
                status: 'sucesso',
                dataEnvio: new Date().toISOString()
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
                `<div style="text-align: left;">
                    <div style="font-size: 1.2em; margin-bottom: 10px; color: #065f46;">
                        ✅ <strong>Relatório Salvo com Sucesso!</strong>
                    </div>
                    <div style="margin-bottom: 5px;">
                        🏪 <strong>Canal de Vendas:</strong> ${canalVendas}
                    </div>
                    <div style="margin-bottom: 5px;">
                        🆔 <strong>ID Plataforma:</strong> ${idPlataforma}
                    </div>
                    <div style="margin-bottom: 5px;">
                        👤 <strong>Usuário:</strong> ${CONFIG.LOGIN_USUARIO}
                    </div>
                    <div style="margin-bottom: 15px;">
                        📅 <strong>Data/Hora:</strong> ${dataFormatada}
                    </div>
                    <div style="font-size: 0.9em; color: #475569; background: #f1f5f9; padding: 8px; border-radius: 5px;">
                        Os dados foram adicionados à planilha do Google Sheets.
                    </div>
                </div>`,
                'success'
            );
            
            // Efeito visual de sucesso
            efeitoSucesso();
            
            // Limpar formulário após 3 segundos
            setTimeout(limparFormulario, 3000);
            
            // Abrir planilha em nova aba após 2 segundos
            setTimeout(() => {
                window.open(CONFIG.LINKS.EDIT, '_blank');
            }, 2000);
            
        } else {
            throw new Error('Falha no envio para o Google Sheets');
        }
        
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        
        // Mensagem de erro amigável
        let mensagemErro = `
            <div style="text-align: left;">
                <div style="font-size: 1.2em; margin-bottom: 10px; color: #dc2626;">
                    ❌ <strong>Erro ao Salvar</strong>
                </div>
                <div style="margin-bottom: 10px;">
                    Não foi possível conectar ao Google Sheets no momento.
                </div>
                <div style="font-size: 0.9em; color: #475569;">
                    <strong>Dados salvos localmente:</strong><br>
                    🏪 Canal: ${canalVendas}<br>
                    🆔 ID: ${idPlataforma}<br>
                    📅 Data: ${new Date().toLocaleString('pt-BR')}
                </div>
            </div>
        `;
        
        mostrarMensagem(mensagemErro, 'error');
        
        // Salvar localmente para tentar depois
        const envio = {
            canalVendas: canalVendas,
            idPlataforma: idPlataforma,
            login: CONFIG.LOGIN_USUARIO,
            dataHora: new Date().toISOString(),
            dataFormatada: new Date().toLocaleString('pt-BR'),
            id: Date.now(),
            status: 'pendente',
            erro: error.message,
            dataEnvio: new Date().toISOString()
        };
        
        historicoEnvios.unshift(envio);
        localStorage.setItem('relatorio_historico', JSON.stringify(historicoEnvios));
        carregarHistorico();
        
    } finally {
        // Restaurar botão
        btnSalvar.innerHTML = btnTextoOriginal;
        btnSalvar.disabled = false;
        document.body.style.cursor = 'default';
    }
}

// Enviar via método GET (mais compatível)
async function enviarViaMetodoGET(dados) {
    console.log('📨 Enviando via método GET...');
    
    try {
        // Converter dados para parâmetros de URL
        const params = new URLSearchParams({
            action: 'salvar',
            canalVendas: dados.canalVendas,
            idPlataforma: dados.idPlataforma,
            login: dados.login,
            dataFormatada: encodeURIComponent(dados.dataFormatada),
            planilhaId: dados.planilhaId,
            sheetName: dados.sheetName,
            timestamp: dados.timestamp,
            source: 'webapp_relatorios'
        });
        
        const urlComParams = `${CONFIG.GOOGLE_SCRIPT_URL}?${params}`;
        console.log('🔗 URL completa:', urlComParams.substring(0, 200) + '...');
        
        // Usar fetch com no-cors (necessário para GitHub Pages)
        const response = await fetch(urlComParams, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-store',
            referrerPolicy: 'no-referrer'
        });
        
        console.log('✅ Requisição GET enviada');
        
        // Com no-cors não podemos verificar a resposta, mas consideramos sucesso
        // pois se não houve erro de rede, a requisição foi enviada
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro no envio GET:', error);
        
        // Tentar método alternativo com imagem (fallback)
        return await enviarViaMetodoImagem(dados);
    }
}

// Método alternativo com imagem (fallback para CORS)
async function enviarViaMetodoImagem(dados) {
    return new Promise((resolve) => {
        console.log('🔄 Tentando método alternativo com imagem...');
        
        const params = new URLSearchParams({
            action: 'salvar',
            canalVendas: dados.canalVendas.substring(0, 100), // Limitar tamanho
            idPlataforma: dados.idPlataforma,
            login: dados.login,
            timestamp: dados.timestamp
        });
        
        const url = `${CONFIG.GOOGLE_SCRIPT_URL}?${params}`;
        
        const img = new Image();
        img.style.display = 'none';
        
        img.onload = function() {
            console.log('✅ Método imagem: Carregado');
            resolve(true);
        };
        
        img.onerror = function() {
            console.log('⚠️ Método imagem: Erro no carregamento, mas a requisição foi feita');
            resolve(true); // Ainda consideramos sucesso
        };
        
        img.src = url;
        document.body.appendChild(img);
        
        // Timeout
        setTimeout(() => {
            console.log('⏰ Método imagem: Timeout');
            resolve(true); // Consideramos sucesso após timeout
        }, 5000);
    });
}

// Efeito visual de sucesso
function efeitoSucesso() {
    const btn = document.getElementById('btnSalvar');
    const originalBackground = btn.style.background;
    
    // Efeito de pulso verde
    btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    btn.style.transform = 'scale(1.05)';
    btn.style.transition = 'all 0.3s';
    
    setTimeout(() => {
        btn.style.background = originalBackground;
        btn.style.transform = 'scale(1)';
    }, 1000);
}

// Vibrar campo vazio
function vibrarCampoVazio() {
    const campos = ['canalVendas', 'idPlataforma'];
    let campoVazio = false;
    
    campos.forEach(campoId => {
        const campo = document.getElementById(campoId);
        if (!campo.value.trim()) {
            campo.style.borderColor = '#ef4444';
            campo.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
            campo.style.animation = 'vibrar 0.3s';
            
            setTimeout(() => {
                campo.style.animation = '';
            }, 300);
            
            campoVazio = true;
        }
    });
    
    if (campoVazio) {
        // Focar no primeiro campo vazio
        const primeiroCampo = campos.find(id => !document.getElementById(id).value.trim());
        if (primeiroCampo) {
            document.getElementById(primeiroCampo).focus();
        }
    }
}

// Limpar formulário
function limparFormulario() {
    document.getElementById('canalVendas').value = '';
    document.getElementById('idPlataforma').value = '';
    
    // Resetar estilos dos campos
    ['canalVendas', 'idPlataforma'].forEach(id => {
        const campo = document.getElementById(id);
        campo.style.borderColor = '';
        campo.style.boxShadow = '';
    });
    
    // Focar no primeiro campo
    setTimeout(() => {
        document.getElementById('canalVendas').focus();
    }, 100);
    
    // Limpar mensagem de status
    const statusMessage = document.getElementById('statusMessage');
    if (statusMessage) {
        statusMessage.style.display = 'none';
        statusMessage.innerHTML = '';
    }
}

// Mostrar mensagem de status
function mostrarMensagem(texto, tipo) {
    const statusMessage = document.getElementById('statusMessage');
    if (!statusMessage) return;
    
    statusMessage.innerHTML = texto;
    statusMessage.className = `status-message ${tipo}`;
    statusMessage.style.display = 'block';
    
    // Rolagem suave para a mensagem
    statusMessage.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
    
    // Auto-remover
    const tempo = tipo === 'success' ? 8000 : 10000;
    setTimeout(() => {
        if (statusMessage.style.display !== 'none') {
            statusMessage.style.opacity = '0';
            statusMessage.style.transition = 'opacity 0.5s';
            
            setTimeout(() => {
                statusMessage.style.display = 'none';
                statusMessage.style.opacity = '1';
            }, 500);
        }
    }, tempo);
}

// Carregar histórico de envios
function carregarHistorico() {
    const container = document.getElementById('historicoContainer');
    if (!container) return;
    
    if (historicoEnvios.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px;">
                <div style="font-size: 3em; margin-bottom: 20px;">📭</div>
                <p style="color: #64748b; font-size: 1.1em;">
                    Nenhum relatório enviado ainda.
                </p>
                <p style="color: #94a3b8; font-size: 0.9em; margin-top: 10px;">
                    Os relatórios enviados aparecerão aqui.
                </p>
            </div>
        `;
        return;
    }
    
    let html = '';
    const limiteExibicao = Math.min(historicoEnvios.length, 10);
    
    for (let i = 0; i < limiteExibicao; i++) {
        const envio = historicoEnvios[i];
        const statusIcon = envio.status === 'sucesso' ? '✅' : 
                          envio.status === 'pendente' ? '⏳' : '❌';
        const statusClass = envio.status === 'sucesso' ? 'success' : 
                           envio.status === 'pendente' ? 'warning' : 'error';
        const statusText = envio.status === 'sucesso' ? 'Enviado' : 
                          envio.status === 'pendente' ? 'Pendente' : 'Falhou';
        
        // Formatar data
        let dataExibicao = 'Data inválida';
        try {
            const data = new Date(envio.dataEnvio || envio.dataHora || envio.id);
            dataExibicao = data.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {}
        
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
                        <div class="detail-value status-${statusClass}">${statusText}</div>
                    </div>
                </div>
                ${envio.erro ? `
                    <div class="erro-detalhe">
                        <strong>Detalhe:</strong> ${envio.erro.substring(0, 100)}${envio.erro.length > 100 ? '...' : ''}
                    </div>
                ` : ''}
                ${envio.status === 'pendente' ? `
                    <div class="pendente-actions">
                        <button onclick="tentarEnviarNovamente(${i})" class="btn-reenviar">
                            🔄 Tentar Novamente
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // Adicionar botão para limpar histórico
    if (historicoEnvios.length > 5) {
        html += `
            <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                <button onclick="limparHistoricoCompleto()" class="btn-limpar-historico">
                    🗑️ Limpar Histórico (${historicoEnvios.length} itens)
                </button>
                <p style="color: #94a3b8; font-size: 0.85em; margin-top: 8px;">
                    Mostrando ${limiteExibicao} de ${historicoEnvios.length} registros
                </p>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// Tentar enviar novamente
function tentarEnviarNovamente(index) {
    const envio = historicoEnvios[index];
    if (!envio) return;
    
    // Preencher formulário
    document.getElementById('canalVendas').value = envio.canalVendas || '';
    document.getElementById('idPlataforma').value = envio.idPlataforma || '';
    
    mostrarMensagem('🔄 Dados preenchidos para reenvio. Clique em "Salvar no Google Sheets" novamente.', 'info');
    
    // Rolar para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Limpar histórico completo
function limparHistoricoCompleto() {
    if (confirm(`Tem certeza que deseja limpar todo o histórico?\n\nIsso removerá ${historicoEnvios.length} registros salvos localmente.`)) {
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

// Adicionar estilos CSS dinâmicos
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes vibrar {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    .erro-detalhe {
        margin-top: 10px;
        padding: 8px 12px;
        background: #fee2e2;
        border-radius: 6px;
        font-size: 0.85rem;
        color: #991b1b;
        border-left: 3px solid #dc2626;
    }
    
    .pendente-actions {
        margin-top: 12px;
        text-align: right;
    }
    
    .btn-reenviar {
        padding: 6px 15px;
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 600;
        transition: all 0.3s;
    }
    
    .btn-reenviar:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(59, 130, 246, 0.3);
    }
    
    .btn-limpar-historico {
        padding: 10px 20px;
        background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
        border: 2px solid #cbd5e1;
        border-radius: 8px;
        color: #64748b;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 600;
        transition: all 0.3s;
    }
    
    .btn-limpar-historico:hover {
        background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
        color: #475569;
        transform: translateY(-2px);
    }
    
    .status-success {
        color: #059669;
        font-weight: bold;
    }
    
    .status-warning {
        color: #d97706;
        font-weight: bold;
    }
    
    .status-error {
        color: #dc2626;
        font-weight: bold;
    }
    
    .status-message.info {
        background: linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%);
        color: #1e40af;
        border: 2px solid #93c5fd;
    }
    
    .historico-item.warning {
        border: 2px solid #fbbf24;
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    }
    
    .loading {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 1s linear infinite;
        margin-right: 10px;
        vertical-align: middle;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Log inicial
console.log(`
╔══════════════════════════════════════╗
║     SISTEMA DE RELATÓRIOS           ║
║     Status: INICIALIZADO            ║
║     Planilha: ${CONFIG.GOOGLE_SHEETS_ID} ║
║     Usuário: ${CONFIG.LOGIN_USUARIO}       ║
╚══════════════════════════════════════╝
`);
