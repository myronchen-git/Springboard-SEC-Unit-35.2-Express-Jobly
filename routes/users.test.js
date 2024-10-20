'use strict';

const request = require('supertest');

const db = require('../db.js');
const app = require('../app');
const User = require('../models/user');

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token,
  users,
  jobs,
} = require('./_testCommon');

// ==================================================

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /users */

describe('POST /users', function () {
  const newUser = Object.freeze({
    username: 'u-new',
    firstName: 'First-new',
    lastName: 'Last-newL',
    email: 'new@email.com',
    isAdmin: null,
  });

  test('works for admins: create non-admin', async function () {
    const resp = await request(app)
      .post('/users')
      .send({
        ...newUser,
        isAdmin: false,
      })
      .set('authorization', `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      user: {
        ...newUser,
        isAdmin: false,
      },
      token: expect.any(String),
    });
  });

  test('works for admins: create admin', async function () {
    const resp = await request(app)
      .post('/users')
      .send({
        ...newUser,
        isAdmin: true,
      })
      .set('authorization', `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      user: {
        ...newUser,
        isAdmin: true,
      },
      token: expect.any(String),
    });
  });

  test('unauth for anon', async function () {
    const resp = await request(app)
      .post('/users')
      .send({
        ...newUser,
        isAdmin: true,
      });
    expect(resp.statusCode).toEqual(401);
  });

  test('forbidden if not admin', async function () {
    // Arrange
    const url = '/users';
    const body = {
      ...newUser,
      isAdmin: true,
    };

    // Act
    const resp = await request(app)
      .post(url)
      .send(body)
      .set('authorization', `Bearer ${u2Token}`);

    // Assert
    expect(resp.statusCode).toEqual(403);
  });

  test('bad request if missing data', async function () {
    const resp = await request(app)
      .post('/users')
      .send({
        username: 'u-new',
      })
      .set('authorization', `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test('bad request if invalid data', async function () {
    const resp = await request(app)
      .post('/users')
      .send({
        ...newUser,
        email: 'not-an-email',
        isAdmin: true,
      })
      .set('authorization', `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /users */

describe('GET /users', function () {
  test('works for admins', async function () {
    const resp = await request(app)
      .get('/users')
      .set('authorization', `Bearer ${u1Token}`);
    expect(resp.body).toEqual({ users });
  });

  test('unauth for anon', async function () {
    const resp = await request(app).get('/users');
    expect(resp.statusCode).toEqual(401);
  });

  test('forbidden if not admin', async function () {
    // Arrange
    const url = '/users';

    // Act
    const resp = await request(app)
      .get(url)
      .set('authorization', `Bearer ${u2Token}`);

    // Assert
    expect(resp.statusCode).toEqual(403);
  });

  test('fails: test next() handler', async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query('DROP TABLE users CASCADE');
    const resp = await request(app)
      .get('/users')
      .set('authorization', `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /users/:username */

describe('GET /users/:username', function () {
  test('works for admins, with jobs', async function () {
    // Arrange
    await User.applyJob('u1', 1);
    await User.applyJob('u1', 2);

    // Act
    const resp = await request(app)
      .get(`/users/u1`)
      .set('authorization', `Bearer ${u1Token}`);

    // Assert
    expect(resp.body).toEqual({
      user: {
        ...users[0],
        jobs: [1, 2],
      },
    });
  });

  test('works for admins, with no jobs', async function () {
    const resp = await request(app)
      .get(`/users/u1`)
      .set('authorization', `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      user: {
        ...users[0],
        jobs: [],
      },
    });
  });

  test('works for non-admin user if looking up self', async function () {
    // Arrange
    const url = '/users/u2';

    // Act
    const resp = await request(app)
      .get(url)
      .set('authorization', `Bearer ${u2Token}`);

    // Assert
    expect(resp.body).toEqual({
      user: {
        ...users[1],
        jobs: [],
      },
    });
  });

  test('unauth for anon', async function () {
    const resp = await request(app).get(`/users/u1`);
    expect(resp.statusCode).toEqual(401);
  });

  test('forbidden if not admin', async function () {
    // Arrange
    const url = '/users/u1';

    // Act
    const resp = await request(app)
      .get(url)
      .set('authorization', `Bearer ${u2Token}`);

    // Assert
    expect(resp.statusCode).toEqual(403);
  });

  test('not found if user not found', async function () {
    const resp = await request(app)
      .get(`/users/nope`)
      .set('authorization', `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /users/:username */

describe('PATCH /users/:username', () => {
  test('works for admins', async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({
        firstName: 'New',
      })
      .set('authorization', `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      user: {
        ...users[0],
        firstName: 'New',
      },
    });
  });

  test('works for non-admin user if updating self', async function () {
    // Arrange
    const url = '/users/u2';

    // Act
    const resp = await request(app)
      .patch(`/users/u2`)
      .send({
        firstName: 'New',
      })
      .set('authorization', `Bearer ${u2Token}`);

    // Assert
    expect(resp.body).toEqual({
      user: {
        ...users[1],
        firstName: 'New',
      },
    });
  });

  test('unauth for anon', async function () {
    const resp = await request(app).patch(`/users/u1`).send({
      firstName: 'New',
    });
    expect(resp.statusCode).toEqual(401);
  });

  test('forbidden if not admin', async function () {
    // Arrange
    const url = '/users/u1';

    // Act
    const resp = await request(app)
      .patch(url)
      .send({
        firstName: 'New',
      })
      .set('authorization', `Bearer ${u2Token}`);

    // Assert
    expect(resp.statusCode).toEqual(403);
  });

  test('not found if no such user', async function () {
    const resp = await request(app)
      .patch(`/users/nope`)
      .send({
        firstName: 'Nope',
      })
      .set('authorization', `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test('bad request if invalid data', async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({
        firstName: 42,
      })
      .set('authorization', `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test('works: set new password', async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({
        password: 'new-password',
      })
      .set('authorization', `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      user: users[0],
    });
    const isSuccessful = await User.authenticate('u1', 'new-password');
    expect(isSuccessful).toBeTruthy();
  });
});

/************************************** DELETE /users/:username */

describe('DELETE /users/:username', function () {
  test('works for admins', async function () {
    const resp = await request(app)
      .delete(`/users/u1`)
      .set('authorization', `Bearer ${u1Token}`);
    expect(resp.body).toEqual({ deleted: 'u1' });
  });

  test('works for non-admin user if deleting self', async function () {
    // Arrange
    const url = '/users/u2';

    // Act
    const resp = await request(app)
      .delete(`/users/u2`)
      .set('authorization', `Bearer ${u2Token}`);

    // Assert
    expect(resp.body).toEqual({ deleted: 'u2' });
  });

  test('unauth for anon', async function () {
    const resp = await request(app).delete(`/users/u1`);
    expect(resp.statusCode).toEqual(401);
  });

  test('forbidden if not admin', async function () {
    // Arrange
    const url = '/users/u1';

    // Act
    const resp = await request(app)
      .delete(url)
      .set('authorization', `Bearer ${u2Token}`);

    // Assert
    expect(resp.statusCode).toEqual(403);
  });

  test('not found if user missing', async function () {
    const resp = await request(app)
      .delete(`/users/nope`)
      .set('authorization', `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** POST /:username/jobs/:id */

describe('POST /:username/jobs/:id', function () {
  test('works for admins', async function () {
    // Arrange
    const url = '/users/u2/jobs/1';

    // Act
    const resp = await request(app)
      .post(url)
      .set('authorization', `Bearer ${u1Token}`);

    // Assert
    expect(resp.statusCode).toBe(201);
    expect(resp.body).toEqual({ applied: 1 });
  });

  test('works for non-admin specified user', async function () {
    // Arrange
    const url = '/users/u2/jobs/1';

    // Act
    const resp = await request(app)
      .post(url)
      .set('authorization', `Bearer ${u2Token}`);

    // Assert
    expect(resp.statusCode).toBe(201);
    expect(resp.body).toEqual({ applied: 1 });
  });

  test('unauth for anon', async function () {
    // Arrange
    const url = '/users/u1/jobs/1';

    // Act
    const resp = await request(app).post(url);

    // Assert
    expect(resp.statusCode).toEqual(401);
  });

  test('forbidden if not admin or specified user', async function () {
    // Arrange
    const url = '/users/u1/jobs/1';

    // Act
    const resp = await request(app)
      .post(url)
      .set('authorization', `Bearer ${u2Token}`);

    // Assert
    expect(resp.statusCode).toEqual(403);
  });

  test('not found if no such user', async function () {
    // Arrange
    const url = '/users/nope/jobs/1';

    // Act
    const resp = await request(app)
      .post(url)
      .set('authorization', `Bearer ${u1Token}`);

    // Assert
    expect(resp.statusCode).toEqual(404);
  });

  test('not found if no such job', async function () {
    // Arrange
    const url = '/users/u1/jobs/99';

    // Act
    const resp = await request(app)
      .post(url)
      .set('authorization', `Bearer ${u1Token}`);

    // Assert
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** GET /:username/matchingJobs */

describe('GET /:username/matchingJobs', function () {
  test('works for admins', async function () {
    // Arrange
    const url = '/users/u2/matchingJobs';

    // Act
    const resp = await request(app)
      .get(url)
      .set('authorization', `Bearer ${u1Token}`);

    // Assert
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      jobs: [
        { ...jobs[0], technologies: ['t1'] },
        { ...jobs[1], technologies: ['t1'] },
      ],
    });
  });

  test('works for non-admin specified user', async function () {
    // Arrange
    const url = '/users/u2/matchingJobs';

    // Act
    const resp = await request(app)
      .get(url)
      .set('authorization', `Bearer ${u2Token}`);

    // Assert
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      jobs: [
        { ...jobs[0], technologies: ['t1'] },
        { ...jobs[1], technologies: ['t1'] },
      ],
    });
  });

  test('Returns empty list if there are no matching jobs.', async function () {
    // Arrange
    const url = '/users/u3/matchingJobs';

    // Act
    const resp = await request(app)
      .get(url)
      .set('authorization', `Bearer ${u1Token}`);

    // Assert
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({ jobs: [] });
  });

  test('unauth for anon', async function () {
    // Arrange
    const url = '/users/u1/matchingJobs';

    // Act
    const resp = await request(app).get(url);

    // Assert
    expect(resp.statusCode).toEqual(401);
  });

  test('forbidden if not admin or specified user', async function () {
    // Arrange
    const url = '/users/u1/matchingJobs';

    // Act
    const resp = await request(app)
      .get(url)
      .set('authorization', `Bearer ${u2Token}`);

    // Assert
    expect(resp.statusCode).toEqual(403);
  });

  test('not found if no such user', async function () {
    // Arrange
    const url = '/users/nope/matchingJobs';

    // Act
    const resp = await request(app)
      .get(url)
      .set('authorization', `Bearer ${u1Token}`);

    // Assert
    expect(resp.statusCode).toEqual(404);
  });
});
