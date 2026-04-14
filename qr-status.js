(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.QrStatusUtils = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeText(rawValue) {
    return String(rawValue || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  }

  function normalizeQrId(rawValue) {
    return normalizeText(rawValue);
  }

  function getItemKeys(entry) {
    if (!entry) return [];
    return [entry.id, entry.pt, entry.en]
      .map(normalizeText)
      .filter(Boolean);
  }

  function getDistanceLimit(text) {
    if (text.length <= 4) return 1;
    if (text.length <= 8) return 2;
    return 3;
  }

  function levenshteinDistance(left, right) {
    var rows = left.length + 1;
    var cols = right.length + 1;
    var matrix = new Array(rows);

    for (var row = 0; row < rows; row += 1) {
      matrix[row] = new Array(cols);
      matrix[row][0] = row;
    }

    for (var col = 0; col < cols; col += 1) {
      matrix[0][col] = col;
    }

    for (var i = 1; i < rows; i += 1) {
      for (var j = 1; j < cols; j += 1) {
        var cost = left[i - 1] === right[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[left.length][right.length];
  }

  function resolveItem(decodedText, baseDados) {
    var input = normalizeText(decodedText);
    var lista = Array.isArray(baseDados) ? baseDados : [];
    var bestMatch = null;
    var bestDistance = Infinity;

    if (!input) {
      return {
        item: null,
        id: input,
        strategy: 'empty'
      };
    }

    for (var index = 0; index < lista.length; index += 1) {
      var entry = lista[index];
      var keys = getItemKeys(entry);

      for (var keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
        var key = keys[keyIndex];

        if (key === input) {
          return {
            item: entry,
            id: input,
            strategy: 'exact'
          };
        }

        if (input.length >= 3 && (key.indexOf(input) !== -1 || input.indexOf(key) !== -1)) {
          return {
            item: entry,
            id: input,
            strategy: 'partial'
          };
        }

        var distance = levenshteinDistance(input, key);
        var limit = Math.max(getDistanceLimit(input), getDistanceLimit(key));
        if (distance <= limit && distance < bestDistance) {
          bestDistance = distance;
          bestMatch = entry;
        }
      }
    }

    if (bestMatch) {
      return {
        item: bestMatch,
        id: input,
        strategy: 'fuzzy'
      };
    }

    return {
      item: null,
      id: input,
      strategy: 'none'
    };
  }

  function verificarStatusQr(decodedText, baseDados) {
    var resolution = resolveItem(decodedText, baseDados);
    var item = resolution.item;
    var id = resolution.id;

    return {
      ok: Boolean(item),
      id: id,
      item: item || null,
      strategy: resolution.strategy,
      message: item
        ? 'QR funcionando para entrada "' + id + '" via ' + resolution.strategy + '.'
        : 'QR nao encontrado para id "' + (id || '(vazio)') + '".'
    };
  }

  return {
    normalizeText: normalizeText,
    normalizeQrId: normalizeQrId,
    resolveItem: resolveItem,
    verificarStatusQr: verificarStatusQr
  };
}));