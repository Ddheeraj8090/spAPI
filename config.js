require('dotenv').config();
const sql = require('mssql');

const config = {
  server: '192.168.1.34',
  port: 1431,
  user: 'sparklingcrown',
  password: 'RtnahT99EmAl',
  database: 'sparklingcrown',
  options: {
    trustServerCertificate: true, 
    trustedConnection: false,
    enableArithAbort: true,
    multipleStatements: true,
  },
};


module.exports = config; 

