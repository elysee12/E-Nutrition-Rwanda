import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'rw.gov.moh.enutrition',
  appName: 'E-Nutrition Rwanda',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
