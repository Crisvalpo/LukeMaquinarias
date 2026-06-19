const fs = require('fs');
const path = require('path');

// 1. Parsear el archivo CSV
const csvPath = path.join(__dirname, '../crd10_core_projects.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');

const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
const headers = lines[0].slice(1, -1).split('","');

console.log(`Parseando ${lines.length - 1} proyectos desde el CSV...`);

let sql = `-- Inserción de proyectos desde CSV\n`;

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  const cols = line.slice(1, -1).split('","');
  
  if (cols.length < 20) continue;

  const costCenter = cols[4] ? cols[4].trim() : '';
  const location = cols[10] ? cols[10].trim() : '';
  const projectName = cols[19] ? cols[19].trim() : '';

  if (!costCenter || !projectName) continue;

  // Escapar comillas simples en SQL
  const escapedName = projectName.replace(/'/g, "''");
  const escapedLocation = location ? location.replace(/'/g, "''") : '';
  const locationValue = escapedLocation ? `'${escapedLocation}'` : 'NULL';

  sql += `INSERT INTO maquinaria.obras (nombre_obra, codigo_cc, ubicacion, activa) VALUES ('${escapedName}', '${costCenter}', ${locationValue}, true) ON CONFLICT (codigo_cc) DO UPDATE SET nombre_obra = EXCLUDED.nombre_obra, ubicacion = EXCLUDED.ubicacion, activa = EXCLUDED.activa;\n`;
}

const sqlOutputPath = path.join(__dirname, 'populate_projects.sql');
fs.writeFileSync(sqlOutputPath, sql, 'utf8');
console.log(`SQL generado exitosamente en ${sqlOutputPath}`);
