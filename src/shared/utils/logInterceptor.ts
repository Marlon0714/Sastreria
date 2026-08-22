import { useLogStore } from "../state/logStore";

// Serializa de forma segura un valor que no es string, para no perder
// información útil (ej. objetos de contexto o errores) al loguearlo.
function safeStringify(value: unknown): string {
  if (value instanceof Error) {
    // Las propiedades de Error no son enumerables, así que JSON.stringify(error)
    // da "{}". Serializamos explícitamente lo relevante.
    return `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ""}`;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    // Referencias circulares u otros valores que JSON.stringify no puede manejar.
    return String(value);
  }
}

function formatArgs(args: unknown[]): string {
  return args
    .map((a) => (typeof a === "string" ? a : safeStringify(a)))
    .join(" ");
}

export function interceptLogs() {
  const addLog = useLogStore.getState().addLog;
  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  console.log = (...args) => {
    addLog("log", formatArgs(args));
    origLog(...args);
  };
  console.warn = (...args) => {
    addLog("warn", formatArgs(args));
    origWarn(...args);
  };
  console.error = (...args) => {
    addLog("error", formatArgs(args));
    origError(...args);
  };
}
