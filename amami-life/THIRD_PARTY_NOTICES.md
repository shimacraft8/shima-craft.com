# Third-party notices

## SunCalc 1.9.0

Used for local reference solar and lunar calculations.

```text
Copyright (c) 2014, Vladimir Agafonkin
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are
permitted provided that the following conditions are met:

   1. Redistributions of source code must retain the above copyright notice, this list of
      conditions and the following disclaimer.

   2. Redistributions in binary form must reproduce the above copyright notice, this list
      of conditions and the following disclaimer in the documentation and/or other materials
      provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

```

## JMA tide archive

気象庁「潮位表 奄美（AMAMI）2026年」をSHIMA CRAFTが表示用に加工。出典：https://www.data.jma.go.jp/kaiyou/db/tide/suisan/suisan.php?stn=O9

システムフォントはOSから利用し、フォントファイルは同梱していません。UI Pocketのスクリーンショットは調査資料でありアプリに含めません。その他の依存ライセンスは各npmパッケージのLICENSEを参照。公開前に配布バンドルのライセンス一覧を確定してください。

## @xmldom/xmldom 0.8.15

Local Node XML inspection, not a mobile network client.

```text
Copyright 2019 - present Christopher J. Brody and other contributors, as listed in: https://github.com/xmldom/xmldom/graphs/contributors
Copyright 2012 - 2017 @jindw <jindw@xidea.org> and other contributors, as listed in: https://github.com/jindw/xmldom/graphs/contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

```

Expo/React Native and their transitive dependencies retain their upstream licenses through npm installation. A complete production distribution license review is still required before store submission.

## 地理院タイル・気象庁台風情報・空港の画面内表示

Web0.3.6の方位図は国土地理院の淡色タイルをブラウザで読み込み色調加工。地図上に出典と加工を表示。https://maps.gsi.go.jp/help/use.html
台風の発表対象リストと実況天気図は気象庁から取得し出典を明示。実況天気図は改変しない。https://www.jma.go.jp/jma/kishou/info/coment.html
奄美空港のフライトページは公式サイトをiframe表示。転載データや許諾済みAPIとは扱わず、元の表示を維持。
SunCalc 1.9.0の完全なライセンスを公開素材 `assets/suncalc-LICENSE.txt` として提供。

## Web0.3.7の地図

Leaflet 1.9.4: Copyright (c) 2010-2023, Vladimir Agafonkin; Copyright (c) 2010-2011, CloudMade. BSD-2-Clause。全文を web/assets/leaflet-LICENSE.txt に同梱し公開ページからリンク。CSSと標準画像を含む。
地理院淡色タイル Z2–8（台風）/Z9–17（方位図）を直接読込・色調加工。国土地理院へのリンクと加工表示を各図に記載。Z2–8の追加出典:
Shoreline data is derived from: United States. National Imagery and Mapping Agency. "Vector Map Level 0 (VMAP0)." Bethesda, MD: Denver, CO: The Agency; USGS Information Services, 1997.
https://maps.gsi.go.jp/development/ichiran.html の淡色地図欄に基づく。
台風 forecast.json/specifications.json は気象庁から取得・加工、出典・発表/取得時刻・予報円の意味を明示。Yahoo!のデータや画像は使用していない。

## Web0.3.8の方位図

太陽/月は色調加工した地理院タイルからOSM Standardへ変更。© OpenStreetMap contributors（https://www.openstreetmap.org/copyright）。ODbLのOSMデータに基づく標準タイルをそのまま直接表示。地図内に常時出典/ライセンスへのリンクを表示する。台風の地理院タイルと追加出典は継続。OSMF配信条件: https://operations.osmfoundation.org/policies/tiles/ 。先読み/一括取得/オフライン配布はしない。
