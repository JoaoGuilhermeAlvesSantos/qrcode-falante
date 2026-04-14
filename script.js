'use strict';

let baseDados = [];
let scannerAtivo = false;
let html5QrcodeScanner = null;
let ultimoIdLido = null;
let ultimoTempoLeitura = 0;
const INTERVALO_MINIMO_MS = 3000;

// 1. Carregar dados
fetch('./data.json')
  .then(response => response.json())
  .then(data => {
    baseDados = data;
    console.log(`Base de dados carregada: ${baseDados.length} itens.`);
    preencherListaItens();
  })
  .catch(err => {
    console.error('Erro ao carregar data.json:', err);
    mostrarMensagem('Erro ao carregar base de dados.', 'erro');
  });

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
    `<div class="item-tag">
      <strong>${item.pt}</strong>
      ${item.en}
      <span class="item-id">${item.id}</span>
    </div>`
  ).join('');
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

  const achado = baseDados.find(i => i.id === decodedText.trim().toLowerCase());
  if (achado) {
    mostrarItem(achado);
    falar(achado);
  } else {
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

// 7. Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registrado:', reg.scope))
      .catch(err => console.error('Erro ao registrar Service Worker:', err));
  });
}

// 8. Inicialização da UI
document.addEventListener('DOMContentLoaded', () => {
  const btnIniciar = document.getElementById('btn-iniciar');
  const btnParar = document.getElementById('btn-parar');

  if (btnIniciar) btnIniciar.addEventListener('click', iniciarScanner);
  if (btnParar) btnParar.addEventListener('click', pararScanner);

  mostrarMensagem('Pressione "Iniciar Scanner" para começar.', '');
});
