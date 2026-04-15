module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // Alias @/ → ./src pour résolution runtime (Metro). tsconfig.json couvre
      // uniquement TypeScript au compile-time ; sans ce plugin le bundler échoue.
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
          },
        },
      ],
      // Reanimated plugin DOIT rester listé en dernier (requis par la lib).
      'react-native-reanimated/plugin',
    ],
  };
};
