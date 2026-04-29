export type RootStackParamList = {
  ClientList: undefined;
  ClientCreate: undefined;
  ClientDetail: { clientId: string };
  MeasurementCreate: { clientId: string };
  MeasurementHistory: { clientId: string };
};
