// src/db.ts
import knex from 'knex';
import config from './db.config';

const db = knex(config.development);

export default db;
