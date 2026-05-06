import { useLogStore } from "../state/logStore";

export function interceptLogs() {
  const addLog = useLogStore.getState().addLog;
  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  console.log = (...args) => {
    addLog("log", args.join(" "));
    origLog(...args);
  };
  console.warn = (...args) => {
    addLog("warn", args.join(" "));
    origWarn(...args);
  };
  console.error = (...args) => {
    addLog("error", args.join(" "));
    origError(...args);
  };
}
