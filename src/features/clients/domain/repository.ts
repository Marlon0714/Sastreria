import type {
  AddMeasurementDTO,
  Client,
  CreateClientDTO,
  Measurement,
} from "./types";

export interface ClientRepository {
  create(input: CreateClientDTO): Promise<Client>;
  findAll(): Promise<Client[]>;
  findById(id: string): Promise<Client | null>;
}

export interface MeasurementRepository {
  addMeasurement(input: AddMeasurementDTO): Promise<Measurement>;
  findMeasurementsByClientId(clientId: string): Promise<Measurement[]>;
}
