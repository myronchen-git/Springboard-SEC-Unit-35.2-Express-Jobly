'use strict';

const db = require('../db.js');
const { BadRequestError, NotFoundError } = require('../expressError');
const Company = require('./company.js');
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require('./_testCommon');

// ==================================================

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe('create', function () {
  const newCompany = {
    handle: 'new',
    name: 'New',
    description: 'New Description',
    numEmployees: 1,
    logoUrl: 'http://new.img',
  };

  test('works', async function () {
    let company = await Company.create(newCompany);
    expect(company).toEqual(newCompany);

    const result = await db.query(
      `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'new'`
    );
    expect(result.rows).toEqual([
      {
        handle: 'new',
        name: 'New',
        description: 'New Description',
        num_employees: 1,
        logo_url: 'http://new.img',
      },
    ]);
  });

  test('bad request with dupe', async function () {
    try {
      await Company.create(newCompany);
      await Company.create(newCompany);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe('findAll', function () {
  test('works: no filter', async function () {
    let companies = await Company.findAll({});
    expect(companies).toEqual([
      {
        handle: 'c1',
        name: 'C1',
        description: 'Desc1',
        numEmployees: 1,
        logoUrl: 'http://c1.img',
      },
      {
        handle: 'c2',
        name: 'C2',
        description: 'Desc2',
        numEmployees: 2,
        logoUrl: 'http://c2.img',
      },
      {
        handle: 'c3',
        name: 'C3',
        description: 'Desc3',
        numEmployees: 3,
        logoUrl: 'http://c3.img',
      },
    ]);
  });

  test.each([
    [
      { nameLike: '2' },
      [
        {
          handle: 'c2',
          name: 'C2',
          description: 'Desc2',
          numEmployees: 2,
          logoUrl: 'http://c2.img',
        },
      ],
    ],
    [
      { nameLike: 'c2' },
      [
        {
          handle: 'c2',
          name: 'C2',
          description: 'Desc2',
          numEmployees: 2,
          logoUrl: 'http://c2.img',
        },
      ],
    ],
    [
      { minEmployees: 2 },
      [
        {
          handle: 'c2',
          name: 'C2',
          description: 'Desc2',
          numEmployees: 2,
          logoUrl: 'http://c2.img',
        },
        {
          handle: 'c3',
          name: 'C3',
          description: 'Desc3',
          numEmployees: 3,
          logoUrl: 'http://c3.img',
        },
      ],
    ],
    [
      { maxEmployees: 1 },
      [
        {
          handle: 'c1',
          name: 'C1',
          description: 'Desc1',
          numEmployees: 1,
          logoUrl: 'http://c1.img',
        },
      ],
    ],
  ])('works: one filter, case %#', async function (filters, expected) {
    // Act
    const companies = await Company.findAll(filters);

    // Assert
    expect(companies).toEqual(expected);
  });

  test('works: multiple filters', async function () {
    // Arrange
    const filters = { nameLike: 'c', minEmployees: 3, maxEmployees: 10 };

    // Act
    const companies = await Company.findAll(filters);

    // Assert
    expect(companies).toEqual([
      {
        handle: 'c3',
        name: 'C3',
        description: 'Desc3',
        numEmployees: 3,
        logoUrl: 'http://c3.img',
      },
    ]);
  });

  test('bad request when min employees > max', async function () {
    // Arrange
    const filters = { minEmployees: 9, maxEmployees: 1 };

    // Act / Assert
    await expect(Company.findAll(filters)).rejects.toThrow(BadRequestError);
  });
});

/************************************** get */

describe('get', function () {
  test('works: has jobs', async function () {
    let company = await Company.get('c1');
    expect(company).toEqual({
      handle: 'c1',
      name: 'C1',
      description: 'Desc1',
      numEmployees: 1,
      logoUrl: 'http://c1.img',
      jobs: [
        {
          id: expect.any(Number),
          title: 'j1',
          salary: 0,
          equity: 1.0,
        },
        {
          id: expect.any(Number),
          title: 'j2',
          salary: 100,
          equity: 0.5,
        },
      ],
    });
  });

  test('works: no jobs', async function () {
    // Act
    const result = await Company.get('c3');

    // Assert
    expect(result).toEqual({
      handle: 'c3',
      name: 'C3',
      description: 'Desc3',
      numEmployees: 3,
      logoUrl: 'http://c3.img',
      jobs: [],
    });
  });

  test('not found if no such company', async function () {
    try {
      await Company.get('nope');
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe('update', function () {
  const updateData = {
    name: 'New',
    description: 'New Description',
    numEmployees: 10,
    logoUrl: 'http://new.img',
  };

  test('works', async function () {
    let company = await Company.update('c1', updateData);
    expect(company).toEqual({
      handle: 'c1',
      ...updateData,
    });

    const result = await db.query(
      `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'c1'`
    );
    expect(result.rows).toEqual([
      {
        handle: 'c1',
        name: 'New',
        description: 'New Description',
        num_employees: 10,
        logo_url: 'http://new.img',
      },
    ]);
  });

  test('works: null fields', async function () {
    const updateDataSetNulls = {
      name: 'New',
      description: 'New Description',
      numEmployees: null,
      logoUrl: null,
    };

    let company = await Company.update('c1', updateDataSetNulls);
    expect(company).toEqual({
      handle: 'c1',
      ...updateDataSetNulls,
    });

    const result = await db.query(
      `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'c1'`
    );
    expect(result.rows).toEqual([
      {
        handle: 'c1',
        name: 'New',
        description: 'New Description',
        num_employees: null,
        logo_url: null,
      },
    ]);
  });

  test('not found if no such company', async function () {
    try {
      await Company.update('nope', updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test('bad request with no data', async function () {
    try {
      await Company.update('c1', {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe('remove', function () {
  test('works', async function () {
    await Company.remove('c1');
    const res = await db.query(
      "SELECT handle FROM companies WHERE handle='c1'"
    );
    expect(res.rows.length).toEqual(0);
  });

  test('not found if no such company', async function () {
    try {
      await Company.remove('nope');
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
