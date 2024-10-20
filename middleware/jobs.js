'use strict';

const jsonschema = require('jsonschema');

const { BadRequestError, ServerError } = require('../expressError');
const jobGetAllQuerySchema = require('../schemas/jobGetAllQuery.json');

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

/**
 * Middleware to convert the query parameters (filters) for the GET jobs
 * route to have the correct type and value.
 *
 * title is decoded from URI to plain String,
 * minSalary is converted to a positive safe integer or 0, and
 * hasEquity is converted to a boolean.
 *
 * An error is thrown if queries can not be converted.
 *
 * @param {Object} req The request Object from Express, containing the query
 *   parameters.
 * @param {Object} res The response Object from Express.
 * @param {Function} next The next function to execute.
 * @returns Output of "next" function.
 * @throws BadRequestError If minSalary is not an integer
 *   between 0 and 2147483647, inclusive.  Also if title contains a %
 *   not followed by two hexadecimal digits, or if the escape sequence does not
 *   encode a valid UTF-8 character.
 */
function convertGetAllJobsQueryParameters(req, res, next) {
  try {
    // title
    let title = req.query.title;
    try {
      title = title && decodeURIComponent(title.replace(/\+/g, ' '));
    } catch (err) {
      if (err instanceof URIError) {
        throw new BadRequestError(
          'Can not decode query parameter title from URL encoding.'
        );
      } else {
        throw new ServerError();
      }
    }

    // minSalary
    let minSalary;
    if (req.query.minSalary !== undefined)
      minSalary = Number(req.query.minSalary);

    // hasEquity
    let hasEquity = req.query.hasEquity;
    if (hasEquity) {
      switch (hasEquity.toLowerCase()) {
        case 'true':
          hasEquity = true;
          break;
        case 'false':
          hasEquity = false;
          break;
      }
    }

    // validate json schema
    const query = { title, minSalary, hasEquity };

    const validator = jsonschema.validate(query, jobGetAllQuerySchema);
    if (!validator.valid) {
      const errs = validator.errors.map((e) => e.stack);
      throw new BadRequestError(errs);
    }

    req.query = query;

    return next();
  } catch (err) {
    return next(err);
  }
}

// ==================================================

module.exports = {
  convertJobId,
  convertGetAllJobsQueryParameters,
};
