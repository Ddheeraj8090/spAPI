const sql = require('mssql');
const config = require('./config'); // MSSQL config

async function connectToDatabase() {
  try {
    const pool = await sql.connect(config);
    return pool;
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    throw new Error('Failed to connect to the database.');
  }
}

async function executeQuery(query) {
  if (!/^\s*SELECT\s+/i.test(query)) {
    throw new Error('Only SELECT queries are allowed.');
  }

  let pool;
  try {
    pool = await connectToDatabase();
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (err) {
    console.error('❌ Database query error:', err.message);
    throw new Error('Database query error: ' + err.message);
  } finally {
    if (pool) {
      await sql.close(); // correct way to close MSSQL pool
    }
  }
}

module.exports = { executeQuery };
