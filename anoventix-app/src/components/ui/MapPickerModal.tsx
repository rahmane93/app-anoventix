import { useBreakpoint } from '@/src/lib/responsive';
import AppText from '@/src/components/AppText';
import { colors, spacing, typography, webShadow } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCurrentCoords, type Coords } from '../../utils/location';
import { LeafletMap, type LeafletMapHandle } from './LeafletMap';
import { appAlert } from '@/src/components/ui/app-alert';
import { Button } from '@/src/components/ui/button';

// Modal plein écran pour choisir une position sur la carte (pan/zoom libres,
// sans conflit avec un ScrollView parent).

interface MapPickerModalProps {
  visible: boolean;
  latitude?: number | null;
  longitude?: number | null;
  /** Point de référence du quartier choisi : la carte s'y ouvre quand aucune position n'est encore placée. */
  centre?: { latitude: number; longitude: number } | null;
  onClose: () => void;
  onConfirm: (coords: Coords) => void;
}

export function MapPickerModal({ visible, latitude, longitude, centre, onClose, onConfirm }: MapPickerModalProps) {
  const { isDesktop } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<LeafletMapHandle>(null);
  const [coords, setCoords] = useState<Coords | null>(
    latitude != null && longitude != null ? { latitude, longitude } : null,
  );
  const [locating, setLocating] = useState(false);

  // Resynchronise les coordonnées internes à chaque ouverture (pendant le
  // rendu, en comparant à la visibilité précédente, plutôt que dans un effet).
  const [etaitVisible, setEtaitVisible] = useState(visible);
  if (visible !== etaitVisible) {
    setEtaitVisible(visible);
    if (visible) setCoords(latitude != null && longitude != null ? { latitude, longitude } : null);
  }

  const handleUseMyLocation = async () => {
    setLocating(true);
    try {
      const res = await getCurrentCoords();
      if (res === 'denied') {
        appAlert('Permission refusée', "Autorisez l'accès à la localisation pour vous situer sur la carte.");
        return;
      }
      if (!res) {
        appAlert("Position introuvable", 'Impossible de récupérer votre position. Réessayez.');
        return;
      }
      setCoords(res);
      mapRef.current?.setMarker(res);
    } finally {
      setLocating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType={isDesktop ? 'fade' : 'slide'}
      onRequestClose={onClose}
      // Web desktop : dialog centré au-dessus de la page plutôt que plein écran.
      transparent={isDesktop}
      presentationStyle={isDesktop ? undefined : 'fullScreen'}
    >
      <View style={isDesktop ? styles.backdrop : styles.flex}>
      <View style={[styles.root, { paddingTop: insets.top }, isDesktop && styles.rootDialog]}>
        {/* En-tête */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Fermer">
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <AppText style={styles.headerTitle}>Choisir la position</AppText>
          <View style={styles.headerBtn} />
        </View>

        <AppText style={styles.hint}>Déplacez la carte et touchez l'emplacement exact du bien.</AppText>

        {/* Carte plein écran (interactive) */}
        <View style={styles.mapWrap}>
          <LeafletMap
            ref={mapRef}
            latitude={coords?.latitude ?? null}
            longitude={coords?.longitude ?? null}
            centre={centre}
            interactive
            zoom={coords || centre ? 15 : 7}
            fill
            onChange={(c) => setCoords(c)}
          />
        </View>

        {/* Position courante */}
        <Button
          title="Utiliser ma position"
          variant="secondary"
          fullWidth={false}
          style={styles.gpsBtn}
          leftIcon={<Ionicons name="locate-outline" size={18} color={colors.primary} />}
          onPress={handleUseMyLocation}
          isLoading={locating}
          accessibilityLabel="Utiliser ma position actuelle"
        />

        {/* Validation */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          {coords ? (
            <AppText style={styles.coords}>
              {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
            </AppText>
          ) : (
            <AppText style={styles.coordsMuted}>Aucun point sélectionné</AppText>
          )}
          <Button
            title="Valider"
            fullWidth={false}
            style={styles.confirmBtn}
            leftIcon={<Ionicons name="checkmark" size={18} color={colors.white} />}
            onPress={() => {
              if (coords) {
                onConfirm(coords);
                onClose();
              }
            }}
            disabled={!coords}
            accessibilityLabel="Valider la position"
          />
        </View>
      </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,36,68,0.55)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  rootDialog: {
    flex: 0,
    width: '100%',
    maxWidth: 960,
    height: '86%',
    borderRadius: 20,
    overflow: 'hidden',
    ...({ boxShadow: webShadow.lg } as object),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.textPrimary },
  hint: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  mapWrap: { flex: 1, marginHorizontal: spacing.base, marginBottom: spacing.sm },
  gpsBtn: { flexDirection: 'row', marginHorizontal: spacing.base, marginBottom: spacing.sm },
  footer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  coords: { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center' },
  coordsMuted: { fontSize: typography.sizes.sm, color: colors.textMuted, textAlign: 'center', fontStyle: 'italic' },
  confirmBtn: { flexDirection: 'row' },
});
