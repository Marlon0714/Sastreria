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
  /**
   * `date` (YYYY-MM-DD) abre la Agenda directo en ese día en vez de "hoy" —
   * usado desde el Dashboard al tocar un día del desglose semanal (N-111).
   * Opcional y sin afectar el comportamiento por defecto: sin params (o sin
   * `date`), `ScheduleDayViewScreen` sigue arrancando en `todayDateString()`.
   */
  ScheduleDayView: { date?: string } | undefined;
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
  /** Perfil del dueño en modo solo lectura (N-106 fase a) — ver `MyAccountScreen`. */
  MyAccount: undefined;
  /**
   * Detalle de turnos detrás de una tarjeta tocada en el Dashboard (bucket
   * de estado/"no realizados"/"sin fecha global") — ver
   * `dashboard/domain/scheduleListBucket.ts`. `bucket` se declara como
   * unión literal inline (no se importa `ScheduleListBucket` desde
   * `dashboard/domain`), mismo criterio ya usado acá para `category` en
   * `ScheduleStackParamList`/`PricingStackParamList`: mantiene este
   * archivo desacoplado de las features. `startDate`/`endDate` quedan sin
   * definir para buckets globales (`"pendiente"`/`"sin_fecha_global"`).
   */
  ScheduleListByStatus: {
    bucket:
      | "total"
      | "pendiente"
      | "agendado"
      | "en_proceso"
      | "listo_para_entregar"
      | "entregado"
      | "no_realizado"
      | "sin_fecha_global";
    cardLabel: string;
    startDate?: string;
    endDate?: string;
  };
};

export type RootTabParamList = {
  DashboardTab: NavigatorScreenParams<DashboardStackParamList>;
  ClientsTab: NavigatorScreenParams<ClientsStackParamList>;
  TallasTab: NavigatorScreenParams<TallasStackParamList>;
  ScheduleTab: NavigatorScreenParams<ScheduleStackParamList>;
  PricingTab: NavigatorScreenParams<PricingStackParamList>;
};
