// HUD: health, cash, wanted stars, clock, speed, objective banner, feed,
// crosshair and the 2D minimap canvas. All DOM — the 3D view stays clean.
import { CITY_HALF, MAX_WANTED } from './config.js';

export function createHud() {
  const root = document.getElementById('hud');
  const minimap = document.getElementById('minimap');
  const mapCtx = minimap.getContext('2d');
  const feed = document.getElementById('feed');
  const feedLines = [];
  return {
    root,
    minimap,
    mapCtx,
    feed,
    feedLines,
    setHealth(value) {
      document.getElementById('health-fill').style.width = `${Math.max(0, Math.min(100, value))}%`;
      document.getElementById('health-num').textContent = `${Math.ceil(Math.max(0, value))}`;
    },
    setCash(value) {
      document.getElementById('cash-num').textContent = `$${Math.floor(value).toLocaleString('en-US')}`;
    },
    setWanted(level) {
      let stars = '';
      for (let i = 0; i < MAX_WANTED; i += 1) stars += i < level ? '★' : '☆';
      const element = document.getElementById('wanted-stars');
      element.textContent = stars;
      element.classList.toggle('hot', level >= 3);
    },
    setClock(minutes) {
      const hours = Math.floor(minutes / 60) % 24;
      const mins = Math.floor(minutes % 60);
      document.getElementById('clock-num').textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    },
    setSpeed(kmh, inCar) {
      const element = document.getElementById('speed');
      element.textContent = inCar ? `${Math.round(kmh)} km/h` : '';
    },
    setAmmo(ammo, reserve, reloading) {
      document.getElementById('ammo-num').textContent = reloading ? 'RELOADING…' : `🔫 ${ammo} / ${reserve}`;
    },
    setObjective(text) {
      document.getElementById('objective-text').textContent = text;
    },
    setHint(text) {
      document.getElementById('hint-text').textContent = text;
    },
    setMissionTitle(text) {
      document.getElementById('mission-title').textContent = text;
    },
    showCrosshair(show) {
      document.getElementById('crosshair').style.display = show ? 'block' : 'none';
    },
    showBanner(text, subtext) {
      const banner = document.getElementById('banner');
      document.getElementById('banner-title').textContent = text;
      document.getElementById('banner-sub').textContent = subtext || '';
      banner.classList.add('show');
      window.clearTimeout(banner._timer);
      banner._timer = window.setTimeout(() => banner.classList.remove('show'), 3200);
    },
    addFeed(text) {
      feedLines.push(text);
      while (feedLines.length > 5) feedLines.shift();
      feed.innerHTML = feedLines.map((line) => `<div>${line}</div>`).join('');
    },
    showEndScreen(kind, text) {
      const overlay = document.getElementById('end-screen');
      document.getElementById('end-title').textContent = kind;
      document.getElementById('end-text').textContent = text;
      overlay.classList.add('show');
    },
    hideEndScreen() {
      document.getElementById('end-screen').classList.remove('show');
    },
    showStart(hasSave) {
      document.getElementById('start-screen').classList.add('show');
      document.getElementById('continue-btn').style.display = hasSave ? 'inline-block' : 'none';
    },
    hideStart() {
      document.getElementById('start-screen').classList.remove('show');
    },
    showPause(show) {
      document.getElementById('pause-screen').classList.toggle('show', show);
    },
  };
}

// Minimap: roads as a grid, plaza and pier marks, mission target (yellow),
// police (blue/red), player arrow (white) and north at the top.
export function drawMinimap(hud, state) {
  const ctx = hud.mapCtx;
  const size = 170;
  const scale = size / (CITY_HALF * 2 + 40);
  const toMap = (x, z) => [(x + CITY_HALF + 20) * scale, (z + CITY_HALF + 20) * scale];
  ctx.fillStyle = '#0e2a3a';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#2a6f8f';
  ctx.fillRect(size - 14, 0, 14, size);
  ctx.strokeStyle = '#3a3f46';
  ctx.lineWidth = 5;
  for (let i = 0; i <= 7; i += 1) {
    const road = -CITY_HALF + i * 54 + 7;
    const [ax] = toMap(road, 0);
    ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(ax, size); ctx.stroke();
    const [, bz] = toMap(0, road);
    ctx.beginPath(); ctx.moveTo(0, bz); ctx.lineTo(size, bz); ctx.stroke();
  }
  const [px, pz] = toMap(state.landmarks.plaza.x, state.landmarks.plaza.z);
  ctx.fillStyle = '#c9b18a';
  ctx.fillRect(px - 6, pz - 6, 12, 12);
  if (state.missionTarget) {
    const [tx, tz] = toMap(state.missionTarget.x, state.missionTarget.z);
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath(); ctx.arc(tx, tz, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(tx, tz, 10 + Math.sin(performance.now() * 0.005) * 3, 0, Math.PI * 2); ctx.stroke();
  }
  for (const car of state.police) {
    const [cx, cz] = toMap(car.position.x, car.position.z);
    ctx.fillStyle = '#ff4444';
    ctx.beginPath(); ctx.arc(cx, cz, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  const [ux, uz] = toMap(state.playerX, state.playerZ);
  ctx.save();
  ctx.translate(ux, uz);
  ctx.rotate(state.playerHeading);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
  ctx.restore();
}
