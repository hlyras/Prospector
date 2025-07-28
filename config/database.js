module.exports = {
	development: {
		url: '127.0.0.1:3001',
		database: {
			host: process.env.DB_DEVELOPMENT_HOST,
			port: process.env.DB_DEVELOPMENT_PORT,
			database: process.env.DB_DEVELOPMENT_DATABASE,
			user: process.env.DB_DEVELOPMENT_USER,
			password: process.env.DB_DEVELOPMENT_PASSWORD,
			dialect: 'mysql',
			logging: false,
		},
		server: {
			host: process.env.DB_DEVELOPMENT_HOST,
			port: process.env.DB_DEVELOPMENT_PORT,
		}
	},
	production: {
		url: 'http://app.cotalogo.cloudns.ch',
		database: {
			host: process.env.DB_PRODUCTION_HOST,
			port: process.env.DB_PRODUCTION_PORT,
			database: process.env.DB_PRODUCTION_DATABASE,
			user: process.env.DB_PRODUCTION_USER,
			password: process.env.DB_PRODUCTION_PASSWORD,
			dialect: 'mysql',
			logging: false,
		},
		server: {
			host: process.env.DB_PRODUCTION_HOST,
			port: process.env.DB_PRODUCTION_PORT
		}
	}
};