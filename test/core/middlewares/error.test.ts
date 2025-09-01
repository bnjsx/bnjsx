jest.mock('../../../src/helpers/Logger');

import { Logger } from '../../../src/helpers/Logger';
import { error, log } from '../../../src/core/middlewares/error';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  MaintenanceError,
} from '../../../src/errors';
import { resolve } from 'path';

const options: any = {
  mode: 'web',
};

jest.mock('../../../src/config', () => ({
  config: () => {
    return {
      loadSync: () => options,
      resolveSync: () => __dirname,
    };
  },
}));

describe('error middleware', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      path: '/',
    };

    res = {
      status: jest.fn().mockReturnThis(),
      render: jest.fn(),
      json: jest.fn(),
    };
  });

  describe('in web mode', () => {
    it('renders 400 page for BadRequestError', async () => {
      await error(req, res, new BadRequestError());
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith('errors.400', {
        err: expect.any(Object),
      });
    });

    it('renders 403 page for ForbiddenError', async () => {
      await error(req, res, new ForbiddenError());
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith('errors.403', {
        err: expect.any(Object),
      });
    });

    it('renders 404 page for NotFoundError', async () => {
      await error(req, res, new NotFoundError());
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith('errors.404', {
        err: expect.any(Object),
      });
    });

    it('renders 503 page for MaintenanceError', async () => {
      await error(req, res, new MaintenanceError());
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.render).toHaveBeenCalledWith('errors.503', {
        err: expect.any(Object),
      });
    });

    it('renders 500 page for generic error', async () => {
      await error(req, res, new Error('Unknown'));
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith('errors.500', {
        err: expect.any(Object),
      });
    });
  });

  describe('in api mode', () => {
    beforeEach(() => {
      // `mode` should be ignored when path starts with /api
      req.path = '/api/something'; // API path
    });

    it('returns 400 json for BadRequestError', async () => {
      await error(req, res, new BadRequestError());
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { name: 'BadRequestError', message: 'Bad Request.' },
      });
    });

    it('returns 403 json for ForbiddenError', async () => {
      await error(req, res, new ForbiddenError());
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { name: 'ForbiddenError', message: 'Access Forbidden.' },
      });
    });

    it('returns 404 json for NotFoundError', async () => {
      await error(req, res, new NotFoundError());
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          name: 'NotFoundError',
          message: 'The requested resource could not be found.',
        },
      });
    });

    it('returns 503 json for MaintenanceError', async () => {
      await error(req, res, new MaintenanceError());
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          name: 'MaintenanceError',
          message: 'The application is under maintenance.',
        },
      });
    });

    it('returns 500 json for generic error', async () => {
      await error(req, res, new Error('Something broke'));
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          name: 'ServerError',
          message: 'Ops! Something went wrong.',
        },
      });
    });
  });
});

describe('log middleware', () => {
  const req: any = {};
  const res: any = {};
  const path = resolve(__dirname, '.log');
  let logger;

  beforeEach(() => {
    logger = jest.spyOn(Logger.prototype, 'log');
  });

  it('logs the given error object', async () => {
    const err = new Error('Test error');
    await log(req, res, err);

    expect(Logger).toHaveBeenCalledWith(path);
    expect(logger).toHaveBeenCalledWith(err);
  });

  it('logs the default message if no error is provided', async () => {
    await log(req, res);

    expect(Logger).toHaveBeenCalledWith(path);
    expect(logger).toHaveBeenCalledWith('There was an issue');
  });
});
