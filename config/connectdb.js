const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
})

pool.connect()
    .then(() => console.log('Connected to PostgreSQL successfully'))
    .catch((err) => console.log('PostgreSQL connection error:', err))

module.exports = pool