const EARTH_RADIUS_M = 6371000;
const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function haversineMeters(a, b) {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const p = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(p), Math.sqrt(1 - p));
}

export function bearingDegrees(a, b) {
  const [lat1, lng1] = a.map(toRad);
  const [lat2, lng2] = b.map(toRad);
  const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function interpolatePoint(a, b, ratio) {
  const t = clamp(ratio, 0, 1);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export function buildPath(waypoints, targetStepMeters = 180) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) throw new Error('waypoints must contain at least two coordinates');
  const points = [waypoints[0]];
  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const start = waypoints[i];
    const end = waypoints[i + 1];
    const distance = haversineMeters(start, end);
    const parts = Math.max(1, Math.ceil(distance / targetStepMeters));
    for (let j = 1; j <= parts; j += 1) points.push(interpolatePoint(start, end, j / parts));
  }
  return enrichPath(points);
}

export function enrichPath(points) {
  let total = 0;
  const cumulative = [0];
  for (let i = 1; i < points.length; i += 1) {
    total += haversineMeters(points[i - 1], points[i]);
    cumulative.push(total);
  }
  return { points, cumulative, totalMeters: total };
}

export function samplePath(path, progress) {
  const p = clamp(progress, 0, 1);
  const target = path.totalMeters * p;
  let index = path.cumulative.findIndex((distance) => distance >= target);
  if (index <= 0) index = 1;
  if (index < 0) index = path.points.length - 1;
  const previousDistance = path.cumulative[index - 1];
  const segmentLength = Math.max(1, path.cumulative[index] - previousDistance);
  const ratio = (target - previousDistance) / segmentLength;
  const point = interpolatePoint(path.points[index - 1], path.points[index], ratio);
  return {
    point,
    heading: bearingDegrees(path.points[index - 1], path.points[index]),
    index,
    metersTravelled: target,
    metersRemaining: Math.max(0, path.totalMeters - target)
  };
}

export function projectPathToSvg(path, width = 1000, height = 320, padding = 55) {
  const lats = path.points.map(([lat]) => lat);
  const lngs = path.points.map(([, lng]) => lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(0.000001, maxLat - minLat);
  const lngSpan = Math.max(0.000001, maxLng - minLng);
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;
  const scale = Math.min(usableW / lngSpan, usableH / latSpan);
  const drawnW = lngSpan * scale;
  const drawnH = latSpan * scale;
  const offsetX = (width - drawnW) / 2;
  const offsetY = (height - drawnH) / 2;
  return path.points.map(([lat, lng]) => ({
    x: offsetX + (lng - minLng) * scale,
    y: offsetY + (maxLat - lat) * scale
  }));
}

export function svgPathD(points) {
  if (!points.length) return '';
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
}

export function pointAlongSvg(points, progress) {
  if (!points.length) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  const p = clamp(progress, 0, 1);
  const lengths = [0];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    lengths.push(total);
  }
  const target = total * p;
  let index = lengths.findIndex((value) => value >= target);
  if (index <= 0) index = 1;
  if (index < 0) index = points.length - 1;
  const segmentStart = lengths[index - 1];
  const segmentLength = Math.max(.001, lengths[index] - segmentStart);
  const ratio = (target - segmentStart) / segmentLength;
  return {
    x: points[index - 1].x + (points[index].x - points[index - 1].x) * ratio,
    y: points[index - 1].y + (points[index].y - points[index - 1].y) * ratio
  };
}

export function formatDistance(meters) {
  if (meters < 1000) return `${Math.max(0, Math.round(meters / 10) * 10)} m`;
  return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`;
}

export { clamp };
