#!/usr/bin/env python3
"""Kodlayicinin ciktisini iki bagimsiz olcutle dogrular:

1) YAPISAL (sert kosul): sabit versiyon + maske 0 ile uretilen matris, ISO
   spesifikasyonuna gore dogrulanmis referans `qrcode` kutuphanesinin ayni
   parametrelerle urettigi matrisle BIREBIR (diff=0) ayni olmali. 40 versiyon
   x 4 ECC = 160 konfigurasyonun tamami.

2) ISLEVSEL (yumusak kosul): otomatik-maske ciktisi opencv ile cozulup geri
   okunmali. opencv'nin QR dedektoru yuksek versiyonlarda (>~v25) guvenilmez
   oldugu icin islevsel kontrol v1-25 ile sinirlidir; yapisal kontrol zaten
   tum versiyonlari kapsar.

Herhangi bir yapisal uyusmazlikta cikis kodu != 0 (CI bunu hata sayar).
"""
import json, sys, os
import numpy as np
import cv2
import qrcode

LEVELS = {'L': qrcode.constants.ERROR_CORRECT_L,
          'M': qrcode.constants.ERROR_CORRECT_M,
          'Q': qrcode.constants.ERROR_CORRECT_Q,
          'H': qrcode.constants.ERROR_CORRECT_H}

HERE = os.path.dirname(__file__)
data = json.load(open(os.path.join(HERE, 'matrices.json')))
det = cv2.QRCodeDetector()


def reference(text, ver, ecl, mask):
    qr = qrcode.QRCode(version=ver, error_correction=LEVELS[ecl],
                       box_size=1, border=0, mask_pattern=mask)
    qr.add_data(text, optimize=0)
    qr.make(fit=False)
    return np.array([[1 if v else 0 for v in row] for row in qr.get_matrix()], int)


def decode(mods, text):
    mods = np.array(mods, np.uint8)
    n = mods.shape[0]
    for q, s in [(8, 8), (12, 6), (16, 6), (10, 10)]:
        big = np.ones((n + 2 * q, n + 2 * q), np.uint8) * 255
        big[q:q + n, q:q + n] = np.where(mods == 1, 0, 255)
        img = cv2.resize(big, ((n + 2 * q) * s, (n + 2 * q) * s),
                         interpolation=cv2.INTER_NEAREST)
        try:
            if det.detectAndDecode(img)[0] == text:
                return True
        except cv2.error:
            pass
    return False


struct_fail = 0
func_checked = func_ok = 0
for o in data:
    ref = reference(o['text'], o['ver'], o['ecl'], 0)
    mine = np.array(o['fixed'], int)
    if ref.shape != mine.shape or int((ref != mine).sum()) != 0:
        struct_fail += 1
        d = 'shape' if ref.shape != mine.shape else int((ref != mine).sum())
        print(f"  YAPISAL HATA v{o['ver']} {o['ecl']}: diff={d}")
    if o['ver'] <= 25:                      # opencv guvenilir araligi
        func_checked += 1
        if decode(o['auto'], o['text']):
            func_ok += 1
        else:
            print(f"  uyari: opencv cozemedi v{o['autoVer']} {o['ecl']} (encoder degil, dedektor sinirinda olabilir)")

print(f"\nYAPISAL: {len(data) - struct_fail}/{len(data)} referansla bit-identical")
print(f"ISLEVSEL: {func_ok}/{func_checked} opencv ile okundu (v<=25)")

if struct_fail:
    print(f"\nBASARISIZ: {struct_fail} yapisal uyusmazlik")
    sys.exit(1)
print("\nGECTI: tum versiyonlar referansla birebir ayni")
