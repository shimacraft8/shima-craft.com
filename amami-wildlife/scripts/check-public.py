from pathlib import Path
import urllib.request,urllib.error,json,concurrent.futures,hashlib,re,datetime
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'docs/build-manifest.json').read_text())
expected_release=re.search(r"X-Wildlife-Release','([^']+)'",(ROOT/'worker.mjs').read_text()).group(1)
paths=['/'+p.removesuffix('index.html') if p.endswith('index.html') else '/'+p for p in manifest if p.startswith('wildlife/') and not p.endswith('404.html')]
paths+=['/wildlife','/wildlife/not-a-species/','/','/studio','/privacy']
def check(p):
 u='https://shima-craft.com'+p
 try:
  with urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0 SHIMACRAFT-Wildlife-QA/0.1'}),timeout=35) as r:body=r.read();status=r.status;headers=r.headers;final=r.url
 except urllib.error.HTTPError as r:body=r.read();status=r.code;headers=r.headers;final=r.url
 except Exception as e:return {'path':p,'error':str(e),'pass':False}
 iswild=p.startswith('/wildlife');expected=404 if p=='/wildlife/not-a-species/' else 200;ok=status==expected
 failures=[]
 if status!=expected:failures.append('http-status')
 if iswild:
  if headers.get('X-Wildlife-Release')!=expected_release:failures.append('release-version')
  if "frame-ancestors 'none'" not in headers.get('Content-Security-Policy',''):failures.append('csp-frame-ancestors')
 if iswild and status==200:
  local=ROOT/'public'/p.lstrip('/')
  if p=='/wildlife' or p.endswith('/'):local=ROOT/'public'/p.lstrip('/')/'index.html'
  if local.is_file() and hashlib.sha256(body).digest()!=hashlib.sha256(local.read_bytes()).digest():failures.append('body-sha256')
 title=re.search(b'<title>(.*?)</title>',body,re.S) if headers.get('Content-Type','').startswith('text/html') else None
 return {'path':p,'status':status,'final':final,'title':title.group(1).decode(errors='replace') if title else None,'release':headers.get('X-Wildlife-Release'),'csp':headers.get('Content-Security-Policy'),'failures':failures,'pass':not failures}
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:result=list(pool.map(check,paths))
 report={'time':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':len(result),'passed':sum(x['pass'] for x in result),'results':result}
 (ROOT/'docs/production-http.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'checks':len(result),'passed':report['passed'],'failures':[x for x in result if not x['pass']]},ensure_ascii=False))
 if not all(x['pass'] for x in result):raise SystemExit(1)
