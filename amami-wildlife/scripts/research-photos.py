"""Discover reuse-licensed real photographs; never publish without visual review.
Runs only on explicit invocation. No credentials. Wikimedia Commons public API.
"""
from pathlib import Path
import urllib.request,urllib.parse,json,re,time,html,concurrent.futures
ROOT=Path(__file__).resolve().parents[1]
HEADERS={'User-Agent':'SHIMACRAFTWildlife/0.1 (https://shima-craft.com/wildlife/; educational photograph research)'}
def get(url):
 req=urllib.request.Request(url,headers=HEADERS)
 with urllib.request.urlopen(req,timeout=35) as r:return r.read()
def clean(s):return html.unescape(re.sub('<[^>]+>','',s or '')).strip()
def find(s):
 query='"'+s['scientific']+'" filetype:bitmap'
 params={'action':'query','format':'json','generator':'search','gsrsearch':query,'gsrnamespace':6,'gsrlimit':5,'prop':'imageinfo','iiprop':'url|extmetadata|size','iiurlwidth':960}
 try:
  data=json.loads(get('https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(params)))
  choices=[]
  for p in sorted(data.get('query',{}).get('pages',{}).values(),key=lambda p:p.get('index',999)):
   info=p.get('imageinfo',[{}])[0];meta=info.get('extmetadata',{});lic=clean(meta.get('LicenseShortName',{}).get('value',''));title=p['title'];desc=clean(meta.get('ImageDescription',{}).get('value',''))
   if not re.match(r'^(CC BY(?:-SA)? [234]\.0|CC0|Public domain)$',lic):continue
   if re.search(r'illustrat|drawing|map|range|skeleton|skull|skin|fossil|egg|distribution|painting',title+' '+desc,re.I):continue
   if info.get('width',0)<300 or info.get('height',0)<200:continue
   choices.append({'title':title,'description':desc[:1200],'author':clean(meta.get('Artist',{}).get('value','')),'credit':clean(meta.get('Credit',{}).get('value','')),'license':lic,'licenseUrl':meta.get('LicenseUrl',{}).get('value',''),'sourcePage':info.get('descriptionurl'),'originalUrl':info.get('url'),'previewUrl':info.get('thumburl',info.get('url')),'width':info.get('width'),'height':info.get('height'),'visualReview':False})
  return s['id'],choices
 except Exception as e:return s['id'],{'error':str(e)}
if __name__=='__main__':
 species=json.loads((ROOT/'data/species.json').read_text());out=ROOT/'research/photo-candidates.json';results={}
 # Bounded public reads; preserve result for manual review, do not auto-publish.
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  for id,result in pool.map(find,species):results[id]=result;print(id,len(result) if isinstance(result,list) else result,flush=True)
 out.write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
