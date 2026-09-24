# Convierte las fotos del lote MaterialVinted (seres vivos) a webp 900 px y escribe fotos/lote-manifest.js
# Uso (desde visu-cantabria):  python3 convert_lote.py "<ruta a OPOS BIOLOGIA 2027>"
import json, os, sys
from PIL import Image
root = sys.argv[1]; here = os.path.dirname(os.path.abspath(__file__))
jobs = json.load(open(os.path.join(here, 'lote_jobs.json')))
os.makedirs(os.path.join(here, 'fotos', 'lote'), exist_ok=True)
F, C, bad = {}, {}, []
for j in jobs:
    src = j['src'] if j['src'].startswith('/') else os.path.join(root, j['src'])
    dst = os.path.join(here, j['dst'])
    try:
        if not os.path.exists(dst):
            im = Image.open(src); im.load()
            if im.mode not in ('RGB', 'L'): im = im.convert('RGB')
            im.thumbnail((900, 900)); im.save(dst, 'WEBP', quality=80)
        F.setdefault(j['id'], []).append(j['dst']); C.setdefault(j['id'], []).append(j['cap'])
    except Exception as e:
        bad.append((j['src'][-60:], str(e)[:80]))
with open(os.path.join(here, 'fotos', 'lote-manifest.js'), 'w') as f:
    f.write('(function(){var F=window.FOTOS||(window.FOTOS={}),C=window.FOTOS_CAP||(window.FOTOS_CAP={});\n')
    f.write('var f=' + json.dumps(F, ensure_ascii=False) + ';\nvar c=' + json.dumps(C, ensure_ascii=False) + ';\n')
    f.write('for(var k in f){var a=F[k]||[],b=(C[k]||[]).slice();while(b.length<a.length)b.push("asturnatura.com");F[k]=a.concat(f[k]);C[k]=b.concat(c[k]);}})();\n')
print('fotos OK:', sum(len(v) for v in F.values()), '· ejemplares:', len(F), '· errores:', len(bad))
for b in bad[:15]: print('  ', b)
