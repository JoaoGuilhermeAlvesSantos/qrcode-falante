(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.QrStatusUtils = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeQrId(rawValue) {
    return String(rawValue || '').trim().toLowerCase();
  }

  function verificarStatusQr(decodedText, baseDados) {
    const id = normalizeQrId(decodedText);
    const lista = Array.isArray(baseDados) ? baseDados : [];
    const item = lista.find(function (entry) {
      return entry && entry.id === id;
    });

    return {
      ok: Boolean(item),
      id: id,
      item: item || null,
      message: item
        ? 'QR funcionando para id "' + id + '".'
        : 'QR nao encontrado para id "' + (id || '(vazio)') + '".'
    };
  }

  return {
    normalizeQrId: normalizeQrId,
    verificarStatusQr: verificarStatusQr
  };
}));