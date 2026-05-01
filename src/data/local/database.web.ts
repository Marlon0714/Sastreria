type SyncStatus = "pending" | "synced" | "error";

interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

interface MeasurementRow {
  id: string;
  client_id: string;
  measured_at: string;
  pecho_cm: number;
  cintura_cm: number;
  cadera_cm: number;
  largo_cm: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

interface CamisaMeasurementRow {
  id: string;
  client_id: string;
  espalda: number | null;
  hombro: number | null;
  talle_delantero: number | null;
  talle_trasero: number | null;
  distancia: number | null;
  separacion: number | null;
  pecho: number | null;
  cintura: number | null;
  base: number | null;
  largo: number | null;
  largo_manga: number | null;
  ancho_manga: number | null;
  escote: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

interface PantalonMeasurementRow {
  id: string;
  client_id: string;
  largo: number | null;
  cintura: number | null;
  base: number | null;
  tiro: number | null;
  pierna: number | null;
  rodilla: number | null;
  bota: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

interface UserVersionRow {
  user_version: number;
}

interface SqlResult {
  lastInsertRowId: number;
  changes: number;
}

interface WebDatabase {
  runAsync(sql: string, ...params: unknown[]): Promise<SqlResult>;
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  execAsync(sql: string): Promise<void>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

interface InMemoryState {
  userVersion: number;
  clients: ClientRow[];
  measurements: MeasurementRow[];
  camisaMeasurements: CamisaMeasurementRow[];
  pantalonMeasurements: PantalonMeasurementRow[];
}

const state: InMemoryState = {
  userVersion: 0,
  clients: [],
  measurements: [],
  camisaMeasurements: [],
  pantalonMeasurements: [],
};

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}

const webDatabase: WebDatabase = {
  async runAsync(sql: string, ...params: unknown[]): Promise<SqlResult> {
    const normalized = normalizeSql(sql);

    if (normalized.includes("insert into clients")) {
      const [
        id,
        firstName,
        lastName,
        phone,
        notes,
        createdAt,
        updatedAt,
        syncStatus,
      ] = params as [
        string,
        string,
        string,
        string,
        string | null,
        string,
        string,
        SyncStatus,
      ];

      state.clients.push({
        id,
        first_name: firstName,
        last_name: lastName,
        phone,
        notes,
        created_at: createdAt,
        updated_at: updatedAt,
        sync_status: syncStatus,
      });

      return { lastInsertRowId: 0, changes: 1 };
    }

    if (normalized.includes("insert into measurements")) {
      const [
        id,
        clientId,
        measuredAt,
        pechoCm,
        cinturaCm,
        caderaCm,
        largoCm,
        notes,
        createdAt,
        updatedAt,
        syncStatus,
      ] = params as [
        string,
        string,
        string,
        number,
        number,
        number,
        number,
        string | null,
        string,
        string,
        SyncStatus,
      ];

      state.measurements.push({
        id,
        client_id: clientId,
        measured_at: measuredAt,
        pecho_cm: pechoCm,
        cintura_cm: cinturaCm,
        cadera_cm: caderaCm,
        largo_cm: largoCm,
        notes,
        created_at: createdAt,
        updated_at: updatedAt,
        sync_status: syncStatus,
      });

      return { lastInsertRowId: 0, changes: 1 };
    }

    if (normalized.includes("insert into camisa_measurements")) {
      const [
        id,
        clientId,
        espalda,
        hombro,
        talleDelantero,
        talleTrasero,
        distancia,
        separacion,
        pecho,
        cintura,
        base,
        largo,
        largoManga,
        anchoManga,
        escote,
        notes,
        createdAt,
        updatedAt,
        syncStatus,
      ] = params as [
        string,
        string,
        number | null,
        number | null,
        number | null,
        number | null,
        number | null,
        number | null,
        number | null,
        number | null,
        number | null,
        number | null,
        number | null,
        number | null,
        number | null,
        string | null,
        string,
        string,
        SyncStatus,
      ];

      const existingIndex = state.camisaMeasurements.findIndex(
        (row) => row.client_id === clientId,
      );

      if (existingIndex >= 0) {
        const existing = state.camisaMeasurements[existingIndex];
        state.camisaMeasurements[existingIndex] = {
          ...existing,
          espalda,
          hombro,
          talle_delantero: talleDelantero,
          talle_trasero: talleTrasero,
          distancia,
          separacion,
          pecho,
          cintura,
          base,
          largo,
          largo_manga: largoManga,
          ancho_manga: anchoManga,
          escote,
          notes,
          updated_at: updatedAt,
          sync_status: syncStatus,
        };
      } else {
        state.camisaMeasurements.push({
          id,
          client_id: clientId,
          espalda,
          hombro,
          talle_delantero: talleDelantero,
          talle_trasero: talleTrasero,
          distancia,
          separacion,
          pecho,
          cintura,
          base,
          largo,
          largo_manga: largoManga,
          ancho_manga: anchoManga,
          escote,
          notes,
          created_at: createdAt,
          updated_at: updatedAt,
          sync_status: syncStatus,
        });
      }

      return { lastInsertRowId: 0, changes: 1 };
    }

    if (normalized.includes("insert into pantalon_measurements")) {
      const [
        id,
        clientId,
        largo,
        cintura,
        base,
        tiro,
        pierna,
        rodilla,
        bota,
        notes,
        createdAt,
        updatedAt,
        syncStatus,
      ] = params as [
        string,
        string,
        number | null,
        number | null,
        number | null,
        number | null,
        number | null,
        number | null,
        number | null,
        string | null,
        string,
        string,
        SyncStatus,
      ];

      const existingIndex = state.pantalonMeasurements.findIndex(
        (row) => row.client_id === clientId,
      );

      if (existingIndex >= 0) {
        const existing = state.pantalonMeasurements[existingIndex];
        state.pantalonMeasurements[existingIndex] = {
          ...existing,
          largo,
          cintura,
          base,
          tiro,
          pierna,
          rodilla,
          bota,
          notes,
          updated_at: updatedAt,
          sync_status: syncStatus,
        };
      } else {
        state.pantalonMeasurements.push({
          id,
          client_id: clientId,
          largo,
          cintura,
          base,
          tiro,
          pierna,
          rodilla,
          bota,
          notes,
          created_at: createdAt,
          updated_at: updatedAt,
          sync_status: syncStatus,
        });
      }

      return { lastInsertRowId: 0, changes: 1 };
    }

    return { lastInsertRowId: 0, changes: 0 };
  },

  async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    const normalized = normalizeSql(sql);

    if (normalized.includes("from clients")) {
      const rows = [...state.clients].sort((a, b) =>
        b.updated_at.localeCompare(a.updated_at),
      );
      return rows as T[];
    }

    if (
      normalized.includes("from measurements") &&
      normalized.includes("where client_id = ?")
    ) {
      const [clientId] = params as [string];
      const rows = state.measurements
        .filter((row) => row.client_id === clientId)
        .sort((a, b) => b.measured_at.localeCompare(a.measured_at));
      return rows as T[];
    }

    return [];
  },

  async getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null> {
    const normalized = normalizeSql(sql);

    if (normalized === "pragma user_version;") {
      const row: UserVersionRow = { user_version: state.userVersion };
      return row as T;
    }

    if (
      normalized.includes("from clients") &&
      normalized.includes("where id = ?")
    ) {
      const [id] = params as [string];
      const row = state.clients.find((client) => client.id === id) ?? null;
      return row as T | null;
    }

    if (
      normalized.includes("from camisa_measurements") &&
      normalized.includes("where client_id = ?")
    ) {
      const [clientId] = params as [string];
      const row =
        state.camisaMeasurements.find(
          (measurement) => measurement.client_id === clientId,
        ) ?? null;
      return row as T | null;
    }

    if (
      normalized.includes("from pantalon_measurements") &&
      normalized.includes("where client_id = ?")
    ) {
      const [clientId] = params as [string];
      const row =
        state.pantalonMeasurements.find(
          (measurement) => measurement.client_id === clientId,
        ) ?? null;
      return row as T | null;
    }

    return null;
  },

  async execAsync(sql: string): Promise<void> {
    const normalized = normalizeSql(sql);
    const match = normalized.match(/^pragma user_version = (\d+);?$/);
    if (match) {
      state.userVersion = Number(match[1]);
    }
  },

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    await task();
  },
};

export function getDatabase(): WebDatabase {
  return webDatabase;
}
