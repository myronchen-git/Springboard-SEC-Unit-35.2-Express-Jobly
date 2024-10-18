'use strict';

const db = require('../db.js');
const { BadRequestError, NotFoundError } = require('../expressError');
const Job = require('./job.js');
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

// from _testCommon.js
const jobs = Object.freeze([
  Object.freeze({
    id: expect.any(Number),
    title: 'j1',
    salary: 0,
    equity: 1.0,
    companyHandle: 'c1',
  }),
  Object.freeze({
    id: expect.any(Number),
    title: 'j2',
    salary: 100,
    equity: 0.5,
    companyHandle: 'c1',
  }),
  Object.freeze({
    id: expect.any(Number),
    title: 'j3',
    salary: 1000,
    equity: 0.0,
    companyHandle: 'c2',
  }),
]);

/************************************** create */

describe('create', function () {
  const newJob = Object.freeze({
    title: 'New Job',
    salary: 0,
    equity: 1.0,
    companyHandle: 'c1',
  });

  test('Successfully creates a new job.', async function () {
    // Arrange
    const expectedJob = { ...newJob, id: expect.any(Number) };

    // Act
    const result = await Job.create(newJob);

    // Assert
    expect(result).toEqual(expectedJob);

    const job = await Job.get(result.id);
    expect(job).toEqual(expectedJob);
  });

  test('bad request with dupe', async function () {
    // Arrange
    await Job.create(newJob);

    // Act / Assert
    await expect(Job.create(newJob)).rejects.toThrow(BadRequestError);
  });

  test('bad request with nonexistent company', async function () {
    // Arrange
    const invalidJob = { ...newJob, companyHandle: 'c99' };

    // Act / Assert
    await expect(Job.create(invalidJob)).rejects.toThrow(NotFoundError);
  });
});

/************************************** findAll */

describe('findAll', function () {
  test('works: no filter', async function () {
    // Act
    const result = await Job.findAll({});

    // Assert
    expect(result).toEqual(jobs);
  });

  test.each([
    [{ title: '2' }, [jobs[1]]],
    [{ title: 'J' }, jobs],
    [{ minSalary: 10 }, [jobs[1], jobs[2]]],
    [{ hasEquity: true }, [jobs[0], jobs[1]]],
  ])('works: one filter, case %#', async (filters, expected) => {
    // Act
    const result = await Job.findAll(filters);

    // Assert
    expect(result).toEqual(expected);
  });

  test('works: multiple filters', async () => {
    // Arrange
    const filters = { title: 'J', minSalary: 1000, hasEquity: false };

    // Act
    const result = await Job.findAll(filters);

    // Assert
    expect(result).toEqual([jobs[2]]);
  });
});

/************************************** get */

describe('get', function () {
  test('gets a specified job', async function () {
    // Arrange
    const id = 1;

    // Act
    const result = await Job.get(id);

    // Assert
    expect(result).toEqual(jobs[0]);
  });

  test('not found if job does not exist', async function () {
    // Arrange
    const id = 999;

    // Act / Assert
    await expect(Job.get(id)).rejects.toThrow(NotFoundError);
  });
});

/************************************** update */

describe('update', function () {
  const updateData = Object.freeze({
    title: 'Updated Job',
    salary: 99,
    equity: 0.99,
  });

  const id = 1;

  test('updates a specified job', async function () {
    // Arrange
    const expectedJob = { ...jobs[0], ...updateData };

    // Act
    const result = await Job.update(id, updateData);

    // Assert
    expect(result).toEqual(expectedJob);

    const job = await Job.get(id);
    expect(job).toEqual(expectedJob);
  });

  test('works: null fields', async function () {
    // Arrange
    const updateDataSetNulls = {
      title: 'Updated Job',
      salary: null,
      equity: null,
    };
    const expectedJob = { ...jobs[0], ...updateDataSetNulls };

    // Act
    const result = await Job.update(id, updateDataSetNulls);

    // Assert
    expect(result).toEqual(expectedJob);

    const job = await Job.get(id);
    expect(job).toEqual(expectedJob);
  });

  test('works: does not update id or company handle', async function () {
    // Arrange
    const updateData = {
      id: 9,
      title: 'Updated Job',
      companyHandle: 'c2',
    };
    const expectedJob = { ...jobs[0], title: updateData.title };

    // Act
    const result = await Job.update(id, updateData);

    // Assert
    expect(result).toEqual(expectedJob);

    const job = await Job.get(id);
    expect(job).toEqual(expectedJob);
  });

  test('not found if job does not exist', async function () {
    // Arrange
    const id = 999;

    // Act / Assert
    await expect(Job.update(id, updateData)).rejects.toThrow(NotFoundError);
  });

  test('bad request with no data', async function () {
    // Arrange
    const updateData = {};

    // Act / Assert
    await expect(Job.update(id, updateData)).rejects.toThrow(BadRequestError);
  });
});

/************************************** remove */

describe('remove', function () {
  test('deletes a job', async function () {
    // Arrange
    const id = 1;

    // Act
    await Job.remove(id);

    // Assert
    await expect(Job.get(id)).rejects.toThrow(NotFoundError);
  });

  test('not found if job does not exist', async function () {
    // Arrange
    const id = 999;

    // Act / Assert
    await expect(Job.remove(id)).rejects.toThrow(NotFoundError);
  });
});
