import type {
  CamisaMeasurement,
  Client,
  ClientTalla,
  CreateClientDTO,
  CreateTallaDTO,
  PantalonMeasurement,
  SacoMeasurement,
  ChalecoMeasurement,
  UpdateClientDTO,
  UpdateTallaDTO,
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
}

export interface TallaRepository {
  upsert(input: CreateTallaDTO | UpdateTallaDTO): Promise<ClientTalla>;
  findByClientId(clientId: string): Promise<ClientTalla[]>;
  delete(id: string): Promise<void>;
}

export interface ClientsDependencies {
  clientRepository: ClientRepository;
  measurementRepository: MeasurementRepository;
  tallaRepository: TallaRepository;
}

export type ClientsDependenciesOverrides = Partial<ClientsDependencies>;
