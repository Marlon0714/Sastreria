import type {
  CamisaMeasurement,
  Client,
  CreateClientDTO,
  PantalonMeasurement,
  UpsertCamisaDTO,
  UpsertPantalonDTO,
} from "./types";

export interface ClientRepository {
  create(input: CreateClientDTO): Promise<Client>;
  findAll(): Promise<Client[]>;
  findById(id: string): Promise<Client | null>;
}

export interface MeasurementRepository {
  upsertCamisa(input: UpsertCamisaDTO): Promise<CamisaMeasurement>;
  upsertPantalon(input: UpsertPantalonDTO): Promise<PantalonMeasurement>;
  findCamisaByClientId(clientId: string): Promise<CamisaMeasurement | null>;
  findPantalonByClientId(clientId: string): Promise<PantalonMeasurement | null>;
}

export interface ClientsDependencies {
  clientRepository: ClientRepository;
  measurementRepository: MeasurementRepository;
}

export type ClientsDependenciesOverrides = Partial<ClientsDependencies>;
