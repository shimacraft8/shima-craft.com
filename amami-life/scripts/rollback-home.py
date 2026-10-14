#!/usr/bin/env python3
"""Remove only AMAMI LIFE routes; keep the original SHIMA CRAFT Worker and domain."""
import argparse,json,os,tomllib,urllib.request
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--execute',action='store_true')
args=parser.parse_args()
config=os.environ.get('XDG_CONFIG_HOME')
if not config: raise SystemExit('Set the dedicated XDG_CONFIG_HOME for SHIMA CRAFT first')
token=tomllib.loads((Path(config)/'.wrangler/config/default.toml').read_text())['oauth_token']
account='42f69e35f08bb21dca5194467e2f59de'
zone='cdfc2875eb9e0bf217159ec8be376373'
def api(path,method='GET'):
    request=urllib.request.Request('https://api.cloudflare.com/client/v4'+path,method=method,headers={'Authorization':'Bearer '+token})
    with urllib.request.urlopen(request,timeout=30) as response: payload=json.load(response)
    if not payload.get('success'): raise SystemExit('Cloudflare did not confirm success')
    return payload['result']
if api('/user')['email']!='shimacraft8@gmail.com': raise SystemExit('Wrong account; no changes made')
if api('/zones/'+zone)['account']['id']!=account: raise SystemExit('Wrong zone; no changes made')
allowed={'shima-craft.com/*','www.shima-craft.com/*'}
routes=[r for r in api('/zones/'+zone+'/workers/routes') if r.get('script')=='shima-craft-amami-life' and r.get('pattern') in allowed]
print(json.dumps({'execute':args.execute,'routes':routes},ensure_ascii=False,indent=2))
if args.execute:
    for route in routes: api('/zones/'+zone+'/workers/routes/'+route['id'],'DELETE')
    print('Removed only AMAMI LIFE routes. Original Worker/domain bindings were not modified.')
