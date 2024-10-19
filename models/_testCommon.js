'use strict';

const bcrypt = require('bcrypt');

const db = require('../db.js');
const { BCRYPT_WORK_FACTOR } = require('../config');

// ==================================================

async function commonBeforeAll() {
  // noinspection SqlWithoutWhere
  await db.query('DELETE FROM companies');
  // noinspection SqlWithoutWhere
  await db.query('DELETE FROM users');
  // noinspection SqlWithoutWhere
  await db.query('TRUNCATE TABLE jobs RESTART IDENTITY CASCADE');
  // noinspection SqlWithoutWhere
  await db.query('TRUNCATE TABLE applications CASCADE');
  // noinspection SqlWithoutWhere
  await db.query('TRUNCATE TABLE technologies RESTART IDENTITY CASCADE');
  // noinspection SqlWithoutWhere
  await db.query('TRUNCATE TABLE jobs_technologies CASCADE');
  // noinspection SqlWithoutWhere
  await db.query('TRUNCATE TABLE users_technologies CASCADE');

  await db.query(`
    INSERT INTO companies(handle, name, num_employees, description, logo_url)
    VALUES ('c1', 'C1', 1, 'Desc1', 'http://c1.img'),
           ('c2', 'C2', 2, 'Desc2', 'http://c2.img'),
           ('c3', 'C3', 3, 'Desc3', 'http://c3.img')`);

  await db.query(
    `
        INSERT INTO users(username,
                          password,
                          first_name,
                          last_name,
                          email)
        VALUES ('u1', $1, 'U1F', 'U1L', 'u1@email.com'),
               ('u2', $2, 'U2F', 'U2L', 'u2@email.com')
        RETURNING username`,
    [
      await bcrypt.hash('password1', BCRYPT_WORK_FACTOR),
      await bcrypt.hash('password2', BCRYPT_WORK_FACTOR),
    ]
  );

  await db.query(
    `INSERT INTO jobs (title, salary, equity, company_handle)
    VALUES ('j1', 0, 1.0, 'c1'),
            ('j2', 100, 0.5, 'c1'),
            ('j3', 1000, 0.0, 'c2')`
  );

  await db.query(
    `INSERT INTO technologies (name)
    VALUES ('t1'),
            ('t2'),
            ('t3')`
  );

  await db.query(
    `INSERT INTO jobs_technologies (job_id, tech_id)
    VALUES (1, 1),
            (1, 2),
            (1, 3),
            (2, 1)`
  );

  await db.query(
    `INSERT INTO users_technologies (username, tech_id)
    VALUES ('u1', 1),
            ('u1', 2)`
  );
}

async function commonBeforeEach() {
  await db.query('BEGIN');
}

async function commonAfterEach() {
  await db.query('ROLLBACK');
}

async function commonAfterAll() {
  await db.end();
}

// ensure that this matches insertion values above
const users = Object.freeze([
  Object.freeze({
    username: 'u1',
    firstName: 'U1F',
    lastName: 'U1L',
    email: 'u1@email.com',
    isAdmin: false,
  }),
  Object.freeze({
    username: 'u2',
    firstName: 'U2F',
    lastName: 'U2L',
    email: 'u2@email.com',
    isAdmin: false,
  }),
]);

// ensure that this matches insertion values above
const jobs = Object.freeze([
  Object.freeze({
    id: expect.any(Number),
    title: 'j1',
    salary: 0,
    equity: 1.0,
    companyHandle: 'c1',
  }),
  Object.freeze({
    id: expect.any(Number),
    title: 'j2',
    salary: 100,
    equity: 0.5,
    companyHandle: 'c1',
  }),
  Object.freeze({
    id: expect.any(Number),
    title: 'j3',
    salary: 1000,
    equity: 0.0,
    companyHandle: 'c2',
  }),
]);

// ==================================================

module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  users,
  jobs,
};
