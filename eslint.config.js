const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: ["coverage/**", "dist/**"],
  },
  {
    // `eslint-config-expo` (bump a ~57.0.2 con la migración de SDK, N-114)
    // habilita por defecto un set de reglas de React Compiler. Revisadas
    // hallazgo por hallazgo en N-128:
    // - `set-state-in-effect`: decisión permanente en "warn". Los ~30
    //   hallazgos son el idioma estándar de este proyecto para "cargar al
    //   montar" (`load` en useCallback + `useEffect(() => { void load() })`),
    //   sin librería de fetching (no hay React Query/SWR). No son tan
    //   uniformes como parece (distinción loading/refreshing en unos,
    //   Promise.all + derivados en otros): forzar un hook compartido
    //   ahorraría poco código y arriesga romper comportamiento ya afinado en
    //   rondas previas de bugs (N-089/N-093/N-094). Ver needs-backlog.md.
    // - `immutability`, `incompatible-library`, `refs`: los hallazgos reales
    //   ya se corrigieron (ver needs-backlog.md, N-128). Quedan en "warn"
    //   por si aparece un caso nuevo, para no bloquear el lint mientras se
    //   revisa con la misma atención individual.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/incompatible-library": "warn",
      "react-hooks/refs": "warn",
    },
  },
]);
