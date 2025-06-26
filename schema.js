const sql = require('mssql');
const config = require('./config');

async function extractSchema() {
  const pool = await sql.connect(config);

  try {
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_CATALOG = '${config.database}'
    `);

    const tables = tablesResult.recordset;
    let schemaText = '';

    for (const { TABLE_NAME } of tables) {
      const countResult = await pool.request().query(`
        SELECT COUNT(*) AS count FROM [${TABLE_NAME}]
      `);

      if (countResult.recordset[0].count === 0) continue;

      const columnsResult = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_CATALOG = '${config.database}' AND TABLE_NAME = '${TABLE_NAME}'
      `);

      const primaryKeyResult = await pool.request().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_NAME), 'IsPrimaryKey') = 1 
          AND TABLE_NAME = '${TABLE_NAME}'
      `);

      const foreignKeyResult = await pool.request().query(`
        SELECT 
          fkCols.COLUMN_NAME, 
          pk.TABLE_NAME AS REFERENCED_TABLE_NAME, 
          pkCols.COLUMN_NAME AS REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS AS rc
        JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS fk 
          ON rc.CONSTRAINT_NAME = fk.CONSTRAINT_NAME
        JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS pk 
          ON rc.UNIQUE_CONSTRAINT_NAME = pk.CONSTRAINT_NAME
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS fkCols 
          ON rc.CONSTRAINT_NAME = fkCols.CONSTRAINT_NAME
        JOIN (
          SELECT CONSTRAINT_NAME, COLUMN_NAME 
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        ) AS pkCols 
          ON pk.CONSTRAINT_NAME = pkCols.CONSTRAINT_NAME
        WHERE fk.TABLE_NAME = '${TABLE_NAME}'
      `);

      schemaText += `${TABLE_NAME} (\n`;

      for (let i = 0; i < columnsResult.recordset.length; i++) {
        const col = columnsResult.recordset[i];
        schemaText += `  ${col.COLUMN_NAME} ${col.DATA_TYPE}`;

        if (primaryKeyResult.recordset.some(pk => pk.COLUMN_NAME === col.COLUMN_NAME)) {
          schemaText += ' PRIMARY KEY';
        }

        const foreignKey = foreignKeyResult.recordset.find(fk => fk.COLUMN_NAME === col.COLUMN_NAME);
        if (foreignKey) {
          schemaText += ` FOREIGN KEY REFERENCES ${foreignKey.REFERENCED_TABLE_NAME}(${foreignKey.REFERENCED_COLUMN_NAME})`;
        }

        schemaText += (i < columnsResult.recordset.length - 1) ? ',\n' : '\n';
      }

      schemaText += ')\n\n';
    }

    return schemaText.trim();
  } catch (err) {
    console.error('❌ Error generating schema:', err);
    return '';
  } finally {
    await sql.close(); // correct for MSSQL
  }
}

module.exports = { extractSchema };
