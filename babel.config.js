module.exports = {
  presets: [
    ['module:@react-native/babel-preset', { jsxImportSource: 'nativewind' }],
    'nativewind/babel',
  ],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: { '@': './src' },
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      },
    ],
    /* Must stay last — Reanimated 4 ships its worklets transform through
       react-native-worklets, and the plugin has to see every other
       transform's output. */
    'react-native-worklets/plugin',
  ],
};
