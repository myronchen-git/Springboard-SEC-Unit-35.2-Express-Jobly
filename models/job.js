'use strict';

const db = require('../db');
const { BadRequestError, NotFoundError } = require('../expressError');
const { sqlForPartialUpdate } = require('../helpers/sql');

// ==================================================

/** Related functions for jobs. */

class Job {
  /**
   * Inserts a new job into the database and returns the database data.
   *
   * @param {Object} param0 { title, salary, equity, companyHandle }.
   * @returns {id, title, salary, equity, companyHandle}.
   * @throws BadRequestError - If the job already exists in the database.
   * @throws NotFoundError - If the company is not found.
   */
  static async create({ title, salary, equity, companyHandle }) {
    const duplicateCheck = await db.query(
      `SELECT id
           FROM jobs
           WHERE title=$1 AND salary=$2 AND equity=$3 AND company_handle=$4`,
      [title, salary, equity, companyHandle]
    );

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate job: ${title}`);

    let job;
    try {
      const jobsResult = await db.query(
        `INSERT INTO jobs
        (title, salary, equity, company_handle)
        VALUES ($1, $2, $3, $4)
        RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
        [title, salary, equity, companyHandle]
      );
      job = jobsResult.rows[0];
    } catch (err) {
      if (err.code === '23503') {
        throw new NotFoundError(
          `Company not found for handle: ${companyHandle}.`
        );
      }
    }

    if (job.equity !== null) {
      job.equity = Number(job.equity);
    }

    return job;
  }

  /**
   * Finds all jobs.
   *
   * @returns [{ id, title, salary, equity, companyHandle }, ...]
   */
  static async findAll() {
    const querySql = `
      SELECT id, title, salary, equity, company_handle AS "companyHandle"
      FROM jobs`;

    const jobsResult = await db.query(querySql);

    const jobs = jobsResult.rows.map((job) => {
      if (job.equity !== null) {
        job.equity = Number(job.equity);
      }
      return job;
    });

    return jobs;
  }

  /**
   * Gets a specified job by ID.
   *
   * @param {Number} id Job ID of job to get.
   * @returns { id, title, salary, equity, companyHandle }.
   * @throws NotFoundError If job is not found.
   */
  static async get(id) {
    const jobsResult = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
      FROM jobs
      WHERE id = $1`,
      [id]
    );

    const job = jobsResult.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    if (job.equity !== null) {
      job.equity = Number(job.equity);
    }

    return job;
  }

  /**
   * Updates a job.  ID and company handle can not be changed.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * @param {Number} id The job ID of job to update.
   * @param {Object} data { title, salary, equity }.
   * @returns { id, title, salary, equity, companyHandle }.
   * @throws NotFoundError If job is not found.
   */
  static async update(id, data) {
    delete data.id;
    delete data.companyHandle;

    const { setCols, values } = sqlForPartialUpdate(data, {});
    const idVarIdx = '$' + (values.length + 1);

    const querySql = `
      UPDATE jobs
      SET ${setCols}
      WHERE id = ${idVarIdx}
      RETURNING id, title, salary, equity, company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    if (job.equity !== null) {
      job.equity = Number(job.equity);
    }

    return job;
  }

  /**
   * Deletes a specified job by ID.
   *
   * @param {Number} id The job ID of the job to delete.
   * @throws NotFoundError If job is not found.
   */
  static async remove(id) {
    const result = await db.query(
      `DELETE FROM jobs
      WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) throw new NotFoundError(`No job: ${id}`);
  }
}

// ==================================================

module.exports = Job;
