import type { Profile } from "./profile";

/**
 * Espejo local de solo lectura de `profiles` (Supabase) — pull-only, la app
 * nunca crea/edita perfiles. Permite que pickers como "operario asignado"
 * funcionen sin conexión.
 */
export interface ProfilesCacheRepository {
  /** Perfiles asignables como responsables de un turno — excluye cuentas de dispositivo compartido. */
  getOperarios(): Promise<Profile[]>;
}
