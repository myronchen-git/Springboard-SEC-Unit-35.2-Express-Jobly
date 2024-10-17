'use strict';

const { convertJobId } = require('./jobs');
const { BadRequestError } = require('../expressError');

// ==================================================

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
