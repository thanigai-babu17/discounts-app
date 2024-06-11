import { Knex } from 'knex';

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: process.env.DB_URL,
    pool: { min: 0, max: 10 },
    migrations: {
      tableName: 'a360_migrations',
    },
  },
  production: {
    client: 'pg',
    connection: process.env.DB_URL,
    pool: { min: 0, max: 10 },
    migrations: {
      tableName: 'a360_migrations',
    },
  },
};

export default config;
