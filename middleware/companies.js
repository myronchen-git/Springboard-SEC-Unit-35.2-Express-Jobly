'use strict';

const { BadRequestError } = require('../expressError');

// ==================================================

/**
 * Middleware to convert the query parameters (filters) for the GET companies
 * route to have the correct type and value.
 *
 * minEmployees and maxEmployees are converted to integers, and
 * nameLike is decoded from URI to plain String.
 *
 * A max integer value of 2147483647 is used, because that is PostgreSQL's max
 * value for its integer data type.
 *
 * An error is thrown if queries can not be converted.
 *
 * @param {Object} req The request Object from Express, containing the query
 *   parameters.
 * @param {Object} res The response Object from Express.
 * @param {Function} next The next function to execute.
 * @returns Output of "next" function.
 * @throws BadRequestError If minEmployees or maxEmployees is not an integer
 *   between 0 and 2147483647, inclusive.  Also if nameLike contains a % not
 *   followed by two hexadecimal digits, or if the escape sequence does not
 *   encode a valid UTF-8 character.
 */
function convertGetAllCompaniesQueryParameters(req, res, next) {
  try {
    // minEmployees / maxEmployees
    const minEmployees = req.query.minEmployees
      ? Number.parseFloat(req.query.minEmployees)
      : undefined;
    const maxEmployees = req.query.maxEmployees
      ? Number.parseFloat(req.query.maxEmployees)
      : undefined;

    for (const query of [minEmployees, maxEmployees]) {
      if (
        query !== undefined &&
        (Number.isNaN(query) ||
          query < 0 ||
          query > 2147483647 ||
          !Number.isInteger(query))
      ) {
        throw new BadRequestError(
          'minEmployees or maxEmployees is not a positive integer ' +
            'between 0 and 2147483647, inclusive.'
        );
      }
    }

    req.query.minEmployees = minEmployees;
    req.query.maxEmployees = maxEmployees;

    // nameLike
    const nameLike = req.query.nameLike;

    if (nameLike) {
      try {
        req.query.nameLike = decodeURIComponent(nameLike.replace(/\+/g, ' '));
      } catch (err) {
        if (err instanceof URIError) {
          throw new BadRequestError(
            'Can not decode query parameter nameLike from URL encoding.'
          );
        }
      }
    }

    return next();
  } catch (err) {
    next(err);
  }
}

// ==================================================

module.exports = { convertGetAllCompaniesQueryParameters };
