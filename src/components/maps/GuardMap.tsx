import { useMemo, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

interface GuardMapProps {
  position: { lat: number; lng: number } | null;
  accuracy?: number | null;
  checkpoints?: GuardCheckpoint[];
  completedIds?: string[];
  activeCpId?: string | null;
  trail?: Array<{ lat: number; lng: number }>;
}

export interface GuardCheckpoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  order: number;
}

interface MapState {
  position: { lat: number; lng: number } | null;
  checkpoints: GuardCheckpoint[];
  completedCpIds: string[];
  activeCpId: string | null;
  trail: Array<{ lat: number; lng: number }>;
}

const DEFAULT_LAT = -16.5;
const DEFAULT_LNG = -68.15;
const DEFAULT_ZOOM = 16;

function buildGuardHtml(initialJson: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
  html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #04080f; }
  .leaflet-container { background: #04080f; font-family: Inter, system-ui, sans-serif; }
  .guard-pulse { position: absolute; top: 50%; left: 50%; width: 34px; height: 34px; border-radius: 50%; border: 2px solid #22c55e; opacity: 0.6; transform: translate(-50%, -50%); animation: pulseRing 2s ease-out infinite; }
  @keyframes pulseRing { 0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0.7; } 100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; } }
  .leaflet-popup-content-wrapper { background: #0d1526; color: #e2e8f0; border: 1px solid #1a2540; border-radius: 8px; font-family: Inter, system-ui, sans-serif; }
  .leaflet-popup-tip { background: #0d1526; border: 1px solid #1a2540; }
  .popup-inner { padding: 2px 0; }
  .popup-inner strong { font-size: 13px; }
  .popup-badge { display: inline-block; margin-top: 5px; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; color: #fff; }
  .popup-badge.pending { background: #f59e0b; }
  .popup-badge.active { background: #3380ff; }
  .popup-badge.completed { background: #16a34a; }
</style>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>
<body>
<div id="map"></div>
<script>
var INITIAL_STATE = ${initialJson};
var map = null;
var guardMarker = null;
var cpLayer = null;
var trailLayer = null;
var centeredOnce = false;
var lastActiveCpId = null;
var pending = [];

function guardHtml(color) {
  return '<div style="position:relative;width:34px;height:34px;">' +
    '<svg viewBox="0 0 34 34" width="34" height="34"><circle cx="17" cy="17" r="13" fill="' + color + '" stroke="white" stroke-width="2.5" opacity="0.95"/><circle cx="17" cy="17" r="5" fill="white" opacity="0.9"/></svg>' +
    '<div class="guard-pulse"></div></div>';
}

function checkpointHtml(color, order) {
  return '<div style="position:relative;width:28px;height:36px;">' +
    '<svg viewBox="0 0 28 36" width="28" height="36">' +
    '<path d="M14 0 C6.3 0 0 6.3 0 14 C0 24.5 14 36 14 36 S28 24.5 28 14 C28 6.3 21.7 0 14 0Z" fill="' + color + '" stroke="white" stroke-width="1.5"/>' +
    '<circle cx="14" cy="13" r="8" fill="white" opacity="0.95"/>' +
    '<text x="14" y="17" text-anchor="middle" font-size="10" font-weight="700" fill="' + color + '" font-family="Inter, sans-serif">' + order + '</text>' +
    '</svg></div>';
}

function cpColor(state) {
  if (state === 'completed') return '#16a34a';
  if (state === 'active') return '#3380ff';
  return '#f59e0b';
}

function badgeText(state) {
  if (state === 'completed') return '&#10003; Completado';
  if (state === 'active') return '&#9679; Activo';
  return '&#9675; Pendiente';
}

window.__mapUpdate = function (data) {
  if (!map) { pending.push(data); return; }
  renderState(data);
};

function renderTrail(state) {
  if (trailLayer) { map.removeLayer(trailLayer); trailLayer = null; }
  var tr = (state.trail || []).filter(function (p) { return p && typeof p.lat === 'number' && typeof p.lng === 'number'; });
  if (tr.length < 2) return;
  var pos = tr.map(function (p) { return [p.lat, p.lng]; });
  trailLayer = L.polyline(pos, { color: '#3380ff', weight: 3, opacity: 0.5, dashArray: '8 6' }).addTo(map);
}

function renderCheckpoints(state) {
  if (cpLayer) { map.removeLayer(cpLayer); cpLayer = null; }
  var cps = state.checkpoints || [];
  if (!cps.length) return;
  var done = new Set(state.completedCpIds || []);
  var markers = cps.map(function (cp, index) {
    var st = done.has(cp.id) ? 'completed' : (cp.id === state.activeCpId ? 'active' : 'pending');
    var order = cp.order || (index + 1);
    var icon = L.divIcon({ html: checkpointHtml(cpColor(st), order), className: '', iconSize: [28, 36], iconAnchor: [14, 36], popupAnchor: [0, -30] });
    var marker = L.marker([cp.lat, cp.lng], { icon: icon });
    marker.bindPopup('<div class="popup-content"><strong>' + (cp.name || ('Checkpoint ' + order)) + '</strong><br><span class="popup-badge ' + st + '">' + badgeText(st) + '</span></div>', { className: 'sentinel-popup' });
    return marker;
  });
  cpLayer = L.layerGroup(markers).addTo(map);
}

function renderGuard(state) {
  if (guardMarker) { map.removeLayer(guardMarker); guardMarker = null; }
  if (!state.position) return;
  var icon = L.divIcon({ html: guardHtml('#22c55e'), className: '', iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -17] });
  guardMarker = L.marker([state.position.lat, state.position.lng], { icon: icon, zIndexOffset: 1000 }).addTo(map);
  if (!centeredOnce) {
    centeredOnce = true;
    map.flyTo([state.position.lat, state.position.lng], 18, { duration: 1.2 });
  }
}

function renderState(state) {
  renderTrail(state);
  renderCheckpoints(state);
  renderGuard(state);
  if (state.activeCpId && state.activeCpId !== lastActiveCpId) {
    lastActiveCpId = state.activeCpId;
    var active = (state.checkpoints || []).find(function (c) { return c.id === state.activeCpId; });
    if (active) {
      map.flyTo([active.lat, active.lng], 16, { duration: 1.2 });
    }
  }
}

function init() {
  var center = [${DEFAULT_LAT}, ${DEFAULT_LNG}];
  if (INITIAL_STATE.position) center = [INITIAL_STATE.position.lat, INITIAL_STATE.position.lng];
  var startZoom = INITIAL_STATE.position ? 18 : ${DEFAULT_ZOOM};
  map = L.map('map', { zoomControl: false, scrollWheelZoom: false, attributionControl: true }).setView(center, startZoom);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; <a href="https://carto.com/">CARTO</a> &amp; <a href="https://www.openstreetmap.org/">OSM</a>', maxZoom: 20, subdomains: 'abcd' }).addTo(map);
  renderState(INITIAL_STATE);
  pending.forEach(renderState);
  pending = [];
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
</script>
</body>
</html>`;
}

export function GuardMap({
  position,
  checkpoints = [],
  completedIds = [],
  activeCpId = null,
  trail = [],
}: GuardMapProps) {
  const webRef = useRef<WebView>(null);
  const latestRef = useRef<MapState | null>(null);

  const mapState = useMemo<MapState>(
    () => ({
      position: position ? { lat: position.lat, lng: position.lng } : null,
      checkpoints,
      completedCpIds: completedIds,
      activeCpId: activeCpId ?? null,
      trail,
    }),
    [position?.lat, position?.lng, checkpoints, completedIds, activeCpId, trail],
  );

  latestRef.current = mapState;

  const html = useMemo(() => buildGuardHtml(JSON.stringify(mapState)), []);

  const inject = useCallback((state: MapState) => {
    try {
      const script = `window.__mapUpdate && window.__mapUpdate(${JSON.stringify(state)}); true;`;
      webRef.current?.injectJavaScript(script);
    } catch (err) {
      console.warn('[GuardMap] inject error:', err);
    }
  }, []);

  useEffect(() => {
    inject(mapState);
  }, [mapState, inject]);

  const handleLoadEnd = useCallback(() => {
    const state = latestRef.current;
    if (state) inject(state);
  }, [inject]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === 'ready') {
        const state = latestRef.current;
        if (state) inject(state);
      }
    } catch {
      // message ignorado
    }
  }, [inject]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        source={{ html }}
        style={styles.web}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        scrollEnabled={false}
        overScrollMode="never"
        nestedScrollEnabled={false}
        setSupportMultipleWindows={false}
        onLoadEnd={handleLoadEnd}
        onMessage={handleMessage}
        onError={(event) => console.warn('[GuardMap] error:', event.nativeEvent.description)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  web: {
    flex: 1,
    backgroundColor: '#04080f',
  },
});