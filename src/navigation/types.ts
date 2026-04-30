import type { NavigatorScreenParams } from "@react-navigation/native";

export type ClientsStackParamList = {
  ClientList: undefined;
  ClientCreate: undefined;
  ClientDetail: { clientId: string };
  MeasurementCreate: { clientId: string };
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
