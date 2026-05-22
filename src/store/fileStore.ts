import { create } from 'zustand';
import * as filesApi from '../api/files';

export interface UiFile {
  id: string;
  name: string;
  version: string;
  reflected: boolean;
  date: string;
}

interface FileState {
  files: filesApi.DomainFile[];
  loadFiles: (serviceId: string) => Promise<void>;
  reset: () => void;
  getUiFiles: () => UiFile[];
}

function toUiFile(f: filesApi.DomainFile): UiFile {
  return {
    id: f.file_id,
    name: f.name,
    version: f.version,
    reflected: f.reflected,
    date: (f.uploaded_at || '').slice(0, 10),
  };
}

export const useFileStore = create<FileState>()((set, get) => ({
  files: [],

  loadFiles: async (serviceId) => {
    set({ files: await filesApi.listFiles(serviceId) });
  },

  reset: () => set({ files: [] }),

  getUiFiles: () => get().files.map(toUiFile),
}));
