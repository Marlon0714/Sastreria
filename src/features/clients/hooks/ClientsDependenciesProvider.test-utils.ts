/**
 * Test utility — creates a no-op ClientsDependencies object for wrapping
 * screens in tests where the actual repository calls are mocked at the hook
 * level (jest.mock on useUpsertCamisa, useCamisaMeasurement, etc.).
 *
 * Usage: wrap the screen with <ClientsDependenciesProvider dependencies={noopDependencies}>
 */
import type { ClientsDependencies } from "../domain/repository";

export const noopDependencies: ClientsDependencies = {
  clientRepository: {
    create: async () => Promise.reject(new Error("noop")),
    findAll: async () => Promise.resolve([]),
    findById: async () => Promise.resolve(null),
    update: async () => Promise.reject(new Error("noop")),
    delete: async () => Promise.reject(new Error("noop")),
  },
  measurementRepository: {
    upsertCamisa: async () => Promise.reject(new Error("noop")),
    upsertPantalon: async () => Promise.reject(new Error("noop")),
    upsertSaco: async () => Promise.reject(new Error("noop")),
    upsertChaleco: async () => Promise.reject(new Error("noop")),
    findCamisaByClientId: async () => Promise.resolve(null),
    findPantalonByClientId: async () => Promise.resolve(null),
    findSacoByClientId: async () => Promise.resolve(null),
    findChalecoByClientId: async () => Promise.resolve(null),
  },
  tallaRepository: {
    upsert: async () => Promise.reject(new Error("noop")),
    findByClientId: async () => Promise.resolve([]),
    delete: async () => Promise.reject(new Error("noop")),
  },
};
