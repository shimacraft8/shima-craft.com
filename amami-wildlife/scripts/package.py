"""Package reproducible source, selected masters, public assets, docs; no credentials/research media."""
from pathlib import Path
import json,zipfile,hashlib
ROOT=Path(__file__).resolve().parents[1]
target=ROOT.parent/'amami-wildlife-project.zip'
files=set()
for directory in ['scripts','tests','data','design-system','docs','public','src','prototypes']:
 files.update(p for p in (ROOT/directory).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix not in ['.pyc','.zip'])
for name in ['README.md','.gitignore','wrangler.jsonc','worker.mjs','package.json','package-lock.json']:
 files.add(ROOT/name)
illustrations=json.loads((ROOT/'data/illustrations.json').read_text())
for entry in json.loads((ROOT/'data/species.json').read_text()):
 if entry['asset']:files.add(ROOT/illustrations[entry['asset']]['master'])
files.add(ROOT/'assets/cute-habitat-v1.png')
files.update(p for p in (ROOT/'assets/guides').glob('*') if p.is_file())
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(files):
  relative=p.relative_to(ROOT)
  assert not any(v in relative.parts for v in ['.wrangler','node_modules','.git'])
  assert relative.parts[0]!='research'
  z.write(p,Path('amami-wildlife')/relative)
with zipfile.ZipFile(target) as z:
 assert z.testzip() is None
 assert not any('private_key' in n.lower() or 'auth/' in n for n in z.namelist())
print(json.dumps({'zip':str(target),'files':len(files),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}))
