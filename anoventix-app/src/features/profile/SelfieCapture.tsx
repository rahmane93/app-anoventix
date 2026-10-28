import AppText from '@/src/components/AppText';
import { Button } from '@/src/components/ui/button';
import { FullscreenOverlay } from '@/src/components/ui/fullscreen-overlay';
import { toJpegUpload, type UploadFile } from '@/src/lib/images';
import { colors, radius, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { Image } from 'expo-image';
import React, { useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

// ─── Selfie de vérification d'identité (EVO-01, RG-02-23 à RG-02-26) ─────────
// Capture en direct uniquement : aucune importation depuis la galerie ou les fichiers.
// Étapes : consignes → prise de vue guidée (ovale pour le visage, rectangle pour la pièce) → aperçu.

type Etape = 'consignes' | 'camera' | 'apercu';

const CONSIGNES = [
  'Placez-vous dans un endroit bien éclairé, le visage entier dans le cadre.',
  'Gardez le visage découvert : ni lunettes de soleil, ni masque, ni casquette.',
  'Tenez votre pièce d’identité à côté du visage, face lisible tournée vers l’objectif.',
  'Prenez la photo en direct : pas de photo d’écran ni de photo d’une photo.',
];

/** Un navigateur sans caméra (ordinateur de bureau) ne peut pas faire le selfie. */
const webSansCamera = () =>
  Platform.OS === 'web' && (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia);

export function SelfieCapture({
  visible,
  onClose,
  onCapture,
}: {
  visible: boolean;
  onClose: () => void;
  onCapture: (selfie: UploadFile) => void;
}) {
  const [etape, setEtape] = useState<Etape>('consignes');
  const [facing, setFacing] = useState<CameraType>('front');
  const [photo, setPhoto] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [permission, demanderPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);

  const fermer = () => {
    setEtape('consignes');
    setPhoto(null);
    setErreur(null);
    onClose();
  };

  const commencer = async () => {
    setErreur(null);
    if (!permission?.granted) {
      const res = await demanderPermission();
      if (!res.granted) return;
    }
    setEtape('camera');
  };

  const prendre = async () => {
    if (!camera.current || enCours) return;
    setEnCours(true);
    try {
      const p = await camera.current.takePictureAsync({ quality: 0.9, skipProcessing: false });
      setPhoto({ uri: p.uri, width: p.width, height: p.height });
      setEtape('apercu');
    } catch {
      setErreur('La photo n’a pas pu être prise. Réessayez.');
    } finally {
      setEnCours(false);
    }
  };

  const utiliser = async () => {
    if (!photo) return;
    setEnCours(true);
    try {
      // JPEG garanti, 720 px au moins sur le petit côté (le serveur refuse en dessous).
      const fichier = await toJpegUpload(photo, { quality: 0.9, baseName: 'selfie' });
      onCapture(fichier);
      fermer();
    } catch {
      setErreur('Impossible de préparer cette photo. Reprenez-la.');
      setEtape('camera');
    } finally {
      setEnCours(false);
    }
  };

  const refus = permission && !permission.granted && !permission.canAskAgain;

  return (
    <FullscreenOverlay visible={visible} onRequestClose={fermer} backgroundColor="#000">
      <View style={st.root}>
        <View style={st.header}>
          <AppText style={st.headerTitle}>Selfie de vérification</AppText>
          <Button
            title="Fermer"
            variant="ghost"
            size="sm"
            fullWidth={false}
            onPress={fermer}
            accessibilityLabel="Fermer sans prendre de selfie"
          />
        </View>

        {webSansCamera() ? (
          <View style={st.centre}>
            <Ionicons name="phone-portrait-outline" size={40} color={colors.white} />
            <AppText style={st.texte}>
              Pour prendre votre selfie, utilisez l’application Android ou un téléphone.
            </AppText>
          </View>
        ) : etape === 'consignes' ? (
          <View style={st.centre}>
            <Ionicons name="camera-outline" size={40} color={colors.white} />
            <AppText style={st.titre}>Avant de commencer</AppText>
            {CONSIGNES.map((c) => (
              <View key={c} style={st.consigne}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.white} />
                <AppText style={st.consigneTexte}>{c}</AppText>
              </View>
            ))}
            <AppText style={st.legende}>
              AnoventiX utilise l’appareil photo pour votre selfie de vérification d’identité. Il n’est vu que par la
              modération.
            </AppText>
            {refus ? (
              <>
                <AppText style={st.erreur}>
                  L’accès à l’appareil photo est refusé. Autorisez-le dans les réglages de votre téléphone pour continuer.
                </AppText>
                <Button title="Ouvrir les réglages" fullWidth={false} onPress={() => Linking.openSettings()} />
              </>
            ) : (
              <Button title="Ouvrir l’appareil photo" fullWidth={false} onPress={commencer} />
            )}
          </View>
        ) : etape === 'camera' ? (
          <View style={st.cameraBox}>
            <CameraView ref={camera} style={StyleSheet.absoluteFill} facing={facing} mirror={facing === 'front'} />
            <View style={st.guides} pointerEvents="none">
              <View style={st.ovale} />
              <View style={st.rectangle} />
            </View>
            {erreur ? <AppText style={[st.erreur, st.erreurCamera]}>{erreur}</AppText> : null}
            <View style={st.controles}>
              <Button
                title="Retourner"
                variant="ghost"
                size="sm"
                fullWidth={false}
                onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
                accessibilityLabel="Changer de caméra"
              />
              <Button
                title="Prendre la photo"
                fullWidth={false}
                isLoading={enCours}
                onPress={prendre}
                accessibilityLabel="Prendre la photo"
              />
            </View>
          </View>
        ) : (
          <View style={st.centre}>
            {photo ? <Image source={{ uri: photo.uri }} style={st.apercu} contentFit="contain" /> : null}
            {erreur ? <AppText style={st.erreur}>{erreur}</AppText> : null}
            <View style={st.controles}>
              <Button title="Reprendre" variant="outline" fullWidth={false} onPress={() => setEtape('camera')} />
              <Button title="Utiliser cette photo" fullWidth={false} isLoading={enCours} onPress={utiliser} />
            </View>
          </View>
        )}
      </View>
    </FullscreenOverlay>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingTop: spacing.xl, paddingBottom: spacing.sm,
  },
  headerTitle: { color: colors.white, fontSize: typography.sizes.md, fontWeight: '700' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.base },
  titre: { color: colors.white, fontSize: typography.sizes.lg, fontWeight: '700' },
  texte: { color: colors.white, fontSize: typography.sizes.md, textAlign: 'center', lineHeight: 22 },
  consigne: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, alignSelf: 'stretch' },
  consigneTexte: { flex: 1, color: colors.white, fontSize: typography.sizes.sm, lineHeight: 20 },
  legende: { color: colors.onDarkMuted, fontSize: typography.sizes.xs, textAlign: 'center', lineHeight: 18 },
  erreur: { color: colors.onDarkError, fontSize: typography.sizes.sm, textAlign: 'center' },
  erreurCamera: { position: 'absolute', top: spacing.base, left: spacing.base, right: spacing.base },
  cameraBox: { flex: 1, overflow: 'hidden' },
  guides: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  ovale: {
    width: '58%', aspectRatio: 0.78, borderRadius: 999, borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)', borderStyle: 'dashed',
  },
  rectangle: {
    width: '46%', aspectRatio: 1.58, borderRadius: radius.md, borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)', borderStyle: 'dashed',
  },
  controles: {
    position: 'absolute', bottom: spacing.xl, left: spacing.base, right: spacing.base,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm,
  },
  apercu: { width: '100%', flex: 1 },
});
