'use strict';

/** Routes for jobs. */

const jsonschema = require('jsonschema');
const express = require('express');

const { BadRequestError } = require('../expressError');
const { ensureLoggedIn, ensureAdmin } = require('../middleware/auth');
const {
  convertJobId,
  convertGetAllJobsQueryParameters,
} = require('../middleware/jobs');

const Job = require('../models/job');

const jobNewSchema = require('../schemas/jobNew.json');
const jobUpdateSchema = require('../schemas/jobUpdate.json');

// ==================================================

const router = new express.Router();

/**
 * POST /
 * { job } => { job }
 *
 * job should be { title, salary, equity, companyHandle }.
 *
 * Returns { id, title, salary, equity, companyHandle }.
 *
 * Authorization required: login, admin
 */
router.post('/', ensureLoggedIn, ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map((e) => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.create(req.body);
    return res.status(201).json({ job });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /
 * => { jobs: [{ id, title, salary, equity, companyHandle }, ...] }
 *
 * Can filter on provided search filters:
 * - title (will find case-insensitive, partial matches)
 * - minSalary
 * - hasEquity
 *
 * Authorization required: none
 */
router.get(
  '/',
  convertGetAllJobsQueryParameters,
  async function (req, res, next) {
    try {
      const jobs = await Job.findAll(req.query);
      return res.json({ jobs });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /:id
 * => { job: { id, title, salary, equity, companyHandle } }
 *
 * Authorization required: none
 */
router.get('/:id', convertJobId, async function (req, res, next) {
  try {
    const job = await Job.get(req.params.id);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /:id
 * { title, salary, equity }
 * =>
 * { job: { id, title, salary, equity, companyHandle } }
 *
 * Any number of fields can be updated.
 *
 * Authorization required: login, admin
 */
router.patch(
  '/:id',
  convertJobId,
  ensureLoggedIn,
  ensureAdmin,
  async function (req, res, next) {
    try {
      const validator = jsonschema.validate(req.body, jobUpdateSchema);
      if (!validator.valid) {
        const errs = validator.errors.map((e) => e.stack);
        throw new BadRequestError(errs);
      }

      const job = await Job.update(req.params.id, req.body);
      return res.json({ job });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE /:id
 * => { deleted: id }
 *
 * Authorization: login, admin
 */
router.delete(
  '/:id',
  convertJobId,
  ensureLoggedIn,
  ensureAdmin,
  async function (req, res, next) {
    try {
      await Job.remove(req.params.id);
      return res.json({ deleted: req.params.id });
    } catch (err) {
      return next(err);
    }
  }
);

// ==================================================

module.exports = router;
