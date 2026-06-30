'use client'

import { useEffect } from 'react'

export default function JsReadyInit() {
  useEffect(() => {
    // .nagino-yado-root にクラスを付与してアニメーションを有効化
    // body への付与は .nagino-yado-root スコープ内に body を入れられないため使えない
    document.querySelector('.nagino-yado-root')?.classList.add('nagi-js-ready')
  }, [])

  return null
}
