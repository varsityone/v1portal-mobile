module.exports = function (api) {
  const platform = api.caller(c => c?.platform);
  api.cache.using(() => platform ?? 'unknown');

  return {
    presets: [require('expo/node_modules/babel-preset-expo')],
    plugins: platform === 'web' ? [] : ['react-native-reanimated/plugin'],
  };
};
