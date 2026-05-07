import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { clientFactory } from "../../../__tests__/factories";
import type { Client } from "../domain/types";
import type { UpdateClientSchemaInput } from "../domain/schemas";
import ClientEditScreen from "./ClientEditScreen";

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
  });

  it("renderiza el formulario pre-llenado con los datos del cliente", () => {
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
    fireEvent.press(getByLabelText("Guardar cambios del cliente"));

    // Assert
    expect(await findByText("El nombre es obligatorio")).toBeTruthy();
    expect(await findByText("El teléfono no es válido")).toBeTruthy();
    expect(updateClient).not.toHaveBeenCalled();
    expect(goBack).not.toHaveBeenCalled();
  });
});
