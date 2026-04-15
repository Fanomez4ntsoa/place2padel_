module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // Reanimated plugin DOIT rester listé en dernier (requis par la lib).
      'react-native-reanimated/plugin',
    ],
  };
};
