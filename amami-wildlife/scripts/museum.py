"""Optional explorable block forest with a complete static catalogue fallback."""
import html
E=lambda value:html.escape(str(value),quote=True)
SPOTS=[('hego','ヒカゲヘゴの林'),('floor','林床の木かげ'),('falls','滝の下の岩場'),('stream','渓流のほとり'),('estuary','河口のひがた'),('cape','海を見おろす林縁'),('shore','海べの砂地')]
def render_museum(species,base,group_slugs):
 groups=list(dict.fromkeys(s['group'] for s in species))
 options=''.join('<optgroup label="'+E(g)+'">'+''.join(f'<option value="{E(s["id"])}">{E(s["name"])}</option>' for s in species if s['group']==g)+'</optgroup>' for g in groups)
 places=''.join(f'<option value="{key}">{name}</option>' for key,name in SPOTS)
 return f'''<section class="museum is-2d" id="explore" aria-labelledby="museum-title">
 <div class="forest-entry"><div><p class="eyebrow">AMAMI WILDLIFE</p><h1 id="museum-title">奄美大島の生き物大全</h1><p>ブロックの森を歩いて 生き物を探そう</p></div><button type="button" id="forest-enter" disabled>森に入る <span aria-hidden="true">↗</span></button></div>
 <div class="museum-stage" id="museum-stage">
  <div id="museum-canvas"></div>
  <header class="forest-heading"><div><p>AMAMI WILDLIFE / SHIMA CRAFT</p><p class="forest-title">奄美大島の生き物大全</p></div><button type="button" id="museum-mode">森を出る <span aria-hidden="true">↗</span></button></header>
  <details id="forest-search" class="forest-search"><summary>生き物を探す <span aria-hidden="true">⌕</span></summary><div><label for="museum-species">掲載中の{len(species)}項目</label><select id="museum-species" name="museum-species" autocomplete="off">{options}</select><div class="forest-search-actions"><button type="button" id="museum-find" disabled>いる場所を見る</button><button type="button" id="museum-open" disabled>解説をひらく</button></div></div></details>
  <div id="museum-labels" class="museum-labels"></div>
  <p class="museum-loading" id="museum-loading" role="status" hidden>森をひらいています…</p>
  <p id="museum-status" class="museum-sr" role="status" aria-live="polite"></p>
  <div class="forest-bottom">
   <div class="forest-location"><label for="forest-place">近くへ移動</label><select id="forest-place" name="forest-place" autocomplete="off">{places}</select><p id="forest-place-name" class="museum-sr">ヒカゲヘゴの林</p></div>
   <div class="forest-walk" role="group" aria-label="歩く方向"><span>長押しで歩く</span><button type="button" data-walk="forward" aria-label="前へ歩く（長押しで移動）">↑</button><button type="button" data-walk="left" aria-label="左へ歩く（長押しで移動）">←</button><button type="button" data-walk="back" aria-label="後ろへ歩く（長押しで移動）">↓</button><button type="button" data-walk="right" aria-label="右へ歩く（長押しで移動）">→</button></div>
   <div class="forest-zoom" role="group" aria-label="表示の拡大"><button type="button" id="forest-zoom-in" aria-label="少し拡大する">＋</button><button type="button" id="forest-zoom-out" aria-label="表示を引く">−</button></div>
   <div class="forest-look" role="group" aria-label="見渡す方向"><span>見回す</span><button type="button" data-turn="left" aria-label="左を向く">←</button><button type="button" data-turn="up" aria-label="上を向く">↑</button><button type="button" data-turn="down" aria-label="下を向く">↓</button><button type="button" data-turn="right" aria-label="右を向く">→</button></div>
   <p class="forest-hint" id="forest-controls-help">画面を選んで W A S D で歩く<span> / ドラッグ・矢印キーで見回す</span></p>
   <div class="forest-meta"><span id="forest-found">見つけた 0 / {len(species)}</span><button type="button" id="forest-reset">入口へ戻る</button><details class="forest-info"><summary>森について</summary><div><p>ヒカゲヘゴの林、渓流、滝、海辺がつながる創作のブロック空間です。木道の外も歩けます。奄美群島の生き物を集めた創作空間です。島ごとの分布、実際の生息地点、季節・昼夜や大きさの比率は再現していません。ドラッグや矢印で見回し、WASDキーや長押しボタンで歩けます。Shiftで早歩き、Homeで入口へ戻れます。</p><p>森の生き物は写真を参考に形や色を簡略化した立体ブロックモデルです。掲載{len(species)}項目、全種の調査は継続中です。</p><button type="button" id="motion-toggle" aria-pressed="false">動きを止める</button><a href="{base}about/">この図鑑について ↗</a></div></details></div>
  </div>
 </div>
 <p id="museum-failure" class="notice wrap" role="status" hidden></p>
 <noscript><p class="notice wrap">3Dの森にはJavaScriptが必要です。下の一覧から全{len(species)}項目を閲覧できます。</p></noscript>
 </section>
 <dialog class="museum-dialog" id="museum-dialog" aria-labelledby="exhibit-title"><button type="button" id="exhibit-close" aria-label="解説を閉じる">閉じる ×</button><div class="exhibit-book"><div class="exhibit-photo-page"><p class="eyebrow">PHOTOGRAPH / 実際の写真</p><img id="exhibit-photo" alt="" width="960" height="720"><p id="exhibit-caption"></p><p class="photo-credit" id="exhibit-credit"></p></div><div class="exhibit-text-page"><p id="exhibit-group" class="eyebrow"></p><h2 id="exhibit-title"></h2><p id="exhibit-scientific" lang="la"></p><p id="exhibit-lead" class="exhibit-lead"></p><p id="exhibit-fact"></p><dl id="exhibit-facts"></dl><details><summary>出典・写真・イラストについて</summary><ul id="exhibit-sources"></ul><p>森には写真を参考に制作した立体ブロックモデルを配置しています。図鑑の詳細ページには手描き風イラストと実写を残しています。写真の種・亜種の専門家による全点監修は未実施で、写真ごとの注記もご確認ください。</p></details><a id="exhibit-detail" class="museum-primary">図鑑の詳細ページへ ↗</a></div></div></dialog>'''
