'use strict';

const request = require('supertest');

const db = require('../db');
const app = require('../app');

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token,
  jobs,
} = require('./_testCommon');

// ==================================================

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe('POST /jobs', function () {
  const url = '/jobs';
  const newJob = Object.freeze({
    title: 'new job',
    salary: 10,
    equity: 0.1,
    companyHandle: 'c1',
  });

  test('Creates a new job for admins.', async function () {
    // Act
    const resp = await request(app)
      .post(url)
      .send(newJob)
      .set('authorization', `Bearer ${u1Token}`);

    // Assert
    expect(resp.statusCode).toBe(201);
    expect(resp.body).toEqual({
      job: { ...newJob, id: expect.any(Number) },
    });
  });

  test('forbidden if not admin', async function () {
    // Act
    const resp = await request(app)
      .post(url)
      .send(newJob)
      .set('authorization', `Bearer ${u2Token}`);

    // Assert
    expect(resp.statusCode).toEqual(403);
  });

  test('bad request with missing data', async function () {
    // Arrange
    const newJob = {
      salary: 10,
      equity: 0.1,
    };

    // Act
    const resp = await request(app)
      .post(url)
      .send(newJob)
      .set('authorization', `Bearer ${u1Token}`);

    // Assert
    expect(resp.statusCode).toEqual(400);
  });

  test.each([
    [{ ...newJob, salary: 'a' }],
    [{ ...newJob, salary: -1 }],
    [{ ...newJob, equity: 'a' }],
    [{ ...newJob, equity: 1.1 }],
  ])(
    'bad request with invalid data; new job data: %o',
    async function (newJob) {
      // Act
      const resp = await request(app)
        .post(url)
        .send(newJob)
        .set('authorization', `Bearer ${u1Token}`);

      // Assert
      expect(resp.statusCode).toEqual(400);
    }
  );

  test('bad request with nonexistent company', async function () {
    // Arrange
    const invalidJob = { ...newJob, companyHandle: 'c99' };

    // Act
    const resp = await request(app)
      .post(url)
      .send(invalidJob)
      .set('authorization', `Bearer ${u1Token}`);

    // Assert
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** GET /jobs */

describe('GET /jobs', function () {
  const url = '/jobs';

  test('ok for anon', async function () {
    // Act
    const resp = await request(app).get(url);

    // Assert
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({ jobs });
  });

  test.each([
    ['/jobs?title=J1', [jobs[0]]],
    ['/jobs?title=2', [jobs[1]]],
    ['/jobs?minSalary=10', [jobs[1], jobs[2]]],
    ['/jobs?hasEquity=true', [jobs[0], jobs[1]]],
    ['/jobs?title=J&minSalary=1000&hasEquity=FALSE', [jobs[2]]],
  ])(
    'works with query parameters; test case: %s',
    async function (url, expectedJobs) {
      // Act
      const resp = await request(app).get(url);

      // Assert
      expect(resp.statusCode).toBe(200);
      expect(resp.body).toEqual({ jobs: expectedJobs });
    }
  );

  test.each([
    ['/jobs?id=1', jobs],
    ['/jobs?companyHandle=c1', jobs],
    ['/jobs?id=9&companyHandle=c1&title=j1', [jobs[0]]],
  ])(
    'does not filter other company properties; test case: %#',
    async function (url, expectedJobs) {
      // Act
      const resp = await request(app).get(url);

      // Assert
      expect(resp.statusCode).toBe(200);
      expect(resp.body).toEqual({ jobs: expectedJobs });
    }
  );

  test('fails: test next() handler', async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query('DROP TABLE jobs CASCADE');
    const resp = await request(app)
      .get(url)
      .set('authorization', `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });

  test('fails: title can not be decoded from URL', async function () {
    // Arrange
    const url = '/jobs?title=j%';

    // Act
    const resp = await request(app).get(url);

    // Assert
    expect(resp.statusCode).toBe(400);
  });

  test.each([
    ['/jobs?minSalary=a'],
    ['/jobs?minSalary=-2'],
    ['/jobs?minSalary=2147483648'],
    ['/jobs?minSalary=1.5'],
  ])(
    'fails: minSalary is not a positive integer; test case: %s',
    async function (url) {
      // Act
      const resp = await request(app).get(url);

      // Assert
      expect(resp.statusCode).toBe(400);
    }
  );

  test.each([
    ['/jobs?hasEquity=a'],
    ['/jobs?hasEquity=t'],
    ['/jobs?hasEquity=1'],
    ['/jobs?hasEquity=f'],
    ['/jobs?hasEquity=0'],
  ])('fails: hasEquity is not a boolean', async function (url) {
    // Act
    const resp = await request(app).get(url);

    // Assert
    expect(resp.statusCode).toBe(400);
  });
});

/************************************** GET /jobs/:id */

describe('GET /jobs/:id', function () {
  test('works for anon', async function () {
    // Arrange
    const url = '/jobs/1';

    // Act
    const resp = await request(app).get(url);

    // Assert
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({ job: jobs[0] });
  });

  test('not found for no such job', async function () {
    // Arrange
    const url = '/jobs/99';

    // Act
    const resp = await request(app).get(url);

    // Assert
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /jobs/:id */

describe('PATCH /jobs/:id', function () {
  const url = '/jobs/1';
  const updateData = Object.freeze({
    title: 'Updated Job',
    salary: 99,
    equity: 0.99,
  });

  test('works for admins', async function () {
    // Arrange
    const expectedJob = { ...jobs[0], ...updateData };

    // Act
    const resp = await request(app)
      .patch(url)
      .send(updateData)
      .set('authorization', `Bearer ${u1Token}`);

    // Assert
    expect(resp.body).toEqual({ job: expectedJob });
  });

  test('unauth for anon', async function () {
    // Act
    const resp = await request(app).patch(url).send(updateData);

    // Assert
    expect(resp.statusCode).toEqual(401);
  });

  test('forbidden if not admin', async function () {
    // Act
    const resp = await request(app)
      .patch(url)
      .send(updateData)
      .set('authorization', `Bearer ${u2Token}`);

    // Assert
    expect(resp.statusCode).toEqual(403);
  });

  test('not found on no such job', async function () {
    // Arrange
    const url = '/jobs/99';

    // Act
    const resp = await request(app)
      .patch(url)
      .send(updateData)
      .set('authorization', `Bearer ${u1Token}`);

    // Assert
    expect(resp.statusCode).toEqual(404);
  });

  test.each([[{ id: 9 }], [{ companyHandle: 'c3' }]])(
    'bad request on ID or company handle change attempt; data: %o',
    async function (updateData) {
      // Act
      const resp = await request(app)
        .patch(url)
        .send(updateData)
        .set('authorization', `Bearer ${u1Token}`);

      // Assert
      expect(resp.statusCode).toEqual(400);
    }
  );

  test.each([
    [{ ...updateData, title: null }],
    [{ ...updateData, salary: 'a' }],
    [{ ...updateData, salary: -1 }],
    [{ ...updateData, equity: 'a' }],
    [{ ...updateData, equity: 1.1 }],
  ])('bad request on invalid data', async function (updateData) {
    // Act
    const resp = await request(app)
      .patch(url)
      .send(updateData)
      .set('authorization', `Bearer ${u1Token}`);

    // Assert
    expect(resp.statusCode).toEqual(400);
  });

  test('bad request on no data', async function () {
    // Arrange
    const updateData = {};

    // Act
    const resp = await request(app)
      .patch(url)
      .send(updateData)
      .set('authorization', `Bearer ${u1Token}`);

    // Assert
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/:id */

describe('DELETE /jobs/:id', function () {
  const url = '/jobs/1';

  test('works for admins', async function () {
    // Act
    const resp = await request(app)
      .delete(url)
      .set('authorization', `Bearer ${u1Token}`);

    // Assert
    expect(resp.body).toEqual({ deleted: 1 });
  });

  test('unauth for anon', async function () {
    // Act
    const resp = await request(app).delete(url);

    // Assert
    expect(resp.statusCode).toEqual(401);
  });

  test('forbidden if not admin', async function () {
    // Act
    const resp = await request(app)
      .delete(url)
      .set('authorization', `Bearer ${u2Token}`);

    // Assert
    expect(resp.statusCode).toEqual(403);
  });

  test('not found for no such company', async function () {
    // Arrange
    const url = '/jobs/99';

    // Act
    const resp = await request(app)
      .delete(url)
      .set('authorization', `Bearer ${u1Token}`);

    // Assert
    expect(resp.statusCode).toEqual(404);
  });
});
