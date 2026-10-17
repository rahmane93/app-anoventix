import React, { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../../theme';
import {
  buildLeafletHtml,
  DEFAULT_CENTER,
  LEAFLET_MSG_SOURCE,
  type LeafletMapHandle,
  type LeafletMapProps,
} from './leaflet-html';

export type { LatLng, LeafletMapHandle } from './leaflet-html';

// Variante web de LeafletMap : react-native-webview n'existe pas dans le
// navigateur, la même page Leaflet est rendue dans une <iframe srcDoc>.
// Même API que la version native (props + ref.setMarker).

type LeafletWindow = Window & { __setMarker?: (lat: number, lng: number) => void };

export const LeafletMap = forwardRef<LeafletMapHandle, LeafletMapProps>(function LeafletMap(
  { latitude, longitude, interactive = false, onChange, zoom = 13, height = 220, fill = false, style },
  ref,
) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const channel = useId();
  const hasInit = latitude != null && longitude != null;
  const lat = hasInit ? (latitude as number) : DEFAULT_CENTER.lat;
  const lng = hasInit ? (longitude as number) : DEFAULT_CENTER.lng;

  // HTML figé au montage : les mises à jour passent par __setMarker.
  const html = useMemo(
    () => buildLeafletHtml(lat, lng, hasInit, interactive, zoom, channel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const injectMarker = (la: number, ln: number) => {
    const win = frameRef.current?.contentWindow as LeafletWindow | null | undefined;
    win?.__setMarker?.(la, ln);
  };

  useImperativeHandle(ref, () => ({
    setMarker: ({ latitude: la, longitude: ln }) => injectMarker(la, ln),
  }));

  // Même logique que la version native : on ne renvoie pas à la carte les
  // points qu'elle vient elle-même de signaler.
  const shownRef = useRef(hasInit ? `${lat},${lng}` : null);
  useEffect(() => {
    if (latitude == null || longitude == null) return;
    const k = `${latitude},${longitude}`;
    if (k === shownRef.current) return;
    shownRef.current = k;
    injectMarker(latitude, longitude);
  }, [latitude, longitude]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const msg = e.data as { source?: string; channel?: string; data?: string } | null;
      if (!msg || msg.source !== LEAFLET_MSG_SOURCE || msg.channel !== channel) return;
      if (e.source !== frameRef.current?.contentWindow) return;
      try {
        const data = JSON.parse(msg.data ?? '');
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          shownRef.current = `${data.latitude},${data.longitude}`;
          onChangeRef.current?.({ latitude: data.latitude, longitude: data.longitude });
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [channel]);

  return (
    <View style={[styles.wrap, fill ? styles.fill : { height }, style]}>
      <iframe
        ref={frameRef}
        srcDoc={html}
        title="Carte"
        style={{ border: 0, width: '100%', height: '100%', display: 'block' }}
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
});
