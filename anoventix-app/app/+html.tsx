import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Document HTML racine du rendu web statique (non utilisé sur iOS/Android).
// Depuis Expo SDK 58, le document doit rendre lui-même les nœuds fournis par le serveur :
// headNodes (styles, préchargements) et bodyNodes (balises <script> du bundle). Sans eux, le HTML
// exporté ne charge aucun JavaScript et la page reste vide.

const globalCss = `
html, body { background-color: #F2F2F2; }
body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; }
[role="button"], [role="link"], [role="menuitem"], [role="tab"], a { cursor: pointer; }
:focus { outline: none; }
:focus-visible { outline: 2px solid #2A5FA8; outline-offset: 2px; border-radius: 6px; }
/* Survol générique des boutons React Native (TouchableOpacity → role=button). */
[role="button"], [role="link"], [role="tab"] { transition: filter 150ms ease, box-shadow 150ms ease, transform 150ms ease, background-color 150ms ease; }
[role="button"]:hover:not([aria-disabled="true"]), [role="tab"]:hover { filter: brightness(0.96); }
::selection { background: #FDF6E3; color: #0F2444; }
* { scrollbar-width: thin; scrollbar-color: #C7CDD6 transparent; }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: #C7CDD6; border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
::-webkit-scrollbar-thumb:hover { background: #9CA3AF; background-clip: padding-box; }
::-webkit-scrollbar-track { background: transparent; }
`;

export default function Root({ children }: PropsWithChildren) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();
  return (
    <html lang="fr" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#1A3C6E" />
        <meta
          name="description"
          content="Anoventix — achat, location et bail de biens immobiliers en Guinée. Maisons, appartements, terrains et bureaux, quartier par quartier."
        />
        <title>Anoventix — Immobilier en Guinée</title>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: globalCss }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
