/**
 * Configuracion del cliente S3 para Wasabi Cloud Storage
 * Utiliza @aws-sdk/client-s3 compatible con Wasabi
 */

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");

// Validar variables de entorno requeridas
const requiredEnvVars = [
  "WASABI_ACCESS_KEY_ID",
  "WASABI_SECRET_ACCESS_KEY",
  "WASABI_REGION",
  "WASABI_BUCKET_UPLOADS",
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0 && process.env.NODE_ENV === "production") {
  console.error(
    `[S3] Variables de entorno faltantes: ${missingVars.join(", ")}`
  );
}

// Configuracion del cliente S3 para Wasabi
const s3Client = new S3Client({
  region: process.env.WASABI_REGION || "us-east-1",
  endpoint:
    process.env.WASABI_ENDPOINT ||
    `https://s3.${process.env.WASABI_REGION || "us-east-1"}.wasabisys.com`,
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true,
});

const BUCKET_UPLOADS = process.env.WASABI_BUCKET_UPLOADS || "mydent-uploads";
const BUCKET_BACKUPS = process.env.WASABI_BUCKET_BACKUPS || "mydent-backups";

/**
 * Sube un archivo a S3/Wasabi
 * @param {Buffer|ReadableStream} fileBuffer - Contenido del archivo
 * @param {string} key - Ruta/nombre del archivo en el bucket (ej: "vouchers/archivo.jpg")
 * @param {string} contentType - MIME type del archivo
 * @param {string} [bucket] - Bucket destino (default: BUCKET_UPLOADS)
 * @returns {Promise<{key: string, url: string}>}
 */
const uploadFile = async (fileBuffer, key, contentType, bucket = BUCKET_UPLOADS) => {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  const endpoint =
    process.env.WASABI_ENDPOINT ||
    `https://s3.${process.env.WASABI_REGION || "us-east-1"}.wasabisys.com`;
  const url = `${endpoint}/${bucket}/${key}`;

  return { key, url };
};

/**
 * Obtiene un archivo de S3/Wasabi
 * @param {string} key - Ruta/nombre del archivo en el bucket
 * @param {string} [bucket] - Bucket origen (default: BUCKET_UPLOADS)
 * @returns {Promise<{body: ReadableStream, contentType: string}>}
 */
const getFile = async (key, bucket = BUCKET_UPLOADS) => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await s3Client.send(command);
  return {
    body: response.Body,
    contentType: response.ContentType,
  };
};

/**
 * Elimina un archivo de S3/Wasabi
 * @param {string} key - Ruta/nombre del archivo en el bucket
 * @param {string} [bucket] - Bucket origen (default: BUCKET_UPLOADS)
 * @returns {Promise<void>}
 */
const deleteFile = async (key, bucket = BUCKET_UPLOADS) => {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await s3Client.send(command);
};

/**
 * Genera la key (ruta) para un archivo segun su tipo
 * @param {string} folder - Carpeta destino (ej: "vouchers", "contracts")
 * @param {string} originalFilename - Nombre original del archivo
 * @param {string} [prefix] - Prefijo opcional (ej: "plan_voucher")
 * @returns {string} Key generada
 */
const generateFileKey = (folder, originalFilename, prefix = "") => {
  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  const ext = path.extname(originalFilename);
  const name = prefix ? `${prefix}_${uniqueSuffix}${ext}` : `${uniqueSuffix}${ext}`;
  return `${folder}/${name}`;
};

module.exports = {
  s3Client,
  uploadFile,
  getFile,
  deleteFile,
  generateFileKey,
  BUCKET_UPLOADS,
  BUCKET_BACKUPS,
};
