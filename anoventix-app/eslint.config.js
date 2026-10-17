// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // App 100% francophone : les apostrophes dans le texte JSX (L'annonce,
      // d'identité…) sont légitimes et déclenchent cette règle en masse.
      'react/no-unescaped-entities': 'off',
    },
  },
]);
