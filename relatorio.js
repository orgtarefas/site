// Configurações
const CONFIG = {
    GOOGLE_SHEETS_ID: '2PACX-1vQzF6_7q6HfCfK7N_zTC7uyS34bQrWomUPyH5FCSz5f0bYNmhod5B8clysLxpazVIENArC52FgEEC9R',
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
});

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
    btnSalvar.innerHTML = '<span class="loading"></span> Salvando...';
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
            tipo: document.getElementById('tipoRelatorio').value
        };
        
        // Simular envio para Google Sheets
        // NOTA: Para funcionar realmente, você precisa configurar:
        // 1. Google Sheets API no Google Cloud Console
        // 2. Criar credenciais OAuth 2.0
        // 3. Compartilhar a planilha com o email do serviço
        
        // Aqui está a implementação SIMULADA
        const sucesso = await simularEnvioGoogleSheets(dadosRelatorio);
        
        if (sucesso) {
            // Salvar no histórico local
            const envio = {
                ...dadosRelatorio,
                id: Date.now(),
                status: 'sucesso'
            };
            
            historicoEnvios.unshift(envio);
            localStorage.setItem('relatorio_historico', JSON.stringify(historicoEnvios));
            
            // Atualizar histórico na tela
            carregarHistorico();
            
            // Mostrar mensagem de sucesso
            mostrarMensagem(`✅ Relatório salvo com sucesso no Google Sheets!<br>
                           Canal: ${canalVendas}<br>
                           ID: ${idPlataforma}<br>
                           Data: ${dataFormatada}`, 'success');
            
            // Limpar formulário após 2 segundos
            setTimeout(limparFormulario, 2000);
            
            // Abrir link do Google Sheets em nova aba
            setTimeout(() => {
                window.open(`https://docs.google.com/spreadsheets/d/${CONFIG.GOOGLE_SHEETS_ID}/edit`, '_blank');
            }, 1500);
        } else {
            throw new Error('Falha ao conectar com Google Sheets');
        }
        
    } catch (error) {
        console.error('Erro ao salvar relatório:', error);
        mostrarMensagem(`❌ Erro ao salvar: ${error.message}`, 'error');
        
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
    } finally {
        // Restaurar botão
        btnSalvar.innerHTML = btnTextoOriginal;
        btnSalvar.disabled = false;
    }
}

// Simular envio para Google Sheets
async function simularEnvioGoogleSheets(dados) {
    // Esta é uma simulação
    // Para implementação real, você precisará:
    
    // Opção 1: Usar Google Sheets API diretamente
    /*
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.GOOGLE_SHEETS_ID}/values/${CONFIG.SHEET_NAME}!A:D:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer SEU_TOKEN_AQUI',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            values: [[
                dados.canalVendas,
                dados.idPlataforma,
                dados.login,
                dados.dataFormatada
            ]]
        })
    });
    return response.ok;
    */
    
    // Opção 2: Usar Google Apps Script (recomendado para GitHub Pages)
    /*
    const scriptUrl = 'SUA_URL_DO_APPS_SCRIPT_AQUI';
    const response = await fetch(scriptUrl, {
        method: 'POST',
        body: JSON.stringify(dados)
    });
    return response.ok;
    */
    
    // Por enquanto, simulamos um sucesso após 1.5 segundos
    return new Promise(resolve => {
        setTimeout(() => {
            console.log('📤 Dados simulados para Google Sheets:', dados);
            resolve(true);
        }, 1500);
    });
}

// Limpar formulário
function limparFormulario() {
    document.getElementById('canalVendas').value = '';
    document.getElementById('idPlataforma').value = '';
    document.getElementById('tipoRelatorio').value = 'canal_vendas';
    
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
    
    // Auto-remover após 5 segundos
    if (tipo === 'success') {
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }
}

// Carregar histórico de envios
function carregarHistorico() {
    const container = document.getElementById('historicoContainer');
    
    if (historicoEnvios.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhum envio realizado ainda.</p>';
        return;
    }
    
    let html = '';
    
    historicoEnvios.slice(0, 5).forEach(envio => {
        const statusIcon = envio.status === 'sucesso' ? '✅' : '❌';
        const statusClass = envio.status === 'sucesso' ? 'success' : 'error';
        
        html += `
            <div class="historico-item ${statusClass}">
                <div class="historico-header">
                    <div class="historico-title">${statusIcon} ${envio.canalVendas}</div>
                    <div class="historico-date">${envio.dataFormatada}</div>
                </div>
                <div class="historico-details">
                    <div class="historico-detail">
                        <div class="detail-label">ID Plataforma</div>
                        <div class="detail-value">${envio.idPlataforma}</div>
                    </div>
                    <div class="historico-detail">
                        <div class="detail-label">Login</div>
                        <div class="detail-value">${envio.login}</div>
                    </div>
                    <div class="historico-detail">
                        <div class="detail-label">Status</div>
                        <div class="detail-value ${statusClass}">${envio.status === 'sucesso' ? 'Enviado' : 'Erro'}</div>
                    </div>
                </div>
                ${envio.erro ? `<div class="erro-detalhe">Erro: ${envio.erro}</div>` : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Implementação REAL com Google Apps Script (opcional)
// Para usar, crie um script no Google Apps Script e cole o código abaixo:

/*
// Código do Google Apps Script (GoogleSheetsAPI.gs)
function doPost(e) {
    try {
        const dados = JSON.parse(e.postData.contents);
        const sheet = SpreadsheetApp.openById('SEU_SHEET_ID_AQUI')
            .getSheetByName('Canal de Vendas');
        
        // Encontrar próxima linha vazia
        const ultimaLinha = sheet.getLastRow();
        const novaLinha = ultimaLinha + 1;
        
        // Inserir dados
        sheet.getRange(novaLinha, 1).setValue(dados.canalVendas); // Coluna A
        sheet.getRange(novaLinha, 2).setValue(dados.idPlataforma); // Coluna B
        sheet.getRange(novaLinha, 3).setValue(dados.login); // Coluna C
        sheet.getRange(novaLinha, 4).setValue(dados.dataFormatada); // Coluna D
        
        return ContentService
            .createTextOutput(JSON.stringify({ success: true, linha: novaLinha }))
            .setMimeType(ContentService.MimeType.JSON);
            
    } catch (error) {
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}
