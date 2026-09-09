import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('[CO-Cocina Error]:', err?.message || err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Ocurrió un error interno en el servidor';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  res.status(statusCode).json({
    error: {
      code,
      message,
    },
  });
}
