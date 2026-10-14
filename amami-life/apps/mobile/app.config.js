const { releaseValues } = require('./release-config.cjs');
module.exports = ({ config }) => {
  const release = process.env.AMAMI_RELEASE_BUILD === '1';
  const values = release ? releaseValues(process.env) : null;
  return {
    ...config,
    name: release ? 'AMAMI LIFE' : 'AMAMI LIFE · Local',
    slug: 'amami-life',
    scheme: 'amamilife',
    version: values?.AMAMI_RELEASE_VERSION ?? config.version,
    icon: './assets/icon-paper.png',
    backgroundColor: '#f7f3e9',
    owner: values?.AMAMI_EXPO_OWNER,
    ios: {
      ...config.ios,
      bundleIdentifier: values?.AMAMI_IOS_BUNDLE_ID,
      icon: { light: './assets/icon-paper.png', dark: './assets/icon-ink.png' },
      infoPlist: { ITSAppUsesNonExemptEncryption: false },
    },
    android: {
      ...config.android,
      package: values?.AMAMI_ANDROID_PACKAGE,
      blockedPermissions: ['android.permission.RECORD_AUDIO', 'android.permission.ACCESS_FINE_LOCATION', 'android.permission.ACCESS_COARSE_LOCATION'],
      adaptiveIcon: { foregroundImage: './assets/icon-foreground.png', backgroundColor: '#f7f3e9' },
    },
    plugins: [
      ...config.plugins,
      ['expo-splash-screen', { image: './assets/splash-paper.png', imageWidth: 160, backgroundColor: '#f7f3e9', dark: { image: './assets/splash-ink.png', backgroundColor: '#222522' } }],
    ],
    extra: { ...config.extra, localBuild: !release, ...(values ? { eas: { projectId: values.AMAMI_EAS_PROJECT_ID } } : {}) },
  };
};
