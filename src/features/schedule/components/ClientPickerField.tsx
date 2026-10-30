import { colors } from "../../../shared/theme/colors";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useClientRepository } from "../../clients/hooks/ClientsDependenciesProvider";
import type { Client, UpdateClientDTO } from "../../clients/domain/types";
import {
  PERSON_NAME_PATTERN,
  PHONE_DIGITS_PATTERN,
  capitalizeWords,
  normalizeDigitsInput,
} from "../../../shared/domain/textPatterns";
import {
  findDuplicateByName,
  findDuplicateByPhone,
  normalizePhone,
  normalizeText,
} from "../../../shared/utils/textSearch";

const MAX_SUGGESTIONS = 5;
// Exigido solo en esta alta rápida dentro del turno (N-118) — a propósito
// no se toca la validación general de Clientes (N-059 la dejó sin mínimo).
const PHONE_DIGITS_LENGTH = 10;

interface ClientPickerFieldProps {
  clientId?: string;
  unregisteredName?: string;
  onChangeClientId: (clientId: string | undefined) => void;
  onChangeUnregisteredName: (name: string | undefined) => void;
  errorMessage?: string;
}

export interface ClientPickerFieldHandle {
  /**
   * Se llama justo antes de guardar el turno. Si quedó un registro de
   * cliente a medio llenar (se abrió "Registrar cliente" pero nunca se
   * presionó el botón), decide qué hacer con esos datos en vez de
   * perderlos: con nombre+apellido+teléfono válidos, registra el cliente
   * de una vez; con solo nombre+apellido, los deja como "cliente sin
   * registrar" del turno.
   */
  resolvePendingRegistration: () => Promise<void>;
  /**
   * Nombre completo (nombre + apellido) del cliente registrado con este id,
   * usando la lista de clientes que este campo ya cargó en memoria — evita
   * una consulta extra al repositorio de clientes solo para resolver un
   * nombre que ya está disponible localmente. Devuelve `undefined` si el id
   * no corresponde a ningún cliente cargado.
   */
  resolveClientFullName: (clientId: string) => string | undefined;
}

export const ClientPickerField = forwardRef<
  ClientPickerFieldHandle,
  ClientPickerFieldProps
>(function ClientPickerField(
  {
    clientId,
    unregisteredName,
    onChangeClientId,
    onChangeUnregisteredName,
    errorMessage,
  },
  ref,
) {
  const clientRepository = useClientRepository();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nameInput, setNameInput] = useState(unregisteredName ?? "");
  const [isChangingClient, setIsChangingClient] = useState(false);
  const [newlyCreatedClientId, setNewlyCreatedClientId] = useState<
    string | null
  >(null);
  const [isAddingPhone, setIsAddingPhone] = useState(false);
  const [phoneToAdd, setPhoneToAdd] = useState("");
  const [phoneUpdateError, setPhoneUpdateError] = useState<string | null>(null);
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);

  const [isRegistering, setIsRegistering] = useState(false);
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  // Guarda el texto completo escrito antes de separarlo en nombre/apellido
  // al abrir "Registrar cliente", para poder restaurarlo tal cual si se
  // cancela el registro.
  const [preSplitNameInput, setPreSplitNameInput] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    clientRepository
      .findAll()
      .then((result) => {
        if (!cancelled) {
          setClients(result);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [clientRepository]);

  // Evita que el efecto de sincronización de abajo pise el texto recién
  // prellenado al tocar "Cambiar cliente": ese tap suelta
  // `clientId` (pasa a undefined) SIN tocar `unregisteredClientName` a
  // propósito, para no desvincular al cliente
  // real hasta que el usuario realmente edite o confirme el cambio. Sin
  // este flag, el cambio de `clientId` dispararía el efecto y volvería a
  // fijar `nameInput` a "" (porque `unregisteredName` sigue undefined),
  // borrando el nombre que se acaba de prellenar.
  const skipNextSyncRef = useRef(false);

  // Mantiene el texto sincronizado si el nombre "sin registrar" cambia desde
  // afuera (ej. al cargar un turno existente en el formulario de edición).
  useEffect(() => {
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    if (!clientId) {
      setNameInput(unregisteredName ?? "");
    }
  }, [unregisteredName, clientId]);

  const selectedClient = useMemo(
    () => (clientId ? (clients.find((c) => c.id === clientId) ?? null) : null),
    [clients, clientId],
  );

  const suggestions = useMemo(() => {
    const normalizedQuery = normalizeText(nameInput.trim());
    if (!normalizedQuery) {
      return [];
    }
    const numericQuery = normalizePhone(nameInput);
    return clients
      .filter((client) => {
        const normalizedName = normalizeText(
          `${client.firstName} ${client.lastName}`,
        );
        return (
          normalizedName.includes(normalizedQuery) ||
          (numericQuery
            ? normalizePhone(client.phone).includes(numericQuery)
            : false)
        );
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [clients, nameInput]);

  const resetRegisterState = (): void => {
    setIsRegistering(false);
    setNewLastName("");
    setNewPhone("");
    setRegisterError(null);
    setPreSplitNameInput(null);
  };

  const selectClient = (client: Client, wasCreatedHere = false): void => {
    onChangeClientId(client.id);
    onChangeUnregisteredName(undefined);
    setNameInput(`${client.firstName} ${client.lastName}`);
    setIsChangingClient(false);
    setNewlyCreatedClientId(
      wasCreatedHere && !client.phone.trim() ? client.id : null,
    );
    setIsAddingPhone(false);
    setPhoneToAdd("");
    setPhoneUpdateError(null);
    resetRegisterState();
  };

  const createNewClient = async (
    firstName: string,
    lastName: string,
  ): Promise<void> => {
    setIsCreatingClient(true);
    setRegisterError(null);
    try {
      const created = await clientRepository.create({
        firstName,
        lastName,
        phone: newPhone.trim() ? normalizeDigitsInput(newPhone.trim()) : "",
      });
      setClients((prev) => [...prev, created]);
      selectClient(created, true);
    } catch {
      setRegisterError("No se pudo crear el cliente. Intenta nuevamente.");
    } finally {
      setIsCreatingClient(false);
    }
  };

  const handleSavePhone = (): void => {
    if (
      !selectedClient ||
      selectedClient.id !== newlyCreatedClientId ||
      isUpdatingPhone
    ) {
      return;
    }

    const trimmedPhone = phoneToAdd.trim();
    const normalizedPhone = normalizeDigitsInput(trimmedPhone);
    if (!trimmedPhone || !PHONE_DIGITS_PATTERN.test(normalizedPhone)) {
      setPhoneUpdateError("El teléfono solo puede contener números.");
      return;
    }
    if (normalizedPhone.length !== PHONE_DIGITS_LENGTH) {
      setPhoneUpdateError("El teléfono debe tener 10 dígitos.");
      return;
    }

    const duplicatePhone = findDuplicateByPhone(
      clients.filter((client) => client.id !== selectedClient.id),
      normalizedPhone,
    );
    if (duplicatePhone) {
      setPhoneUpdateError(
        `Este teléfono ya está registrado a nombre de ${duplicatePhone.firstName} ${duplicatePhone.lastName}. No se modificó ninguna ficha.`,
      );
      return;
    }

    const updateInput: UpdateClientDTO = {
      id: selectedClient.id,
      firstName: selectedClient.firstName,
      lastName: selectedClient.lastName,
      phone: normalizedPhone,
      phones: selectedClient.phones,
      cedula: selectedClient.cedula,
      notes: selectedClient.notes ?? undefined,
    };

    Alert.alert(
      "Confirmar teléfono",
      `Se actualizará la ficha guardada de ${selectedClient.firstName} ${selectedClient.lastName}. El teléfono quedará asociado a este cliente en todos sus turnos. ¿Confirmas que es la persona correcta?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Actualizar ficha",
          onPress: () => {
            setIsUpdatingPhone(true);
            setPhoneUpdateError(null);
            void clientRepository
              .update(updateInput)
              .then((updatedClient) => {
                setClients((previous) =>
                  previous.map((client) =>
                    client.id === updatedClient.id ? updatedClient : client,
                  ),
                );
                setNewlyCreatedClientId(null);
                setIsAddingPhone(false);
                setPhoneToAdd("");
              })
              .catch((error: unknown) => {
                setPhoneUpdateError(
                  "No se pudo actualizar la ficha del cliente. Intenta nuevamente.",
                );
                console.error(
                  JSON.stringify({
                    level: "error",
                    service: "ClientPickerField",
                    message: "No se pudo agregar el teléfono al cliente nuevo",
                    error:
                      error instanceof Error ? error.message : String(error),
                  }),
                );
              })
              .finally(() => setIsUpdatingPhone(false));
          },
        },
      ],
    );
  };

  const proceedWithPhoneCheck = (firstName: string, lastName: string): void => {
    const normalizedPhone = newPhone.trim()
      ? normalizeDigitsInput(newPhone.trim())
      : "";
    const duplicatePhone = normalizedPhone
      ? findDuplicateByPhone(clients, normalizedPhone)
      : null;

    if (duplicatePhone) {
      Alert.alert(
        "Teléfono ya registrado",
        `Ya existe un cliente con este teléfono: ${duplicatePhone.firstName} ${duplicatePhone.lastName}. ¿Deseas guardarlo así de todos modos?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Guardar de todos modos",
            onPress: () => void createNewClient(firstName, lastName),
          },
        ],
      );
      return;
    }

    void createNewClient(firstName, lastName);
  };

  const handleRegisterPress = (): void => {
    const rawFirstName = nameInput.trim();
    const rawLastName = newLastName.trim();

    if (!rawFirstName || !rawLastName) {
      setRegisterError("Nombre y apellido son obligatorios.");
      return;
    }

    if (
      !PERSON_NAME_PATTERN.test(rawFirstName) ||
      !PERSON_NAME_PATTERN.test(rawLastName)
    ) {
      setRegisterError("Nombre y apellido solo pueden contener letras.");
      return;
    }

    const firstName = capitalizeWords(rawFirstName);
    const lastName = capitalizeWords(rawLastName);

    const trimmedPhone = newPhone.trim();
    if (trimmedPhone) {
      const normalizedNewPhone = normalizeDigitsInput(trimmedPhone);
      if (!PHONE_DIGITS_PATTERN.test(normalizedNewPhone)) {
        setRegisterError("El teléfono solo puede contener números.");
        return;
      }
      if (normalizedNewPhone.length !== PHONE_DIGITS_LENGTH) {
        setRegisterError("El teléfono debe tener 10 dígitos.");
        return;
      }
    }

    const duplicate = findDuplicateByName(clients, firstName, lastName);
    if (duplicate) {
      Alert.alert(
        "Cliente existente",
        `Ya existe un cliente con este nombre${
          duplicate.phone ? `: ${duplicate.phone}` : ""
        }. ¿Es la misma persona?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Usar este cliente",
            onPress: () => selectClient(duplicate),
          },
          {
            text: "Crear de todos modos",
            onPress: () => proceedWithPhoneCheck(firstName, lastName),
          },
        ],
      );
      return;
    }

    proceedWithPhoneCheck(firstName, lastName);
  };

  useImperativeHandle(
    ref,
    () => ({
      resolveClientFullName: (id: string) => {
        const client = clients.find((c) => c.id === id);
        return client ? `${client.firstName} ${client.lastName}` : undefined;
      },
      resolvePendingRegistration: () =>
        new Promise<void>((resolve) => {
          if (!isRegistering || clientId) {
            resolve();
            return;
          }

          const rawFirstName = nameInput.trim();
          const rawLastName = newLastName.trim();
          if (!rawFirstName || !rawLastName) {
            resolve();
            return;
          }

          const trimmedPhone = newPhone.trim();
          const normalizedPhone = trimmedPhone
            ? normalizeDigitsInput(trimmedPhone)
            : "";
          const canRegister =
            PERSON_NAME_PATTERN.test(rawFirstName) &&
            PERSON_NAME_PATTERN.test(rawLastName) &&
            normalizedPhone !== "" &&
            PHONE_DIGITS_PATTERN.test(normalizedPhone) &&
            normalizedPhone.length === PHONE_DIGITS_LENGTH;

          const firstName = capitalizeWords(rawFirstName);
          const lastName = capitalizeWords(rawLastName);
          const fullName = `${firstName} ${lastName}`;

          if (!canRegister) {
            // Sin teléfono válido no se registra como cliente — se guarda
            // el nombre completo en el turno para no perder el apellido
            // ya escrito.
            onChangeUnregisteredName(fullName);
            onChangeClientId(undefined);
            resolve();
            return;
          }

          const finishCreate = async (): Promise<void> => {
            try {
              const created = await clientRepository.create({
                firstName,
                lastName,
                phone: normalizedPhone,
              });
              setClients((prev) => [...prev, created]);
              onChangeClientId(created.id);
              onChangeUnregisteredName(undefined);
            } catch {
              onChangeUnregisteredName(fullName);
              onChangeClientId(undefined);
            } finally {
              resolve();
            }
          };

          const duplicateName = findDuplicateByName(
            clients,
            firstName,
            lastName,
          );
          const duplicatePhone = findDuplicateByPhone(clients, normalizedPhone);
          const duplicate = duplicateName ?? duplicatePhone;

          if (duplicate) {
            const message = duplicateName
              ? `Ya existe un cliente con este nombre${
                  duplicateName.phone ? `: ${duplicateName.phone}` : ""
                }. ¿Deseas registrarlo de todos modos?`
              : `Ya existe un cliente con este teléfono: ${duplicatePhone!.firstName} ${duplicatePhone!.lastName}. ¿Deseas registrarlo de todos modos?`;

            Alert.alert("Cliente posiblemente duplicado", message, [
              {
                text: "No registrar, solo guardar el nombre",
                onPress: () => {
                  onChangeUnregisteredName(fullName);
                  onChangeClientId(undefined);
                  resolve();
                },
              },
              {
                text: "Registrar de todos modos",
                onPress: () => void finishCreate(),
              },
            ]);
            return;
          }

          void finishCreate();
        }),
    }),
    [
      isRegistering,
      clientId,
      nameInput,
      newLastName,
      newPhone,
      clients,
      clientRepository,
      onChangeClientId,
      onChangeUnregisteredName,
    ],
  );

  if (isLoading) {
    return <ActivityIndicator accessibilityLabel="Cargando clientes" />;
  }

  if (selectedClient) {
    return (
      <View style={styles.container}>
        <View style={styles.selector}>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectorText}>
              {selectedClient.firstName} {selectedClient.lastName}
            </Text>
            {selectedClient.phone ? (
              <Text style={styles.optionSubtext}>{selectedClient.phone}</Text>
            ) : null}
          </View>
          <Pressable
            accessibilityLabel="Cambiar cliente"
            accessibilityRole="button"
            hitSlop={8}
            style={styles.changeClientButton}
            onPress={() => {
              // Deja el nombre actual editable en vez de borrarlo — antes
              // había que volver a escribir todo desde cero solo para
              // corregir o buscar a alguien parecido.
              //
              // A propósito NO se llama a `onChangeUnregisteredName` acá:
              // hacerlo escribiría de inmediato "cliente sin registrar" en
              // el estado real del formulario, y si el usuario guarda el
              // turno justo después de tocar el botón (sin editar nada
              // más), se perdería el vínculo con el cliente real en
              // silencio. Al dejar `clientId` y `unregisteredClientName`
              // ambos sin definir, un guardado inmediato debe fallar la
              // validación normal ("selecciona un cliente") en vez de
              // sustituir el valor guardado por uno incorrecto. Solo cuando
              // el usuario siga escribiendo (`onChangeText` de abajo) se
              // reporta el nombre sin registrar.
              const currentName = `${selectedClient.firstName} ${selectedClient.lastName}`;
              skipNextSyncRef.current = true;
              onChangeClientId(undefined);
              setNameInput(currentName);
              setIsChangingClient(true);
            }}
          >
            <Text style={styles.changeClientButtonText}>Cambiar cliente</Text>
          </Pressable>
        </View>
        {newlyCreatedClientId === selectedClient.id &&
        !selectedClient.phone.trim() ? (
          <View style={styles.addPhoneSection}>
            {!isAddingPhone ? (
              <>
                <Text style={styles.addPhoneTitle}>
                  ¿Tienes el teléfono de {selectedClient.firstName}?
                </Text>
                <Text style={styles.addPhoneDescription}>
                  Agrégalo ahora sin salir del turno. Se guardará en la ficha
                  de este cliente.
                </Text>
                <Pressable
                  accessibilityLabel={`Completar teléfono de ${selectedClient.firstName} ${selectedClient.lastName}`}
                  accessibilityRole="button"
                  style={styles.addPhoneButton}
                  onPress={() => {
                    setPhoneUpdateError(null);
                    setIsAddingPhone(true);
                  }}
                >
                  <Text style={styles.addPhoneButtonText}>
                    Completar teléfono
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.addPhoneDescription}>
                  Teléfono de {selectedClient.firstName}{" "}
                  {selectedClient.lastName}. Al guardarlo, se actualizará su
                  ficha para todos sus turnos.
                </Text>
                <TextInput
                  accessibilityLabel={`Teléfono de ${selectedClient.firstName} ${selectedClient.lastName}`}
                  placeholder="Teléfono (10 dígitos)"
                  placeholderTextColor="#94a3b8"
                  value={phoneToAdd}
                  onChangeText={(value) => {
                    setPhoneToAdd(value);
                    setPhoneUpdateError(null);
                  }}
                  keyboardType="phone-pad"
                  style={[
                    styles.searchInput,
                    phoneUpdateError ? styles.selectorError : null,
                  ]}
                  editable={!isUpdatingPhone}
                />
                {phoneUpdateError ? (
                  <Text style={styles.errorText}>{phoneUpdateError}</Text>
                ) : null}
                <Pressable
                  accessibilityLabel="Guardar teléfono"
                  style={[
                    styles.saveNewClientButton,
                    isUpdatingPhone ? styles.disabledButton : null,
                  ]}
                  onPress={handleSavePhone}
                  disabled={isUpdatingPhone}
                >
                  <Text style={styles.saveNewClientButtonText}>
                    {isUpdatingPhone ? "Actualizando..." : "Guardar teléfono"}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Cancelar agregar teléfono"
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsAddingPhone(false);
                    setPhoneToAdd("");
                    setPhoneUpdateError(null);
                  }}
                  disabled={isUpdatingPhone}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isChangingClient ? (
        <Text style={styles.changeClientHint}>
          Esto solo cambia el cliente de este turno; no modifica el registro
          guardado.
        </Text>
      ) : null}
      <TextInput
        accessibilityLabel="Nombre del cliente"
        placeholder="Nombre de quien agenda"
        placeholderTextColor="#94a3b8"
        value={nameInput}
        onChangeText={(text) => {
          setNameInput(text);
          onChangeUnregisteredName(text.trim() ? text : undefined);
        }}
        style={[styles.searchInput, errorMessage ? styles.selectorError : null]}
      />
      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      {suggestions.length > 0 ? (
        <ScrollView style={styles.list} nestedScrollEnabled>
          {suggestions.map((item) => (
            <Pressable
              key={item.id}
              accessibilityLabel={`Elegir a ${item.firstName} ${item.lastName} (${
                item.phone || item.id
              })`}
              style={styles.option}
              onPress={() => selectClient(item)}
            >
              <Text style={styles.optionText}>
                {item.firstName} {item.lastName}
              </Text>
              {item.phone ? (
                <Text style={styles.optionSubtext}>{item.phone}</Text>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {isRegistering ? (
        <View style={styles.registerForm}>
          <Text style={styles.addClientTitle}>Registrar cliente</Text>
          <TextInput
            accessibilityLabel="Apellido del cliente nuevo"
            placeholder="Apellido"
            placeholderTextColor="#94a3b8"
            value={newLastName}
            onChangeText={setNewLastName}
            style={styles.searchInput}
            autoFocus
          />
          <TextInput
            accessibilityLabel="Teléfono del cliente nuevo"
            placeholder="Teléfono (opcional)"
            placeholderTextColor="#94a3b8"
            value={newPhone}
            onChangeText={setNewPhone}
            keyboardType="phone-pad"
            style={styles.searchInput}
          />

          {registerError ? (
            <Text style={styles.errorText}>{registerError}</Text>
          ) : null}

          <Pressable
            accessibilityLabel="Crear cliente"
            style={[
              styles.saveNewClientButton,
              isCreatingClient ? styles.disabledButton : null,
            ]}
            onPress={handleRegisterPress}
            disabled={isCreatingClient}
          >
            <Text style={styles.saveNewClientButtonText}>
              {isCreatingClient ? "Guardando..." : "Crear cliente"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Cancelar registro de cliente"
            style={styles.cancelButton}
            onPress={() => {
              if (preSplitNameInput !== null) {
                setNameInput(preSplitNameInput);
              }
              resetRegisterState();
            }}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityLabel="Registrar cliente"
          style={styles.addClientButton}
          onPress={() => {
            setRegisterError(null);
            // Si ya se escribió el nombre completo buscando coincidencias
            // (ej. "Juan Pérez"), se separa en nombre/apellido para no
            // tener que volver a escribir el apellido.
            const trimmed = nameInput.trim();
            const spaceIndex = trimmed.indexOf(" ");
            if (spaceIndex > 0) {
              setPreSplitNameInput(trimmed);
              setNameInput(trimmed.slice(0, spaceIndex));
              setNewLastName(trimmed.slice(spaceIndex + 1).trim());
            }
            setIsRegistering(true);
          }}
        >
          <Text style={styles.addClientButtonText}>+ Registrar cliente</Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  selectorError: {
    borderColor: colors.danger,
  },
  selectedInfo: {
    flex: 1,
  },
  selectorText: {
    color: "#0f172a",
  },
  changeClientButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  changeClientButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  changeClientHint: {
    color: colors.textMuted,
    fontSize: 13,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    color: "#0f172a",
  },
  list: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    overflow: "hidden",
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  optionText: {
    color: "#0f172a",
  },
  optionSubtext: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 2,
  },
  addClientButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  addClientButtonText: {
    color: colors.primary,
    fontWeight: "600",
  },
  addPhoneSection: {
    gap: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#f8fafc",
  },
  addPhoneTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
  },
  addPhoneDescription: {
    color: colors.textMuted,
    fontSize: 13,
  },
  addPhoneButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: colors.primarySoft,
  },
  addPhoneButtonText: {
    color: colors.primary,
    fontWeight: "700",
  },
  registerForm: {
    gap: 6,
  },
  addClientTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  saveNewClientButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveNewClientButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: "#64748b",
    fontWeight: "600",
  },
});
