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
  },
  measurementRepository: {
    upsertCamisa: async () => Promise.reject(new Error("noop")),
    upsertPantalon: async () => Promise.reject(new Error("noop")),
    findCamisaByClientId: async () => Promise.resolve(null),
    findPantalonByClientId: async () => Promise.resolve(null),
  },
};
