
const sql = require("mssql");
require("dotenv").config();

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
    },
    port:parseInt(process.env.DB_PORT),
};

let poolPromise;

const connectToDB = async () => {
    try {
        const pool = await sql.connect(config);
        console.log("Connected to SQL Server...");
        poolPromise = Promise.resolve(pool);
    } catch (err) {
        console.error("Database connection failed:", err);
        process.exit(1);
    }
};

const getPool = async () => {
    if (!poolPromise) {

        await connectToDB();
    } else {
        try {
            const pool = await poolPromise;
            if (!pool.connected) {
                console.log("Reconnecting to SQL Server...");
                await connectToDB();
            }
        } catch (err) {
            console.error("Error while checking connection status:", err);
            await connectToDB();
        }
    }
    return poolPromise;
};


module.exports = { sql, connectToDB, getPool };
