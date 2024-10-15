'use strict';

const { BadRequestError } = require('../expressError');

// ==================================================

/**
 * Creates SQL SET parameters and values by using request body data and a
 * key-value map of request body key names to database table names.  This helps
 * to conditionally create the SQL String in accordance to what properties were
 * passed into the update user route.
 *
 * @param {Object} dataToUpdate Data retrieved from HTTP request body.
 * @param {Object} jsToSql Object containing request body key names as keys and
 *   their database table names as values.
 * @returns {String, Array} The SQL String to use in a SET clause for
 *   updating a SQL record.  An Array with values to use in conjunction with
 *   the String.
 * @throws BadRequestError If no data was passed.
 */
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError('No data');

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map(
    (colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`
  );

  return {
    setCols: cols.join(', '),
    values: Object.values(dataToUpdate),
  };
}

// ==================================================

module.exports = { sqlForPartialUpdate };
