const SCENE_LABELS = {
  coast: ['海岸ドライブ', '潮風を感じるデモ景観'],
  field: ['島の文化エリアへ', '緑の中を進むデモ景観'],
  mountain: ['山あいのロングルート', 'カーブを意識するデモ景観'],
  forest: ['亜熱帯の自然ルート', '森と川へ向かうデモ景観'],
  harbor: ['南部の港町ルート', '海へ続く道のデモ景観']
};

export class DemoPanoramaProvider {
  constructor(container, labelElement, subLabelElement) {
    this.container = container;
    this.labelElement = labelElement;
    this.subLabelElement = subLabelElement;
    this.route = null;
  }

  mount(route) {
    this.route = route;
    this.container.hidden = false;
    this.container.dataset.scene = route.scene;
    const [label, subLabel] = SCENE_LABELS[route.scene] ?? SCENE_LABELS.coast;
    this.labelElement.textContent = label;
    this.subLabelElement.textContent = subLabel;
  }

  update({ progress, heading, playing }) {
    const road = this.container.querySelector('.demo-road');
    const mountains = this.container.querySelector('.demo-mountains');
    const palms = this.container.querySelector('.demo-palms');
    if (road) road.style.transform = `translateX(${Math.sin(progress * Math.PI * 5) * 4}%) skewX(${Math.sin((heading * Math.PI) / 180) * 3}deg)`;
    if (mountains) mountains.style.transform = `translateX(${-progress * 7}%) scale(1.12)`;
    if (palms) palms.style.transform = `translateX(${Math.sin(progress * 22) * 2}%)`;
    this.container.classList.toggle('is-paused', !playing);
    this.container.style.filter = `saturate(${1 + Math.sin(progress * Math.PI) * .12})`;
  }

  recenter() {
    // Demo mode always faces forward.
  }

  destroy() {
    this.container.hidden = true;
  }
}
