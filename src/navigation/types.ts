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
  CamisaMeasurementCreate: { clientId: string };
  PantalonMeasurementCreate: { clientId: string };
  CamisaMeasurementDetail: { clientId: string };
  PantalonMeasurementDetail: { clientId: string };
  /**
   * @deprecated Reemplazada por `CamisaMeasurementCreate` / `PantalonMeasurementCreate`.
   * Eliminada en N-019 junto con `MeasurementCreateScreen`.
   */
  MeasurementCreate: { clientId: string };
  /**
   * @deprecated Reemplazada por `CamisaMeasurementDetail` / `PantalonMeasurementDetail`.
   * Eliminada en N-019 junto con `MeasurementHistoryScreen`.
   */
  MeasurementHistory: { clientId: string };
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
