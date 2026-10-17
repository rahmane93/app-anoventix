import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, radius } from '../../theme';
import { buildLeafletHtml, DEFAULT_CENTER, type LeafletMapHandle, type LeafletMapProps } from './leaflet-html';

export type { LatLng, LeafletMapHandle } from './leaflet-html';

// Carte gratuite (OpenStreetMap + Leaflet) rendue dans une WebView — sans clé API.
// Deux usages : sélection d'un point (interactive) ou affichage seul d'un marqueur.

export const LeafletMap = forwardRef<LeafletMapHandle, LeafletMapProps>(function LeafletMap(
  { latitude, longitude, interactive = false, onChange, zoom = 13, height = 220, fill = false, style },
  ref,
) {
  const webRef = useRef<WebView>(null);
  const hasInit = latitude != null && longitude != null;
  const lat = hasInit ? (latitude as number) : DEFAULT_CENTER.lat;
  const lng = hasInit ? (longitude as number) : DEFAULT_CENTER.lng;

  // HTML généré une seule fois au montage (les MAJ externes passent par injectJavaScript).
  const html = useMemo(
    () => buildLeafletHtml(lat, lng, hasInit, interactive, zoom),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const injectMarker = (la: number, ln: number) => {
    webRef.current?.injectJavaScript(`window.__setMarker && window.__setMarker(${la}, ${ln}); true;`);
  };

  useImperativeHandle(ref, () => ({
    setMarker: ({ latitude: la, longitude: ln }) => injectMarker(la, ln),
  }));

  // Coordonnées modifiées par le parent après le montage : on déplace le marqueur
  // dans la page existante plutôt que de recharger la WebView (Leaflet + tuiles).
  // Les points venant de la carte elle-même (onChange) ne sont pas renvoyés.
  const shownRef = useRef(hasInit ? `${lat},${lng}` : null);
  useEffect(() => {
    if (latitude == null || longitude == null) return;
    const k = `${latitude},${longitude}`;
    if (k === shownRef.current) return;
    shownRef.current = k;
    injectMarker(latitude, longitude);
  }, [latitude, longitude]);

  return (
    <View style={[styles.wrap, fill ? styles.fill : { height }, style]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.web}
        scrollEnabled={false}
        onMessage={(e) => {
          try {
            const data = JSON.parse(e.nativeEvent.data);
            if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
              shownRef.current = `${data.latitude},${data.longitude}`;
              onChange?.({ latitude: data.latitude, longitude: data.longitude });
            }
          } catch {
            /* ignore */
          }
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: '#e8eef5',
  },
  fill: { flex: 1 },
  web: { flex: 1, backgroundColor: 'transparent' },
});
