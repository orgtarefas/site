// ============================================
// CONFIGURAÇÕES
// ============================================
const CONFIG = {
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzMXiybH9m-VJx7zk0pGcZnoL4mjyHxBdo-TCYwR263QycHXR6dp6b4QGErf/exec',
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
        
        // ENVIAR E OBTER RESPOSTA (usando JSONP para ler a resposta)
        const resposta = await enviarEVerificarDuplicado(dados);
        
        if (resposta.success) {
            if (resposta.acao === 'atualizado') {
                // SE JÁ EXISTIA - ATUALIZADO
                mostrarMensagem(`
                    <div style="font-size: 0.95em;">
                        <div style="color: #f59e0b; font-weight: 600; margin-bottom: 8px;">
                            ⚠️ Registro atualizado
                        </div>
                        <div style="color: #475569;">
                            <div>🏪 <strong>Canal:</strong> ${canalVendas}</div>
                            <div>🆔 <strong>ID:</strong> ${idPlataforma}</div>
                            <div style="margin-top: 5px; font-size: 0.9em; color: #64748b;">
                                Este registro já existia. Data de atualização foi modificada.
                            </div>
                        </div>
                    </div>
                `, 'warning');
                
                // EFEITO DIFERENTE PARA ATUALIZAÇÃO
                efeitoAtualizacao();
                
            } else {
                // SE É NOVO - CRIADO
                mostrarMensagem(`
                    <div style="font-size: 0.95em;">
                        <div style="color: #059669; font-weight: 600; margin-bottom: 8px;">
                            ✅ Novo registro criado!
                        </div>
                        <div style="color: #475569;">
                            <div>🏪 <strong>Canal:</strong> ${canalVendas}</div>
                            <div>🆔 <strong>ID:</strong> ${idPlataforma}</div>
                            <div style="margin-top: 5px; font-size: 0.9em; color: #64748b;">
                                Novo registro adicionado à planilha.
                            </div>
                        </div>
                    </div>
                `, 'success');
                
                // EFEITO DE SUCESSO
                efeitoSucesso();
            }
            
            // LIMPAR APÓS 3 SEGUNDOS
            setTimeout(limparFormulario, 3000);
            
        } else {
            throw new Error(resposta.message || 'Falha no envio');
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
                    ${error.message || 'Não foi possível conectar ao Google Sheets.'}
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
// ENVIAR E VERIFICAR DUPLICADO
// ============================================
function enviarEVerificarDuplicado(dados) {
    return new Promise((resolve) => {
        // Criar callback único para receber resposta
        const callbackName = 'callback_' + Date.now();
        
        // Função que será chamada pelo JSONP
        window[callbackName] = function(resposta) {
            console.log('📨 Resposta recebida:', resposta);
            delete window[callbackName];
            document.body.removeChild(script);
            resolve(resposta);
        };
        
        // Construir URL com callback
        const params = new URLSearchParams();
        params.append('canalVendas', dados.canalVendas);
        params.append('idPlataforma', dados.idPlataforma);
        params.append('login', dados.login);
        params.append('dataFormatada', dados.dataFormatada);
        params.append('callback', callbackName);
        
        const url = `${CONFIG.GOOGLE_SCRIPT_URL}?${params}`;
        console.log('🔗 Enviando para:', url.substring(0, 100) + '...');
        
        // Criar script para JSONP
        const script = document.createElement('script');
        script.src = url;
        
        // Tratar erro
        script.onerror = () => {
            console.error('❌ Erro no carregamento do script');
            delete window[callbackName];
            document.body.removeChild(script);
            resolve({
                success: false,
                message: 'Erro de conexão'
            });
        };
        
        document.body.appendChild(script);
        
        // Timeout após 10 segundos
        setTimeout(() => {
            if (window[callbackName]) {
                console.warn('⏰ Timeout na requisição');
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                resolve({
                    success: false,
                    message: 'Timeout - tente novamente'
                });
            }
        }, 10000);
    });
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
    
    // Adicionar classe para warning
    if (tipo === 'warning') {
        div.style.background = '#fef3c7';
        div.style.color = '#92400e';
        div.style.border = '2px solid #fde68a';
    }
    
    // AUTO-ESCONDER
    const tempo = 5000;
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

// EFEITO DE SUCESSO (novo registro)
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

// EFEITO DE ATUALIZAÇÃO (registro existente)
function efeitoAtualizacao() {
    const btn = document.getElementById('btnSalvar');
    if (!btn) return;
    
    const originalBackground = btn.style.background;
    
    btn.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
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

// ============================================
// ADICIONAR ESTILO PARA WARNING
// ============================================
const estiloWarning = document.createElement('style');
estiloWarning.textContent = `
    .status-message.warning {
        background: #fef3c7 !important;
        color: #92400e !important;
        border: 2px solid #fde68a !important;
    }
    
    .loading {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 8px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(estiloWarning);
