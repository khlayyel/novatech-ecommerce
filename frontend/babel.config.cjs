/* Configuration Babel utilisée uniquement par Jest (les tests sont
   transpilés en CommonJS). Vite utilise son propre pipeline esbuild
   et n'applique jamais ce fichier.

   - modules: 'commonjs' explicite — Babel 8 avec cible Node « current »
     considère l'ESM natif supporté et ne transforme plus les modules,
     alors que Jest (mode CommonJS) en a besoin.
   - import.meta n'existe pas en CommonJS : on le remplace par un objet
     vide — src/config.ts applique ensuite son repli (valeurs par défaut).
*/
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript'
  ],
  plugins: [
    function replaceImportMeta({ types: t }) {
      return {
        visitor: {
          MetaProperty(path) {
            path.replaceWith(t.objectExpression([]));
          }
        }
      };
    }
  ]
};
