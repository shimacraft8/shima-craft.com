"""Reproduce original geometric app marks. Optional Pillow, no source image edits."""
from pathlib import Path
from PIL import Image, ImageDraw
import random
root = Path(__file__).resolve().parents[1]
out = root / 'apps/mobile/assets'
S = 2048

def art(color, ink):
    im = Image.new('RGBA', (S,S)); d = ImageDraw.Draw(im)
    d.pieslice((440,520,1608,1688),180,360,fill=color)
    for i in range(17):
        w=1370-i*51; y=1135+i*24
        d.line(((S-w)/2,y,(S+w)/2,y),fill=(*color,round(255*(1-i/18))),width=max(3,14-i//2))
    for x,y in [(1315,570),(1430,625),(1215,640)]:
        d.line([(x-18,y-8),(x,y+6),(x+19,y-12)],fill=ink,width=10)
    return im

for theme,bg,fg,ink in [('paper',(247,243,233),(237,37,24),(36,37,32)),('ink',(34,37,34),(214,176,108),(243,239,229))]:
    image=Image.new('RGB',(S,S),bg)
    rng=random.Random(23); noise=Image.new('RGB',(S,S)); noise.putdata([tuple(max(0,min(255,c+rng.randrange(-3,4))) for c in bg) for _ in range(S*S)])
    image=Image.blend(image,noise,.45); image.paste(art(fg,ink),mask=art(fg,ink).getchannel('A'))
    image.resize((1024,1024),Image.Resampling.LANCZOS).save(out/f'icon-{theme}.png')
    art(fg,ink).resize((1024,1024),Image.Resampling.LANCZOS).save(out/f'splash-{theme}.png')
# Adaptive foreground uses more breathing room to keep the mark inside masks.
fg=art((237,37,24),(36,37,32)).resize((1600,1600),Image.Resampling.LANCZOS)
a=Image.new('RGBA',(S,S));a.alpha_composite(fg,(224,224));a.resize((1024,1024),Image.Resampling.LANCZOS).save(out/'icon-foreground.png')
print('Generated 5 original icon/splash assets; not uploaded.')
