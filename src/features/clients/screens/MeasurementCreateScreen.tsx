import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { RootStackParamList } from "../../../navigation/types";
import type { AddMeasurementSchemaInput } from "../domain/schemas";
import { useAddMeasurement } from "../hooks/useAddMeasurement";

type Props = NativeStackScreenProps<RootStackParamList, "MeasurementCreate">;

type MeasurementFormValues = {
  clientId: string;
  measuredAt?: string;
  pechoCm: string;
  cinturaCm: string;
  caderaCm: string;
  largoCm: string;
  notes: string;
};

export default function MeasurementCreateScreen({ navigation, route }: Props) {
  const { isSubmitting, error, addMeasurement, validate } = useAddMeasurement();

  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<MeasurementFormValues>({
    defaultValues: {
      clientId: route.params.clientId,
      measuredAt: undefined,
      pechoCm: "",
      cinturaCm: "",
      caderaCm: "",
      largoCm: "",
      notes: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const payload: AddMeasurementSchemaInput = {
      clientId: values.clientId,
      measuredAt: values.measuredAt,
      pechoCm: values.pechoCm,
      cinturaCm: values.cinturaCm,
      caderaCm: values.caderaCm,
      largoCm: values.largoCm,
      notes: values.notes,
    };

    const validationErrors = validate(payload);
    const keys: (keyof MeasurementFormValues)[] = [
      "clientId",
      "measuredAt",
      "pechoCm",
      "cinturaCm",
      "caderaCm",
      "largoCm",
      "notes",
    ];

    let hasErrors = false;

    for (const key of keys) {
      const validationError = validationErrors[key];
      if (validationError?.message) {
        hasErrors = true;
        setError(key, { type: "manual", message: validationError.message });
      }
    }

    if (hasErrors) {
      return;
    }

    const createdMeasurement = await addMeasurement(payload);
    if (createdMeasurement) {
      reset({
        clientId: route.params.clientId,
        measuredAt: undefined,
        pechoCm: "",
        cinturaCm: "",
        caderaCm: "",
        largoCm: "",
        notes: "",
      });
      navigation.replace("MeasurementHistory", {
        clientId: route.params.clientId,
      });
    }
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Nueva medida</Text>

        <Field
          label="Pecho (cm)"
          error={errors.pechoCm?.message}
          control={control}
          name="pechoCm"
        />
        <Field
          label="Cintura (cm)"
          error={errors.cinturaCm?.message}
          control={control}
          name="cinturaCm"
        />
        <Field
          label="Cadera (cm)"
          error={errors.caderaCm?.message}
          control={control}
          name="caderaCm"
        />
        <Field
          label="Largo (cm)"
          error={errors.largoCm?.message}
          control={control}
          name="largoCm"
        />

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Notas (opcional)</Text>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={value}
                onChangeText={onChange}
                placeholder="Contexto de la medida"
                multiline
              />
            )}
          />
          {errors.notes?.message ? (
            <Text style={styles.errorText}>{errors.notes.message}</Text>
          ) : null}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          accessibilityLabel="Guardar medida"
          style={[
            styles.submitButton,
            isSubmitting ? styles.submitButtonDisabled : undefined,
          ]}
          onPress={() => void onSubmit()}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Guardando..." : "Guardar medida"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  label: string;
  error?: string;
  control: ReturnType<typeof useForm<MeasurementFormValues>>["control"];
  name: "pechoCm" | "cinturaCm" | "caderaCm" | "largoCm";
};

function Field({ label, error, control, name }: FieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            keyboardType="decimal-pad"
            placeholder="Ej. 92,5"
          />
        )}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 16,
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  notesInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: "#0f766e",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
