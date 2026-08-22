import { create } from "zustand";

export type LogEntry = {
  id: number;
  level: string;
  message: string;
  timestamp: string;
};

type LogStore = {
  logs: LogEntry[];
  addLog: (level: string, message: string) => void;
  clearLogs: () => void;
  logViewerEnabled: boolean;
  toggleLogViewer: () => void;
};

// Contador incremental en memoria para dar a cada log un id estable,
// independiente de su posición en el array (que se recorta a las últimas 100 entradas).
let nextLogId = 0;

export const useLogStore = create<LogStore>((set) => ({
  logs: [],
  logViewerEnabled: false,
  addLog: (level, message) =>
    set((state) => ({
      logs: [
        ...state.logs,
        { id: nextLogId++, level, message, timestamp: new Date().toISOString() },
      ].slice(-100),
    })),
  clearLogs: () => set({ logs: [] }),
  toggleLogViewer: () =>
    set((state) => ({ logViewerEnabled: !state.logViewerEnabled })),
}));
