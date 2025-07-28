const mysql = require('mysql2');
const dbconfig = require('./database');

// environments: development | production
const pool = mysql.createPool({
  connectionLimit: 75,
  host: dbconfig.development.database.host,
  port: dbconfig.development.database.port,
  user: dbconfig.development.database.user,
  password: dbconfig.development.database.password,
  charset: 'utf8mb4'
});

const db = async (query, values) => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
        return;
      }

      connection.query(query, values, (err, rows) => {
        connection.release();
        if (err) {
          console.log(err);
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  });
};

// async function seeAndCloseConnections() {
// 	try {
// 		const results = await db('SHOW PROCESSLIST', []);

// 		// Lista todas as conexões ativas
// 		// console.log('Conexões ativas antes de fechar:');
// 		// console.table(results);

// 		for (const result of results) {
// 			// Extraindo o ID da conexão de cada resultado
// 			const connectionId = result.Id;

// 			// Ignorando a conexão do event scheduler
// 			if (connectionId !== 5) {
// 				// Executando o comando KILL para desconectar a conexão
// 				await db(`KILL ${connectionId}`, []);
// 			}
// 		}

// 		// Lista apenas a sua própria conexão após fechar as outras
// 		const myConnection = await db('SHOW PROCESSLIST', []);

// 		console.log('Minha conexão após fechar as outras:');
// 		console.table(myConnection);

// 		console.log('Todas as outras conexões foram fechadas.');
// 	} catch (error) {
// 		console.error('Erro ao fechar conexões:', error);
// 	}
// }

// pool.on('connection', function (connection) {
// 	seeAndCloseConnections();
// });

module.exports = db;