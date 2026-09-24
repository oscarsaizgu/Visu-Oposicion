# Convierte las fotos de geología/microscopía del lote a webp 900 px y escribe fotos/extra-manifest.js
# Uso (desde la carpeta visu-cantabria):  python3 convert_fotos.py "<ruta a OPOS BIOLOGIA 2027>"
import json, os, sys
from PIL import Image
root = sys.argv[1]; here = os.path.dirname(os.path.abspath(__file__))
jobs = json.load(open(os.path.join(here, 'fotos_jobs.json')))
force = tuple(x for x in os.environ.get('FORCE', '').split(',') if x)  # p. ej. FORCE=micro- rehace esas fotos
os.makedirs(os.path.join(here, 'fotos', 'geo'), exist_ok=True)
F, C, bad = {}, {}, []
for j in jobs:
    src = os.path.join(root, j['src']); dst = os.path.join(here, j['dst'])
    try:
        if force and j['id'].startswith(force) or not os.path.exists(dst):
            im = Image.open(src); im.load()
            if im.mode not in ('RGB', 'L'): im = im.convert('RGB')
            im.thumbnail((900, 900)); im.save(dst, 'WEBP', quality=80)
        F.setdefault(j['id'], []).append(j['dst']); C.setdefault(j['id'], []).append(j['cap'])
    except Exception as e:
        bad.append((j['src'], str(e)[:80]))
with open(os.path.join(here, 'fotos', 'extra-manifest.js'), 'w') as f:
    f.write('(function(){var F=window.FOTOS||(window.FOTOS={}),C=window.FOTOS_CAP||(window.FOTOS_CAP={});\n')
    f.write('var f=' + json.dumps(F, ensure_ascii=False) + ';\nvar c=' + json.dumps(C, ensure_ascii=False) + ';\n')
    f.write('for(var k in f){F[k]=f[k];C[k]=c[k];}})();\n')
print('fotos OK:', sum(len(v) for v in F.values()), '· ejemplares con foto:', len(F), '· errores:', len(bad))
for b in bad[:20]: print('  ', b)
