// ============================================
// CONFIGURAÇÕES
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
    console.log('✅ Sistema de Relatórios carregado');
    
    // Configurar evento do Enter
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            if (e.target.id === 'canalVendas' || e.target.id === 'idPlataforma') {
                e.preventDefault();
                salvarRelatorio();
            }
        }
    });
    
    // Focar no primeiro campo
    setTimeout(() => {
        document.getElementById('canalVendas').focus();
    }, 100);
});

// ============================================
// SALVAR RELATÓRIO
// ============================================
async function salvarRelatorio() {
    // Obter valores
    const canalVendas = document.getElementById('canalVendas').value.trim();
    const idPlataforma = document.getElementById('idPlataforma').value.trim();
    
    // VALIDAÇÃO
    if (!canalVendas || !idPlataforma) {
        mostrarMensagem('❌ Por favor, preencha todos os campos!', 'error');
        return;
    }
    
    // BOTÃO LOADING
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
        
        // ENVIAR PARA GOOGLE SHEETS
        const sucesso = await enviarParaGoogleSheets(dados);
        
        if (sucesso) {
            // SUCESSO
            mostrarMensagem(`
                <div style="font-size: 0.95em;">
                    <div style="color: #059669; font-weight: 600; margin-bottom: 8px;">
                        ✅ Relatório salvo com sucesso!
                    </div>
                    <div style="color: #475569;">
                        <div>🏪 <strong>Canal:</strong> ${canalVendas}</div>
                        <div>🆔 <strong>ID:</strong> ${idPlataforma}</div>
                        <div style="margin-top: 5px; font-size: 0.9em; color: #64748b;">
                            Dados salvos na planilha do Google Sheets
                        </div>
                    </div>
                </div>
            `, 'success');
            
            // EFEITO DE SUCESSO
            efeitoSucesso();
            
            // LIMPAR APÓS 3 SEGUNDOS
            setTimeout(limparFormulario, 3000);
            
        } else {
            throw new Error('Falha no envio');
        }
        
    } catch (error) {
        console.error('Erro:', error);
        
        // ERRO
        mostrarMensagem(`
            <div style="font-size: 0.95em;">
                <div style="color: #dc2626; font-weight: 600; margin-bottom: 8px;">
                    ❌ Erro ao salvar
                </div>
                <div style="color: #475569;">
                    Não foi possível conectar ao Google Sheets.
                    Tente novamente em alguns instantes.
                </div>
            </div>
        `, 'error');
        
    } finally {
        // RESTAURAR BOTÃO
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

// ============================================
// ENVIAR PARA GOOGLE SHEETS
// ============================================
async function enviarParaGoogleSheets(dados) {
    try {
        // USAR GET (simples)
        const params = new URLSearchParams();
        params.append('canalVendas', dados.canalVendas);
        params.append('idPlataforma', dados.idPlataforma);
        params.append('login', dados.login);
        params.append('dataFormatada', dados.dataFormatada);
        
        const url = `${CONFIG.GOOGLE_SCRIPT_URL}?${params}`;
        
        // Enviar com fetch (no-cors para GitHub Pages)
        await fetch(url, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-store'
        });
        
        return true;
        
    } catch (error) {
        console.error('Erro no envio:', error);
        return false;
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// MOSTRAR MENSAGEM
function mostrarMensagem(texto, tipo) {
    const div = document.getElementById('statusMessage');
    if (!div) return;
    
    div.innerHTML = texto;
    div.className = `status-message ${tipo}`;
    div.style.display = 'block';
    
    // AUTO-ESCONDER
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
    
    // FOCAR NO PRIMEIRO CAMPO
    setTimeout(() => {
        document.getElementById('canalVendas').focus();
    }, 100);
}

// ============================================
// LIMPAR (BOTÃO)
// ============================================
function limparFormulario() {
    document.getElementById('canalVendas').value = '';
    document.getElementById('idPlataforma').value = '';
    
    // ESCONDER MENSAGEM
    const msg = document.getElementById('statusMessage');
    if (msg) {
        msg.style.display = 'none';
    }
    
    // FOCAR NO PRIMEIRO CAMPO
    setTimeout(() => {
        document.getElementById('canalVendas').focus();
    }, 100);
}
