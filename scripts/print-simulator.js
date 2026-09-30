#!/usr/bin/env node
/**
 * Simulador local de impresora térmica ESC/POS.
 *
 * Levanta un servidor TCP crudo que recibe exactamente los mismos bytes que
 * recibiría una impresora real (ver `TcpLabelPrinterRepositoryImpl.ts`) y los
 * reconstruye como una imagen `.bmp` en disco, para poder revisar
 * visualmente una etiqueta ANTES de gastar un intento real en la impresora
 * física.
 *
 * Uso: node scripts/print-simulator.js [--port 9100] [--host 0.0.0.0] [--out-dir ./label-previews]
 *
 * Flujo de uso real:
 *   1. Correr este script en una laptop conectada a la misma red WiFi que el
 *      celular (por ejemplo `npm run print:simulator -- --port 9100`).
 *   2. En la app, Ajustes > Impresoras > agregar una impresora nueva con host
 *      = IP local de esa laptop en esa red, puerto 9100.
 *   3. Imprimir una etiqueta real (o usar el botón "Probar") apuntando a esa
 *      "impresora".
 *   4. Abrir el `.bmp` generado acá y confirmar visualmente que se ve bien.
 *
 * La lógica de decodificación del comando ESC/POS `GS v 0` duplica
 * deliberadamente `src/features/printing/domain/escposRasterDecoder.ts`
 * (versión canónica, testeada con Jest) — este script es Node puro y no
 * puede requerir un archivo TypeScript sin agregar una dependencia nueva
 * (no hay `ts-node`/`@babel/register` en el proyecto). El formato es pequeño
 * y estable; si `escposRaster.ts` cambia, hay que actualizar ambos lados.
 */

const fs = require("fs");
const net = require("net");
const path = require("path");

const ESC_INIT = [0x1b, 0x40];
const RASTER_HEADER_PREFIX = [0x1d, 0x76, 0x30, 0x00];
const GS_CUT_PARTIAL_LENGTH = 4;

const ANSI_GREEN = "\x1b[32m";
const ANSI_RED = "\x1b[31m";
const ANSI_RESET = "\x1b[0m";

function parseArgs(argv) {
  const options = { port: 9100, host: "0.0.0.0", outDir: "./label-previews" };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--port") {
      options.port = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--host") {
      options.host = argv[i + 1];
      i += 1;
    } else if (arg === "--out-dir") {
      options.outDir = argv[i + 1];
      i += 1;
    }
  }

  return options;
}

function matchesBytes(buffer, offset, expected) {
  return expected.every((byte, index) => buffer[offset + index] === byte);
}

function isRasterJob(buffer) {
  return buffer.length >= 6 && matchesBytes(buffer, 2, RASTER_HEADER_PREFIX);
}

/**
 * Puerto en JS plano de `decodeEscPosLabelJob` — ver el comentario de
 * cabecera de este archivo sobre por qué está duplicado. A diferencia de la
 * versión de dominio, no lanza: devuelve `{ ok: false, reason }` para poder
 * loguear en rojo sin tumbar la conexión.
 */
function decodeRasterJob(buffer) {
  const minLength = ESC_INIT.length + 8 + GS_CUT_PARTIAL_LENGTH;
  if (buffer.length < minLength) {
    return { ok: false, reason: `job demasiado corto (${buffer.length} bytes, mínimo ${minLength})` };
  }
  if (!matchesBytes(buffer, 0, ESC_INIT)) {
    return { ok: false, reason: "header ESC_INIT inválido" };
  }
  if (!matchesBytes(buffer, 2, RASTER_HEADER_PREFIX)) {
    return { ok: false, reason: "header GS v 0 inválido o modo m distinto de 0" };
  }

  const bytesPerRow = buffer[6] | (buffer[7] << 8);
  const height = buffer[8] | (buffer[9] << 8);
  const expectedLength = ESC_INIT.length + 8 + bytesPerRow * height + GS_CUT_PARTIAL_LENGTH;

  if (buffer.length !== expectedLength) {
    return {
      ok: false,
      reason: `longitud inconsistente: se esperaban ${expectedLength} bytes, se recibieron ${buffer.length}`,
    };
  }

  const dataStart = ESC_INIT.length + 8;
  const data = buffer.slice(dataStart, dataStart + bytesPerRow * height);

  return { ok: true, bitmap: { width: bytesPerRow * 8, height, bytesPerRow, data } };
}

function decodeTextJob(buffer) {
  let start = 0;
  let end = buffer.length;

  if (matchesBytes(buffer, 0, ESC_INIT)) {
    start = ESC_INIT.length;
  }
  if (
    end - GS_CUT_PARTIAL_LENGTH >= start &&
    buffer[end - 4] === 0x1d &&
    buffer[end - 3] === 0x56 &&
    buffer[end - 2] === 0x42 &&
    buffer[end - 1] === 0x00
  ) {
    end -= GS_CUT_PARTIAL_LENGTH;
  }

  return buffer.toString("latin1", start, end);
}

/** Escribe un BMP monocromo (1 bit por píxel) a partir de un bitmap empaquetado MSB-primero. */
function writeMonochromeBmp(bitmap, filePath) {
  const { width, height, bytesPerRow, data } = bitmap;
  const paddedRowSize = Math.ceil(bytesPerRow / 4) * 4;
  const pixelDataSize = paddedRowSize * height;
  const pixelDataOffset = 14 + 40 + 8;
  const fileSize = pixelDataOffset + pixelDataSize;

  const buffer = Buffer.alloc(fileSize);

  // BITMAPFILEHEADER (14 bytes)
  buffer.write("BM", 0, "ascii");
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(0, 6); // reservados
  buffer.writeUInt32LE(pixelDataOffset, 10);

  // BITMAPINFOHEADER (40 bytes)
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22); // positivo = bottom-up
  buffer.writeUInt16LE(1, 26); // biPlanes
  buffer.writeUInt16LE(1, 28); // biBitCount
  buffer.writeUInt32LE(0, 30); // biCompression = BI_RGB
  buffer.writeUInt32LE(pixelDataSize, 34);
  buffer.writeInt32LE(0, 38);
  buffer.writeInt32LE(0, 42);
  buffer.writeUInt32LE(2, 46); // biClrUsed
  buffer.writeUInt32LE(2, 50); // biClrImportant

  // Paleta: índice 0 = blanco (bit 0), índice 1 = negro (bit 1)
  buffer.writeUInt32LE(0x00ffffff, 54); // BGRA little-endian: FF FF FF 00
  buffer.writeUInt32LE(0x00000000, 58); // BGRA little-endian: 00 00 00 00

  // Píxeles: bottom-up (última fila de `data` primero en el archivo)
  for (let y = 0; y < height; y += 1) {
    const sourceRowStart = (height - 1 - y) * bytesPerRow;
    const destRowStart = pixelDataOffset + y * paddedRowSize;
    data.copy(buffer, destRowStart, sourceRowStart, sourceRowStart + bytesPerRow);
  }

  fs.writeFileSync(filePath, buffer);
}

function buildOutputPath(outDir) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(outDir, `label-${timestamp}.bmp`);
}

function handleJob(buffer, outDir) {
  if (buffer.length === 0) {
    console.log("Conexión recibida sin datos (probablemente un sondeo de 'Buscar en la red').");
    return;
  }

  if (isRasterJob(buffer)) {
    const result = decodeRasterJob(buffer);
    if (!result.ok) {
      console.error(`${ANSI_RED}✖ Job ráster inválido: ${result.reason}${ANSI_RESET}`);
      return;
    }

    fs.mkdirSync(outDir, { recursive: true });
    const outputPath = buildOutputPath(outDir);
    writeMonochromeBmp(result.bitmap, outputPath);
    console.log(
      `${ANSI_GREEN}✔ Etiqueta recibida (${result.bitmap.width}x${result.bitmap.height}px) guardada en: ${outputPath}${ANSI_RESET}`,
    );
    console.log("  Ábrela y confirma que se ve bien ANTES de imprimir en la impresora real.");
    return;
  }

  const text = decodeTextJob(buffer);
  console.log(`${ANSI_GREEN}✔ Texto de prueba recibido (sin imagen):${ANSI_RESET}`);
  console.log(text);
}

function startServer({ port, host, outDir }) {
  const server = net.createServer((socket) => {
    const chunks = [];
    let handled = false;

    const finish = () => {
      if (handled) {
        return;
      }
      handled = true;
      const buffer = Buffer.concat(chunks);
      try {
        handleJob(buffer, outDir);
      } catch (error) {
        console.error(`${ANSI_RED}✖ Error inesperado procesando el job: ${error.message}${ANSI_RESET}`);
      }
    };

    socket.on("data", (chunk) => chunks.push(chunk));
    socket.on("end", finish);
    socket.on("close", finish);
    socket.on("error", (error) => {
      console.error(`${ANSI_RED}✖ Error de conexión: ${error.message}${ANSI_RESET}`);
    });
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `${ANSI_RED}✖ El puerto ${port} ya está en uso. Cierra lo que lo esté usando o elige otro con --port.${ANSI_RESET}`,
      );
      process.exit(1);
    } else {
      throw error;
    }
  });

  server.listen(port, host, () => {
    console.log(`Simulador de impresora escuchando en ${host}:${port}`);
    console.log("Configura esta IP y puerto como impresora en la app para probar sin hardware real.");
  });
}

module.exports = {
  parseArgs,
  isRasterJob,
  decodeRasterJob,
  decodeTextJob,
  writeMonochromeBmp,
  buildOutputPath,
  handleJob,
  startServer,
};

if (require.main === module) {
  startServer(parseArgs(process.argv.slice(2)));
}
