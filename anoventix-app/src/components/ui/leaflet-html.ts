// Page HTML Leaflet (OpenStreetMap, sans clé API) partagée par la WebView native
// (LeafletMap.tsx) et l'iframe web (LeafletMap.web.tsx).

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

export function buildLeafletHtml(
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
    function send(payload) {
      var data = JSON.stringify(payload);
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(data);
      else if (window.parent !== window) {
        window.parent.postMessage({ source: '${LEAFLET_MSG_SOURCE}', channel: '${channel}', data: data }, '*');
      }
    }
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
