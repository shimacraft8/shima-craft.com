"""Curated entries and traceable, explicitly unreviewed checklist imports."""
from pathlib import Path
import json,re,unicodedata,csv,hashlib
ROOT=Path(__file__).resolve().parents[1]
SOURCES={
 'awcc':{'title':'環境省 奄美野生生物保護センター｜奄美群島の動物','url':'https://kyushu.env.go.jp/okinawa/awcc/animal.html','scope':'代表的な鳥類・哺乳類・爬虫類・両生類'},
 'insects':{'title':'環境省 奄美野生生物保護センター｜奄美群島の昆虫','url':'https://kyushu.env.go.jp/okinawa/awcc/insect.html','scope':'代表的な昆虫。全種目録ではない'},
 'frogs':{'title':'わきゃあまみ⑥ 奄美のカエル図鑑 第3版（2023）','url':'https://www.vill.yamato.lg.jp/kikaku/kurashi/kankyo/shizentaiken/documents/kaerukaitei.pdf','scope':'刊行時点のカエル9種類'},
 'dragonflies':{'title':'わきゃあまみ㉒ 奄美群島のトンボ全種','url':'https://www.vill.yamato.lg.jp/kikaku/kurashi/kankyo/shizentaiken/documents/amamigunntou-tonnbo.pdf','scope':'刊行時点の56分類群。亜種を含む'},
 'birds-extra':{'title':'奄美野鳥の会｜図鑑刊行後に記録された野鳥','url':'https://aoc.or.jp/addition-to-guide01/','scope':'2009年以降の追加記録。記載の季節区分と群島への記録を区別'},
 'birds-iba':{'title':'日本野鳥の会｜IBA 奄美諸島','url':'https://mobile.wbsj.org/nature/hogo/others/iba/search/sites/kyusyu/imgs/JP158.pdf','scope':'鳥類の季節区分を含む地域資料。現在の全種目録ではない'},
 'ants':{'title':'環境省｜奄美・琉球の生き物（普及啓発資料）','url':'https://kyushu.env.go.jp/okinawa/amami-okinawa/awareness/pdf/c-42-j.pdf','scope':'ツヤミカドオオアリの和名・学名・奄美大島の分布'},
 'turtles':{'title':'わきゃあまみ⑮ アオウミガメとアカウミガメ','url':'https://www.vill.yamato.lg.jp/kikaku/kurashi/kankyo/shizentaiken/documents/15_wakyaamami.pdf','scope':'ウミガメの形態とくらし'},
 'tokunoshima-fishes':{'title':'Mochida & Motomura（2018）徳之島の魚類目録','url':'https://www.museum.kagoshima-u.ac.jp/staff/motomura/2018_09_TokunoshimaFishes_lowres.pdf','scope':'徳之島周辺の海水・淡水魚の文献・標本記録'},
 'okinoerabu-fishes':{'title':'Motomura & Uehara（2020）沖永良部島の魚類目録','url':'https://www.museum.kagoshima-u.ac.jp/staff/motomura/2020_03_Okinoerabu_Fishes_lowres.pdf','scope':'沖永良部島周辺の海水・淡水魚の文献・標本記録'},
 'fish-index':{'title':'鹿児島大学総合研究博物館｜魚類の出版物','url':'https://www.museum.kagoshima-u.ac.jp/staff/motomura/dl.html','scope':'喜界島・与論島・群島全域などの照合資料'},
 'yamato':{'title':'大和村｜わきゃあまみ 資料一覧','url':'https://www.vill.yamato.lg.jp/kikaku/kurashi/kankyo/shizentaiken/wakyamami.html','scope':'カニ・海の生き物・クジラ・イルカ等の追加照合資料'}
}
entries=[]
def add(id,name,scientific,group,habitat,islands,lead,fact,season='出現期は整理中',source='awcc',asset=None,rank='species',note=''):
 entries.append(dict(id=id,name=name,scientific=scientific,rank=rank,group=group,habitat=habitat,islands=islands.split('・') if islands else [],lead=lead,fact=fact,season=season,sources=[source],asset=asset,status='editorial',taxonomyNote=note,checked='2026-11-01',illustrationStatus='generated-photo-referenced' if asset else 'pending'))
add('amami-rabbit','アマミノクロウサギ','Pentalagus furnessi','哺乳類','森','奄美大島・徳之島','短い耳で、夜の森をとことこ。','短い耳と丈夫な爪が目印。巣穴を使って暮らします。',asset='cute-amami-rabbit-v1')
add('lidths-jay','ルリカケス','Garrulus lidthi','鳥類','森','奄美大島・加計呂麻島・請島','るり色の羽に、黒い目元。','青と赤茶の羽、淡いくちばしが目印。森の木々の間を移動します。',asset='cute-lidths-jay-v1')
add('amami-ishikawa-frog','アマミイシカワガエル','Odorrana splendida','両生類','川・水辺','奄美大島','緑と金色、渓流のかくれんぼ。','緑の体に金色の斑点。沖縄島の近縁種とは2011年に区別されました。',asset='cute-amami-ishikawa-frog-v1')
add('green-turtle','アオウミガメ','Chelonia mydas','爬虫類','海・海岸','','海の中を、ゆったりひと泳ぎ。','アカウミガメとは頭や甲羅の形が異なります。海で見かけても進路をふさがず、距離をとって観察しましょう。',source='turtles',asset='cute-green-turtle-v1',note='群島の沿岸域。島別の記録は照合中。')
add('camponotus-amamianus','ツヤミカドオオアリ','Camponotus amamianus','昆虫','森','奄美大島','つやつやの体を、よく見てみよう。','黒く光る体が印象的なオオアリの仲間。このイラストは働きアリです。',source='ants',asset='cute-camponotus-amamianus-v2',note='「日本最大」の比較は働きアリ・女王等の条件を要するため、ここでは断定していません。')
for row in [
 ('amami-spiny-rat','アマミトゲネズミ','Tokudaia osimensis','哺乳類','森','奄美大島','森に暮らす、とげのあるネズミ。','背中にはとげ状の毛。徳之島のトゲネズミとは別の種です。'),
 ('tokunoshima-spiny-rat','トクノシマトゲネズミ','Tokudaia tokunoshimensis','哺乳類','森','徳之島','徳之島で育まれた、小さな命。','2006年に別種として区別された、徳之島固有のネズミです。'),
 ('long-haired-rat','ケナガネズミ','Diplothrix legata','哺乳類','森','奄美大島・徳之島','長い尾で、枝から枝へ。','尾の先の白い部分と長い毛が特徴。木登りの得意な夜行性のネズミです。'),
 ('orii-bat','オリイコキクガシラコウモリ','Rhinolophus cornutus orii','哺乳類','森','奄美大島・加計呂麻島・徳之島・沖永良部島','日が沈んだら、虫を探しに。','洞窟などで休み、夜に昆虫を捕らえます。休息場所に入り込まず、静かに見守りましょう。'),
 ('orii-shrew','オリイジネズミ','Crocidura orii','哺乳類','森','奄美大島・加計呂麻島・徳之島','まだ、謎の多い森の住人。','生態の分かっていない点も多い小型の哺乳類です。'),
 ('watase-shrew','ワタセジネズミ','Crocidura watasei','哺乳類','里','','親子が列になって、お引っ越し。','子が前の個体につかまるキャラバン行動が知られています。'),
 ('amami-woodcock','アマミヤマシギ','Scolopax mira','鳥類','森','','長いくちばしで、地面を探す。','林道にも出ることがあります。夜の運転では小さな生き物にも気を配りましょう。'),
 ('ryukyu-robin','アカヒゲ','Larvivora komadori','鳥類','森','','森に響く、小さな歌い手。','雄は黒い顔とのど、赤茶色の背が特徴。雌とは顔つきが異なります。'),
 ('ryukyu-scops-owl','リュウキュウコノハズク','Otus elegans elegans','鳥類','森','','木の穴で暮らす、小さなフクロウ。','樹洞を子育てに使います。木の穴をのぞき込まずに観察しましょう。'),
 ('black-wood-pigeon','カラスバト','Columba janthina janthina','鳥類','森','','黒い羽に、ひそかな光沢。','光の当たり方で羽に緑や紫のつやが見えます。'),
 ('green-pigeon','ズアカアオバト','Treron formosae permagnus','鳥類','森','','緑の体が、葉にとけこむ。','木の実を食べるハトの仲間。名前だけで羽の色は判断できません。'),
 ('habu','ハブ','Protobothrops flavoviridis','爬虫類','森','','遠くから、そっと観察。','毒をもつヘビです。近づいたり触ったりせず、足元にも注意しましょう。'),
 ('himehabu','ヒメハブ','Ovophis okinavensis','爬虫類','川・水辺','','湿った森の、待ち伏せ名人。','体は太く短め。毒があるため、種類の判別のために近づかないでください。'),
 ('coral-snake','ヒャン','Sinomicrurus japonicus','爬虫類','森','奄美大島・加計呂麻島・請島・与路島・徳之島','鮮やかな色にも、距離をとって。','小型でも毒をもつヘビ。徳之島の個体の分類は2021年の研究で見直されています。'),
 ('green-snake','リュウキュウアオヘビ','Cyclophiops semicarinatus','爬虫類','森','','緑の体で、落ち葉の上を。','体色には個体差があります。無毒でも野生の個体には触れず観察しましょう。'),
 ('akamata','アカマタ','Lycodon semicarinatus','爬虫類','里','','赤茶と黒の、しましま模様。','さまざまな動物を食べるヘビ。つかもうとすると咬むことがあります。'),
 ('banded-gecko','オビトカゲモドキ','Goniurosaurus splendens','爬虫類','森','徳之島','夜の森に、淡い帯。','桃色がかった横帯が目印。徳之島だけに生息する種です。'),
 ('otton-frog','オットンガエル','Babina subaspera','両生類','川・水辺','奄美大島・加計呂麻島','大きな体と、力強い前足。','渓流や周辺の森に暮らす大型のカエルです。'),
 ('amami-tip-nosed-frog','アマミハナサキガエル','Odorrana amamiensis','両生類','川・水辺','奄美大島・徳之島','長い後ろ足で、ぴょん。','渓流の近くに暮らします。体の色は褐色から緑色までさまざまです。'),
 ('amami-crocodile-newt','アマミイボイモリ','Echinotriton raffaellii','両生類','森','奄美大島・徳之島','落ち葉の下で、ひっそり。','いぼ状の突起がある陸生のイモリ。水辺と周囲の森の両方が大切です。')
]: add(*row,rank='subspecies' if len(row[2].split())==3 else 'species')
add('grey-faced-buzzard','サシバ','Butastur indicus','鳥類','里','','秋の空を渡ってくる。','南へ渡る途中で通過する個体と、奄美で冬を過ごす個体がいます。',season='冬鳥・旅鳥')
add('pale-thrush','シロハラ','Turdus pallidus','鳥類','森','','冬の落ち葉を、かさこそ。','冬に渡ってきて、地面で食べ物を探します。',season='冬鳥')
add('ruddy-kingfisher','リュウキュウアカショウビン','Halcyon coromanda bangsi','鳥類','森','','夏の森に、赤いくちばし。','春から夏に渡来する鳥。子育て中の巣には近づかないでください。',season='夏鳥',rank='subspecies')
for i,n,s,islands in [
 ('amami-stag','アマミマルバネクワガタ','Neolucanus protogenetivus protogenetivus','奄美大島・加計呂麻島・徳之島'),
 ('uke-stag','ウケジママルバネクワガタ','Neolucanus protogenetivus hamaii','請島'),
 ('amami-deer-stag','アマミシカクワガタ','Rhaetulus recticornis',''),
 ('amami-mountain-stag','アマミミヤマクワガタ','Lucanus ferriei','奄美大島'),
 ('broad-grooved-stag','スジブトヒラタクワガタ','Dorcus metacostatus',''),
 ('okinawa-peacock','オキナワカラスアゲハ','Papilio okinawensis',''),
 ('blue-tiger','リュウキュウアサギマダラ','Ideopsis similis',''),
 ('amami-dung-beetle','マルダイコクコガネ','Copris brachypterus','奄美大島・徳之島'),
 ('winter-chafer','ケブカコフキコガネ','Tricholontha papagena','奄美大島・喜界島・徳之島'),
 ('white-striped-chafer','オキナワシロスジコガネ','Polyphylla schoenfeldti',''),
 ('ferrie-longhorn','フェリエベニボシカミキリ','Rosalia ferriei','奄美大島')
]:add(i,n,s,'昆虫','森',islands,'小さな体にも、島の個性。','分布や特徴は環境省の解説で確認できます。採集せず、暮らす環境ごと観察しましょう。',source='insects',rank='subspecies' if len(s.split())==3 else 'species')

# Editorial microcopy: short factual phrases rather than punctuated slogans.
LEADS={
 'amami-rabbit':'短い耳が特徴の夜行性のウサギ',
 'lidths-jay':'青と赤茶の羽をもつ奄美の鳥',
 'amami-ishikawa-frog':'緑の体に金色の斑点があるカエル',
 'green-turtle':'海を泳ぐ大きなウミガメ',
 'camponotus-amamianus':'黒くつやのあるオオアリの仲間',
 'amami-spiny-rat':'とげ状の毛をもつ奄美大島固有のネズミ',
 'tokunoshima-spiny-rat':'徳之島固有のトゲネズミ',
 'long-haired-rat':'木登りが得意な大型のネズミ',
 'orii-bat':'夜に昆虫を捕らえるコウモリ',
 'orii-shrew':'生態に不明な点も多い小型の哺乳類',
 'watase-shrew':'親子のキャラバン行動が知られるジネズミ',
 'amami-woodcock':'長いくちばしで地面の餌を探す鳥',
 'ryukyu-robin':'雌雄で顔の色が異なる森の小鳥',
 'ryukyu-scops-owl':'木の穴を子育てに使う小型のフクロウ',
 'black-wood-pigeon':'緑や紫の光沢がある黒いハト',
 'green-pigeon':'木の実を食べる緑色のハト',
 'habu':'奄美の森や人里に暮らす有毒のヘビ',
 'himehabu':'湿った森に暮らす有毒のヘビ',
 'coral-snake':'鮮やかな模様をもつ有毒のヘビ',
 'green-snake':'ミミズなどを食べるヘビ',
 'akamata':'赤褐色と黒褐色の横帯があるヘビ',
 'banded-gecko':'淡い横帯が特徴の徳之島固有種',
 'otton-frog':'渓流や周辺の森に暮らす大型のカエル',
 'amami-tip-nosed-frog':'長い後ろ足で跳ぶ渓流のカエル',
 'amami-crocodile-newt':'森の落ち葉の下などに暮らすイモリ',
 'grey-faced-buzzard':'渡りの途中や越冬で奄美を訪れるタカ',
 'pale-thrush':'冬に渡来して地面で餌を探す鳥',
 'ruddy-kingfisher':'春から夏に渡来する赤いくちばしの鳥'
}
for entry in entries:
 entry['lead']=LEADS.get(entry['id'],entry['name']+'の分布と特徴')

# These are source records, NOT a verified current distribution checklist.
records=[]
for source,island in [('tokunoshima-fishes','徳之島'),('okinoerabu-fishes','沖永良部島')]:
 text=(ROOT/'research'/f'{source}.txt').read_text()
 for p,page in enumerate(text.split('\f'),1):
  lines=page.splitlines()
  for ix,line in enumerate(lines[:-1]):
   # A heading followed immediately by an original Japanese-name field.
   m=re.match(r'^([A-Z][a-z]+ (?:[a-z][a-z-]+|sp\.)(?: [a-z][a-z-]+)?)(?=\s|$)',line.strip())
   nextline=lines[ix+1].strip()
   if m and nextline.startswith('[Jpn name:'):
    sci=m.group(1);roman=nextline.split(']',1)[0].removeprefix('[Jpn name:').strip()
    records.append(dict(scientificAsPrinted=sci,japaneseRomanizedAsPrinted=roman,source=source,pdfPage=p,island=island,review='unreviewed',note='刊行時点の文献・標本記録。現行学名・同定・現在の生息は未照合。'))
text=unicodedata.normalize('NFKC',(ROOT/'research/dragonflies.txt').read_text())
found={}
for p,page in enumerate(text.split('\f'),1):
 for m in re.finditer(r'(?:^|\s)(\d{1,2})\s+([ァ-ヺー]{3,})',page):
  num=int(m.group(1))
  if 1<=num<=56: found[num]={'name':m.group(2),'source':'dragonflies','pdfPage':p,'sourceNumber':num,'review':'unreviewed','note':'亜種を含む資料上の項目。学名・島別記録は照合中。'}
# PDF last row positions the labels above the numbers; manually verified on page 5.
for num,name in [(55,'アキアカネ'),(56,'ヒメハネビロトンボ')]:
 found[num]={'name':name,'source':'dragonflies','pdfPage':5,'sourceNumber':num,'review':'unreviewed','note':'亜種を含む資料上の項目。学名・島別記録は照合中。'}
records.extend(found[k] for k in sorted(found))
ROOT.joinpath('data/species.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n')
ROOT.joinpath('data/sources.json').write_text(json.dumps(SOURCES,ensure_ascii=False,indent=2)+'\n')
ROOT.joinpath('data/checklist-records.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
with (ROOT/'data/checklist-records.csv').open('w',newline='') as f:
 keys=['name','scientificAsPrinted','japaneseRomanizedAsPrinted','island','source','pdfPage','sourceNumber','review','note'];w=csv.DictWriter(f,keys,lineterminator='\n');w.writeheader();w.writerows(records)
print(json.dumps({'editorialEntries':len(entries),'documentRecords':len(records),'dragonflyItems':len(found),'fishRecords':len(records)-len(found),'coverage':'incomplete'},ensure_ascii=False))
