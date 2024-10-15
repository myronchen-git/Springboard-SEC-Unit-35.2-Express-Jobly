'use strict';

const { convertGetAllCompaniesQueryParameters } = require('./companies');
const { BadRequestError } = require('../expressError');

// ==================================================

describe('convertGetAllCompaniesQueryParameters', () => {
  test.each([
    [
      {
        nameLike: 'c1',
        minEmployees: '0',
        maxEmployees: '2147483647',
      },
      {
        nameLike: 'c1',
        minEmployees: 0,
        maxEmployees: 2147483647,
      },
    ],
    [{}, {}],
  ])(
    'If queries are valid, should not throw an error.  Test case: %#.',
    (query, convertedQuery) => {
      // Arrange
      const req = { query };
      const res = {};
      const next = function (err) {
        expect(err).toBeFalsy();
      };

      // Act
      convertGetAllCompaniesQueryParameters(req, res, next);

      // Assert
      expect(req.query).toEqual(convertedQuery);
      expect.assertions(2);
    }
  );

  test.each([
    [{ minEmployees: 'a' }],
    [{ minEmployees: '-1' }],
    [{ minEmployees: '2147483648' }],
    [{ minEmployees: '1.5' }],
    [{ maxEmployees: 'a' }],
    [{ maxEmployees: '-1' }],
    [{ maxEmployees: '2147483648' }],
    [{ maxEmployees: '1.5' }],
    [{ nameLike: 'c%' }],
  ])(
    'If queries are invalid, should throw an error.  Input is %o.',
    (query) => {
      // Arrange
      const req = { query };
      const res = {};
      const next = function (err) {
        expect(err instanceof BadRequestError).toBeTruthy();
      };

      // Act
      convertGetAllCompaniesQueryParameters(req, res, next);

      // Assert
      expect.assertions(1);
    }
  );
});
