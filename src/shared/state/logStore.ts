import { create } from "zustand";

export type LogEntry = { level: string; message: string; timestamp: string };

type LogStore = {
  logs: LogEntry[];
  addLog: (level: string, message: string) => void;
  clearLogs: () => void;
  logViewerEnabled: boolean;
  toggleLogViewer: () => void;
};

export const useLogStore = create<LogStore>((set) => ({
  logs: [],
  logViewerEnabled: false,
  addLog: (level, message) =>
    set((state) => ({
      logs: [
        ...state.logs,
        { level, message, timestamp: new Date().toISOString() },
      ].slice(-100),
    })),
  clearLogs: () => set({ logs: [] }),
  toggleLogViewer: () =>
    set((state) => ({ logViewerEnabled: !state.logViewerEnabled })),
}));
