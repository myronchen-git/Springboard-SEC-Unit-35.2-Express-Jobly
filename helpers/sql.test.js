'use strict';

const { sqlForPartialUpdate } = require('./sql');
const { BadRequestError } = require('../expressError');

// ==================================================

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
