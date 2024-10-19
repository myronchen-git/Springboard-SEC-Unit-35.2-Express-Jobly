'use strict';

const {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} = require('../expressError');
const db = require('../db.js');
const User = require('./user.js');
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  users,
  jobs,
} = require('./_testCommon');

// ==================================================

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** authenticate */

describe('authenticate', function () {
  test('works', async function () {
    const user = await User.authenticate('u1', 'password1');
    expect(user).toEqual(users[0]);
  });

  test('unauth if no such user', async function () {
    try {
      await User.authenticate('nope', 'password');
      fail();
    } catch (err) {
      expect(err instanceof UnauthorizedError).toBeTruthy();
    }
  });

  test('unauth if wrong password', async function () {
    try {
      await User.authenticate('c1', 'wrong');
      fail();
    } catch (err) {
      expect(err instanceof UnauthorizedError).toBeTruthy();
    }
  });
});

/************************************** register */

describe('register', function () {
  const newUser = {
    username: 'new',
    firstName: 'Test',
    lastName: 'Tester',
    email: 'test@test.com',
    isAdmin: false,
  };

  test('works', async function () {
    let user = await User.register({
      ...newUser,
      password: 'password',
    });
    expect(user).toEqual(newUser);
    const found = await db.query("SELECT * FROM users WHERE username = 'new'");
    expect(found.rows.length).toEqual(1);
    expect(found.rows[0].is_admin).toEqual(false);
    expect(found.rows[0].password.startsWith('$2b$')).toEqual(true);
  });

  test('works: adds admin', async function () {
    let user = await User.register({
      ...newUser,
      password: 'password',
      isAdmin: true,
    });
    expect(user).toEqual({ ...newUser, isAdmin: true });
    const found = await db.query("SELECT * FROM users WHERE username = 'new'");
    expect(found.rows.length).toEqual(1);
    expect(found.rows[0].is_admin).toEqual(true);
    expect(found.rows[0].password.startsWith('$2b$')).toEqual(true);
  });

  test('bad request with dup data', async function () {
    try {
      await User.register({
        ...newUser,
        password: 'password',
      });
      await User.register({
        ...newUser,
        password: 'password',
      });
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe('findAll', function () {
  test('works', async function () {
    const results = await User.findAll();
    expect(results).toEqual(users);
  });
});

/************************************** get */

describe('get', function () {
  test('works: has jobs', async function () {
    // Arrange
    await User.applyJob('u1', 1);
    await User.applyJob('u1', 2);

    // Act
    let user = await User.get('u1');

    // Assert
    expect(user).toEqual({
      ...users[0],
      jobs: [1, 2],
    });
  });

  test('works: no jobs', async function () {
    // Act
    let user = await User.get('u1');

    // Assert
    expect(user).toEqual({
      ...users[0],
      jobs: [],
    });
  });

  test('not found if no such user', async function () {
    try {
      await User.get('nope');
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe('update', function () {
  const updateData = {
    firstName: 'NewF',
    lastName: 'NewF',
    email: 'new@email.com',
    isAdmin: true,
  };

  test('works', async function () {
    let job = await User.update('u1', updateData);
    expect(job).toEqual({
      username: 'u1',
      ...updateData,
    });
  });

  test('works: set password', async function () {
    let job = await User.update('u1', {
      password: 'new',
    });
    expect(job).toEqual(users[0]);
    const found = await db.query("SELECT * FROM users WHERE username = 'u1'");
    expect(found.rows.length).toEqual(1);
    expect(found.rows[0].password.startsWith('$2b$')).toEqual(true);
  });

  test('not found if no such user', async function () {
    try {
      await User.update('nope', {
        firstName: 'test',
      });
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test('bad request if no data', async function () {
    expect.assertions(1);
    try {
      await User.update('c1', {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe('remove', function () {
  test('works', async function () {
    await User.remove('u1');
    const res = await db.query("SELECT * FROM users WHERE username='u1'");
    expect(res.rows.length).toEqual(0);
  });

  test('not found if no such user', async function () {
    try {
      await User.remove('nope');
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** applyJob */

describe('applyJob', function () {
  test('Applies user to a job.', async function () {
    // Arrange
    const username = 'u1';
    const jobId = 1;

    // Act
    const result = await User.applyJob(username, jobId);

    // Assert
    expect(result).toEqual({ username, jobId, status: 'applied' });

    const applicationsResult = await db.query(
      `SELECT * FROM applications WHERE username = $1 AND job_id = $2`,
      [username, jobId]
    );
    expect(applicationsResult.rowCount).toBe(1);
  });

  test('not found if no such user', async function () {
    // Arrange
    const username = 'nope';
    const jobId = 1;

    // Act / Assert
    await expect(User.applyJob(username, jobId)).rejects.toThrow(NotFoundError);
  });

  test('not found if no such job', async function () {
    // Arrange
    const username = 'u1';
    const jobId = 99;

    // Act / Assert
    await expect(User.applyJob(username, jobId)).rejects.toThrow(NotFoundError);
  });
});

/************************************** matchJobs */

describe('matchJobs', function () {
  test("Gets jobs that matches a user's technologies.", async function () {
    // Arrange
    const username = 'u1';

    // Act
    const result = await User.matchJobs(username);

    // Assert
    expect(result).toEqual([
      { ...jobs[0], technologies: ['t1', 't2'] },
      { ...jobs[1], technologies: ['t1'] },
    ]);
  });

  test('Returns empty list if there are no matching jobs.', async function () {
    // Arrange
    const username = 'u2';

    // Act
    const result = await User.matchJobs(username);

    // Assert
    expect(result).toEqual([]);
  });

  test('not found if no such user', async function () {
    // Arrange
    const username = 'nope';

    // Act / Assert
    await expect(User.matchJobs(username)).rejects.toThrow(NotFoundError);
  });
});
