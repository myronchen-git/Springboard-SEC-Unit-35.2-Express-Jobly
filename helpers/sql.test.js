'use strict';

const {
  sqlForPartialUpdate,
  sqlWhereClauseForGetCompanies,
  sqlWhereClauseForGetJobs,
} = require('./sql');
const { BadRequestError } = require('../expressError');

// ==================================================

/************************************** sqlForPartialUpdate */

describe('sqlForPartialUpdate', () => {
  test('Creates SQL String and outputs associated values.', () => {
    // Arrange
    const dataToUpdate = {
      firstName: 'First',
      lastName: 'Last',
      password: '1234',
      email: 'email@email.com',
      isAdmin: true,
    };
    const jsToSql = {
      firstName: 'first_name',
      lastName: 'last_name',
      isAdmin: 'is_admin',
    };

    // Act
    const result = sqlForPartialUpdate(dataToUpdate, jsToSql);

    // Assert
    expect(result).toEqual({
      setCols:
        '"first_name"=$1, "last_name"=$2, "password"=$3, "email"=$4, "is_admin"=$5',
      values: ['First', 'Last', '1234', 'email@email.com', true],
    });
  });

  test(
    'Creates SQL String and outputs associated values when given updates ' +
      'for some properties.',
    () => {
      // Arrange
      const dataToUpdate = {
        lastName: 'Last',
      };
      const jsToSql = {
        firstName: 'first_name',
        lastName: 'last_name',
        isAdmin: 'is_admin',
      };

      // Act
      const result = sqlForPartialUpdate(dataToUpdate, jsToSql);

      // Assert
      expect(result).toEqual({
        setCols: '"last_name"=$1',
        values: ['Last'],
      });
    }
  );

  test('Throws error when no data is passed.', () => {
    // Arrange
    const dataToUpdate = {};
    const jsToSql = {
      firstName: 'first_name',
      lastName: 'last_name',
      isAdmin: 'is_admin',
    };

    // Act / Assert
    expect(() => sqlForPartialUpdate(dataToUpdate, jsToSql)).toThrow(
      BadRequestError
    );
  });
});

/************************************** sqlWhereClauseForGetCompanies */

describe('sqlWhereClauseForGetCompanies', () => {
  test.each([
    [{}, { whereClause: '', values: [] }],
    [
      { nameLike: 'net' },
      { whereClause: ' WHERE name ILIKE $1', values: ['%net%'] },
    ],
    [
      { nameLike: 'Study Networks' },
      { whereClause: ' WHERE name ILIKE $1', values: ['%Study Networks%'] },
    ],
    [
      { minEmployees: 2 },
      { whereClause: ' WHERE num_employees >= $1', values: [2] },
    ],
    [
      { maxEmployees: 10 },
      { whereClause: ' WHERE num_employees <= $1', values: [10] },
    ],
    [
      { nameLike: 'net', minEmployees: 2, maxEmployees: 10 },
      {
        whereClause:
          ' WHERE name ILIKE $1 AND num_employees >= $2 AND num_employees <= $3',
        values: ['%net%', 2, 10],
      },
    ],
  ])(
    'Outputs the correct SQL String to use in the WHERE clause for test case %#.',
    (filters, expected) => {
      // Act
      const result = sqlWhereClauseForGetCompanies(filters);

      // Assert
      expect(result).toEqual(expected);
    }
  );

  test('Does not filter other company properties.', () => {
    // Arrange
    const filters = { handle: 'abc' };

    // Act
    const result = sqlWhereClauseForGetCompanies(filters);

    // Assert
    expect(result).toEqual({ whereClause: '', values: [] });
  });

  test('If minEmployees > maxEmployees, it should throw an error.', () => {
    // Arrange
    const filters = { minEmployees: 20, maxEmployees: 10 };

    // Act / Assert
    expect(() => sqlWhereClauseForGetCompanies(filters)).toThrow(
      BadRequestError
    );
  });
});

/************************************** sqlWhereClauseForGetJobs */

describe('sqlWhereClauseForGetJobs', () => {
  test.each([
    [{}, { whereClause: '', values: [] }],
    [
      { title: 'dev' },
      { whereClause: ' WHERE title ILIKE $1', values: ['%dev%'] },
    ],
    [{ minSalary: 10 }, { whereClause: ' WHERE salary >= $1', values: [10] }],
    [{ hasEquity: true }, { whereClause: ' WHERE equity <> $1', values: [0] }],
    [
      { title: 'dev', minSalary: 10, hasEquity: false },
      {
        whereClause: ' WHERE title ILIKE $1 AND salary >= $2',
        values: ['%dev%', 10],
      },
    ],
  ])(
    'Outputs the correct SQL String to use in the WHERE clause for test case %#.',
    (filters, expected) => {
      // Act
      const result = sqlWhereClauseForGetJobs(filters);

      // Assert
      expect(result).toEqual(expected);
    }
  );

  test.each([
    [{ id: 9 }, { whereClause: '', values: [] }],
    [{ companyHandle: 'c1' }, { whereClause: '', values: [] }],
    [
      { id: 9, title: 'dev', companyHandle: 'c1' },
      { whereClause: ' WHERE title ILIKE $1', values: ['%dev%'] },
    ],
  ])(
    'Does not filter other company properties.  Test case: %#.',
    (filters, expected) => {
      // Act
      const result = sqlWhereClauseForGetJobs(filters);

      // Assert
      expect(result).toEqual(expected);
    }
  );
});
