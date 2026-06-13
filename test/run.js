#!/usr/bin/env node
/* specs.json'daki her konfigurasyonu kendi kodlayicimizla kodlar.
 * - Yapisal dogrulama icin: versiyon ve maske 0 sabitlenir (referansla
 *   birebir karsilastirilabilsin diye).
 * - Islevsel dogrulama icin: otomatik versiyon + otomatik maske ile de kodlar.
 * Cikti: matrices.json
 */
const fs = require('fs');
const path = require('path');
const { qrEncode } = require(path.join(__dirname, '..', 'qr.js'));

const specs = JSON.parse(fs.readFileSync(path.join(__dirname, 'specs.json')));
const out = specs.map(s => {
  const fixed = qrEncode(s.text, s.ecl, 0, s.ver); // forceMask=0, forceVer=ver
  const auto = qrEncode(s.text, s.ecl);            // gercek app davranisi
  const grid = m => m.map(row => row.map(v => (v ? 1 : 0)));
  return {
    ver: s.ver, ecl: s.ecl, text: s.text,
    fixed: grid(fixed.modules),
    auto: grid(auto.modules),
    autoVer: auto.version, autoMask: auto.ecl
  };
});
fs.writeFileSync(path.join(__dirname, 'matrices.json'), JSON.stringify(out));
console.log(`matrices.json yazildi: ${out.length} konfigurasyon kodlandi`);
