'use strict';

const { convertJobId, convertGetAllJobsQueryParameters } = require('./jobs');
const { BadRequestError } = require('../expressError');

// ==================================================

/************************************** convertJobId */

describe('convertJobId', () => {
  test('Does not throw if ID is valid.', () => {
    // Arrange
    const id = '1';
    const req = { params: { id } };
    const res = {};
    const next = function (err) {
      expect(err).toBeFalsy();
    };

    // Act
    convertJobId(req, res, next);

    // Assert
    expect(req.params.id).toEqual(1);
    expect.assertions(2);
  });

  test('Throws an error if ID is not valid.', () => {
    // Arrange
    const id = 'a';
    const req = { params: { id } };
    const res = {};
    const next = function (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    };

    // Act
    convertJobId(req, res, next);

    // Assert
    expect.assertions(1);
  });
});

/************************************** convertGetAllJobsQueryParameters */

describe('convertGetAllJobsQueryParameters', () => {
  test('Converts query parameters to their correct types.', () => {
    // Arrange
    const req = {
      query: {
        title: 'software%20development%20engineer',
        minSalary: '100',
        hasEquity: 'true',
      },
    };
    const res = {};
    const next = function (err) {
      expect(err).toBeFalsy();
    };

    // Act
    convertGetAllJobsQueryParameters(req, res, next);

    // Assert
    expect(req.query.title).toEqual('software development engineer');
    expect(req.query.minSalary).toEqual(100);
    expect(req.query.hasEquity).toBe(true);
    expect.assertions(4);
  });

  test('Throws error if title can not be converted.', () => {
    // Arrange
    const req = {
      query: {
        title: '%E0%A4%A',
      },
    };
    const res = {};
    const next = function (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    };

    // Act
    convertGetAllJobsQueryParameters(req, res, next);

    // Assert
    expect.assertions(1);
  });

  test.each([['a'], ['-1'], ['2147483648'], ['1.5']])(
    'Throws error if minSalary is not a positive integer or 0.  minSalary: %s.',
    (minSalary) => {
      // Arrange
      const req = {
        query: { minSalary },
      };
      const res = {};
      const next = function (err) {
        expect(err instanceof BadRequestError).toBeTruthy();
      };

      // Act
      convertGetAllJobsQueryParameters(req, res, next);

      // Assert
      expect.assertions(1);
    }
  );

  test.each([['a'], ['t'], ['1'], ['f'], ['0']])(
    'Throws error if hasEquity is not a boolean.',
    (hasEquity) => {
      // Arrange
      const req = {
        query: { hasEquity },
      };
      const res = {};
      const next = function (err) {
        expect(err instanceof BadRequestError).toBeTruthy();
      };

      // Act
      convertGetAllJobsQueryParameters(req, res, next);

      // Assert
      expect.assertions(1);
    }
  );
});
