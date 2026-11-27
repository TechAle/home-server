import {create} from 'zustand';

interface FoundryUiState {
  /** Timestamp until which the dashboard disables start/restart. */
  cooldownUntil: number;
  startCooldown: (ms: number) => void;
}

/**
 * In-memory only: the cooldown must survive navigating away from the dashboard
 * while Foundry is still binding its port, but not an app restart.
 */
export const useFoundryUiStore = create<FoundryUiState>(set => ({
  cooldownUntil: 0,
  startCooldown: ms => set({cooldownUntil: Date.now() + ms}),
}));
