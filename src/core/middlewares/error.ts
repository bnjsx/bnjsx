import { resolve } from 'path';
import { config } from '../../config';
import { Request } from '../modules/Request';
import { Response } from '../modules/Response';
import { Logger } from '../../helpers';

import {
  BadRequestError,
  ForbiddenError,
  MaintenanceError,
  NotFoundError,
} from '../../errors';

export async function error(req: Request, res: Response, err?: Error) {
  const mode = req.path.startsWith('/api') ? 'api' : config().loadSync().mode;

  if (mode === 'web') {
    if (err instanceof BadRequestError) {
      return res.status(400).render('errors.400');
    }

    if (err instanceof ForbiddenError) {
      return res.status(403).render('errors.403');
    }

    if (err instanceof NotFoundError) {
      return res.status(404).render('errors.404');
    }

    if (err instanceof MaintenanceError) {
      return res.status(503).render('errors.503');
    }

    return res.status(500).render('errors.500');
  }

  if (err instanceof BadRequestError) {
    return res.status(400).json({
      success: false,
      error: { name: 'BadRequestError', message: 'Bad Request.' },
    });
  }

  if (err instanceof ForbiddenError) {
    return res.status(403).json({
      success: false,
      error: { name: 'ForbiddenError', message: 'Access Forbidden.' },
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: {
        name: 'NotFoundError',
        message: 'The requested resource could not be found.',
      },
    });
  }

  if (err instanceof MaintenanceError) {
    return res.status(503).json({
      success: false,
      error: {
        name: 'MaintenanceError',
        message: 'The application is under maintenance.',
      },
    });
  }

  return res.status(500).json({
    success: false,
    error: { name: 'ServerError', message: 'Ops! Something went wrong.' },
  });
}

export async function log(req: Request, res: Response, err?: Error) {
  const path = resolve(config().resolveSync(), '.log');
  return new Logger(path).log(err || 'There was an issue');
}
