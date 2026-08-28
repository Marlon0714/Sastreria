import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import { clientFactory } from "../../../__tests__/factories";
import type { Client } from "../domain/types";
import type { UpdateClientSchemaInput } from "../domain/schemas";
import ClientEditScreen from "./ClientEditScreen";

const mockFindAll = jest.fn<() => Promise<Client[]>>();

jest.mock("../hooks/ClientsDependenciesProvider", () => ({
  useClientRepository: () => ({ findAll: mockFindAll }),
}));

interface UseClientDetailResult {
  client: Client | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

interface HookFieldError {
  message?: string;
}

interface HookFieldErrors {
  firstName?: HookFieldError;
  lastName?: HookFieldError;
  phone?: HookFieldError;
  notes?: HookFieldError;
}

interface UseUpdateClientResult {
  isSubmitting: boolean;
  error: string | null;
  updateClient: (values: UpdateClientSchemaInput) => Promise<Client | null>;
  validate: (values: UpdateClientSchemaInput) => HookFieldErrors;
}

const mockUseClientDetail = jest.fn<() => UseClientDetailResult>();
const mockUseUpdateClient = jest.fn<() => UseUpdateClientResult>();

jest.mock("../hooks/useClientDetail", () => ({
  useClientDetail: () => mockUseClientDetail(),
}));

jest.mock("../hooks/useUpdateClient", () => ({
  useUpdateClient: () => mockUseUpdateClient(),
}));

function buildProps() {
  return {
    navigation: {
      goBack: jest.fn(),
    } as never,
    route: {
      params: {
        clientId: "11111111-1111-4111-8111-111111111111",
      },
    } as never,
  };
}

describe("ClientEditScreen", () => {
  beforeEach(() => {
    mockUseClientDetail.mockReset();
    mockUseUpdateClient.mockReset();
    mockFindAll.mockReset();
    mockFindAll.mockResolvedValue([]);
  });

  it("renderiza el formulario pre-llenado con los datos del cliente", async () => {
    // Arrange
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    const client = clientFactory({
      id: "11111111-1111-4111-8111-111111111111",
      firstName: "Ana",
      lastName: "Torres",
      phone: "3001234567",
      notes: "Cliente frecuente",
    });

    mockUseClientDetail.mockReturnValue({
      client,
      isLoading: false,
      error: null,
      reload,
    });

    mockUseUpdateClient.mockReturnValue({
      isSubmitting: false,
      error: null,
      updateClient: jest.fn(async () => client),
      validate: () => ({}),
    });

    // Act
    const { getByDisplayValue } = render(
      <ClientEditScreen {...buildProps()} />,
    );
    await waitFor(() => expect(mockFindAll).toHaveBeenCalled());

    // Assert
    expect(getByDisplayValue("Ana")).toBeTruthy();
    expect(getByDisplayValue("Torres")).toBeTruthy();
    expect(getByDisplayValue("3001234567")).toBeTruthy();
    expect(getByDisplayValue("Cliente frecuente")).toBeTruthy();
  });

  it("envía formulario y llama updateClient", async () => {
    // Arrange
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    const goBack = jest.fn();

    const client = clientFactory({
      id: "11111111-1111-4111-8111-111111111111",
      firstName: "Ana",
      lastName: "Torres",
      phone: "3001234567",
      notes: "Cliente frecuente",
    });

    const updateClient =
      jest.fn<(values: UpdateClientSchemaInput) => Promise<Client | null>>();
    updateClient.mockResolvedValue(client);

    mockUseClientDetail.mockReturnValue({
      client,
      isLoading: false,
      error: null,
      reload,
    });

    mockUseUpdateClient.mockReturnValue({
      isSubmitting: false,
      error: null,
      updateClient,
      validate: () => ({}),
    });

    const props = {
      ...buildProps(),
      navigation: { goBack } as never,
    };

    // Act
    const { getByDisplayValue, getByLabelText } = render(
      <ClientEditScreen {...props} />,
    );
    await waitFor(() => expect(mockFindAll).toHaveBeenCalled());

    fireEvent.changeText(getByDisplayValue("Ana"), "Ana Maria");
    fireEvent.changeText(getByDisplayValue("Torres"), "Torres Diaz");
    fireEvent.changeText(getByDisplayValue("3001234567"), "3119990000");
    fireEvent.changeText(
      getByDisplayValue("Cliente frecuente"),
      "Nueva observación",
    );
    fireEvent.press(getByLabelText("Guardar cambios del cliente"));

    // Assert
    await waitFor(() => {
      expect(updateClient).toHaveBeenCalledWith({
        id: "11111111-1111-4111-8111-111111111111",
        firstName: "Ana Maria",
        lastName: "Torres Diaz",
        phone: "3119990000",
        phone2: "",
        phone3: "",
        cedula: "",
        notes: "Nueva observación",
      });
      expect(goBack).toHaveBeenCalledTimes(1);
    });
  });

  it("muestra errores de validación inline y no envía", async () => {
    // Arrange
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    const goBack = jest.fn();

    const client = clientFactory({
      id: "11111111-1111-4111-8111-111111111111",
      firstName: "Ana",
      lastName: "Torres",
      phone: "3001234567",
      notes: "",
    });

    const updateClient =
      jest.fn<(values: UpdateClientSchemaInput) => Promise<Client | null>>();

    mockUseClientDetail.mockReturnValue({
      client,
      isLoading: false,
      error: null,
      reload,
    });

    mockUseUpdateClient.mockReturnValue({
      isSubmitting: false,
      error: null,
      updateClient,
      validate: () => ({
        firstName: { message: "El nombre es obligatorio" },
        phone: { message: "El teléfono no es válido" },
      }),
    });

    const props = {
      ...buildProps(),
      navigation: { goBack } as never,
    };

    // Act
    const { getByLabelText, findByText } = render(
      <ClientEditScreen {...props} />,
    );
    await waitFor(() => expect(mockFindAll).toHaveBeenCalled());
    fireEvent.press(getByLabelText("Guardar cambios del cliente"));

    // Assert
    expect(await findByText("El nombre es obligatorio")).toBeTruthy();
    expect(await findByText("El teléfono no es válido")).toBeTruthy();
    expect(updateClient).not.toHaveBeenCalled();
    expect(goBack).not.toHaveBeenCalled();
  });

  it("advierte si el teléfono ya está usado por otro cliente y permite guardar de todos modos", async () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    const goBack = jest.fn();

    const client = clientFactory({
      id: "11111111-1111-4111-8111-111111111111",
      firstName: "Ana",
      lastName: "Torres",
      phone: "3001234567",
      notes: "",
    });
    const otroCliente = clientFactory({
      id: "22222222-2222-4222-8222-222222222222",
      firstName: "Luis",
      lastName: "Gómez",
      phone: "3119990000",
    });
    mockFindAll.mockResolvedValue([client, otroCliente]);

    const updateClient =
      jest.fn<(values: UpdateClientSchemaInput) => Promise<Client | null>>();
    updateClient.mockResolvedValue(client);

    mockUseClientDetail.mockReturnValue({
      client,
      isLoading: false,
      error: null,
      reload,
    });
    mockUseUpdateClient.mockReturnValue({
      isSubmitting: false,
      error: null,
      updateClient,
      validate: () => ({}),
    });

    jest.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
      const saveAnyway = buttons?.find(
        (b) => b.text === "Guardar de todos modos",
      );
      void saveAnyway?.onPress?.();
    });

    const props = { ...buildProps(), navigation: { goBack } as never };
    const { getByDisplayValue, getByLabelText } = render(
      <ClientEditScreen {...props} />,
    );

    await waitFor(() => expect(mockFindAll).toHaveBeenCalled());

    fireEvent.changeText(getByDisplayValue("3001234567"), otroCliente.phone);
    fireEvent.press(getByLabelText("Guardar cambios del cliente"));

    await waitFor(() => {
      expect(updateClient).toHaveBeenCalled();
      expect(goBack).toHaveBeenCalledTimes(1);
    });
  });

  it("no destapa Teléfono 3 si Teléfono 2 sigue vacío, para no correr los teléfonos al guardar", async () => {
    const client = clientFactory({
      id: "11111111-1111-4111-8111-111111111111",
      firstName: "Ana",
      lastName: "Torres",
      phone: "3001234567",
      phones: [],
    });

    mockUseClientDetail.mockReturnValue({
      client,
      isLoading: false,
      error: null,
      reload: jest.fn<() => Promise<void>>().mockResolvedValue(),
    });
    mockUseUpdateClient.mockReturnValue({
      isSubmitting: false,
      error: null,
      updateClient: jest.fn(async () => client),
      validate: () => ({}),
    });

    const { getByLabelText, queryByLabelText } = render(
      <ClientEditScreen {...buildProps()} />,
    );
    await waitFor(() => expect(mockFindAll).toHaveBeenCalled());

    fireEvent.press(getByLabelText("Agregar teléfono adicional"));
    expect(getByLabelText("Eliminar teléfono 2")).toBeTruthy();

    fireEvent.press(getByLabelText("Agregar teléfono adicional"));
    expect(queryByLabelText("Eliminar teléfono 3")).toBeNull();
  });

  it("detecta como duplicado un teléfono ya registrado como principal de otro cliente cuando se escribe en Teléfono 2", async () => {
    const client = clientFactory({
      id: "11111111-1111-4111-8111-111111111111",
      firstName: "Ana",
      lastName: "Torres",
      phone: "3001234567",
      phones: [],
    });
    const otroCliente = clientFactory({
      id: "22222222-2222-4222-8222-222222222222",
      firstName: "Luis",
      lastName: "Gómez",
      phone: "3119990000",
    });
    mockFindAll.mockResolvedValue([client, otroCliente]);

    const updateClient =
      jest.fn<(values: UpdateClientSchemaInput) => Promise<Client | null>>();
    updateClient.mockResolvedValue(client);

    mockUseClientDetail.mockReturnValue({
      client,
      isLoading: false,
      error: null,
      reload: jest.fn<() => Promise<void>>().mockResolvedValue(),
    });
    mockUseUpdateClient.mockReturnValue({
      isSubmitting: false,
      error: null,
      updateClient,
      validate: () => ({}),
    });

    jest.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
      const saveAnyway = buttons?.find(
        (b) => b.text === "Guardar de todos modos",
      );
      void saveAnyway?.onPress?.();
    });

    const { getByLabelText, getByPlaceholderText } = render(
      <ClientEditScreen {...buildProps()} />,
    );
    await waitFor(() => expect(mockFindAll).toHaveBeenCalled());

    fireEvent.press(getByLabelText("Agregar teléfono adicional"));
    fireEvent.changeText(
      getByPlaceholderText("Ej. 3101234567"),
      otroCliente.phone,
    );
    fireEvent.press(getByLabelText("Guardar cambios del cliente"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Teléfono ya registrado",
        expect.stringContaining(otroCliente.firstName),
        expect.anything(),
      );
    });
    expect(updateClient).toHaveBeenCalled();
  });

  it("al borrar manualmente Teléfono 2 dejando Teléfono 3 con valor, guarda ese número como Teléfono 2 (sin intercambio silencioso)", async () => {
    const client = clientFactory({
      id: "11111111-1111-4111-8111-111111111111",
      firstName: "Ana",
      lastName: "Torres",
      phone: "3001234567",
      phones: ["3202223344", "3505556677"],
    });

    const updateClient =
      jest.fn<(values: UpdateClientSchemaInput) => Promise<Client | null>>();
    updateClient.mockResolvedValue(client);

    mockUseClientDetail.mockReturnValue({
      client,
      isLoading: false,
      error: null,
      reload: jest.fn<() => Promise<void>>().mockResolvedValue(),
    });
    mockUseUpdateClient.mockReturnValue({
      isSubmitting: false,
      error: null,
      updateClient,
      validate: () => ({}),
    });

    const { getByLabelText, getByDisplayValue } = render(
      <ClientEditScreen {...buildProps()} />,
    );
    await waitFor(() => expect(mockFindAll).toHaveBeenCalled());
    await waitFor(() => expect(getByDisplayValue("3202223344")).toBeTruthy());

    // Borra manualmente el texto de Teléfono 2 (sin usar el ícono "x")
    fireEvent.changeText(getByDisplayValue("3202223344"), "");
    fireEvent.press(getByLabelText("Guardar cambios del cliente"));

    await waitFor(() => {
      expect(updateClient).toHaveBeenCalledWith(
        expect.objectContaining({ phone2: "3505556677", phone3: "" }),
      );
    });
  });
});
