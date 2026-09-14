import { useIdentityStore } from "../../../shared/state/identityStore";

/**
 * Formula de visibilidad exclusiva del dueño (usada para la marca "Personal"
 * de Agenda, ver N-120): solo el dueño en su propio dispositivo ve/toca este
 * contenido. En el dispositivo compartido del mostrador nunca se ve, ni
 * siquiera si quien lo usa en ese momento es el dueño — la marca "Personal"
 * no debe aparecer ni poder tocarse ahí bajo ninguna circunstancia. Sin
 * perfil resuelto (bypass offline ya documentado en `isTabVisibleForRole`)
 * se retorna `true` para no ocultar nada.
 */
export function useOwnerOnlyVisibility(): boolean {
  const role = useIdentityStore((state) => state.ownProfile?.role ?? null);
  const isSharedDevice = useIdentityStore(
    (state) => state.ownProfile?.isSharedDevice ?? false,
  );

  if (!role) {
    return true;
  }

  return role === "owner" && !isSharedDevice;
}
