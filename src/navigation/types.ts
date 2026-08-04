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
  /**
   * Pantalla unificada de saco: crea si no hay medidas, muestra/edita si ya existen.
   * `mode: "create"` muestra "Continuar sin medidas" la primera vez.
   */
  SacoMeasurementDetail: {
    clientId: string;
    mode?: MeasurementTypeSelectMode;
  };
  /**
   * Pantalla unificada de chaleco: crea si no hay medidas, muestra/edita si ya existen.
   * `mode: "create"` muestra "Continuar sin medidas" la primera vez.
   */
  ChalecoMeasurementDetail: {
    clientId: string;
    mode?: MeasurementTypeSelectMode;
  };
  /** Gestión de tallas por cliente (acceso desde ClientDetail). */
  Tallas: { clientId: string };
};

export type ScheduleStackParamList = {
  ScheduleDayView: undefined;
  ScheduleForm: { scheduleId?: string };
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
