import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Vrai quand l'utilisateur a demandé de réduire les animations (réglage système :
 * « Réduire les animations » sur iOS/Android, `prefers-reduced-motion` sur le web).
 * Les animations décoratives (squelettes qui pulsent, transitions de mise en page)
 * doivent alors rester statiques.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let actif = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (actif) setReduce(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      actif = false;
      sub.remove();
    };
  }, []);

  return reduce;
}
