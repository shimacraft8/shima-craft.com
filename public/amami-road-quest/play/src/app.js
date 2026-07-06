import { ROUTES, getRouteById } from './data/routes.js';
import { buildPath, samplePath, projectPathToSvg, svgPathD, pointAlongSvg, formatDistance, clamp } from './core/route-engine.js';
import { GameEngine, getNextCheckpoint } from './core/game-engine.js';
import { loadProgress, saveRouteResult, saveApiKey, loadApiKey, clearApiKey, isApiKeyRemembered, loadSiteConfigKey } from './core/storage.js';
import { DemoPanoramaProvider } from './providers/demo-panorama.js';
import { GoogleEmbedPanoramaProvider } from './providers/google-embed-panorama.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  home: $('#home'), play: $('#play'), questForm: $('#questForm'), routeGrid: $('#routeGrid'), modeNotice: $('#modeNotice'),
  questCode: $('#questCode'), questTitle: $('#questTitle'), scoreValue: $('#scoreValue'), viewerModeBadge: $('#viewerModeBadge'),
  demoPanorama: $('#demoPanorama'), embedPanorama: $('#embedPanorama'), sceneLabel: $('#sceneLabel'), sceneSubLabel: $('#sceneSubLabel'),
  nextCheckpointLabel: $('#nextCheckpointLabel'), nextCheckpointDistance: $('#nextCheckpointDistance'), floatingEvent: $('#floatingEvent'),
  playPauseButton: $('#playPauseButton'), backButton: $('#backButton'), forwardButton: $('#forwardButton'), speedSelect: $('#speedSelect'),
  routeShadow: $('#routeShadow'), routeBase: $('#routeBase'), routeDone: $('#routeDone'), checkpointLayer: $('#checkpointLayer'), vehicleMarker: $('#vehicleMarker'),
  progressPercent: $('#progressPercent'), progressBar: $('#progressBar'), remainingDistance: $('#remainingDistance'), discoveryCount: $('#discoveryCount'), accuracyValue: $('#accuracyValue'),
  mapRouteName: $('#mapRouteName'), guideMessage: $('#guideMessage'), journeyList: $('#journeyList'),
  eventModal: $('#eventModal'), eventIcon: $('#eventIcon'), eventKicker: $('#eventKicker'), eventTitle: $('#eventTitle'), eventDescription: $('#eventDescription'), eventInteractive: $('#eventInteractive'), eventContinueButton: $('#eventContinueButton'),
  goalModal: $('#goalModal'), goalTitle: $('#goalTitle'), goalSubtitle: $('#goalSubtitle'), goalScore: $('#goalScore'), goalDiscovery: $('#goalDiscovery'), goalAccuracy: $('#goalAccuracy'), earnedTitle: $('#earnedTitle'),
  settingsModal: $('#settingsModal'), helpModal: $('#helpModal'), apiKeyInput: $('#apiKeyInput'), rememberKeyInput: $('#rememberKeyInput'),
  startOverlay: $('#startOverlay'), startOverlayRoute: $('#startOverlayRoute'), beginJourneyButton: $('#beginJourneyButton'), siteKeyNotice: $('#siteKeyNotice'),
  toast: $('#toast'), liveRegion: $('#liveRegion')
};

const state = {
  selectedRouteId: ROUTES[0].id,
  activeRoute: null,
  path: null,
  svgPoints: null,
  game: null,
  provider: null,
  playing: false,
  speed: 2,
  progress: 0,
  lastFrame: 0,
  baseDurationSeconds: 70,
  animationFrame: null,
  modalWasPlaying: false,
  activeModal: null,
  lastFocused: null,
  currentSample: null,
  vehicle: 'car'
};

function renderRouteCards() {
  const progress = loadProgress();
  elements.routeGrid.replaceChildren();
  ROUTES.forEach((route) => {
    const result = progress[route.id];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'route-card';
    button.dataset.routeId = route.id;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', String(route.id === state.selectedRouteId));
    button.style.setProperty('--card-a', route.theme[0]);
    button.style.setProperty('--card-b', route.theme[1]);
    const stars = '★'.repeat(route.difficulty) + '☆'.repeat(3 - route.difficulty);
    button.innerHTML = `
      <span class="route-icon" aria-hidden="true">${route.icon}</span>
      <small>${route.code}${result?.completed ? ' · CLEAR' : ''}</small>
      <strong>${route.title}</strong>
      <p>${route.subtitle}</p>
      <span class="route-meta"><span>${stars}</span><span>${route.duration}</span>${result?.bestScore ? `<span>${result.bestScore}pt</span>` : ''}</span>`;
    button.addEventListener('click', () => selectRoute(route.id));
    elements.routeGrid.append(button);
  });
}

function selectRoute(routeId) {
  state.selectedRouteId = routeId;
  $$('.route-card').forEach((card) => card.setAttribute('aria-checked', String(card.dataset.routeId === routeId)));
  showToast(`${getRouteById(routeId).shortTitle}を選択しました`);
}

function selectedRadio(name, fallback) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value ?? fallback;
}

function createProvider(route, initialSample) {
  const apiKey = loadApiKey();
  if (apiKey && !navigator.onLine) {
    showToast('オフラインのため、デモ景観で開始します');
  } else if (apiKey) {
    try {
      elements.demoPanorama.hidden = true;
      const provider = new GoogleEmbedPanoramaProvider(elements.embedPanorama, apiKey);
      provider.mount(route, initialSample);
      elements.viewerModeBadge.textContent = 'LIVE EMBED';
      return provider;
    } catch (error) {
      console.error(error);
      showToast('実写モードを開始できないため、デモ景観に切り替えました');
    }
  }
  elements.embedPanorama.hidden = true;
  const provider = new DemoPanoramaProvider(elements.demoPanorama, elements.sceneLabel, elements.sceneSubLabel);
  provider.mount(route);
  elements.viewerModeBadge.textContent = 'DEMO';
  return provider;
}

function startQuest(routeId = state.selectedRouteId) {
  cleanupQuest();
  const route = getRouteById(routeId);
  state.activeRoute = route;
  state.path = buildPath(route.waypoints, 190);
  state.svgPoints = projectPathToSvg(state.path);
  state.game = new GameEngine(route);
  state.progress = 0;
  state.speed = Number(selectedRadio('speed', '2'));
  state.vehicle = selectedRadio('vehicle', 'car');
  state.baseDurationSeconds = 55 + route.difficulty * 18;
  state.currentSample = samplePath(state.path, 0);
  state.provider = createProvider(route, state.currentSample);
  state.playing = false;
  state.lastFrame = performance.now();

  elements.speedSelect.value = String(state.speed);
  elements.playPauseButton.textContent = '▶';
  elements.playPauseButton.setAttribute('aria-label', '再生');
  elements.startOverlayRoute.textContent = route.shortTitle;
  elements.startOverlay.hidden = false;
  elements.questCode.textContent = route.code;
  elements.questTitle.textContent = route.title;
  elements.mapRouteName.textContent = route.shortTitle;
  renderMap(route);
  renderJourney(route);
  updateDisplay();

  elements.home.hidden = true;
  elements.play.hidden = false;
  window.scrollTo({ top: 0, behavior: 'instant' });
  elements.liveRegion.textContent = `${route.title}の準備ができました。出発ボタンで開始します`;
  requestAnimationFrame(() => elements.beginJourneyButton.focus());
  state.animationFrame = requestAnimationFrame(tick);
}

function beginJourney() {
  if (elements.startOverlay.hidden) return;
  elements.startOverlay.hidden = true;
  state.playing = true;
  state.lastFrame = performance.now();
  elements.playPauseButton.textContent = 'Ⅱ';
  elements.playPauseButton.setAttribute('aria-label', '一時停止');
  elements.liveRegion.textContent = '出発しました';
  elements.playPauseButton.focus();
}

function cleanupQuest() {
  if (state.animationFrame) cancelAnimationFrame(state.animationFrame);
  state.animationFrame = null;
  state.provider?.destroy?.();
  state.provider = null;
  state.playing = false;
  state.lastFrame = 0;
  elements.startOverlay.hidden = true;
}

function endQuest() {
  cleanupQuest();
  closeAllModals();
  elements.play.hidden = true;
  elements.home.hidden = false;
  renderRouteCards();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function tick(now) {
  const deltaSeconds = Math.min(.1, Math.max(0, (now - state.lastFrame) / 1000));
  state.lastFrame = now;
  if (state.playing && !state.activeModal) {
    const increment = (deltaSeconds / state.baseDurationSeconds) * state.speed;
    setProgress(state.progress + increment);
  }
  state.provider?.flush?.();
  state.animationFrame = requestAnimationFrame(tick);
}

function setProgress(value) {
  const previous = state.progress;
  state.progress = clamp(value, 0, 1);
  const events = state.game.setProgress(state.progress);
  updateDisplay();
  if (state.progress > previous) handleEvents(events);
}

function handleEvents(events) {
  if (!events.length || state.activeModal) return;
  const event = events[0];
  if (event.type === 'checkpoint') openCheckpoint(event.checkpoint);
  if (event.type === 'quiz') openQuiz(event.quiz);
  if (event.type === 'goal') openGoal();
}

function updateDisplay() {
  if (!state.activeRoute || !state.path || !state.game) return;
  const route = state.activeRoute;
  const sample = samplePath(state.path, state.progress);
  state.currentSample = sample;
  state.provider?.update?.({ ...sample, progress: state.progress, playing: state.playing });
  const percent = Math.round(state.progress * 100);
  elements.scoreValue.textContent = state.game.score.toLocaleString('ja-JP');
  elements.progressPercent.textContent = `${percent}%`;
  elements.progressBar.style.width = `${percent}%`;
  elements.remainingDistance.textContent = formatDistance(sample.metersRemaining);
  elements.discoveryCount.textContent = `${state.game.discoveries} / ${route.checkpoints.length}`;
  elements.accuracyValue.textContent = state.game.accuracy == null ? '—' : `${state.game.accuracy}%`;

  const svgPoint = pointAlongSvg(state.svgPoints, state.progress);
  elements.vehicleMarker.setAttribute('transform', `translate(${svgPoint.x.toFixed(2)} ${svgPoint.y.toFixed(2)})`);
  const emoji = state.vehicle === 'walk' ? '🚶' : '🚙';
  elements.vehicleMarker.querySelector('text').textContent = emoji;
  const pathLength = elements.routeBase.getTotalLength?.() ?? 1000;
  elements.routeDone.style.strokeDasharray = String(pathLength);
  elements.routeDone.style.strokeDashoffset = String(pathLength * (1 - state.progress));

  const next = getNextCheckpoint(route, state.progress);
  if (next) {
    elements.nextCheckpointLabel.textContent = next.title;
    elements.nextCheckpointDistance.textContent = `あと ${formatDistance(Math.max(0, (next.progress - state.progress) * state.path.totalMeters))}`;
  } else {
    elements.nextCheckpointLabel.textContent = 'ゴールへ向かっています';
    elements.nextCheckpointDistance.textContent = `あと ${formatDistance(sample.metersRemaining)}`;
  }
  updateJourney();
}

function renderMap(route) {
  const d = svgPathD(state.svgPoints);
  elements.routeShadow.setAttribute('d', d);
  elements.routeBase.setAttribute('d', d);
  elements.routeDone.setAttribute('d', d);
  elements.checkpointLayer.replaceChildren();
  route.checkpoints.forEach((checkpoint, index) => {
    const point = pointAlongSvg(state.svgPoints, checkpoint.progress);
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('transform', `translate(${point.x} ${point.y})`);
    group.innerHTML = `<circle r="17" fill="#fffdf7" stroke="#f27963" stroke-width="5"/><text text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="900">${index + 1}</text>`;
    elements.checkpointLayer.append(group);
  });
}

function renderJourney(route) {
  elements.journeyList.replaceChildren();
  route.checkpoints.forEach((checkpoint, index) => {
    const item = document.createElement('li');
    item.dataset.checkpointIndex = String(index);
    item.innerHTML = `<span class="node">${index + 1}</span><span>${checkpoint.title}</span>`;
    elements.journeyList.append(item);
  });
  const goal = document.createElement('li');
  goal.dataset.goal = 'true';
  goal.innerHTML = '<span class="node">🏁</span><span>目的地に到着</span>';
  elements.journeyList.append(goal);
}

function updateJourney() {
  const completed = state.game.completedCheckpoints.size;
  [...elements.journeyList.children].forEach((item, index, list) => {
    item.classList.toggle('done', index < completed || (index === list.length - 1 && state.game.goalReached));
    item.classList.toggle('current', index === completed && !state.game.goalReached);
  });
  if (state.game.goalReached) elements.guideMessage.textContent = 'おつかれさま！目的地に到着したよ。';
  else if (state.game.quizAnswered) elements.guideMessage.textContent = '分岐も確認できたね。ゴールまであと少し！';
  else if (state.game.discoveries > 0) elements.guideMessage.textContent = 'チェックポイント発見！次の目印へ進もう。';
  else elements.guideMessage.textContent = '景色と地図を見比べながら進もう！';
}

function pauseForModal(modal) {
  state.modalWasPlaying = state.playing;
  state.playing = false;
  openModal(modal);
  elements.playPauseButton.textContent = '▶';
}

function resumeAfterModal() {
  if (state.modalWasPlaying && !state.game?.goalReached) {
    state.playing = true;
    elements.playPauseButton.textContent = 'Ⅱ';
  }
}

function openCheckpoint(checkpoint) {
  elements.eventIcon.textContent = checkpoint.icon;
  elements.eventKicker.textContent = 'CHECK POINT';
  elements.eventTitle.textContent = checkpoint.title;
  elements.eventDescription.textContent = checkpoint.description;
  elements.eventInteractive.replaceChildren();
  elements.eventContinueButton.disabled = false;
  elements.eventContinueButton.textContent = `+${checkpoint.points} pt　冒険を続ける`;
  pauseForModal(elements.eventModal);
  elements.liveRegion.textContent = `チェックポイント、${checkpoint.title}`;
}

function openQuiz(quiz) {
  elements.eventIcon.textContent = '？';
  elements.eventKicker.textContent = 'ROUTE CHALLENGE';
  elements.eventTitle.textContent = quiz.question;
  elements.eventDescription.textContent = '正しいと思う答えを選んでください。';
  elements.eventInteractive.replaceChildren();
  const options = document.createElement('div');
  options.className = 'quiz-options';
  quiz.choices.forEach((choice, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quiz-option';
    button.textContent = `${String.fromCharCode(65 + index)}. ${choice}`;
    button.addEventListener('click', () => answerQuiz(index, options, quiz));
    options.append(button);
  });
  elements.eventInteractive.append(options);
  elements.eventContinueButton.disabled = true;
  elements.eventContinueButton.textContent = '答えを選んでください';
  pauseForModal(elements.eventModal);
}

function answerQuiz(index, options, quiz) {
  const result = state.game.answerQuiz(index);
  if (!result.accepted) return;
  [...options.children].forEach((button, buttonIndex) => {
    button.disabled = true;
    if (buttonIndex === quiz.correct) button.classList.add('correct');
    if (buttonIndex === index && !result.correct) button.classList.add('wrong');
  });
  elements.eventDescription.textContent = result.correct ? quiz.explanation : `惜しい！ 正解は「${quiz.choices[quiz.correct]}」。${quiz.explanation.replace(/^正解！\s*/, '')}`;
  elements.eventContinueButton.disabled = false;
  elements.eventContinueButton.textContent = result.correct ? `+${result.points} pt　冒険を続ける` : '確認して冒険を続ける';
  updateDisplay();
}

function openGoal() {
  state.playing = false;
  saveRouteResult(state.activeRoute.id, state.game.snapshot());
  elements.goalTitle.textContent = `${state.activeRoute.shortTitle.split(' → ')[1]}に到着！`;
  elements.goalSubtitle.textContent = `${state.activeRoute.shortTitle}をクリアしました。`;
  elements.goalScore.textContent = `${state.game.score.toLocaleString('ja-JP')} pt`;
  elements.goalDiscovery.textContent = `${state.game.discoveries} / ${state.activeRoute.checkpoints.length}`;
  elements.goalAccuracy.textContent = state.game.accuracy == null ? '—' : `${state.game.accuracy}%`;
  elements.earnedTitle.textContent = state.activeRoute.titleEarned;
  openModal(elements.goalModal);
  elements.liveRegion.textContent = 'ミッションクリア。目的地に到着しました。';
}

function openModal(modal) {
  state.lastFocused = document.activeElement;
  state.activeModal = modal;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => modal.querySelector('button:not([disabled]), input, select')?.focus());
}

function closeModal(modal) {
  modal.hidden = true;
  if (state.activeModal === modal) state.activeModal = null;
  document.body.style.overflow = '';
  state.lastFocused?.focus?.();
}

function closeAllModals() {
  [elements.eventModal, elements.goalModal, elements.settingsModal, elements.helpModal].forEach((modal) => { modal.hidden = true; });
  state.activeModal = null;
  document.body.style.overflow = '';
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = setTimeout(() => { elements.toast.hidden = true; }, 2600);
}

function updateModeNotice() {
  const apiKey = loadApiKey();
  elements.modeNotice.innerHTML = apiKey
    ? '<span class="status-dot"></span><div><strong>実写Street Viewモード</strong><small>Google Maps Embed APIを使用します。エラー時はデモへ切り替えます。</small></div>'
    : '<span class="status-dot"></span><div><strong>デモ景観モード</strong><small>APIキーなしで全機能を体験できます。実写は設定から切り替え。</small></div>';
}

function openSettings() {
  elements.siteKeyNotice.hidden = !loadSiteConfigKey();
  elements.apiKeyInput.value = loadApiKey();
  elements.rememberKeyInput.checked = isApiKeyRemembered();
  openModal(elements.settingsModal);
}

function saveSettings() {
  const key = elements.apiKeyInput.value.trim();
  const googleApiKeyPrefix = ['AI', 'za'].join('');
  if (key && (key.length < 20 || !key.startsWith(googleApiKeyPrefix))) {
    showToast('APIキーの形式を確認してください');
    elements.apiKeyInput.focus();
    return;
  }
  saveApiKey(key, elements.rememberKeyInput.checked);
  updateModeNotice();
  closeModal(elements.settingsModal);
  showToast(key ? '実写モードを有効にしました' : 'デモ景観モードにしました');
}

function bindEvents() {
  elements.questForm.addEventListener('submit', (event) => { event.preventDefault(); startQuest(); });
  $('#exitButton').addEventListener('click', endQuest);
  $('#settingsButton').addEventListener('click', openSettings);
  $('#helpButton').addEventListener('click', () => openModal(elements.helpModal));
  $('#saveSettingsButton').addEventListener('click', saveSettings);
  $('#clearKeyButton').addEventListener('click', () => { clearApiKey(); elements.apiKeyInput.value = ''; elements.rememberKeyInput.checked = false; updateModeNotice(); showToast('APIキーを削除しました'); });
  elements.eventContinueButton.addEventListener('click', () => { closeModal(elements.eventModal); resumeAfterModal(); });
  $('#replayButton').addEventListener('click', () => { closeModal(elements.goalModal); startQuest(state.activeRoute.id); });
  $('#nextQuestButton').addEventListener('click', () => {
    const index = ROUTES.findIndex((route) => route.id === state.activeRoute.id);
    const next = ROUTES[(index + 1) % ROUTES.length];
    closeModal(elements.goalModal);
    state.selectedRouteId = next.id;
    startQuest(next.id);
  });
  elements.beginJourneyButton.addEventListener('click', beginJourney);
  elements.playPauseButton.addEventListener('click', () => {
    if (!elements.startOverlay.hidden) {
      beginJourney();
      return;
    }
    state.playing = !state.playing;
    elements.playPauseButton.textContent = state.playing ? 'Ⅱ' : '▶';
    elements.playPauseButton.setAttribute('aria-label', state.playing ? '一時停止' : '再生');
  });
  elements.backButton.addEventListener('click', () => setProgress(state.progress - .045));
  elements.forwardButton.addEventListener('click', () => setProgress(state.progress + .045));
  elements.speedSelect.addEventListener('change', () => { state.speed = Number(elements.speedSelect.value); showToast(`再生速度を×${state.speed}に変更しました`); });
  $('#recenterButton').addEventListener('click', () => { state.provider?.recenter?.(state.currentSample); showToast('進行方向へ戻しました'); });
  $$('[data-close-modal]').forEach((button) => button.addEventListener('click', () => {
    const modal = button.closest('.modal-backdrop');
    closeModal(modal);
    if (modal === elements.eventModal) resumeAfterModal();
  }));
  [elements.settingsModal, elements.helpModal].forEach((modal) => modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(modal); }));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' && state.activeModal) {
      const focusables = [...state.activeModal.querySelectorAll('button:not([disabled]), input, select, a[href]')];
      if (focusables.length) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    if (event.key === 'Escape' && state.activeModal && state.activeModal !== elements.goalModal) {
      const modal = state.activeModal;
      closeModal(modal);
      if (modal === elements.eventModal) resumeAfterModal();
    }
    if (!elements.play.hidden && !state.activeModal && event.code === 'Space') {
      event.preventDefault();
      elements.playPauseButton.click();
    }
  });
}

function init() {
  renderRouteCards();
  updateModeNotice();
  bindEvents();
  window.addEventListener('offline', () => showToast('オフラインになりました。実写表示には接続が必要です'));
  window.addEventListener('online', () => showToast('接続が回復しました'));
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
  document.documentElement.dataset.appReady = 'true';
}

window.__AMAMI_APP__ = {
  startQuest,
  endQuest,
  begin: beginJourney,
  setProgress,
  getState: () => ({
    routeId: state.activeRoute?.id ?? null,
    progress: state.progress,
    score: state.game?.score ?? 0,
    discoveries: state.game?.discoveries ?? 0,
    goalReached: state.game?.goalReached ?? false,
    activeModal: state.activeModal?.id ?? null
  })
};

init();
