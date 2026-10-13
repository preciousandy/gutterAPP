import type { ImageSourcePropType } from 'react-native';
import type { NetworkProvider } from '@/api/bills';

export const NETWORK_LOGOS: Record<NetworkProvider, ImageSourcePropType> = {
  MTN: require('../../assets/mtn.png'),
  Airtel: require('../../assets/airtel.png'),
  Glo: require('../../assets/glo.png'),
  '9mobile': require('../../assets/9mobile.png'),
};

export const CABLE_LOGOS: Record<string, ImageSourcePropType> = {
  dstv: require('../../assets/dstv.png'),
  gotv: require('../../assets/gotv.png'),
  startimes: require('../../assets/startime.png'),
  showmax: require('../../assets/showmax.png'),
};
