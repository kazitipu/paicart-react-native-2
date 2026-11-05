/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { installCheapShadows } from './src/lib/cheapShadows';
import App from './App';
import { name as appName } from './app.json';

/* Before any view renders — see src/lib/cheapShadows.js. */
installCheapShadows();

AppRegistry.registerComponent(appName, () => App);
