type AsyncStorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  getAllKeys: () => Promise<string[]>;
};

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const asyncStorageShim: AsyncStorageLike = {
  getItem: async (key) => (isBrowser ? window.localStorage.getItem(key) : null),
  setItem: async (key, value) => {
    if (isBrowser) window.localStorage.setItem(key, value);
  },
  removeItem: async (key) => {
    if (isBrowser) window.localStorage.removeItem(key);
  },
  clear: async () => {
    if (isBrowser) window.localStorage.clear();
  },
  getAllKeys: async () => (isBrowser ? Object.keys(window.localStorage) : []),
};

export default asyncStorageShim;
