/**
 * Proxy route para servir archivos desde Wasabi S3
 * Reemplaza express.static('/uploads') para leer archivos desde S3
 */

const express = require('express');
const router = express.Router();
const { getFile } = require('../config/s3Client');
const path = require('path');

// Mapa de extensiones a Content-Type
const mimeTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.dcm': 'application/dicom',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel'
};

/**
 * GET /uploads/...
 * Lee el archivo desde S3 y lo transmite al cliente
 * Usa req.path para obtener la ruta completa (compatible con Express 5)
 */
router.get('/{*splat}', async (req, res) => {
  try {
    // Decodificar URI para manejar carpetas con espacios (ej: "internal requests")
    const s3Key = decodeURIComponent(req.path.replace(/^\//, ''));

    if (!s3Key) {
      return res.status(400).json({ error: 'Ruta de archivo requerida' });
    }

    const { body, contentType } = await getFile(s3Key);

    // Determinar Content-Type
    const ext = path.extname(s3Key).toLowerCase();
    const resolvedContentType = contentType || mimeTypes[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', resolvedContentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 horas

    // Stream la respuesta de S3 al cliente
    body.pipe(res);
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    console.error('[S3 Proxy] Error al obtener archivo:', error);
    res.status(500).json({ error: 'Error al obtener archivo' });
  }
});

module.exports = router;
