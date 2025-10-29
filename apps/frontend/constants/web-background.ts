import type { ImageSourcePropType } from 'react-native';

// Web-only background image. Native apps are unaffected.
// TEMP: Using an existing asset so you can immediately see the background behavior on web.
// Replace this require with your file once it's added under assets/images/.
export const WEB_BACKGROUND_SOURCE: ImageSourcePropType | undefined = require('../assets/images/react-logo.png');
