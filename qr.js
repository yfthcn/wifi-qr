/* =====================================================================
 * NOT: Bu, ISO/IEC 18004'e göre sıfırdan yazılmış referans
 * reimplementasyondur. Üretimde vendor/qrcodegen.js (Nayuki) kullanılır;
 * test/ bu reimplementasyonun referansla bit-identical olduğunu doğrular.
 * ---------------------------------------------------------------------
 * Sıfırdan QR kodlayıcı — saf JS, sıfır bağımlılık.
 * Byte (8-bit) mod, versiyon 1..10, ECC L/M/Q/H, otomatik versiyon seçimi,
 * 8 maskenin penaltı puanlamasıyla en iyisinin seçimi.
 * Tek public fonksiyon: qrEncode(text, eccLevel) -> { size, modules }
 *   modules: size x size  boolean matris (true = siyah)
 * ===================================================================== */
(function (root) {
  'use strict';

  // ---- GF(256) Reed-Solomon aritmetiği (primitif 0x11D) -------------
  var EXP = new Array(512), LOG = new Array(256);
  (function initGF() {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }
  // Üretici polinom (degree = ec codeword sayısı)
  function rsGenerator(degree) {
    var poly = [1];
    for (var d = 0; d < degree; d++) {
      var next = new Array(poly.length + 1).fill(0);
      for (var i = 0; i < poly.length; i++) {
        next[i] ^= poly[i];
        next[i + 1] ^= gfMul(poly[i], EXP[d]);
      }
      poly = next;
    }
    return poly;
  }
  function rsEncode(data, ecCount) {
    var gen = rsGenerator(ecCount);
    var res = new Array(data.length + ecCount).fill(0);
    for (var i = 0; i < data.length; i++) res[i] = data[i];
    for (var i = 0; i < data.length; i++) {
      var coef = res[i];
      if (coef !== 0) {
        for (var j = 0; j < gen.length; j++) {
          res[i + j] ^= gfMul(gen[j], coef);
        }
      }
    }
    return res.slice(data.length);
  }

  // ---- Versiyon/ECC tabloları (1..10) -------------------------------
  // Her giriş: [ecPerBlock, [ [blockCount, dataPerBlock], ... ] ]
  // Sıra: L, M, Q, H
  var EC_TABLE = {
    1:{L:[7,[[1,19]]],M:[10,[[1,16]]],Q:[13,[[1,13]]],H:[17,[[1,9]]]},
    2:{L:[10,[[1,34]]],M:[16,[[1,28]]],Q:[22,[[1,22]]],H:[28,[[1,16]]]},
    3:{L:[15,[[1,55]]],M:[26,[[1,44]]],Q:[18,[[2,17]]],H:[22,[[2,13]]]},
    4:{L:[20,[[1,80]]],M:[18,[[2,32]]],Q:[26,[[2,24]]],H:[16,[[4,9]]]},
    5:{L:[26,[[1,108]]],M:[24,[[2,43]]],Q:[18,[[2,15],[2,16]]],H:[22,[[2,11],[2,12]]]},
    6:{L:[18,[[2,68]]],M:[16,[[4,27]]],Q:[24,[[4,19]]],H:[28,[[4,15]]]},
    7:{L:[20,[[2,78]]],M:[18,[[4,31]]],Q:[18,[[2,14],[4,15]]],H:[26,[[4,13],[1,14]]]},
    8:{L:[24,[[2,97]]],M:[22,[[2,38],[2,39]]],Q:[22,[[4,18],[2,19]]],H:[26,[[4,14],[2,15]]]},
    9:{L:[30,[[2,116]]],M:[22,[[3,36],[2,37]]],Q:[20,[[4,16],[4,17]]],H:[24,[[4,12],[4,13]]]},
    10:{L:[18,[[2,68],[2,69]]],M:[26,[[4,43],[1,44]]],Q:[24,[[6,19],[2,20]]],H:[28,[[6,15],[2,16]]]},
    11:{L:[20,[[4,81]]],M:[30,[[1,50],[4,51]]],Q:[28,[[4,22],[4,23]]],H:[24,[[3,12],[8,13]]]},
    12:{L:[24,[[2,92],[2,93]]],M:[22,[[6,36],[2,37]]],Q:[26,[[4,20],[6,21]]],H:[28,[[7,14],[4,15]]]},
    13:{L:[26,[[4,107]]],M:[22,[[8,37],[1,38]]],Q:[24,[[8,20],[4,21]]],H:[22,[[12,11],[4,12]]]},
    14:{L:[30,[[3,115],[1,116]]],M:[24,[[4,40],[5,41]]],Q:[20,[[11,16],[5,17]]],H:[24,[[11,12],[5,13]]]},
    15:{L:[22,[[5,87],[1,88]]],M:[24,[[5,41],[5,42]]],Q:[30,[[5,24],[7,25]]],H:[24,[[11,12],[7,13]]]},
    16:{L:[24,[[5,98],[1,99]]],M:[28,[[7,45],[3,46]]],Q:[24,[[15,19],[2,20]]],H:[30,[[3,15],[13,16]]]},
    17:{L:[28,[[1,107],[5,108]]],M:[28,[[10,46],[1,47]]],Q:[28,[[1,22],[15,23]]],H:[28,[[2,14],[17,15]]]},
    18:{L:[30,[[5,120],[1,121]]],M:[26,[[9,43],[4,44]]],Q:[28,[[17,22],[1,23]]],H:[28,[[2,14],[19,15]]]},
    19:{L:[28,[[3,113],[4,114]]],M:[26,[[3,44],[11,45]]],Q:[26,[[17,21],[4,22]]],H:[26,[[9,13],[16,14]]]},
    20:{L:[28,[[3,107],[5,108]]],M:[26,[[3,41],[13,42]]],Q:[30,[[15,24],[5,25]]],H:[28,[[15,15],[10,16]]]},
    21:{L:[28,[[4,116],[4,117]]],M:[26,[[17,42]]],Q:[28,[[17,22],[6,23]]],H:[30,[[19,16],[6,17]]]},
    22:{L:[28,[[2,111],[7,112]]],M:[28,[[17,46]]],Q:[30,[[7,24],[16,25]]],H:[24,[[34,13]]]},
    23:{L:[30,[[4,121],[5,122]]],M:[28,[[4,47],[14,48]]],Q:[30,[[11,24],[14,25]]],H:[30,[[16,15],[14,16]]]},
    24:{L:[30,[[6,117],[4,118]]],M:[28,[[6,45],[14,46]]],Q:[30,[[11,24],[16,25]]],H:[30,[[30,16],[2,17]]]},
    25:{L:[26,[[8,106],[4,107]]],M:[28,[[8,47],[13,48]]],Q:[30,[[7,24],[22,25]]],H:[30,[[22,15],[13,16]]]},
    26:{L:[28,[[10,114],[2,115]]],M:[28,[[19,46],[4,47]]],Q:[28,[[28,22],[6,23]]],H:[30,[[33,16],[4,17]]]},
    27:{L:[30,[[8,122],[4,123]]],M:[28,[[22,45],[3,46]]],Q:[30,[[8,23],[26,24]]],H:[30,[[12,15],[28,16]]]},
    28:{L:[30,[[3,117],[10,118]]],M:[28,[[3,45],[23,46]]],Q:[30,[[4,24],[31,25]]],H:[30,[[11,15],[31,16]]]},
    29:{L:[30,[[7,116],[7,117]]],M:[28,[[21,45],[7,46]]],Q:[30,[[1,23],[37,24]]],H:[30,[[19,15],[26,16]]]},
    30:{L:[30,[[5,115],[10,116]]],M:[28,[[19,47],[10,48]]],Q:[30,[[15,24],[25,25]]],H:[30,[[23,15],[25,16]]]},
    31:{L:[30,[[13,115],[3,116]]],M:[28,[[2,46],[29,47]]],Q:[30,[[42,24],[1,25]]],H:[30,[[23,15],[28,16]]]},
    32:{L:[30,[[17,115]]],M:[28,[[10,46],[23,47]]],Q:[30,[[10,24],[35,25]]],H:[30,[[19,15],[35,16]]]},
    33:{L:[30,[[17,115],[1,116]]],M:[28,[[14,46],[21,47]]],Q:[30,[[29,24],[19,25]]],H:[30,[[11,15],[46,16]]]},
    34:{L:[30,[[13,115],[6,116]]],M:[28,[[14,46],[23,47]]],Q:[30,[[44,24],[7,25]]],H:[30,[[59,16],[1,17]]]},
    35:{L:[30,[[12,121],[7,122]]],M:[28,[[12,47],[26,48]]],Q:[30,[[39,24],[14,25]]],H:[30,[[22,15],[41,16]]]},
    36:{L:[30,[[6,121],[14,122]]],M:[28,[[6,47],[34,48]]],Q:[30,[[46,24],[10,25]]],H:[30,[[2,15],[64,16]]]},
    37:{L:[30,[[17,122],[4,123]]],M:[28,[[29,46],[14,47]]],Q:[30,[[49,24],[10,25]]],H:[30,[[24,15],[46,16]]]},
    38:{L:[30,[[4,122],[18,123]]],M:[28,[[13,46],[32,47]]],Q:[30,[[48,24],[14,25]]],H:[30,[[42,15],[32,16]]]},
    39:{L:[30,[[20,117],[4,118]]],M:[28,[[40,47],[7,48]]],Q:[30,[[43,24],[22,25]]],H:[30,[[10,15],[67,16]]]},
    40:{L:[30,[[19,118],[6,119]]],M:[28,[[18,47],[31,48]]],Q:[30,[[34,24],[34,25]]],H:[30,[[20,15],[61,16]]]}
  };

  // Hizalama: alignPositions(ver)

  // Hizalama deseni merkez koordinatları — tüm 40 versiyon için formülle üretilir
  // (Nayuki referans algoritması)
  function alignPositions(ver) {
    if (ver === 1) return [];
    var size = ver * 4 + 17;
    var numAlign = Math.floor(ver / 7) + 2;
    var step = (ver === 32) ? 26 : Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
    var result = [6];
    for (var pos = size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
    return result;
  }

  function totalDataCodewords(ver, ecl) {
    var spec = EC_TABLE[ver][ecl];
    var total = 0;
    spec[1].forEach(function (g) { total += g[0] * g[1]; });
    return total;
  }

  // Byte modunda karakter sayısı göstergesi: v1-9 = 8 bit, v10-26 = 16 bit
  function charCountBits(ver) { return ver <= 9 ? 8 : 16; }

  // ---- Bit buffer ---------------------------------------------------
  function BitBuffer() { this.bits = []; }
  BitBuffer.prototype.put = function (val, len) {
    for (var i = len - 1; i >= 0; i--) this.bits.push((val >>> i) & 1);
  };
  BitBuffer.prototype.length = function () { return this.bits.length; };

  // ---- Veri kodlama -------------------------------------------------
  function utf8Bytes(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) { out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f)); }
      else if (c >= 0xd800 && c <= 0xdbff) {
        var hi = c, lo = str.charCodeAt(++i);
        var cp = 0x10000 + ((hi - 0xd800) << 10) + (lo - 0xdc00);
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f),
                 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
      } else { out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f)); }
    }
    return out;
  }

  function pickVersion(byteLen, ecl) {
    for (var ver = 1; ver <= 40; ver++) {
      var capBits = totalDataCodewords(ver, ecl) * 8;
      var needed = 4 + charCountBits(ver) + byteLen * 8;
      if (needed <= capBits) return ver;
    }
    throw new Error('Veri çok uzun (v40 / ' + ecl + ' kapasitesi aşıldı). Daha düşük ECC seç veya metni kısalt.');
  }

  function buildDataCodewords(bytes, ver, ecl) {
    var bb = new BitBuffer();
    bb.put(0b0100, 4);                 // byte mode göstergesi
    bb.put(bytes.length, charCountBits(ver));
    for (var i = 0; i < bytes.length; i++) bb.put(bytes[i], 8);

    var capBits = totalDataCodewords(ver, ecl) * 8;
    var term = Math.min(4, capBits - bb.length());
    bb.put(0, term);                   // terminator
    while (bb.length() % 8 !== 0) bb.bits.push(0); // byte hizalama

    var codewords = [];
    for (var k = 0; k < bb.bits.length; k += 8) {
      var v = 0;
      for (var b = 0; b < 8; b++) v = (v << 1) | bb.bits[k + b];
      codewords.push(v);
    }
    var pads = [0xec, 0x11], pi = 0;
    while (codewords.length < totalDataCodewords(ver, ecl)) {
      codewords.push(pads[pi++ % 2]);
    }
    return codewords;
  }

  // Blok bölme + EC + interleave
  function interleave(dataCw, ver, ecl) {
    var spec = EC_TABLE[ver][ecl];
    var ecPerBlock = spec[0];
    var blocks = [];
    var idx = 0;
    spec[1].forEach(function (g) {
      for (var n = 0; n < g[0]; n++) {
        var data = dataCw.slice(idx, idx + g[1]);
        idx += g[1];
        blocks.push({ data: data, ec: rsEncode(data, ecPerBlock) });
      }
    });
    var result = [];
    var maxData = 0;
    blocks.forEach(function (b) { if (b.data.length > maxData) maxData = b.data.length; });
    for (var c = 0; c < maxData; c++)
      blocks.forEach(function (b) { if (c < b.data.length) result.push(b.data[c]); });
    for (var c = 0; c < ecPerBlock; c++)
      blocks.forEach(function (b) { result.push(b.ec[c]); });
    return result;
  }

  // ---- Matris yerleşimi ---------------------------------------------
  function buildMatrix(ver) {
    var size = ver * 4 + 17;
    var m = [];
    var reserved = [];
    for (var r = 0; r < size; r++) {
      m.push(new Array(size).fill(null));
      reserved.push(new Array(size).fill(false));
    }
    function setF(r, c, val) { m[r][c] = val; reserved[r][c] = true; }

    // Finder + separator
    function finder(r0, c0) {
      for (var r = -1; r <= 7; r++) for (var c = -1; c <= 7; c++) {
        var rr = r0 + r, cc = c0 + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        var inRing = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                     (c >= 0 && c <= 6 && (r === 0 || r === 6));
        var inCore = (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        setF(rr, cc, inRing || inCore);
      }
    }
    finder(0, 0); finder(0, size - 7); finder(size - 7, 0);

    // Timing
    for (var i = 8; i < size - 8; i++) {
      setF(6, i, i % 2 === 0);
      setF(i, 6, i % 2 === 0);
    }

    // Hizalama desenleri: tüm koordinat kombinasyonları,
    // sadece finder köşelerine denk gelen 3 tanesi hariç
    var centers = alignPositions(ver);
    var lastC = centers.length - 1;
    for (var a = 0; a < centers.length; a++) for (var b = 0; b < centers.length; b++) {
      if ((a === 0 && b === 0) || (a === 0 && b === lastC) || (a === lastC && b === 0)) continue;
      var cr = centers[a], cc = centers[b];
      for (var dr = -2; dr <= 2; dr++) for (var dc = -2; dc <= 2; dc++) {
        var rr = cr + dr, ccx = cc + dc;
        var ring = Math.max(Math.abs(dr), Math.abs(dc));
        setF(rr, ccx, ring !== 1);
      }
    }

    // Karanlık modül
    setF(size - 8, 8, true);

    // Format bilgisi alanlarını rezerve et (değer sonra)
    for (var i = 0; i <= 8; i++) {
      if (i !== 6) { reserved[8][i] = true; reserved[i][8] = true; }
    }
    for (var i = 0; i < 8; i++) {
      reserved[8][size - 1 - i] = true;
      reserved[size - 1 - i][8] = true;
    }

    // Versiyon bilgisi (v7+) rezerve
    if (ver >= 7) {
      for (var i = 0; i < 6; i++) for (var j = 0; j < 3; j++) {
        reserved[i][size - 11 + j] = true;
        reserved[size - 11 + j][i] = true;
      }
    }

    return { m: m, reserved: reserved, size: size };
  }

  function placeData(ctx, finalCw) {
    var m = ctx.m, reserved = ctx.reserved, size = ctx.size;
    var bits = [];
    for (var i = 0; i < finalCw.length; i++)
      for (var b = 7; b >= 0; b--) bits.push((finalCw[i] >> b) & 1);

    var bitIdx = 0;
    var dir = -1; // yukarı
    for (var col = size - 1; col > 0; col -= 2) {
      if (col === 6) col--; // timing sütununu atla
      for (var n = 0; n < size; n++) {
        var row = dir < 0 ? size - 1 - n : n;
        for (var k = 0; k < 2; k++) {
          var c = col - k;
          if (!reserved[row][c]) {
            var v = bitIdx < bits.length ? bits[bitIdx++] : 0;
            m[row][c] = v === 1;
          }
        }
      }
      dir = -dir;
    }
  }

  // ---- Maskeleme ----------------------------------------------------
  function maskFn(id) {
    switch (id) {
      case 0: return function (r, c) { return (r + c) % 2 === 0; };
      case 1: return function (r, c) { return r % 2 === 0; };
      case 2: return function (r, c) { return c % 3 === 0; };
      case 3: return function (r, c) { return (r + c) % 3 === 0; };
      case 4: return function (r, c) { return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; };
      case 5: return function (r, c) { return ((r * c) % 2) + ((r * c) % 3) === 0; };
      case 6: return function (r, c) { return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0; };
      case 7: return function (r, c) { return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0; };
    }
  }

  var ECL_BITS = { L: 1, M: 0, Q: 3, H: 2 }; // format için
  function formatBits(ecl, maskId) {
    var data = (ECL_BITS[ecl] << 3) | maskId; // 5 bit
    var rem = data << 10;
    var gen = 0b10100110111;
    for (var i = 14; i >= 10; i--) {
      if ((rem >> i) & 1) rem ^= gen << (i - 10);
    }
    var bits = ((data << 10) | rem) ^ 0b101010000010010;
    return bits & 0x7fff; // 15 bit
  }

  function versionBits(ver) {
    var rem = ver << 12;
    var gen = 0b1111100100101;
    for (var i = 17; i >= 12; i--) {
      if ((rem >> i) & 1) rem ^= gen << (i - 12);
    }
    return ((ver << 12) | rem) & 0x3ffff; // 18 bit
  }

  function applyFormat(ctx, ecl, maskId) {
    var m = ctx.m, size = ctx.size;
    var fmt = formatBits(ecl, maskId); // 15 bit, bit0 = LSB
    // Kopya 1 (sol-üst finder etrafı), bit0..bit14 sırasıyla
    var copy1 = [[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[7,8],[8,8],
                 [8,7],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0]];
    for (var i = 0; i < 15; i++) {
      var bit = ((fmt >> i) & 1) === 1;
      m[copy1[i][0]][copy1[i][1]] = bit;
    }
    // Kopya 2 (sağ-üst yatay + sol-alt dikey)
    for (var i = 0; i < 15; i++) {
      var bit = ((fmt >> i) & 1) === 1;
      if (i < 8) m[8][size - 1 - i] = bit;
      else m[size - 15 + i][8] = bit;
    }
    m[size - 8][8] = true; // karanlık modül garanti
  }

  function applyVersion(ctx, ver) {
    if (ver < 7) return;
    var m = ctx.m, size = ctx.size;
    var vb = versionBits(ver);
    for (var i = 0; i < 18; i++) {
      var bit = ((vb >> i) & 1) === 1;
      var r = Math.floor(i / 3), c = i % 3;
      m[r][size - 11 + c] = bit;
      m[size - 11 + c][r] = bit;
    }
  }

  // ---- Penaltı puanlama (en iyi maske seçimi) -----------------------
  function penalty(m) {
    var size = m.length, score = 0;
    // Kural 1: ardışık aynı renk
    function runScore(getter) {
      var s = 0;
      for (var a = 0; a < size; a++) {
        var run = 1, prev = getter(a, 0);
        for (var b = 1; b < size; b++) {
          var cur = getter(a, b);
          if (cur === prev) { run++; }
          else { if (run >= 5) s += run - 2; run = 1; prev = cur; }
        }
        if (run >= 5) s += run - 2;
      }
      return s;
    }
    score += runScore(function (r, c) { return m[r][c]; });
    score += runScore(function (c, r) { return m[r][c]; });
    // Kural 2: 2x2 bloklar
    for (var r = 0; r < size - 1; r++) for (var c = 0; c < size - 1; c++) {
      var v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
    }
    // Kural 3: finder-benzeri desen 1011101 (+0000)
    var pat1 = [1,0,1,1,1,0,1,0,0,0,0], pat2 = [0,0,0,0,1,0,1,1,1,0,1];
    function lineHas(getLine) {
      var s = 0;
      for (var a = 0; a < size; a++) {
        for (var b = 0; b <= size - 11; b++) {
          var ok1 = true, ok2 = true;
          for (var k = 0; k < 11; k++) {
            var val = getLine(a, b + k) ? 1 : 0;
            if (val !== pat1[k]) ok1 = false;
            if (val !== pat2[k]) ok2 = false;
          }
          if (ok1) s += 40;
          if (ok2) s += 40;
        }
      }
      return s;
    }
    score += lineHas(function (r, c) { return m[r][c]; });
    score += lineHas(function (c, r) { return m[r][c]; });
    // Kural 4: koyu modül oranı
    var dark = 0;
    for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (m[r][c]) dark++;
    var pct = (dark * 100) / (size * size);
    var prev5 = Math.floor(pct / 5) * 5, next5 = prev5 + 5;
    score += Math.min(Math.abs(prev5 - 50), Math.abs(next5 - 50)) / 5 * 10;
    return score;
  }

  // ---- Ana fonksiyon ------------------------------------------------
  function qrEncode(text, ecl, forceMask, forceVer) {
    ecl = ecl || 'M';
    var bytes = utf8Bytes(text);
    var ver = forceVer || pickVersion(bytes.length, ecl);
    var dataCw = buildDataCodewords(bytes, ver, ecl);
    var finalCw = interleave(dataCw, ver, ecl);

    var best = null, bestScore = Infinity;
    var mStart = forceMask != null ? forceMask : 0;
    var mEnd = forceMask != null ? forceMask + 1 : 8;
    for (var mask = mStart; mask < mEnd; mask++) {
      var ctx = buildMatrix(ver);
      placeData(ctx, finalCw);
      // maskele (sadece veri/rezerve olmayan)
      var fn = maskFn(mask);
      for (var r = 0; r < ctx.size; r++) for (var c = 0; c < ctx.size; c++) {
        if (!ctx.reserved[r][c] && fn(r, c)) ctx.m[r][c] = !ctx.m[r][c];
      }
      applyFormat(ctx, ecl, mask);
      applyVersion(ctx, ver);
      var sc = penalty(ctx.m);
      if (sc < bestScore) { bestScore = sc; best = ctx; }
    }
    return { size: best.size, modules: best.m, version: ver, ecl: ecl };
  }

  root.qrEncode = qrEncode;
})(typeof module !== 'undefined' && module.exports ? module.exports : (this.QR = this.QR || {}));
