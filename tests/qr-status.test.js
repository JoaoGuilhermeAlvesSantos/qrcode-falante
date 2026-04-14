'use strict';

const assert = require('assert');
const { normalizeQrId, verificarStatusQr } = require('../qr-status.js');

const baseDadosFake = [
  { id: 'carro', pt: 'Carro', en: 'Car' },
  { id: 'agua', pt: 'Agua', en: 'Water' },
  { id: 'gato', pt: 'Gato', en: 'Cat' }
];

function runTests() {
  assert.strictEqual(normalizeQrId('  Carro  '), 'carro', 'normalizacao deve limpar e lowercase');

  const statusOk = verificarStatusQr('CARRO', baseDadosFake);
  assert.strictEqual(statusOk.ok, true, 'deve marcar QR valido como ok');
  assert.strictEqual(statusOk.id, 'carro', 'id normalizado deve ser carro');
  assert.ok(statusOk.item, 'item encontrado nao pode ser nulo');
  assert.strictEqual(statusOk.strategy, 'exact', 'CARRO deveria casar como exact');

  const statusPt = verificarStatusQr('Água', baseDadosFake);
  assert.strictEqual(statusPt.ok, true, 'deve aceitar nome PT com acento');
  assert.strictEqual(statusPt.item.id, 'agua', 'nome PT deveria resolver para agua');

  const statusFuzzy = verificarStatusQr('carroo', baseDadosFake);
  assert.strictEqual(statusFuzzy.ok, true, 'deve tolerar pequeno erro de digitacao');
  assert.strictEqual(statusFuzzy.item.id, 'carro', 'fuzzy deveria resolver para carro');

  const statusFail = verificarStatusQr('inexistente', baseDadosFake);
  assert.strictEqual(statusFail.ok, false, 'deve marcar QR invalido como fail');
  assert.strictEqual(statusFail.id, 'inexistente', 'id deve refletir entrada normalizada');
  assert.strictEqual(statusFail.item, null, 'item deve ser nulo para QR invalido');

  const statusVazio = verificarStatusQr('   ', baseDadosFake);
  assert.strictEqual(statusVazio.ok, false, 'entrada vazia deve falhar');

  console.log('Teste de QR status: OK (6 cenarios validados).');
}

runTests();
