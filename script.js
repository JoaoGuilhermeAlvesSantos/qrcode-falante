'use strict';

let baseDados = [];
let scannerAtivo = false;
let html5QrcodeScanner = null;
let ultimoIdLido = null;
let ultimoTempoLeitura = 0;
const INTERVALO_MINIMO_MS = 3000;
const BASE_DADOS_FALLBACK = [
  { id: 'carro', pt: 'Carro', en: 'Car' },
  { id: 'cadeira', pt: 'Cadeira', en: 'Chair' },
  { id: 'mesa', pt: 'Mesa', en: 'Table' },
  { id: 'casa', pt: 'Casa', en: 'House' },
  { id: 'agua', pt: 'Agua', en: 'Water' },
  { id: 'comida', pt: 'Comida', en: 'Food' },
  { id: 'escola', pt: 'Escola', en: 'School' },
  { id: 'livro', pt: 'Livro', en: 'Book' },
  { id: 'cachorro', pt: 'Cachorro', en: 'Dog' },
  { id: 'gato', pt: 'Gato', en: 'Cat' },
  { id: 'banheiro', pt: 'Banheiro', en: 'Bathroom' },
  { id: 'cama', pt: 'Cama', en: 'Bed' },
  { id: 'janela', pt: 'Janela', en: 'Window' },
  { id: 'porta', pt: 'Porta', en: 'Door' },
  { id: 'telefone', pt: 'Telefone', en: 'Phone' }
];

function verificarStatusQr(decodedText) {
  if (window.QrStatusUtils && typeof window.QrStatusUtils.verificarStatusQr === 'function') {
    return window.QrStatusUtils.verificarStatusQr(decodedText, baseDados);
  }

  const id = String(decodedText || '').trim().toLowerCase();
  const item = baseDados.find(i => i.id === id);
  return {
    ok: Boolean(item),
    id,
    item: item || null,
    message: item
      ? `QR funcionando para id "${id}".`
      : `QR nao encontrado para id "${id || '(vazio)'}".`
  };
}

// 1. Carregar dados
function carregarBaseDados() {
  if (window.location.protocol === 'file:') {
    baseDados = BASE_DADOS_FALLBACK;
    console.log(`Base de dados local carregada: ${baseDados.length} itens.`);
    preencherListaItens();
    return;
  }

  fetch('./data.json')
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(data => {
      baseDados = data;
      console.log(`Base de dados carregada: ${baseDados.length} itens.`);
      preencherListaItens();
    })
    .catch(err => {
      console.error('Erro ao carregar data.json, usando base local:', err);
      baseDados = BASE_DADOS_FALLBACK;
      preencherListaItens();
      mostrarMensagem('Usando base local de itens.', '');
    });
}

carregarBaseDados();

// 2. Função de Voz
function falar(item) {
  // Cancelar qualquer fala em andamento
  window.speechSynthesis.cancel();

  const vozes = window.speechSynthesis.getVoices();

  function escolherVoz(lang) {
    // Prioridade: Google > Microsoft > qualquer voz do idioma
    const preferidas = vozes.filter(v =>
      v.lang.startsWith(lang) && (v.name.includes('Google') || v.name.includes('Microsoft'))
    );
    if (preferidas.length > 0) return preferidas[0];
    const qualquer = vozes.filter(v => v.lang.startsWith(lang));
    return qualquer.length > 0 ? qualquer[0] : null;
  }

  const msgPt = new SpeechSynthesisUtterance(item.pt);
  msgPt.lang = 'pt-BR';
  msgPt.rate = 0.9;
  const vozPt = escolherVoz('pt');
  if (vozPt) msgPt.voice = vozPt;

  const msgEn = new SpeechSynthesisUtterance(item.en);
  msgEn.lang = 'en-US';
  msgEn.rate = 0.9;
  const vozEn = escolherVoz('en');
  if (vozEn) msgEn.voice = vozEn;

  window.speechSynthesis.speak(msgPt);

  // Pequena pausa natural entre os idiomas
  msgPt.onend = () => {
    setTimeout(() => window.speechSynthesis.speak(msgEn), 500);
  };
}

// 3. Preencher lista de itens na UI
function preencherListaItens() {
  const lista = document.getElementById('lista-itens');
  if (!lista) return;
  lista.innerHTML = baseDados.map(item =>
    `<div class="item-card">
      <div class="item-info">
        <strong>${item.pt}</strong>
        <span class="item-en">${item.en}</span>
        <span class="item-id">${item.id}</span>
      </div>
      <div class="item-actions">
        <button class="item-action-btn item-action-play" type="button" data-item-id="${item.id}" data-action="play" aria-label="Ouvir ${item.pt}">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <button class="item-action-btn item-action-download" type="button" data-item-id="${item.id}" data-action="download" aria-label="Baixar QR Code de ${item.pt}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 3v11" />
            <path d="M8 10l4 4 4-4" />
            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
        </button>
      </div>
    </div>`
  ).join('');
}

function tocarItem(item) {
  console.log(`[QR STATUS] OK: preview de audio para "${item.id}".`);
  mostrarItem(item);
  falar(item);
}

function baixarQrCode(item) {
  if (!window.QRCode) {
    console.error('[QR STATUS] FAIL: biblioteca de QR Code indisponivel.');
    mostrarMensagem('Biblioteca de QR Code não carregou.', 'erro');
    return;
  }

  const temp = document.createElement('div');
  temp.style.position = 'fixed';
  temp.style.left = '-9999px';
  temp.style.top = '-9999px';
  document.body.appendChild(temp);

  try {
    new QRCode(temp, {
      text: item.id,
      width: 512,
      height: 512,
      correctLevel: QRCode.CorrectLevel.M
    });

    const canvas = temp.querySelector('canvas');
    const image = temp.querySelector('img');
    const dataUrl = canvas ? canvas.toDataURL('image/png') : (image ? image.src : null);

    if (!dataUrl) {
      throw new Error('Não foi possível gerar imagem do QR Code.');
    }

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `qrcode-${item.id}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    console.log(`[QR STATUS] OK: QR baixado para id "${item.id}".`);
    mostrarMensagem(`QR Code de ${item.pt} baixado.`, '');
  } catch (err) {
    console.error(`[QR STATUS] FAIL: erro ao gerar QR para id "${item.id}".`, err);
    console.error('Erro ao gerar QR Code:', err);
    mostrarMensagem(`Erro ao gerar QR Code de ${item.pt}.`, 'erro');
  } finally {
    temp.remove();
  }
}

// 4. Mostrar mensagem na UI
function mostrarMensagem(texto, tipo) {
  const el = document.getElementById('resultado');
  if (!el) return;
  el.textContent = texto;
  el.className = 'resultado ' + (tipo || '');
}

function mostrarItem(item) {
  const el = document.getElementById('resultado');
  if (!el) return;
  el.innerHTML =
    `<span class="resultado-pt">${item.pt}</span>` +
    `<span class="resultado-en">${item.en}</span>`;
  el.className = 'resultado encontrado';
}

// 5. Callback do Scanner
function onScanSuccess(decodedText) {
  const agora = Date.now();
  // Evitar disparar múltiplas vezes para o mesmo código em sequência
  if (decodedText === ultimoIdLido && agora - ultimoTempoLeitura < INTERVALO_MINIMO_MS) {
    return;
  }
  ultimoIdLido = decodedText;
  ultimoTempoLeitura = agora;

  const status = verificarStatusQr(decodedText);
  if (status.ok) {
    console.log(`[QR STATUS] OK: ${status.message}`);
    mostrarItem(status.item);
    falar(status.item);
  } else {
    console.warn(`[QR STATUS] FAIL: ${status.message}`);
    mostrarMensagem(`Código não encontrado: "${decodedText}"`, 'nao-encontrado');
  }
}

function onScanError(errorMessage) {
  // Silenciar erros de frame (são frequentes e esperados)
}

// 6. Controle do Scanner
function iniciarScanner() {
  const btnIniciar = document.getElementById('btn-iniciar');
  const btnParar = document.getElementById('btn-parar');
  const leitorEl = document.getElementById('leitor');

  if (html5QrcodeScanner) {
    html5QrcodeScanner.clear().catch(err => console.warn('Erro ao limpar scanner anterior:', err));
    html5QrcodeScanner = null;
  }

  html5QrcodeScanner = new Html5Qrcode('leitor');

  const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0
  };

  html5QrcodeScanner.start(
    { facingMode: 'environment' },
    config,
    onScanSuccess,
    onScanError
  ).then(() => {
    scannerAtivo = true;
    btnIniciar.style.display = 'none';
    btnParar.style.display = 'inline-flex';
    leitorEl.classList.add('ativo');
    mostrarMensagem('Aponte a câmera para um QR Code.', '');
  }).catch(err => {
    console.error('Erro ao iniciar câmera:', err);
    mostrarMensagem('Não foi possível acessar a câmera. Verifique as permissões.', 'erro');
  });
}

function pararScanner() {
  const btnIniciar = document.getElementById('btn-iniciar');
  const btnParar = document.getElementById('btn-parar');
  const leitorEl = document.getElementById('leitor');

  if (html5QrcodeScanner && scannerAtivo) {
    html5QrcodeScanner.stop().then(() => {
      html5QrcodeScanner.clear();
      html5QrcodeScanner = null;
      scannerAtivo = false;
      btnIniciar.style.display = 'inline-flex';
      btnParar.style.display = 'none';
      leitorEl.classList.remove('ativo');
      mostrarMensagem('Scanner parado.', '');
    }).catch(err => {
      console.error('Erro ao parar câmera:', err);
    });
  }
}

// 7. Registrar Service Worker para PWA (somente em origem suportada)
const ORIGEM_SUPORTA_SW =
  window.location.protocol === 'https:' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

if ('serviceWorker' in navigator && ORIGEM_SUPORTA_SW) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registrado:', reg.scope))
      .catch(err => console.error('Erro ao registrar Service Worker:', err));
  });
} else {
  console.info('Service Worker desativado para esta origem.');
}

// 8. Inicialização da UI
document.addEventListener('DOMContentLoaded', () => {
  const btnIniciar = document.getElementById('btn-iniciar');
  const btnParar = document.getElementById('btn-parar');
  const listaItens = document.getElementById('lista-itens');

  if (btnIniciar) btnIniciar.addEventListener('click', iniciarScanner);
  if (btnParar) btnParar.addEventListener('click', pararScanner);
  if (listaItens) {
    listaItens.addEventListener('click', event => {
      const botao = event.target.closest('button[data-item-id][data-action]');
      if (!botao) return;

      const item = baseDados.find(i => i.id === botao.dataset.itemId);
      if (item) {
        if (botao.dataset.action === 'play') {
          tocarItem(item);
        } else {
          console.log(`[QR STATUS] OK: item valido para download "${item.id}".`);
          baixarQrCode(item);
        }
      } else {
        console.warn(`[QR STATUS] FAIL: item invalido para download "${botao.dataset.itemId}".`);
      }
    });
  }

  mostrarMensagem('Pressione "Iniciar Scanner" para começar.', '');
});
