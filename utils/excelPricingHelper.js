/**
 * Excel Pricing Helper
 * Utilidad para generar y parsear plantillas Excel de precios corporativos
 */

const ExcelJS = require('exceljs');
const path = require('path');

/**
 * Generar plantilla Excel con todos los procedimientos y precios corporativos
 * @param {object} company - Datos de la empresa
 * @param {object} allProcedures - { sub_procedures, condition_procedures }
 * @returns {Buffer} Buffer del archivo Excel
 */
const generatePricingTemplate = async (company, allProcedures) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MyDent Sistema Odontologico';
  workbook.created = new Date();

  // Estilo de cabecera
  const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    }
  };

  const cellBorder = {
    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
  };

  // ========== HOJA 1: Procedimientos por Condicion ==========
  const condSheet = workbook.addWorksheet('Procedimientos por Condicion');

  // Titulo
  condSheet.mergeCells('A1:G1');
  const titleCell1 = condSheet.getCell('A1');
  titleCell1.value = `Precios Corporativos - ${company.company_name} (RUC: ${company.ruc || 'N/A'})`;
  titleCell1.font = { bold: true, size: 14 };
  titleCell1.alignment = { horizontal: 'center' };

  condSheet.mergeCells('A2:G2');
  const subtitleCell1 = condSheet.getCell('A2');
  subtitleCell1.value = 'Procedimientos por Condicion Dental';
  subtitleCell1.font = { bold: true, size: 11, color: { argb: 'FF6B7280' } };
  subtitleCell1.alignment = { horizontal: 'center' };

  // Cabeceras (fila 4)
  const condHeaders = ['Codigo', 'Condicion', 'Procedimiento', 'Especialidad', 'Precio Regular', 'Precio Corporativo', 'Tipo'];
  condHeaders.forEach((header, idx) => {
    const cell = condSheet.getCell(4, idx + 1);
    cell.value = header;
    Object.assign(cell, headerStyle);
    cell.font = headerStyle.font;
    cell.fill = headerStyle.fill;
    cell.alignment = headerStyle.alignment;
    cell.border = headerStyle.border;
  });

  // Datos
  allProcedures.condition_procedures.forEach((proc, idx) => {
    const row = condSheet.getRow(5 + idx);
    row.getCell(1).value = proc.procedure_code;
    row.getCell(2).value = proc.condition_name;
    row.getCell(3).value = proc.procedure_name;
    row.getCell(4).value = proc.specialty;
    row.getCell(5).value = parseFloat(proc.regular_price) || 0;
    row.getCell(5).numFmt = '#,##0.00';
    row.getCell(6).value = proc.corporate_price !== null ? parseFloat(proc.corporate_price) : null;
    row.getCell(6).numFmt = '#,##0.00';
    row.getCell(7).value = 'condition_procedure';

    // Aplicar bordes y estilo alterno
    for (let c = 1; c <= 7; c++) {
      row.getCell(c).border = cellBorder;
      if (idx % 2 === 1) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      }
    }

    // Resaltar celda de precio corporativo (editable)
    row.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
  });

  // Anchos de columna
  condSheet.getColumn(1).width = 12;
  condSheet.getColumn(2).width = 25;
  condSheet.getColumn(3).width = 40;
  condSheet.getColumn(4).width = 20;
  condSheet.getColumn(5).width = 15;
  condSheet.getColumn(6).width = 18;
  condSheet.getColumn(7).width = 22;

  // Ocultar columna Tipo (usada internamente)
  condSheet.getColumn(7).hidden = true;

  // Proteger columnas de solo lectura (excepto precio corporativo)
  condSheet.getColumn(6).protection = { locked: false };

  // ========== HOJA 2: Sub-Procedimientos ==========
  const subSheet = workbook.addWorksheet('Sub-Procedimientos');

  // Titulo
  subSheet.mergeCells('A1:F1');
  const titleCell2 = subSheet.getCell('A1');
  titleCell2.value = `Precios Corporativos - ${company.company_name} (RUC: ${company.ruc || 'N/A'})`;
  titleCell2.font = { bold: true, size: 14 };
  titleCell2.alignment = { horizontal: 'center' };

  subSheet.mergeCells('A2:F2');
  const subtitleCell2 = subSheet.getCell('A2');
  subtitleCell2.value = 'Sub-Procedimientos';
  subtitleCell2.font = { bold: true, size: 11, color: { argb: 'FF6B7280' } };
  subtitleCell2.alignment = { horizontal: 'center' };

  // Cabeceras (fila 4)
  const subHeaders = ['Codigo', 'Sub-Procedimiento', 'Especialidad', 'Precio Regular', 'Precio Corporativo', 'Tipo'];
  subHeaders.forEach((header, idx) => {
    const cell = subSheet.getCell(4, idx + 1);
    cell.value = header;
    cell.font = headerStyle.font;
    cell.fill = headerStyle.fill;
    cell.alignment = headerStyle.alignment;
    cell.border = headerStyle.border;
  });

  // Datos
  allProcedures.sub_procedures.forEach((proc, idx) => {
    const row = subSheet.getRow(5 + idx);
    row.getCell(1).value = proc.procedure_code;
    row.getCell(2).value = proc.procedure_name;
    row.getCell(3).value = proc.specialty;
    row.getCell(4).value = parseFloat(proc.regular_price) || 0;
    row.getCell(4).numFmt = '#,##0.00';
    row.getCell(5).value = proc.corporate_price !== null ? parseFloat(proc.corporate_price) : null;
    row.getCell(5).numFmt = '#,##0.00';
    row.getCell(6).value = 'sub_procedure';

    // Aplicar bordes y estilo alterno
    for (let c = 1; c <= 6; c++) {
      row.getCell(c).border = cellBorder;
      if (idx % 2 === 1) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      }
    }

    // Resaltar celda de precio corporativo (editable)
    row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
  });

  // Anchos de columna
  subSheet.getColumn(1).width = 12;
  subSheet.getColumn(2).width = 45;
  subSheet.getColumn(3).width = 20;
  subSheet.getColumn(4).width = 15;
  subSheet.getColumn(5).width = 18;
  subSheet.getColumn(6).width = 18;

  // Ocultar columna Tipo
  subSheet.getColumn(6).hidden = true;

  // Generar buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

/**
 * Resolver el valor real de una celda de ExcelJS.
 * ExcelJS puede devolver:
 * - Un valor primitivo (number, string, null)
 * - Un objeto formula: { formula, result, sharedFormula, ref, shareType }
 * - Un objeto de texto enriquecido: { richText: [...] }
 * @param {*} cellValue - Valor crudo de la celda
 * @returns {*} Valor resuelto (primitivo)
 */
const resolveCellValue = (cellValue) => {
  if (cellValue === null || cellValue === undefined) return null;
  if (typeof cellValue !== 'object') return cellValue;
  if ('result' in cellValue) return cellValue.result;
  if (cellValue.richText && Array.isArray(cellValue.richText)) {
    return cellValue.richText.map(part => part.text || '').join('');
  }
  return cellValue;
};

/**
 * Parsear archivo Excel importado y extraer precios corporativos
 * @param {Buffer} buffer - Buffer del archivo Excel subido (desde memoryStorage)
 * @returns {Array<{procedure_type, procedure_id, corporate_price}>} Precios extraidos
 */
const parseImportedExcel = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const prices = [];
  const pool = require('../config/db');

  // Construir mapa de codigos a IDs para validar
  const [subResult, condResult] = await Promise.all([
    pool.query(`SELECT sub_procedure_id, sub_procedure_code FROM sub_procedures WHERE status = 'active'`),
    pool.query(`SELECT condition_procedure_id, procedure_code FROM odontogram_condition_procedures WHERE status = 'active'`)
  ]);

  const subCodeMap = {};
  subResult.rows.forEach(r => { subCodeMap[r.sub_procedure_code] = r.sub_procedure_id; });

  const condCodeMap = {};
  condResult.rows.forEach(r => { condCodeMap[r.procedure_code] = r.condition_procedure_id; });

  // Procesar cada hoja
  workbook.eachSheet((worksheet) => {
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 4) return; // Saltar titulo, subtitulo, vacio y cabeceras

      const values = row.values; // row.values es 1-indexed

      // Detectar tipo de hoja por cantidad de columnas y contenido
      // Hoja condition_procedure: 7 cols (codigo, condicion, procedimiento, especialidad, regular, corporativo, tipo)
      // Hoja sub_procedure: 6 cols (codigo, procedimiento, especialidad, regular, corporativo, tipo)

      let code = null;
      let corporatePrice = null;
      let procedureType = null;

      // Intentar leer el tipo desde la columna oculta
      if (worksheet.columnCount >= 7 && values[7]) {
        // Hoja de procedimientos de condicion
        code = resolveCellValue(values[1]);
        code = code ? String(code).trim() : null;
        corporatePrice = resolveCellValue(values[6]);
        procedureType = String(resolveCellValue(values[7])).trim();
      } else if (worksheet.columnCount >= 6 && values[6]) {
        // Hoja de sub-procedimientos
        code = resolveCellValue(values[1]);
        code = code ? String(code).trim() : null;
        corporatePrice = resolveCellValue(values[5]);
        procedureType = String(resolveCellValue(values[6])).trim();
      } else {
        // Fallback: detectar por nombre de hoja
        const sheetName = worksheet.name.toLowerCase();
        if (sheetName.includes('condicion') || sheetName.includes('condition')) {
          code = resolveCellValue(values[1]);
          code = code ? String(code).trim() : null;
          corporatePrice = resolveCellValue(values[6]);
          procedureType = 'condition_procedure';
        } else if (sheetName.includes('sub')) {
          code = resolveCellValue(values[1]);
          code = code ? String(code).trim() : null;
          corporatePrice = resolveCellValue(values[5]);
          procedureType = 'sub_procedure';
        }
      }

      // Saltar filas sin precio corporativo
      if (corporatePrice === null || corporatePrice === undefined || corporatePrice === '') return;

      // Manejar "Gratis" (case-insensitive) = precio 0
      let price;
      if (typeof corporatePrice === 'string' && corporatePrice.trim().toLowerCase() === 'gratis') {
        price = 0;
      } else {
        price = parseFloat(corporatePrice);
        if (isNaN(price) || price < 0) return;
        // Regla de negocio: precio 0 numerico (no "Gratis") = no aplica, se ignora
        if (price === 0) return;
      }

      if (!code || !procedureType) return;

      // Resolver ID segun tipo
      let procedureId = null;
      if (procedureType === 'sub_procedure') {
        procedureId = subCodeMap[code];
      } else if (procedureType === 'condition_procedure') {
        procedureId = condCodeMap[code];
      }

      if (!procedureId) return; // Codigo no encontrado, saltar

      prices.push({
        procedure_type: procedureType,
        procedure_id: procedureId,
        corporate_price: price
      });
    });
  });

  return prices;
};

module.exports = {
  generatePricingTemplate,
  parseImportedExcel
};
