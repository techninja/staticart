/**
 * App state — singleton, localStorage-backed. No server needed.
 * @module store/AppState
 */

import { store } from 'hybrids';

/** @typedef {{ theme: 'light'|'dark', count: number, region: string }} AppState */

/** @type {import('hybrids').Model<AppState>} */
const AppState = {
  theme: 'light',
  count: 0,
  region: '',
  [store.connect]: {
    get: () => {
      const raw = localStorage.getItem('appState');
      const state = raw ? JSON.parse(raw) : {};
      if (!state.theme) {
        state.theme = window.matchMedia?.('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      }
      return state;
    },
    set: (id, values) => {
      localStorage.setItem('appState', JSON.stringify(values));
      return values;
    },
  },
};

export default AppState;
