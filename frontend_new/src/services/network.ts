import NetInfo, {NetInfoState} from '@react-native-community/netinfo';
import {useNetworkStore} from '../store/network';
import {logMessage} from './errorLogger';

let unsubscribe: (() => void) | null = null;
let initialized = false;

const updateStoreFromNetInfo = (state: NetInfoState) => {
  const {setNetworkState} = useNetworkStore.getState();
  setNetworkState({
    isConnected: state.isConnected ?? true,
    isInternetReachable: state.isInternetReachable ?? state.isConnected ?? true,
    connectionType: state.type,
  });
};

export const startNetworkMonitoring = () => {
  if (initialized) {
    return;
  }

  initialized = true;

  unsubscribe = NetInfo.addEventListener(state => {
    updateStoreFromNetInfo(state);

    if (!state.isConnected || state.isInternetReachable === false) {
      logMessage('Network disconnected', {
        type: state.type,
        effectiveType: state.details?.cellularGeneration,
      });
    } else {
      logMessage('Network connected', {
        type: state.type,
        effectiveType: state.details?.cellularGeneration,
      });
    }
  });

  NetInfo.fetch()
    .then(state => {
      updateStoreFromNetInfo(state);
    })
    .catch(error => {
      logMessage('Failed to fetch initial network state', {
        error: error?.message,
      });
    });
};

export const stopNetworkMonitoring = () => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  initialized = false;
};
