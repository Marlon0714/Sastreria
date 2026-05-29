import type { NavigatorScreenParams } from "@react-navigation/native";

export type MeasurementTypeSelectMode = "create" | "view";

export type ClientsStackParamList = {
  ClientList: undefined;
  ClientCreate: undefined;
  ClientDetail: { clientId: string };
  ClientEdit: { clientId: string };
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
  /** Crear medidas de saco para un cliente. */
  SacoMeasurementCreate: { clientId: string; mode?: MeasurementTypeSelectMode };
  /** Editar medidas de saco para un cliente. */
  SacoMeasurementEdit: { clientId: string };
  /** Crear medidas de chaleco para un cliente. */
  ChalecoMeasurementCreate: {
    clientId: string;
    mode?: MeasurementTypeSelectMode;
  };
  /** Editar medidas de chaleco para un cliente. */
  ChalecoMeasurementEdit: { clientId: string };
  /** Gestión de tallas por cliente (acceso desde ClientDetail). */
  Tallas: { clientId: string };
};

export type ScheduleStackParamList = {
  SchedulePlaceholder: undefined;
};

export type PricingStackParamList = {
  PricingList: undefined;
  PricingDetail: { id: string };
  PricingForm: { id?: string; category?: "arreglo" | "confeccion" };
  PricingPlaceholder: undefined;
};

export type TallasStackParamList = {
  TallasList: undefined;
  TallaForm: {
    type: "camisa" | "pantalon" | "saco" | "chaleco";
    tallaId?: string;
  };
};

export type RootTabParamList = {
  ClientsTab: NavigatorScreenParams<ClientsStackParamList>;
  TallasTab: NavigatorScreenParams<TallasStackParamList>;
  ScheduleTab: NavigatorScreenParams<ScheduleStackParamList>;
  PricingTab: NavigatorScreenParams<PricingStackParamList>;
};
