// Config plugin Expo : interdit le trafic HTTP en clair sur Android,
// SAUF pour les hôtes de développement local (backend en HTTP).
//
// Pourquoi : la prod (anoventix.com) est en HTTPS. `usesCleartextTraffic`
// global ouvrait tout le HTTP, y compris en build production. Ce plugin
// génère un Android Network Security Config qui refuse le cleartext par
// défaut et ne l'autorise que pour les hôtes de dev (émulateur / localhost).
//
// Limite Android : `<domain>` n'accepte pas de plage CIDR. Pour un téléphone
// physique sur le LAN (ex. 192.168.1.42), ajouter son IP dans
// NETWORK_SECURITY_CONFIG ci-dessous, ou utiliser `npx expo start --tunnel`.

const {
  withAndroidManifest,
  withDangerousMod,
  AndroidConfig,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const NSC_FILENAME = 'network_security_config.xml';

// Build EAS « production » : aucune exception HTTP, même locale.
const IS_PRODUCTION_BUILD = process.env.EAS_BUILD_PROFILE === 'production';

const DEV_CLEARTEXT_DOMAINS = `
  <!-- Exception DÉVELOPPEMENT uniquement : backend local en HTTP. -->
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">localhost</domain>
    <domain includeSubdomains="true">127.0.0.1</domain>
    <domain includeSubdomains="true">10.0.2.2</domain>
    <domain includeSubdomains="true">10.0.3.2</domain>
  </domain-config>`;

const NETWORK_SECURITY_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<!-- Généré par plugins/withAndroidCleartextScoped.js — ne pas éditer à la main -->
<network-security-config>
  <!-- Par défaut : tout doit passer en HTTPS (prod : anoventix.com). -->
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>${IS_PRODUCTION_BUILD ? '' : DEV_CLEARTEXT_DOMAINS}
</network-security-config>
`;

/** Écrit res/xml/network_security_config.xml dans le projet Android généré. */
const withNetworkSecurityConfigFile = (config) =>
  withDangerousMod(config, [
    'android',
    async (cfg) => {
      const xmlDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml',
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, NSC_FILENAME), NETWORK_SECURITY_CONFIG);
      return cfg;
    },
  ]);

/** Référence le fichier dans le AndroidManifest et coupe le cleartext global. */
const withManifestNetworkSecurity = (config) =>
  withAndroidManifest(config, (cfg) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      cfg.modResults,
    );
    application.$['android:networkSecurityConfig'] =
      '@xml/network_security_config';
    application.$['android:usesCleartextTraffic'] = 'false';
    return cfg;
  });

module.exports = (config) =>
  withManifestNetworkSecurity(withNetworkSecurityConfigFile(config));
