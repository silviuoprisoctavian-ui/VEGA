import express from "express";
import multer from "multer";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const { Pool } = pg;
const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false }
}) : null;
app.use(express.json({ limit: "10mb" }));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = /pdf|png|jpe?g|webp/i.test(file.mimetype) ||
      /\.(pdf|png|jpe?g|webp)$/i.test(file.originalname);
    cb(ok ? null : new Error("Formato no admitido. Usa PDF, JPG, PNG o WEBP."), ok);
  }
});
const PORT = Number(process.env.PORT || 3000);
const getOpenAI = () => {
  if (!process.env.OPENAI_API_KEY) throw new Error("Falta configurar OPENAI_API_KEY en las variables de entorno.");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(express.static(__dirname, { index: "index.html" }));

// Sincronización de estado completo con PostgreSQL. Protegida por token.
async function ensureStateTable() {
  if (!pool) throw new Error("Falta configurar DATABASE_URL.");
  await pool.query(`CREATE TABLE IF NOT EXISTS sv_vega_app_state (
    id integer PRIMARY KEY CHECK (id = 1),
    state jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
}
function authorizeSync(req, res, next) {
  const expected = process.env.VEGA_SYNC_TOKEN;
  if (!expected) return res.status(503).json({ error: "Falta configurar VEGA_SYNC_TOKEN en Render." });
  const header = req.headers.authorization || "";
  if (header !== `Bearer ${expected}`) return res.status(401).json({ error: "Token de sincronización incorrecto." });
  next();
}
app.get("/api/vega-state", authorizeSync, async (_req, res) => {
  try {
    await ensureStateTable();
    const result = await pool.query("SELECT state, updated_at FROM sv_vega_app_state WHERE id=1");
    res.json({ state: result.rows[0]?.state ?? null, updatedAt: result.rows[0]?.updated_at ?? null });
  } catch (err) {
    console.error("State read error:", err.message);
    res.status(500).json({ error: "No se pudo leer el estado de PostgreSQL." });
  }
});
app.put("/api/vega-state", authorizeSync, async (req, res) => {
  try {
    await ensureStateTable();
    const state = req.body?.state;
    if (!state || typeof state !== "object" || Array.isArray(state)) return res.status(400).json({ error: "Estado inválido." });
    const encoded = JSON.stringify(state);
    if (encoded.length > 8 * 1024 * 1024) return res.status(413).json({ error: "El estado supera el límite permitido." });
    const result = await pool.query(
      `INSERT INTO sv_vega_app_state (id, state, updated_at) VALUES (1, $1::jsonb, now())
       ON CONFLICT (id) DO UPDATE SET state=EXCLUDED.state, updated_at=now()
       RETURNING updated_at`,
      [encoded]
    );
    res.json({ ok: true, updatedAt: result.rows[0].updated_at });
  } catch (err) {
    console.error("State write error:", err.message);
    res.status(500).json({ error: "No se pudo guardar el estado en PostgreSQL." });
  }
});

const prompt = `Eres un asistente de extracción de datos de facturas y albaranes para un almacén de productos de vending en España.
Lee el documento completo, incluidos documentos escaneados. Identifica obligatoriamente el NÚMERO DE FACTURA impreso en el documento y devuélvelo en document_number. No uses número de pedido, albarán, cliente, proveedor, CIF ni referencia como número de factura. Si el documento es un albarán y no contiene número de factura, devuelve document_number como null. Devuelve SOLO las líneas de productos físicos que deben entrar en stock.
No incluyas subtotales, bases imponibles, IVA, recargos, portes, totales ni texto legal como productos.
Por cada línea identifica descripción, EAN/código de barras si aparece, cantidad total en unidades individuales, coste por unidad individual sin IVA si puede inferirse claramente, formato de envase y confianza.
Convierte cajas a unidades solo cuando el documento indique claramente unidades por caja (ejemplo: 126 cajas x 12 botellas = 1512 botellas). No confundas cantidad de cajas, unidades por caja, peso ni importe total.
Si el precio mostrado es por unidad individual, úsalo como unit_cost. Si solo hay precio por caja y no puede calcularse con seguridad, devuelve el precio tal como se interpreta y explica la duda en notes; no inventes. Si el precio neto por unidad no está claro, marca confidence low y explica.
Los números usan formato español; 1.512 puede significar 1512 y 0,145 significa 0.145.
No inventes EAN, cantidades ni precios. Si no hay líneas legibles, devuelve lines vacío.`;

app.post("/api/analyze-invoice", upload.single("document"), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: "Falta configurar OPENAI_API_KEY en el archivo .env." });
    if (!req.file) return res.status(400).json({ error: "No se ha recibido ningún documento." });
    const mime = req.file.mimetype || "application/pdf";
    let content;
    let uploaded = null;
    if (mime.startsWith("image/")) {
      const dataUrl = `data:${mime};base64,${req.file.buffer.toString("base64")}`;
      content = [
        { type: "input_text", text: prompt },
        { type: "input_image", image_url: dataUrl, detail: "high" }
      ];
    } else {
      uploaded = await openai.files.create({
        file: await toFile(req.file.buffer, req.file.originalname, { type: mime }),
        purpose: "user_data"
      });
      content = [
        { type: "input_text", text: prompt },
        { type: "input_file", file_id: uploaded.id }
      ];
    }
    let response;
    try {
      response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [{ role: "user", content }],
      text: {
        format: {
          type: "json_schema",
          name: "invoice_lines",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              supplier: { type: ["string", "null"] },
              document_number: { type: ["string", "null"] },
              document_date: { type: ["string", "null"] },
              lines: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    description: { type: "string" },
                    ean: { type: ["string", "null"] },
                    quantity: { type: "number" },
                    unit_cost: { type: "number" },
                    packaging: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] },
                    notes: { type: "string" }
                  },
                  required: ["description", "ean", "quantity", "unit_cost", "packaging", "confidence", "notes"]
                }
              }
            },
            required: ["supplier", "document_number", "document_date", "lines"]
          }
        }
      }
      });
    } finally {
      // Elimina de OpenAI el PDF temporal tras el análisis; las imágenes no se suben como archivo.
      if (uploaded?.id) {
        try { await openai.files.delete(uploaded.id); } catch (cleanupError) {
          console.error("No se pudo borrar el archivo temporal de OpenAI:", cleanupError?.message || "error");
        }
      }
    }
    const output = response.output_text;
    if (!output) return res.status(422).json({ error: "La IA no devolvió datos estructurados. No se ha modificado el stock." });
    const parsed = JSON.parse(output);
    // Validate conservatively; the user still reviews every line before stock changes.
    parsed.lines = parsed.lines.filter(l =>
      typeof l.description === "string" &&
      Number.isFinite(l.quantity) && l.quantity > 0 &&
      Number.isFinite(l.unit_cost) && l.unit_cost >= 0
    );
    res.json(parsed);
  } catch (err) {
    console.error("Invoice AI error:", err?.status || "", err?.code || "", err?.message || "unknown error");
    res.status(500).json({
      error: "No se pudo analizar el documento. No se ha cambiado el stock. Comprueba la conexión y la configuración del servidor e inténtalo de nuevo."
    });
  }
});
app.get("/api/health", (_req, res) => res.json({ ok: true, configured: Boolean(process.env.OPENAI_API_KEY), databaseConfigured: Boolean(process.env.DATABASE_URL), syncConfigured: Boolean(process.env.VEGA_SYNC_TOKEN) }));
app.use((err, _req, res, _next) => {
  const status = err?.code === "LIMIT_FILE_SIZE" ? 413 : 400;
  res.status(status).json({ error: err?.message || "No se pudo procesar el archivo." });
});
app.listen(PORT, "0.0.0.0", () => {
  console.log("SV Vending VEGA escuchando en el puerto "+PORT);
  console.log("Servicio web iniciado; PostgreSQL y sincronización se configuran con variables de entorno.");
});