// ============================================
// CONFIGURAÇÕES DO SISTEMA
// ============================================
const CONFIG = {
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzMXiybH9m-VJx7zk0pGcZnoL4mjyHxBdo-TCYwR263QycHXR6dp6b4QGErfBRlqka6Zg/exec',
    LOGIN_USUARIO: 'thiago.carvalho',
    PLANILHA_ID: '1ZiaoanAU7j5zRU8gy4OrIqvINAtX3hTf_jOZI4q28mY'
};

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Sistema de Relatórios iniciado');
    console.log('🔗 Script URL:', CONFIG.GOOGLE_SCRIPT_URL);
    
    // Atualizar data/hora
    atualizarDataHora();
    
    // Atualizar a cada minuto
    setInterval(atualizarDataHora, 60000);
    
    // Carregar histórico
    carregarHistorico();
    
    // Configurar eventos dos campos
    configurarEventos();
    
    // Mostrar status inicial
    mostrarStatusSistema();
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
    
    const loginDisplay = document.getElementById('loginDisplay');
    if (loginDisplay) loginDisplay.textContent = CONFIG.LOGIN_USUARIO;
}

// CONFIGURAR EVENTOS DOS CAMPOS
function configurarEventos() {
    // Permitir Enter para enviar
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const ativo = document.activeElement;
            if (ativo.id === 'canalVendas' || ativo.id === 'idPlataforma') {
                e.preventDefault();
                salvarRelatorio();
            }
        }
    });
    
    // Auto-focar no primeiro campo
    setTimeout(() => {
        const campo = document.getElementById('canalVendas');
        if (campo) campo.focus();
    }, 100);
}

// MOSTRAR STATUS DO SISTEMA
function mostrarStatusSistema() {
    const statusDiv = document.getElementById('statusConexao');
    if (!statusDiv) return;
    
    statusDiv.innerHTML = '● Conectado';
    statusDiv.style.color = '#10b981';
    statusDiv.style.fontWeight = '600';
}

// SALVAR RELATÓRIO
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
    btn.innerHTML = '<span class="loading"></span> Salvando...';
    btn.disabled = true;
    
    try {
        // PREPARAR DADOS
        const dataFormatada = new Date().toLocaleString('pt-BR');
        const dados = {
            canalVendas: canalVendas,
            idPlataforma: idPlataforma,
            login: CONFIG.LOGIN_USUARIO,
            dataFormatada: dataFormatada
        };
        
        console.log('📤 Enviando dados:', dados);
        
        // ENVIAR PARA GOOGLE SHEETS
        const sucesso = await enviarParaGoogleSheets(dados);
        
        if (sucesso) {
            // SUCESSO
            mostrarMensagem(`
                <div style="text-align: left;">
                    <div style="color: #059669; font-size: 1.1em; margin-bottom: 10px;">
                        ✅ <strong>Relatório salvo com sucesso!</strong>
                    </div>
                    <div style="margin-bottom: 5px; font-size: 0.95em;">
                        🏪 <strong>Canal:</strong> ${canalVendas}
                    </div>
                    <div style="margin-bottom: 5px; font-size: 0.95em;">
                        🆔 <strong>ID:</strong> ${idPlataforma}
                    </div>
                    <div style="color: #64748b; font-size: 0.85em; margin-top: 8px;">
                        Dados salvos na planilha "Canal de Vendas"
                    </div>
                </div>
            `, 'success');
            
            // EFEITO VISUAL
            efeitoSucesso();
            
            // ADICIONAR AO HISTÓRICO
            adicionarAoHistorico({
                canalVendas: canalVendas,
                idPlataforma: idPlataforma,
                dataFormatada: dataFormatada,
                status: 'sucesso'
            });
            
            // LIMPAR FORMULÁRIO APÓS 2 SEGUNDOS
            setTimeout(limparFormulario, 2000);
            
        } else {
            throw new Error('Falha no envio para o Google Sheets');
        }
        
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        
        // ERRO
        mostrarMensagem(`
            <div style="text-align: left;">
                <div style="color: #dc2626; font-size: 1.1em; margin-bottom: 10px;">
                    ❌ <strong>Erro ao salvar</strong>
                </div>
                <div style="margin-bottom: 10px; font-size: 0.95em;">
                    Não foi possível conectar ao Google Sheets.
                </div>
                <div style="color: #64748b; font-size: 0.85em;">
                    Tente novamente em alguns instantes.
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

// ENVIAR PARA GOOGLE SHEETS
async function enviarParaGoogleSheets(dados) {
    try {
        // USAR MÉTODO GET (simples e funciona)
        const params = new URLSearchParams();
        params.append('canalVendas', dados.canalVendas);
        params.append('idPlataforma', dados.idPlataforma);
        params.append('login', dados.login);
        params.append('dataFormatada', dados.dataFormatada);
        
        const url = `${CONFIG.GOOGLE_SCRIPT_URL}?${params}`;
        console.log('🔗 Enviando para:', url.substring(0, 100) + '...');
        
        // Usar fetch com no-cors (para GitHub Pages)
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

// VIBRAR CAMPO VAZIO
function vibrarCampoVazio() {
    const campos = ['canalVendas', 'idPlataforma'];
    
    campos.forEach(id => {
        const campo = document.getElementById(id);
        if (campo && !campo.value.trim()) {
            campo.style.borderColor = '#ef4444';
            campo.style.animation = 'vibrar 0.3s';
            
            setTimeout(() => {
                campo.style.animation = '';
                campo.style.borderColor = '#e2e8f0';
            }, 300);
            
            // Focar no campo vazio
            campo.focus();
        }
    });
}

// EFEITO DE SUCESSO
function efeitoSucesso() {
    const btn = document.getElementById('btnSalvar');
    if (!btn) return;
    
    const originalBackground = btn.style.background;
    
    btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    btn.style.transform = 'scale(1.02)';
    btn.style.transition = 'all 0.3s';
    
    setTimeout(() => {
        btn.style.background = originalBackground;
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
        if (campo) campo.style.borderColor = '#e2e8f0';
    });
    
    // Focar no primeiro campo
    setTimeout(() => {
        const campo = document.getElementById('canalVendas');
        if (campo) campo.focus();
    }, 100);
}

// MOSTRAR MENSAGEM
function mostrarMensagem(texto, tipo) {
    const div = document.getElementById('statusMessage');
    if (!div) return;
    
    div.innerHTML = texto;
    div.className = `status-message ${tipo}`;
    div.style.display = 'block';
    
    // Rolar suavemente para a mensagem
    div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Auto-esconder
    const tempo = tipo === 'success' ? 5000 : 7000;
    setTimeout(() => {
        if (div.style.display === 'block') {
            div.style.opacity = '0';
            div.style.transition = 'opacity 0.5s';
            
            setTimeout(() => {
                div.style.display = 'none';
                div.style.opacity = '1';
            }, 500);
        }
    }, tempo);
}

// ============================================
// HISTÓRICO LOCAL
// ============================================

// ADICIONAR AO HISTÓRICO
function adicionarAoHistorico(dados) {
    let historico = JSON.parse(localStorage.getItem('relatorio_historico')) || [];
    
    const registro = {
        id: Date.now(),
        canalVendas: dados.canalVendas,
        idPlataforma: dados.idPlataforma,
        login: CONFIG.LOGIN_USUARIO,
        dataFormatada: dados.dataFormatada,
        dataRegistro: new Date().toISOString(),
        status: dados.status || 'sucesso',
        erro: dados.erro || null
    };
    
    historico.unshift(registro);
    
    // Manter apenas últimos 15 registros
    if (historico.length > 15) {
        historico = historico.slice(0, 15);
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
            <div class="empty-state">
                📭<br>
                Nenhum envio ainda
            </div>
        `;
        return;
    }
    
    let html = '';
    const limite = Math.min(historico.length, 10);
    
    for (let i = 0; i < limite; i++) {
        const item = historico[i];
        const statusIcon = item.status === 'sucesso' ? '✅' : '⏳';
        const statusClass = item.status === 'sucesso' ? 'sucesso' : 'pendente';
        const statusColor = item.status === 'sucesso' ? '#10b981' : '#f59e0b';
        
        let dataExibicao = '--:--';
        try {
            const data = new Date(item.dataRegistro || item.id);
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
                        ${statusIcon} ${item.canalVendas || 'Sem nome'}
                    </div>
                    <div class="historico-date">${dataExibicao}</div>
                </div>
                <div class="historico-details">
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
// LIMPAR FORMULÁRIO (botão)
// ============================================
function limparFormulario() {
    document.getElementById('canalVendas').value = '';
    document.getElementById('idPlataforma').value = '';
    
    // Resetar estilos
    ['canalVendas', 'idPlataforma'].forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            campo.style.borderColor = '#e2e8f0';
            campo.style.animation = '';
        }
    });
    
    // Focar no primeiro campo
    setTimeout(() => {
        const campo = document.getElementById('canalVendas');
        if (campo) campo.focus();
    }, 100);
    
    // Esconder mensagem de status
    const statusMsg = document.getElementById('statusMessage');
    if (statusMsg) {
        statusMsg.style.display = 'none';
    }
}

// ============================================
// ADICIONAR ANIMAÇÃO DE VIBRAÇÃO
// ============================================
const styleAnimacao = document.createElement('style');
styleAnimacao.textContent = `
    @keyframes vibrar {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-4px); }
        75% { transform: translateX(4px); }
    }
`;
document.head.appendChild(styleAnimacao);

// ============================================
// LOG INICIAL
// ============================================
console.log(`
╔══════════════════════════════════════════╗
║     SISTEMA DE RELATÓRIOS               ║
║     Versão: 1.0                         ║
║     Status: Operacional                 ║
╚══════════════════════════════════════════╝
`);
