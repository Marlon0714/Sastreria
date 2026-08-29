import type { Profile } from "./profile";

/**
 * Espejo local de solo lectura de `profiles` (Supabase) — pull-only, la app
 * nunca crea/edita perfiles. Permite que pickers como "operario asignado"
 * funcionen sin conexión.
 */
export interface ProfilesCacheRepository {
  /** Perfiles asignables como responsables de un turno — excluye cuentas de dispositivo compartido. */
  getOperarios(): Promise<Profile[]>;
  /**
   * Perfiles que pueden identificarse como autor de una acción en una
   * tablet compartida cuando no hay conexión para validar un PIN por RPC
   * (ver `resolve_operario_by_pin`, migración v35). A diferencia de
   * `getOperarios()`, incluye cualquier rol (`owner` u `operario`) — el
   * dueño también puede tomar la tablet compartida y debe poder
   * identificarse aunque se corte la conexión justo en ese momento.
   * Excluye igualmente cuentas de dispositivo compartido.
   */
  getIdentityCandidates(): Promise<Profile[]>;
}
