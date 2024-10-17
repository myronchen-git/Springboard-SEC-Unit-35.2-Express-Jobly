'use strict';

const { BadRequestError } = require('../expressError');

// ==================================================

/**
 * Middleware to convert the query parameter id for jobs routes to have it as a
 * number type.
 *
 * @param {Object} req The request Object from Express, containing the query
 *   parameters.
 * @param {Object} res The response Object from Express.
 * @param {Function} next The next function to execute.
 * @returns Output of "next" function.
 * @throws BadRequestError If id can not be converted into a number.
 */
function convertJobId(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      throw new BadRequestError('id is not a number.');
    }

    req.params.id = id;

    return next();
  } catch (err) {
    return next(err);
  }
}

// ==================================================

module.exports = { convertJobId };
