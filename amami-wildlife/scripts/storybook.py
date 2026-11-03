"""An openable picturebook: a cover turns into 森→渓流→海. All species links work without JavaScript."""
import html,json
from pathlib import Path
E=lambda value:html.escape(str(value),quote=True)
# Discoveries are positioned by species classes in the self-hosted stylesheet.
# The paintings are creative scenery, so only same-habitat neighbours join a scene.
EXTRA={'forest':['green-snake']}
def render_storybook(species,base,versioned):
 root=Path(__file__).resolve().parents[1]
 illustrations=json.loads((root/'data/illustrations.json').read_text());scenes=json.loads((root/'data/story-scenes.json').read_text());by_id={s['id']:s for s in species}
 def art(s,cls='',eager=False):
  info=illustrations[s['asset']]
  return f'<img class="{cls}" src="{versioned(base+"assets/animals/"+s["asset"]+".webp")}" alt="" width="{info["width"]}" height="{info["height"]}" loading="{"eager" if eager else "lazy"}" decoding="async" draggable="false">'
 def landscape(name,alt,cls,priority='lazy'):
  large=versioned(base+'assets/storybook/'+name+'.webp');small=versioned(base+'assets/storybook/'+name+'-768.webp')
  sizes='(max-width: 760px) 100vw, (max-width: 1548px) calc(100vw - 48px), 1500px'
  load={'high':'loading="eager" fetchpriority="high"','eager':'loading="eager"'}.get(priority,'loading="lazy"')
  return f'<img class="{cls}" src="{large}" srcset="{small} 768w, {large} 1536w" sizes="{sizes}" alt="{E(alt)}" width="1536" height="1024" {load} decoding="async" draggable="false">'
 def creature(s,index,cls,eager=False):
  return f'<a class="chapter-creature {cls}" href="{base}species/{s["id"]}/" data-book-open="{s["id"]}" aria-label="{E(s["name"])}のページをひらく">{art(s,"",eager)}<span class="creature-caption"><span><small>NO. {index:03}</small>{E(s["name"])}</span><span aria-hidden="true">↗</span></span></a>'
 def spot(s):
  return f'<a class="story-neighbor spot-{s["id"]}" href="{base}species/{s["id"]}/" data-book-open="{s["id"]}"><span class="spot-art">{art(s)}</span><span class="spot-name">{E(s["name"])}</span><span class="spot-mark" aria-hidden="true">↗</span></a>'
 def slot(sid,spread,count,label,body,accent=''):
  style='' # Placement and colours are in the self-hosted CSS, never inline under the strict CSP.
  return f'<li class="stage-slot slot-{spread}" id="{sid}" data-spread="{spread}" data-chapter="{spread}" data-count="{E(count)}"{style}><article class="spread-paper" aria-labelledby="{label}">{body}</article></li>'
 def scenery(name,alt,priority,cls='spread-art'):
  return f'<div class="{cls}">{landscape(name,alt,"spread-painting",priority)}<span class="art-wash" aria-hidden="true"></span><span class="spread-light" aria-hidden="true"></span></div>'
 rabbit=by_id['amami-rabbit'];forest=scenes[0]
 index_links=''.join(f'<a href="#{s["id"]}"><span>{s["number"]}</span><strong>{E(s["label"])}</strong><small translate="no">{E(s["english"])}</small></a>' for s in scenes)
 cover=slot('cover','cover','表紙','story-title',
  scenery(forest['background'],forest['backgroundAlt'],'high','spread-art cover-art')
  +f'''<div class="cover-plate"><p class="story-eyebrow" translate="no">AMAMI NATURE BOOK</p><h1 id="story-title">めくるたび<br>奄美に出会う</h1><p class="cover-lead">森の奥から 渓流のほとりへ<br>その先には 青い海</p><p class="cover-actions"><a class="story-primary" href="#forest">本をひらく <span aria-hidden="true">→</span></a><a class="story-text-link" href="#catalog">図鑑で探す <span aria-hidden="true">↓</span></a></p></div>'''
  +f'<nav class="cover-index" aria-label="この本の目次"><p>目次 <span>全3章</span></p>{index_links}</nav>'
  +f'<div class="cover-figure">{creature(rabbit,species.index(rabbit)+1,"creature-cover",True)}</div>'
  +'<span class="paper-note" aria-hidden="true">ILLUSTRATED LANDSCAPE / 創作の風景画</span>')
 chapters=[]
 for order,scene in enumerate(scenes):
  s=by_id[scene['main']];number=species.index(s)+1
  title='<br>'.join(E(v) for v in scene['title']);intro='<br>'.join(E(v) for v in scene['intro'].split('\n'))
  ids=list(scene['related'])+EXTRA.get(scene['id'],[])
  spots=''.join(spot(by_id[x]) for x in ids)
  forward=scenes[order+1]['id'] if order+1<len(scenes) else 'colophon'
  forward_label='巻末へ' if order+1==len(scenes) else E(scenes[order+1]['label'])+'へ'
  chapters.append(slot(scene['id'],scene['id'],f"{scene['number']} {scene['label']}",scene['id']+'-title',
   scenery(scene['background'],scene['backgroundAlt'],'eager' if order==0 else 'lazy')
   +creature(s,number,'creature-'+scene['id'],order==0)
   +f'<div class="spread-spots">{spots}</div>'
   +f'''<div class="spread-copy"><p class="chapter-number">{scene['number']}<span>{E(scene['label'])}</span></p><p class="story-eyebrow" translate="no">{E(scene['english'])}</p><h2 id="{scene['id']}-title">{title}</h2><p class="chapter-intro">{intro}</p><p class="spread-actions"><a class="story-primary" href="#{forward}">{forward_label} <span aria-hidden="true">→</span></a><a class="story-text-link" href="{base}?habitat={E(s['habitat'])}#catalog">{E(s['habitat'])}の生き物を図鑑で <span aria-hidden="true">↗</span></a></p></div>''',
   scene['accent']))
 end=slot('colophon','end','巻末','colophon-title',
  scenery(scenes[-1]['background'],'','lazy','spread-art end-art')
  +f'''<div class="spread-copy end-copy"><p class="story-eyebrow" translate="no">THE END / 巻末</p><h2 id="colophon-title">ここから<br>図鑑をひらく</h2><p class="chapter-intro">森・渓流・海でみた生き物も、まだ会っていない生き物も。<br>イラストと実際の写真、出典をそえて{len(species)}項目をまとめています。</p><p class="spread-actions"><a class="story-primary" href="#catalog">図鑑で探す <span aria-hidden="true">↓</span></a><a class="story-text-link" href="#cover">表紙にもどる <span aria-hidden="true">←</span></a><a class="story-text-link" href="{base}about/">この図鑑について <span aria-hidden="true">↗</span></a></p></div>''')
 bar=f'''<div class="stage-bar"><div class="stage-progress" aria-hidden="true"><span></span></div><div class="bar-row bar-main"><div class="stage-turn"><a class="turn-link" id="stage-prev" href="#cover" rel="prev" aria-disabled="true"><span aria-hidden="true">←</span>前のページ</a><a class="turn-link" id="stage-next" href="#forest" rel="next">次のページ<span aria-hidden="true">→</span></a></div><p class="stage-count" aria-live="polite" aria-atomic="true"><span id="stage-count">表紙</span><small>／全3章</small></p><nav class="stage-scenes" aria-label="章を選ぶ"><a href="#cover" data-chapter-link="cover">表紙</a>{''.join(f'<a href="#{s["id"]}" data-chapter-link="{s["id"]}"><span>{s["number"]}</span>{E(s["label"])}</a>' for s in scenes)}<a href="#colophon" data-chapter-link="end">巻末</a></nav></div><div class="bar-row bar-aside"><p class="stage-hint" id="stage-hint">本をひらき 絵の中の生き物を選んでみよう</p><a class="stage-exit" href="#catalog">図鑑で探す <span aria-hidden="true">↓</span></a><button type="button" id="motion-toggle" hidden aria-pressed="false">動きを止める</button></div></div>'''
 stage=f'''<section class="book-stage" id="explore" aria-labelledby="story-title"><a class="stage-skip" href="#catalog">絵本をとばして図鑑へ</a><div class="stage-frame"><div class="stage-viewport"><ol class="stage-track" id="stage-track" tabindex="0" aria-label="奄美の生き物絵本" aria-describedby="stage-hint">{cover}{''.join(chapters)}{end}</ol></div>{bar}</div></section>'''
 outro=f'''<section class="story-outro story-wrap"><div class="outro-lead"><p class="story-eyebrow" translate="no">KEEP EXPLORING</p><h2>気になる生き物を<br>もっと知ろう</h2><a class="story-primary" href="#catalog">全{len(species)}項目を図鑑で見る <span aria-hidden="true">↓</span></a></div><nav class="story-index" aria-label="章をひらく"><p>CONTENTS</p>{index_links}</nav><details class="story-colophon"><summary>ものがたりの絵について</summary><p>奄美の自然を参考にした創作の風景画です。生息地点や季節、昼夜、実際の大きさを再現したものではありません。生き物のページで実写と出典を確認できます。</p></details></section>'''
 # The book is independent from scene rendering, and opens every editorial entry.
 book='''<dialog class="nature-book" id="nature-book" aria-labelledby="book-title"><div class="book-top"><p class="story-eyebrow">AMAMI NATURE BOOK</p><button type="button" id="book-close" aria-label="生き物のページを閉じる">閉じる <span aria-hidden="true">×</span></button></div><div class="book-tabs" role="tablist" aria-label="生き物のページ"><button type="button" role="tab" id="book-tab-0" aria-controls="book-panel-0" aria-selected="true">1 イラスト</button><button type="button" role="tab" id="book-tab-1" aria-controls="book-panel-1" aria-selected="false" tabindex="-1">2 実際の写真</button><button type="button" role="tab" id="book-tab-2" aria-controls="book-panel-2" aria-selected="false" tabindex="-1">3 生態と出典</button></div><div class="book-heading"><p id="book-group" class="story-eyebrow"></p><h2 id="book-title"></h2><p id="book-latin" lang="la"></p></div><div id="book-panel-0" class="book-panel" role="tabpanel" aria-labelledby="book-tab-0"><div class="book-plate" id="book-swipe"><img id="book-art" src="" alt="" width="640" height="426"><span class="book-plate-number" id="book-number"></span></div><div class="book-caption"><p id="book-lead"></p><p id="book-fact"></p></div></div><div id="book-panel-1" class="book-panel" role="tabpanel" aria-labelledby="book-tab-1" hidden><div class="book-real"><img id="book-photo" src="" alt="" width="960" height="720"></div><div class="photo-notes"><p id="book-photo-caption"></p><p id="book-photo-credit"></p></div></div><div id="book-panel-2" class="book-panel book-facts" role="tabpanel" aria-labelledby="book-tab-2" hidden><dl id="book-facts"></dl><details id="book-source-detail" open><summary>解説の出典</summary><ul id="book-sources"></ul></details><p class="book-small-note">イラストは特徴を簡略化した表現です。写真ごとの注記もご確認ください。</p><a class="story-text-link" id="book-detail">図鑑の詳細ページへ <span aria-hidden="true">↗</span></a></div><div class="book-bottom"><button type="button" id="book-prev" disabled><span aria-hidden="true">←</span> 前のページ</button><p id="book-page-status" aria-live="polite">1 / 3</p><button type="button" id="book-next">次のページ <span aria-hidden="true">→</span></button></div></dialog>'''
 # Invalid empty image URLs are not emitted (images are assigned only when opening the book).
 book=book.replace(' src=""','')
 return '<div class="nature-story" data-storybook>'+stage+outro+'</div>'+book
