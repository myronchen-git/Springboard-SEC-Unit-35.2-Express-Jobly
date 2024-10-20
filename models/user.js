'use strict';

const bcrypt = require('bcrypt');

const db = require('../db');
const { sqlForPartialUpdate } = require('../helpers/sql');
const {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ServerError,
} = require('../expressError');

const { BCRYPT_WORK_FACTOR } = require('../config.js');

// ==================================================

/** Related functions for users. */

class User {
  /** authenticate user with username, password.
   *
   * Returns { username, first_name, last_name, email, is_admin }
   *
   * Throws UnauthorizedError is user not found or wrong password.
   **/

  static async authenticate(username, password) {
    // try to find the user first
    const result = await db.query(
      `SELECT username,
                  password,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin"
           FROM users
           WHERE username = $1`,
      [username]
    );

    const user = result.rows[0];

    if (user) {
      // compare hashed password to a new hash from password
      const isValid = await bcrypt.compare(password, user.password);
      if (isValid === true) {
        delete user.password;
        return user;
      }
    }

    throw new UnauthorizedError('Invalid username/password');
  }

  /** Register user with data.
   *
   * Returns { username, firstName, lastName, email, isAdmin }
   *
   * Throws BadRequestError on duplicates.
   **/

  static async register({
    username,
    password,
    firstName,
    lastName,
    email,
    isAdmin,
  }) {
    const duplicateCheck = await db.query(
      `SELECT username
           FROM users
           WHERE username = $1`,
      [username]
    );

    if (duplicateCheck.rows[0]) {
      throw new BadRequestError(`Duplicate username: ${username}`);
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

    const result = await db.query(
      `INSERT INTO users
           (username,
            password,
            first_name,
            last_name,
            email,
            is_admin)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING username, first_name AS "firstName",
           last_name AS "lastName", email, is_admin AS "isAdmin"`,
      [username, hashedPassword, firstName, lastName, email, isAdmin]
    );

    const user = result.rows[0];

    return user;
  }

  /** Find all users.
   *
   * Returns [{ username, first_name, last_name, email, is_admin }, ...]
   **/

  static async findAll() {
    const result = await db.query(
      `SELECT username,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin"
           FROM users
           ORDER BY username`
    );

    return result.rows;
  }

  /** Given a username, return data about user.
   *
   * Returns { username, firstName, lastName, isAdmin, jobs }
   *   where jobs is [ jobId, jobId, ... ].
   *
   * Throws NotFoundError if user not found.
   **/

  static async get(username) {
    const userRes = await db.query(
      `SELECT u.username,
              u.first_name AS "firstName",
              u.last_name AS "lastName",
              u.email,
              u.is_admin AS "isAdmin",
              COALESCE(
                json_agg(a.job_id) FILTER (WHERE a.job_id IS NOT NULL
              ), '[]') AS jobs
      FROM users AS u
      LEFT JOIN applications AS a ON u.username = a.username
      WHERE u.username = $1
      GROUP BY u.username`,
      [username]
    );

    const user = userRes.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);

    return user;
  }

  /** Update user data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain
   * all the fields; this only changes provided ones.
   *
   * Data can include:
   *   { firstName, lastName, password, email, isAdmin }
   *
   * Returns { username, firstName, lastName, email, isAdmin }
   *
   * Throws NotFoundError if not found.
   *
   * WARNING: this function can set a new password or make a user an admin.
   * Callers of this function must be certain they have validated inputs to this
   * or a serious security risks are opened.
   */

  static async update(username, data) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, BCRYPT_WORK_FACTOR);
    }

    const { setCols, values } = sqlForPartialUpdate(data, {
      firstName: 'first_name',
      lastName: 'last_name',
      isAdmin: 'is_admin',
    });
    const usernameVarIdx = '$' + (values.length + 1);

    const querySql = `UPDATE users
                      SET ${setCols}
                      WHERE username = ${usernameVarIdx}
                      RETURNING username,
                                first_name AS "firstName",
                                last_name AS "lastName",
                                email,
                                is_admin AS "isAdmin"`;
    const result = await db.query(querySql, [...values, username]);
    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);

    delete user.password;
    return user;
  }

  /** Delete given user from database; returns undefined. */

  static async remove(username) {
    let result = await db.query(
      `DELETE
           FROM users
           WHERE username = $1
           RETURNING username`,
      [username]
    );
    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);
  }

  /**
   * Has a user apply to a job.  This currently only associates a user and a
   * job together.
   *
   * @param {String} username Username that is applying to the job.
   * @param {Number} jobId ID of the job being applied to.
   * @returns {Object} { username, jobId, status }
   * @throws NotFoundError - If user or job is not found.
   */
  static async applyJob(username, jobId) {
    let application;
    try {
      const applicationsResult = await db.query(
        `INSERT INTO applications (username, job_id, status)
        VALUES ($1, $2, 'applied')
        RETURNING username, job_id AS "jobId", status`,
        [username, jobId]
      );
      application = applicationsResult.rows[0];
    } catch (err) {
      if (err.code === '23503') {
        throw new NotFoundError(`No user: ${username}; or no job: ${jobId}.`);
      } else {
        throw new ServerError();
      }
    }

    return application;
  }

  /**
   * Gets a list of jobs that uses the same technologies as the specified
   * user.  Each job contains the specific shared technologies.
   *
   * @param {String} username The name of the user to match jobs against.
   * @returns {Array} [
   *   { id, title, salary, equity, companyHandle, technologies },
   *   ...
   * ]
   * @throws NotFoundError - If user does not exist.
   */
  static async matchJobs(username) {
    const usersResult = await db.query(
      `SELECT username
      FROM users
      WHERE username = $1`,
      [username]
    );

    if (usersResult.rowCount === 0)
      throw new NotFoundError(`No user: ${username}.`);

    const jobsResult = await db.query(
      `SELECT j.id,
              j.title,
              j.salary,
              j.equity,
              j.company_handle AS "companyHandle",
              json_agg(t.name) AS "technologies"
      FROM users AS u
      JOIN users_technologies AS ut ON u.username = ut.username
      JOIN jobs_technologies AS jt ON ut.tech_id = jt.tech_id
      JOIN jobs AS j ON jt.job_id = j.id
      JOIN technologies AS t ON ut.tech_id = t.id
      WHERE u.username = $1
      GROUP BY j.id`,
      [username]
    );

    const jobs = jobsResult.rows.map((r) => {
      if (r.equity !== null) r.equity = Number(r.equity);
      return r;
    });

    return jobs;
  }
}

// ==================================================

module.exports = User;
