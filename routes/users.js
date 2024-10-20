'use strict';

/** Routes for users. */

const jsonschema = require('jsonschema');
const express = require('express');
const passwordGen = require('generate-password');

const {
  ensureLoggedIn,
  ensureAdmin,
  ensureAdminOrSelf,
} = require('../middleware/auth');
const { convertJobId } = require('../middleware/jobs');
const { BadRequestError } = require('../expressError');
const User = require('../models/user');
const { createToken } = require('../helpers/tokens');
const userNewSchema = require('../schemas/userNew.json');
const userUpdateSchema = require('../schemas/userUpdate.json');

// ==================================================

const router = express.Router();

/** POST / { user }  => { user, token }
 *
 * Adds a new user. This is not the registration endpoint --- instead, this is
 * only for admin users to add new users. The new user being added can be an
 * admin.
 *
 * This returns the newly created user and an authentication token for them:
 *  {user: { username, firstName, lastName, email, isAdmin }, token }
 *
 * Authorization required: login, admin
 **/

router.post('/', ensureLoggedIn, ensureAdmin, async function (req, res, next) {
  try {
    req.body.password = passwordGen.generate({ numbers: true, symbols: true });

    const validator = jsonschema.validate(req.body, userNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map((e) => e.stack);
      throw new BadRequestError(errs);
    }

    const user = await User.register(req.body);
    const token = createToken(user);
    return res.status(201).json({ user, token });
  } catch (err) {
    return next(err);
  }
});

/** GET / => { users: [ {username, firstName, lastName, email }, ... ] }
 *
 * Returns list of all users.
 *
 * Authorization required: login, admin
 **/

router.get('/', ensureLoggedIn, ensureAdmin, async function (req, res, next) {
  try {
    const users = await User.findAll();
    return res.json({ users });
  } catch (err) {
    return next(err);
  }
});

/** GET /[username] => { user }
 *
 * Returns { username, firstName, lastName, isAdmin, jobs }
 *   where jobs is [ jobId, jobId, ... ].
 *
 * Authorization required: login, admin or self
 **/

router.get(
  '/:username',
  ensureLoggedIn,
  ensureAdminOrSelf,
  async function (req, res, next) {
    try {
      const user = await User.get(req.params.username);
      return res.json({ user });
    } catch (err) {
      return next(err);
    }
  }
);

/** PATCH /[username] { user } => { user }
 *
 * Data can include:
 *   { firstName, lastName, password, email }
 *
 * Returns { username, firstName, lastName, email, isAdmin }
 *
 * Authorization required: login, admin or self
 **/

router.patch(
  '/:username',
  ensureLoggedIn,
  ensureAdminOrSelf,
  async function (req, res, next) {
    try {
      const validator = jsonschema.validate(req.body, userUpdateSchema);
      if (!validator.valid) {
        const errs = validator.errors.map((e) => e.stack);
        throw new BadRequestError(errs);
      }

      const user = await User.update(req.params.username, req.body);
      return res.json({ user });
    } catch (err) {
      return next(err);
    }
  }
);

/** DELETE /[username]  =>  { deleted: username }
 *
 * Authorization required: login, admin or self
 **/

router.delete(
  '/:username',
  ensureLoggedIn,
  ensureAdminOrSelf,
  async function (req, res, next) {
    try {
      await User.remove(req.params.username);
      return res.json({ deleted: req.params.username });
    } catch (err) {
      return next(err);
    }
  }
);

/** POST /:username/jobs/:id
 * => { applied: jobId }
 *
 * Has a user apply to a job.
 *
 * Authorization required: login, admin or self
 */
router.post(
  '/:username/jobs/:id',
  ensureLoggedIn,
  ensureAdminOrSelf,
  convertJobId,
  async function (req, res, next) {
    try {
      const { jobId } = await User.applyJob(req.params.username, req.params.id);
      return res.status(201).json({ applied: jobId });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /:username/matchingJobs
 * => { jobs:
 *  [{ id, title, salary, equity, companyHandle, technologies }, ...]
 * }
 *
 * Returns a list of jobs that have technologies that match a specified user's
 * technologies.
 *
 * Authorization required: login, admin or self
 */
router.get(
  '/:username/matchingJobs',
  ensureLoggedIn,
  ensureAdminOrSelf,
  async function (req, res, next) {
    try {
      const jobs = await User.matchJobs(req.params.username);
      return res.json({ jobs });
    } catch (err) {
      return next(err);
    }
  }
);

// ==================================================

module.exports = router;
