from pathlib import Path
import math
r=Path(__file__).resolve().parents[1]/'assets/guides';r.mkdir(parents=True,exist_ok=True)
# An explicit continuous centreline: head -> neck -> single expanding coil -> tail.
points=[]
def cubic(a,b,c,d,n=55):
 for i in range(n):
  t=i/(n-1);v=1-t
  points.append((v*v*v*a[0]+3*v*v*t*b[0]+3*v*t*t*c[0]+t*t*t*d[0],v*v*v*a[1]+3*v*v*t*b[1]+3*v*t*t*c[1]+t*t*t*d[1]))
cubic((390,250),(440,275),(560,375),(625,475),65)
cubic((625,475),(695,555),(610,610),(500,600),65)
cubic((500,600),(330,590),(245,520),(330,410),65)
cubic((330,410),(430,285),(715,315),(820,410),65)
cubic((820,410),(950,530),(840,660),(1000,710),80)
# Variable width goes gradually to exactly one tail point.
left=[];right=[]
for i,(x,y) in enumerate(points):
 pre=points[max(0,i-1)];nxt=points[min(len(points)-1,i+1)];dx=nxt[0]-pre[0];dy=nxt[1]-pre[1];length=math.hypot(dx,dy) or 1
 t=i/(len(points)-1);half=34+24*math.sin(t*math.pi)
 if t>.73:half*=max(0,(1-t)/.27)
 nx=-dy/length;ny=dx/length
 left.append((x+nx*half,y+ny*half));right.append((x-nx*half,y-ny*half))
poly=' '.join(f'{x:.1f},{y:.1f}' for x,y in left+right[::-1])
centre='M'+' L'.join(f'{x:.1f},{y:.1f}' for x,y in points)
neckpoly=' '.join(f'{x:.1f},{y:.1f}' for x,y in left[:58]+right[:58][::-1])
# A natural left-facing viper head overlaps the beginning of the same neck.
neckleft='M'+' L'.join(f'{x:.1f},{y:.1f}' for x,y in left[:58])
neckright='M'+' L'.join(f'{x:.1f},{y:.1f}' for x,y in right[:58])
head='M406 249Q401 216 363 202L282 205Q253 214 263 241L316 275Q359 292 400 270Z'
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1000"><rect width="1200" height="1000" fill="white"/><polygon points="{poly}" fill="#c8c58f" stroke="#25291f" stroke-width="5" stroke-linejoin="round"/><polygon points="{neckpoly}" fill="#c8c58f"/><path d="{neckleft}" fill="none" stroke="#25291f" stroke-width="5"/><path d="{neckright}" fill="none" stroke="#25291f" stroke-width="5"/><path d="{centre}" stroke="#586d6c" stroke-width="2" stroke-dasharray="9 7" fill="none"/><path d="{head}" fill="#c8c58f" stroke="#25291f" stroke-width="5"/><circle cx="307" cy="223" r="5" fill="#25291f"/><path d="M270 239Q320 261 357 258" fill="none" stroke="#25291f" stroke-width="3"/></svg>'''
(r/'snake-structure-guide-v3.svg').write_text(svg)
