import type {
  CamisaMeasurement,
  Client,
  CreateClientDTO,
  PantalonMeasurement,
  SacoMeasurement,
  ChalecoMeasurement,
  UpdateClientDTO,
  UpsertCamisaDTO,
  UpsertPantalonDTO,
  UpsertSacoDTO,
  UpsertChalecoDTO,
} from "./types";

export interface ClientRepository {
  create(input: CreateClientDTO): Promise<Client>;
  findAll(): Promise<Client[]>;
  findById(id: string): Promise<Client | null>;
  update(input: UpdateClientDTO): Promise<Client>;
  delete(id: string): Promise<void>;
}

export interface MeasurementRepository {
  upsertCamisa(input: UpsertCamisaDTO): Promise<CamisaMeasurement>;
  upsertPantalon(input: UpsertPantalonDTO): Promise<PantalonMeasurement>;
  upsertSaco(input: UpsertSacoDTO): Promise<SacoMeasurement>;
  upsertChaleco(input: UpsertChalecoDTO): Promise<ChalecoMeasurement>;
  findCamisaByClientId(clientId: string): Promise<CamisaMeasurement | null>;
  findPantalonByClientId(clientId: string): Promise<PantalonMeasurement | null>;
  findSacoByClientId(clientId: string): Promise<SacoMeasurement | null>;
  findChalecoByClientId(clientId: string): Promise<ChalecoMeasurement | null>;
  deleteCamisa(clientId: string): Promise<void>;
  deletePantalon(clientId: string): Promise<void>;
  deleteSaco(clientId: string): Promise<void>;
  deleteChaleco(clientId: string): Promise<void>;
}

export interface ClientsDependencies {
  clientRepository: ClientRepository;
  measurementRepository: MeasurementRepository;
}

export type ClientsDependenciesOverrides = Partial<ClientsDependencies>;
