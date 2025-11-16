import {create} from 'zustand';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  connectionType?: string | null;
  lastChangedAt: number;
  isOnline: boolean;
  setNetworkState: (
    state: Partial<
      Omit<NetworkState, 'setNetworkState' | 'isOnline' | 'lastChangedAt'>
    >,
  ) => void;
}

const computeIsOnline = (
  isConnected: boolean,
  isInternetReachable: boolean | null | undefined,
): boolean => {
  if (typeof isConnected === 'boolean' && !isConnected) {
    return false;
  }
  if (typeof isInternetReachable === 'boolean') {
    return isInternetReachable;
  }
  return isConnected;
};

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isConnected: true,
  isInternetReachable: true,
  connectionType: null,
  lastChangedAt: Date.now(),
  isOnline: true,
  setNetworkState: partialState => {
    const currentState = get();
    const nextState = {
      ...currentState,
      ...partialState,
    } as Omit<NetworkState, 'setNetworkState'>;

    const resolvedIsOnline = computeIsOnline(
      partialState.isConnected ?? currentState.isConnected,
      partialState.isInternetReachable ?? currentState.isInternetReachable,
    );

    set({
      ...partialState,
      isOnline: resolvedIsOnline,
      lastChangedAt: Date.now(),
      connectionType:
        partialState.connectionType ?? currentState.connectionType ?? null,
    });
  },
}));

export const selectIsOnline = (state: NetworkState) => state.isOnline;
export const selectConnectionType = (state: NetworkState) =>
  state.connectionType;
