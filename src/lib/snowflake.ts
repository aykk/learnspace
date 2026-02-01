/**
 * Snowflake database client for Learnspace
 */

import snowflake from 'snowflake-sdk';

// Configure Snowflake SDK to not check for OCSP (faster connections)
snowflake.configure({ ocspFailOpen: true });

let connection: snowflake.Connection | null = null;
let connectionPromise: Promise<snowflake.Connection> | null = null;

interface SnowflakeConfig {
  account: string;
  username: string;
  password: string;
  database: string;
  schema: string;
  warehouse: string;
}

function getConfig(): SnowflakeConfig {
  const account = process.env.SNOWFLAKE_ACCOUNT;
  const username = process.env.SNOWFLAKE_USERNAME;
  const password = process.env.SNOWFLAKE_PASSWORD;
  const database = process.env.SNOWFLAKE_DATABASE || 'LEARNSPACE';
  const schema = process.env.SNOWFLAKE_SCHEMA || 'PUBLIC';
  const warehouse = process.env.SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH';

  if (!account || !username || !password) {
    throw new Error('Missing Snowflake credentials in environment variables');
  }

  return { account, username, password, database, schema, warehouse };
}

/**
 * Get or create a Snowflake connection
 */
export async function getConnection(): Promise<snowflake.Connection> {
  if (connection) {
    return connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = new Promise((resolve, reject) => {
    const config = getConfig();

    const conn = snowflake.createConnection({
      account: config.account,
      username: config.username,
      password: config.password,
      database: config.database,
      schema: config.schema,
      warehouse: config.warehouse,
    });

    conn.connect((err, conn) => {
      if (err) {
        console.error('Snowflake connection error:', err);
        connectionPromise = null;
        reject(err);
      } else {
        console.log('❄️ Connected to Snowflake');
        connection = conn;
        resolve(conn);
      }
    });
  });

  return connectionPromise;
}

/**
 * Execute a SQL query and return results
 */
export async function query<T = any>(sql: string, binds: any[] = []): Promise<T[]> {
  const conn = await getConnection();

  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText: sql,
      binds: binds,
      complete: (err, stmt, rows) => {
        if (err) {
          console.error('Snowflake query error:', err);
          reject(err);
        } else {
          resolve((rows || []) as T[]);
        }
      },
    });
  });
}

/**
 * Execute a SQL statement (INSERT, UPDATE, DELETE) and return affected rows
 */
export async function execute(sql: string, binds: any[] = []): Promise<number> {
  const conn = await getConnection();

  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText: sql,
      binds: binds,
      complete: (err, stmt) => {
        if (err) {
          console.error('Snowflake execute error:', err);
          reject(err);
        } else {
          resolve(stmt?.getNumUpdatedRows() || 0);
        }
      },
    });
  });
}

/**
 * Test the Snowflake connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const rows = await query('SELECT CURRENT_TIMESTAMP() as now');
    console.log('❄️ Snowflake connection test:', rows[0]);
    return true;
  } catch (error) {
    console.error('Snowflake connection test failed:', error);
    return false;
  }
}
