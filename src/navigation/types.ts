import type { NavigatorScreenParams } from "@react-navigation/native";

export type MeasurementTypeSelectMode = "create" | "view";

export type ClientsStackParamList = {
  ClientList: undefined;
  ClientCreate: undefined;
  ClientDetail: { clientId: string };
  /**
   * Permite al usuario elegir entre registrar/ver medidas de camisa o pantalón.
   * - `mode: "create"` despliega botón "Continuar sin medidas".
   * - `mode: "view"` redirige a la pantalla de detalle del tipo seleccionado.
   */
  MeasurementTypeSelect: { clientId: string; mode: MeasurementTypeSelectMode };
  /** @deprecated — navegación a Create separada eliminada; flujo unificado en Detail */
  CamisaMeasurementCreate: { clientId: string };
  /** @deprecated — navegación a Create separada eliminada; flujo unificado en Detail */
  PantalonMeasurementCreate: { clientId: string };
  /**
   * Pantalla unificada de camisa: crea si no hay medidas, muestra/edita si ya existen.
   * `mode: "create"` muestra "Continuar sin medidas" la primera vez.
   */
  CamisaMeasurementDetail: {
    clientId: string;
    mode?: MeasurementTypeSelectMode;
  };
  /**
   * Pantalla unificada de pantalón: crea si no hay medidas, muestra/edita si ya existen.
   * `mode: "create"` muestra "Continuar sin medidas" la primera vez.
   */
  PantalonMeasurementDetail: {
    clientId: string;
    mode?: MeasurementTypeSelectMode;
  };
};

export type ScheduleStackParamList = {
  SchedulePlaceholder: undefined;
};

export type PricingStackParamList = {
  PricingPlaceholder: undefined;
};

export type RootTabParamList = {
  ClientsTab: NavigatorScreenParams<ClientsStackParamList>;
  ScheduleTab: NavigatorScreenParams<ScheduleStackParamList>;
  PricingTab: NavigatorScreenParams<PricingStackParamList>;
};
