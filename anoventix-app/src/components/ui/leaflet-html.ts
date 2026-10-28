// Page HTML de la carte partagée par la WebView native (LeafletMap.tsx) et
// l'iframe web (LeafletMap.web.tsx). Deux moteurs, choisis par
// EXPO_PUBLIC_MAP_PROVIDER (DEC-30, en test) :
//  - « osm » (défaut) : Leaflet + tuiles raster d'OpenStreetMap ;
//  - « lfmaps »       : MapLibre GL + tuiles vectorielles LFMaps (sans clé, WebGL requis).

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface LeafletMapHandle {
  /** Déplace/place le marqueur et recentre la carte (ex. bouton « ma position »). */
  setMarker: (coords: LatLng) => void;
}

export interface LeafletMapProps {
  /** Coordonnées initiales (centre + marqueur). Absent = pas de marqueur tant qu'on n'a pas cliqué. */
  latitude?: number | null;
  longitude?: number | null;
  /** Centre de la carte quand aucune coordonnée n'est donnée (ex. point de référence du quartier), sans marqueur. */
  centre?: LatLng | null;
  /** true = l'utilisateur peut placer/déplacer le marqueur ; false = lecture seule. */
  interactive?: boolean;
  /** Notifié quand l'utilisateur choisit un point (mode interactif). */
  onChange?: (coords: LatLng) => void;
  zoom?: number;
  height?: number;
  /** Si true, la carte remplit son conteneur flex (au lieu d'une hauteur fixe). */
  fill?: boolean;
  style?: object;
}

// Centre par défaut : Conakry, Guinée.
export const DEFAULT_CENTER = { lat: 9.6412, lng: -13.5784 };

/** Marqueur des messages postés par l'iframe web (filtre des autres `message`). */
export const LEAFLET_MSG_SOURCE = 'anoventix-leaflet';

type MapProvider = 'osm' | 'lfmaps';

const MAP_PROVIDER: MapProvider = process.env.EXPO_PUBLIC_MAP_PROVIDER === 'lfmaps' ? 'lfmaps' : 'osm';

/** Style LFMaps : bright, positron ou liberty. */
const LFMAPS_STYLE_URL = 'https://data.lfmaps.fr/styles/liberty';

// MapLibre 5 : dernière branche distribuée en UMD (la 6 n'existe qu'en module ES,
// à éviter sur les WebView Android anciennes).
const MAPLIBRE_VERSION = '5.24.0';

export function buildMapHtml(
  lat: number,
  lng: number,
  hasInit: boolean,
  interactive: boolean,
  zoom: number,
  channel = '',
): string {
  return MAP_PROVIDER === 'lfmaps'
    ? buildMaplibreHtml(lat, lng, hasInit, interactive, zoom, channel)
    : buildLeafletHtml(lat, lng, hasInit, interactive, zoom, channel);
}

/** Envoi d'un point à l'hôte : WebView native ou page web parente. */
function sendScript(channel: string): string {
  return `function send(payload) {
      var data = JSON.stringify(payload);
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(data);
      else if (window.parent !== window) {
        window.parent.postMessage({ source: '${LEAFLET_MSG_SOURCE}', channel: '${channel}', data: data }, '*');
      }
    }`;
}

function buildLeafletHtml(
  lat: number,
  lng: number,
  hasInit: boolean,
  interactive: boolean,
  zoom: number,
  /** Identifiant d'instance (web) : plusieurs cartes peuvent cohabiter sur une page. */
  channel = '',
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html,body,#map{height:100%;width:100%;margin:0;padding:0;background:#e8eef5}</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var hasInit = ${hasInit};
    var interactive = ${interactive};
    var map = L.map('map', { zoomControl: true, attributionControl: true, scrollWheelZoom: ${interactive} })
              .setView([${lat}, ${lng}], ${zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    var marker = null;
    ${sendScript(channel)}
    function post() {
      if (marker) {
        var p = marker.getLatLng();
        send({ latitude: p.lat, longitude: p.lng });
      }
    }
    function placeMarker(latlng, draggable) {
      if (marker) { marker.setLatLng(latlng); }
      else {
        marker = L.marker(latlng, { draggable: draggable }).addTo(map);
        if (draggable) marker.on('dragend', post);
      }
    }
    if (hasInit) placeMarker([${lat}, ${lng}], interactive);
    if (interactive) {
      map.on('click', function (e) { placeMarker(e.latlng, true); post(); });
    }

    // Permet à l'hôte (React Native ou page web) de poser/déplacer le marqueur.
    window.__setMarker = function (la, ln) {
      placeMarker([la, ln], interactive);
      map.setView([la, ln], Math.max(map.getZoom(), 15));
    };
  </script>
</body>
</html>`;
}

function buildMaplibreHtml(
  lat: number,
  lng: number,
  hasInit: boolean,
  interactive: boolean,
  zoom: number,
  channel: string,
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css" />
  <style>
    html,body,#map{height:100%;width:100%;margin:0;padding:0;background:#e8eef5}
    #erreur{display:none;height:100%;align-items:center;justify-content:center;text-align:center;
            padding:16px;box-sizing:border-box;font:14px sans-serif;color:#555}
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="erreur">Carte indisponible sur cet appareil.</div>
  <script src="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js"></script>
  <script>
    var hasInit = ${hasInit};
    var interactive = ${interactive};
    var marker = null;
    ${sendScript(channel)}

    function webglDisponible() {
      try {
        var c = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
      } catch (e) { return false; }
    }
    function afficherErreur() {
      document.getElementById('map').style.display = 'none';
      document.getElementById('erreur').style.display = 'flex';
    }

    if (!window.maplibregl || !webglDisponible()) {
      afficherErreur();
    } else {
      // Leaflet et MapLibre ne numérotent pas les zooms pareil (tuiles 256 px
      // contre 512 px) : -1 pour garder la même emprise.
      var map = new maplibregl.Map({
        container: 'map',
        style: '${LFMAPS_STYLE_URL}',
        center: [${lng}, ${lat}],
        zoom: ${zoom} - 1,
        maxZoom: 19,
        scrollZoom: interactive,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        attributionControl: { compact: true },
      });
      map.touchZoomRotate.disableRotation();
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');

      var post = function () {
        if (marker) {
          var p = marker.getLngLat();
          send({ latitude: p.lat, longitude: p.lng });
        }
      };
      var placeMarker = function (la, ln, draggable) {
        if (marker) { marker.setLngLat([ln, la]); }
        else {
          marker = new maplibregl.Marker({ draggable: draggable }).setLngLat([ln, la]).addTo(map);
          if (draggable) marker.on('dragend', post);
        }
      };
      if (hasInit) placeMarker(${lat}, ${lng}, interactive);
      if (interactive) {
        map.on('click', function (e) { placeMarker(e.lngLat.lat, e.lngLat.lng, true); post(); });
      }

      window.__setMarker = function (la, ln) {
        placeMarker(la, ln, interactive);
        map.jumpTo({ center: [ln, la], zoom: Math.max(map.getZoom(), 14) });
      };
    }
  </script>
</body>
</html>`;
}
