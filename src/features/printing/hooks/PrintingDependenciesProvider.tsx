import {
  createContext,
  useContext,
  type PropsWithChildren,
  type ReactElement,
} from "react";

import type {
  LabelBitmapDecoder,
  LabelPrinterRepository,
  PrintingDependencies,
} from "../domain/repository";

const PrintingDependenciesContext = createContext<PrintingDependencies | null>(
  null,
);

interface PrintingDependenciesProviderProps extends PropsWithChildren {
  dependencies: PrintingDependencies;
}

export function PrintingDependenciesProvider({
  dependencies,
  children,
}: PrintingDependenciesProviderProps): ReactElement {
  return (
    <PrintingDependenciesContext.Provider value={dependencies}>
      {children}
    </PrintingDependenciesContext.Provider>
  );
}

export function usePrintingDependencies(): PrintingDependencies {
  const dependencies = useContext(PrintingDependenciesContext);

  if (!dependencies) {
    throw new Error(
      "PrintingDependenciesProvider no fue configurado para los hooks de printing.",
    );
  }

  return dependencies;
}

export function useLabelPrinterRepository(): LabelPrinterRepository {
  return usePrintingDependencies().labelPrinterRepository;
}

export function useLabelBitmapDecoder(): LabelBitmapDecoder {
  return usePrintingDependencies().decodeLabelBitmap;
}
