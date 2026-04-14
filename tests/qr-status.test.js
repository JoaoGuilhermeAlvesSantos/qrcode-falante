'use strict';

const assert = require('assert');
const { normalizeQrId, verificarStatusQr } = require('../qr-status.js');

const baseDadosFake = [
  { id: 'carro', pt: 'Carro', en: 'Car' },
  { id: 'gato', pt: 'Gato', en: 'Cat' }
];

function runTests() {
  assert.strictEqual(normalizeQrId('  Carro  '), 'carro', 'normalizacao deve limpar e lowercase');

  const statusOk = verificarStatusQr('CARRO', baseDadosFake);
  assert.strictEqual(statusOk.ok, true, 'deve marcar QR valido como ok');
  assert.strictEqual(statusOk.id, 'carro', 'id normalizado deve ser carro');
  assert.ok(statusOk.item, 'item encontrado nao pode ser nulo');

  const statusFail = verificarStatusQr('inexistente', baseDadosFake);
  assert.strictEqual(statusFail.ok, false, 'deve marcar QR invalido como fail');
  assert.strictEqual(statusFail.id, 'inexistente', 'id deve refletir entrada normalizada');
  assert.strictEqual(statusFail.item, null, 'item deve ser nulo para QR invalido');

  const statusVazio = verificarStatusQr('   ', baseDadosFake);
  assert.strictEqual(statusVazio.ok, false, 'entrada vazia deve falhar');

  console.log('Teste de QR status: OK (4 cenarios validados).');
}

runTests();
