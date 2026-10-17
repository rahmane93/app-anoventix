import React, { useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { create } from 'zustand';

// Portal léger pour Sheet/FullscreenOverlay : remplace <Modal> RN qui crashe
// avec react-native-screens sur la New Architecture iOS
// (RNSModalScreenShadowNode::getContentOriginOffset).

interface Entry {
  id: number;
  node: React.ReactNode;
  onRequestClose: () => void;
}

interface OverlayStore {
  entries: Entry[];
  register: (node: React.ReactNode, onRequestClose: () => void) => number;
  update: (id: number, node: React.ReactNode) => void;
  unregister: (id: number) => void;
}

let counter = 0;

const useOverlayStore = create<OverlayStore>((set) => ({
  entries: [],
  register: (node, onRequestClose) => {
    const id = ++counter;
    set((s) => ({ entries: [...s.entries, { id, node, onRequestClose }] }));
    return id;
  },
  update: (id, node) =>
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? { ...e, node } : e)),
    })),
  unregister: (id) =>
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
}));

export const overlayApi = {
  register: (node: React.ReactNode, onRequestClose: () => void) =>
    useOverlayStore.getState().register(node, onRequestClose),
  update: (id: number, node: React.ReactNode) =>
    useOverlayStore.getState().update(id, node),
  unregister: (id: number) => useOverlayStore.getState().unregister(id),
};

export function OverlayHost() {
  const entries = useOverlayStore((s) => s.entries);

  useEffect(() => {
    if (entries.length === 0) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      entries[entries.length - 1].onRequestClose();
      return true;
    });
    return () => sub.remove();
  }, [entries]);

  if (entries.length === 0) return null;
  return (
    // zIndex : au-dessus de la barre web (sticky, zIndex 50/60), sinon elle
    // recouvre le haut de l'overlay et capte les clics (bouton fermer).
    <View style={[StyleSheet.absoluteFill, styles.host]} pointerEvents="box-none">
      {entries.map((e) => (
        <React.Fragment key={e.id}>{e.node}</React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { zIndex: 1000 },
});
