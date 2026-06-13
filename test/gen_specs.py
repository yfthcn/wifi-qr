#!/usr/bin/env python3
"""Tum 40 versiyon x 4 ECC seviyesi icin test girdileri uretir.
Kapasite, referans `qrcode` kutuphanesinin kendi RS-blok tablosundan hesaplanir,
boylece her versiyonu tam kapasitede zorlariz. Cikti: specs.json
"""
import json, random, string
import qrcode
from qrcode.base import rs_blocks

LEVELS = {'L': qrcode.constants.ERROR_CORRECT_L,
          'M': qrcode.constants.ERROR_CORRECT_M,
          'Q': qrcode.constants.ERROR_CORRECT_Q,
          'H': qrcode.constants.ERROR_CORRECT_H}

def cc_bits(ver):           # byte modu karakter sayisi gostergesi
    return 8 if ver <= 9 else 16

def data_codewords(ver, ecl):
    return sum(b.data_count for b in rs_blocks(ver, LEVELS[ecl]))

def main():
    import os
    random.seed(7)
    specs = []
    for ver in range(1, 41):
        for ecl in ('L', 'M', 'Q', 'H'):
            cap = (data_codewords(ver, ecl) * 8 - 4 - cc_bits(ver)) // 8
            txt = ''.join(random.choice(string.ascii_letters + string.digits)
                          for _ in range(cap))
            specs.append({'ver': ver, 'ecl': ecl, 'text': txt})
    out = os.path.join(os.path.dirname(__file__), 'specs.json')
    json.dump(specs, open(out, 'w'))
    print(f"specs.json yazildi: {len(specs)} konfigurasyon (v1-40 x L/M/Q/H)")

if __name__ == '__main__':
    main()
