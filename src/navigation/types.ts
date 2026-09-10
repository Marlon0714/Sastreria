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
};

export type ScheduleStackParamList = {
  ScheduleDayView: undefined;
  ScheduleForm: {
    scheduleId?: string;
    /** Preselecciona la categoría al crear un turno nuevo (según el segmento activo en la Agenda). */
    category?: "arreglo" | "confeccion";
  };
  /** Autoservicio del operario: ver correo/PIN y cambiarlos, y acceso a "Mis arreglos". */
  MyAccount: undefined;
  /** Arreglos que el operario marcó listo/entregado en un día, con su precio (para calcular su comisión). */
  MyActivity: undefined;
};

export type PricingStackParamList = {
  PricingList: undefined;
  PricingDetail: { id: string };
  PricingForm: { id?: string; category?: "arreglo" | "confeccion" };
  PricingPlaceholder: undefined;
  /** Autoservicio del operario: ver correo/PIN y cambiarlos, y acceso a "Mis arreglos". */
  MyAccount: undefined;
  /** Arreglos que el operario marcó listo/entregado en un día, con su precio (para calcular su comisión). */
  MyActivity: undefined;
};

export type TallasStackParamList = {
  TallasList: undefined;
  TallaForm: {
    type: "camisa" | "pantalon" | "saco" | "chaleco";
    tallaId?: string;
  };
};

export type DashboardStackParamList = {
  DashboardHome: undefined;
};

export type RootTabParamList = {
  DashboardTab: NavigatorScreenParams<DashboardStackParamList>;
  ClientsTab: NavigatorScreenParams<ClientsStackParamList>;
  TallasTab: NavigatorScreenParams<TallasStackParamList>;
  ScheduleTab: NavigatorScreenParams<ScheduleStackParamList>;
  PricingTab: NavigatorScreenParams<PricingStackParamList>;
};
