'use strict';

const db = require('../db.js');
const User = require('../models/user');
const Company = require('../models/company');
const Job = require('../models/job');
const { createToken } = require('../helpers/tokens');

// ==================================================

const users = Object.freeze([
  Object.freeze({
    username: 'u1',
    firstName: 'U1F',
    lastName: 'U1L',
    email: 'user1@user.com',
    isAdmin: true,
  }),
  Object.freeze({
    username: 'u2',
    firstName: 'U2F',
    lastName: 'U2L',
    email: 'user2@user.com',
    isAdmin: false,
  }),
  Object.freeze({
    username: 'u3',
    firstName: 'U3F',
    lastName: 'U3L',
    email: 'user3@user.com',
    isAdmin: false,
  }),
]);

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

// --------------------------------------------------

async function commonBeforeAll() {
  // noinspection SqlWithoutWhere
  await db.query('DELETE FROM users');
  // noinspection SqlWithoutWhere
  await db.query('DELETE FROM companies');
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

  await Company.create({
    handle: 'c1',
    name: 'C1',
    numEmployees: 1,
    description: 'Desc1',
    logoUrl: 'http://c1.img',
  });
  await Company.create({
    handle: 'c2',
    name: 'C2',
    numEmployees: 2,
    description: 'Desc2',
    logoUrl: 'http://c2.img',
  });
  await Company.create({
    handle: 'c3',
    name: 'C3',
    numEmployees: 3,
    description: 'Desc3',
    logoUrl: 'http://c3.img',
  });

  for (const [index, user] of users.entries()) {
    await User.register({
      ...user,
      password: `password${index + 1}`,
    });
  }

  for (const job of jobs) {
    const jobCopy = { ...job };
    delete jobCopy.id;

    await Job.create(jobCopy);
  }

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
            ('u1', 2),
            ('u2', 1)`
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

const u1Token = createToken({ username: 'u1', isAdmin: true });
const u2Token = createToken({ username: 'u2', isAdmin: false });

// ==================================================

module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token,
  users,
  jobs,
};
