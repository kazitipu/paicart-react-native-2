import { createNavigationContainerRef } from '@react-navigation/native';

/* Lets non-component code (e.g. the bKash hand-off in lib/payments) navigate. */
export const navigationRef = createNavigationContainerRef();
