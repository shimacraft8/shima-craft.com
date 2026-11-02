"""An illustrated, progressively enhanced habitat journey; no carousel autoplay."""
def render_journey(species, photos, img, base):
 lookup={s['id']:s for s in species}
 chapters=[
  ('forest','01','FOREST','森','木々の上にも 足もとの落ち葉にも', ['lidths-jay','amami-rabbit','amami-stag'],'lidths-jay'),
  ('river','02','RIVER','川','渓流のそばで暮らす生き物', ['amami-ishikawa-frog','otton-frog','amami-tip-nosed-frog'],'amami-ishikawa-frog'),
  ('ocean','03','OCEAN','海','島を囲む海にも広がる世界', ['green-turtle','loggerhead-turtle'],'green-turtle')
 ]
 panels=[]
 for slug,number,english,title,subtitle,ids,photo_id in chapters:
  animals=''
  for i,id in enumerate(ids):
   s=lookup[id]
   animals+=f'<a class="hero-species hero-species--{i+1}" href="{base}species/{id}/">{img(s,"journey-animal",slug!="forest")}<span class="animal-name">{s["name"]}<span aria-hidden="true">↗</span></span></a>'
  p=photos.get(photo_id)
  photo=f'<a class="chapter-photo" href="{base}species/{photo_id}/?view=photo"><img src="{p["src"]}" width="{p["width"]}" height="{p["height"]}" alt="" loading="lazy"><span><strong>写真で見る <span aria-hidden="true">↗</span></strong></span></a>' if p else ''
  motifs={
   'forest':'M40 490Q270 440 540 110M160 421Q104 340 113 281Q217 292 221 372M285 314Q238 209 270 156Q361 198 336 262M408 201Q388 120 422 61Q505 105 458 149M219 390Q307 393 358 343Q295 306 260 348M342 270Q430 270 474 205Q399 188 383 228',
   'river':'M-20 389Q148 270 303 362T660 322M-20 423Q170 309 310 398T660 359M-20 457Q152 348 300 434T660 396',
   'ocean':'M-20 345Q73 289 167 345T354 345T541 345T728 345M-20 381Q73 325 167 381T354 381T541 381T728 381M-20 417Q73 361 167 417T354 417T541 417T728 417'
  }
  drawing=f'<svg class="habitat-drawing" viewBox="0 0 640 520" fill="none" aria-hidden="true"><path d="{motifs[slug]}"/></svg>'
  verb={'forest':'を歩く','river':'をたどる','ocean':'をのぞく'}[slug]
  panels.append(f''' <section class="journey-chapter chapter-{slug}" id="habitat-{slug}" aria-labelledby="title-{slug}"><div class="chapter-copy"><p class="chapter-index">{number}<span aria-hidden="true"> — </span><span translate="no">{english}</span></p><h2 id="title-{slug}">{title}<span>{verb}</span></h2><p class="chapter-description">{subtitle}</p><a class="chapter-catalog" href="{base}?habitat={"森" if slug=="forest" else "川・水辺" if slug=="river" else "海・海岸"}#catalog">このすみかの生き物を探す <span aria-hidden="true">↗</span></a>{photo}</div><div class="chapter-gallery"><span class="habitat-word" aria-hidden="true" translate="no">{english}</span>{drawing}{animals}</div></section>''')
 nav=''.join(f'<button type="button" data-chapter="{i}" aria-controls="habitat-{c[0]}"'+(' aria-current="step"' if i==0 else '')+f'><span>{c[1]}</span> {c[3]}</button>' for i,c in enumerate(chapters))
 return f'''<section class="journey-intro wrap"><div><p class="eyebrow">奄美群島の動物図鑑</p><h1>奄美大島の生き物大全</h1></div><div class="journey-intro-copy"><p>気になる姿から<br>写真と解説へ</p><a href="#catalog">名前から調べる <span aria-hidden="true">↘</span></a></div></section>
<section class="habitat-journey" id="explore" aria-label="森から川と海へ 生き物のすみかを巡る"><div class="journey-sticky"><div class="journey-toolbar wrap"><nav class="chapter-navigation" aria-label="生き物のすみか">{nav}</nav><div class="scene-controls"><button type="button" id="day-toggle" aria-pressed="false">夜の色にする</button><button type="button" id="motion-toggle" aria-pressed="false">動きを止める</button></div><a class="journey-skip" href="#catalog">図鑑の一覧へ <span aria-hidden="true">↓</span></a></div><div class="journey-window"><div class="journey-track">{''.join(panels)}</div></div><div class="journey-bottom wrap"><p class="journey-instruction"><span class="scroll-indicator" aria-hidden="true">↓</span> スクロールして森から海へ</p><p class="journey-status" role="status" aria-live="polite"></p><div class="journey-arrows"><button type="button" data-journey-prev aria-label="前のすみかへ" disabled>←</button><button type="button" data-journey-next aria-label="次のすみかへ">→</button></div><a href="#catalog">図鑑をひらく <span aria-hidden="true">↗</span></a></div><div class="journey-progress" aria-hidden="true"><span></span></div></div></section>
<p class="journey-disclaimer wrap">イラストの大きさや組み合わせは演出です 生息地点や同時に見られることを示すものではありません</p>'''
