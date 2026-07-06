const GOOGLE_EMBED_BASE = 'https://www.google.com/maps/embed/v1/streetview';

function buildEmbedUrl(apiKey, point, heading) {
  const params = new URLSearchParams({
    key: apiKey,
    location: `${point[0].toFixed(6)},${point[1].toFixed(6)}`,
    heading: String(Math.round(heading)),
    pitch: '0',
    fov: '88'
  });
  return `${GOOGLE_EMBED_BASE}?${params.toString()}`;
}

export class GoogleEmbedPanoramaProvider {
  constructor(container, apiKey) {
    if (!apiKey) throw new Error('Google Maps Embed APIキーが設定されていません');
    this.container = container;
    this.apiKey = apiKey;
    this.iframe = null;
    this.lastIndex = -1;
    this.lastUpdateAt = 0;
    this.pending = null;
  }

  mount(route, initialSample) {
    this.container.hidden = false;
    this.container.replaceChildren();
    this.notice = document.createElement('div');
    this.notice.className = 'embed-loading';
    this.notice.setAttribute('role', 'status');
    this.notice.textContent = '実写景観を読み込んでいます…';
    this.iframe = document.createElement('iframe');
    this.iframe.title = `${route.shortTitle}のGoogle Street View`;
    this.iframe.loading = 'eager';
    this.iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    this.iframe.allowFullscreen = true;
    this.iframe.addEventListener('load', () => this.clearNotice(), { once: true });
    this.container.append(this.notice, this.iframe);
    this.noticeTimer = setTimeout(() => {
      if (this.notice?.isConnected) {
        this.notice.textContent = '読み込みに時間がかかっています。通信状況をご確認ください。実写が表示されない場合もデモ景観と冒険マップで進行できます。';
      }
    }, 12000);
    this.forceUpdate(initialSample);
  }

  clearNotice() {
    clearTimeout(this.noticeTimer);
    this.notice?.remove();
    this.notice = null;
  }

  update(sample) {
    const now = Date.now();
    if (sample.index === this.lastIndex || now - this.lastUpdateAt < 1100) {
      this.pending = sample;
      return;
    }
    this.forceUpdate(sample);
  }

  forceUpdate(sample) {
    if (!this.iframe || !sample) return;
    this.lastIndex = sample.index;
    this.lastUpdateAt = Date.now();
    this.iframe.src = buildEmbedUrl(this.apiKey, sample.point, sample.heading);
    this.pending = null;
  }

  recenter(sample) {
    this.forceUpdate(sample);
  }

  flush() {
    if (this.pending && Date.now() - this.lastUpdateAt >= 1100) this.forceUpdate(this.pending);
  }

  destroy() {
    this.clearNotice();
    this.container.replaceChildren();
    this.container.hidden = true;
    this.iframe = null;
    this.pending = null;
  }
}
