import type {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from 'express';
import express from 'express';
import cookieParser from 'cookie-parser';

export type AuthUser = {
  userId?: string;
  email?: string;
  name?: string;
  role?: string;
  teamId?: string;
};

export type RouteContext = {
  req: Request;
  res: Response;
  user: AuthUser | null;
  params: Record<string, string>;
  query: Record<string, any>;
  body: any;
};

type RouteHandler = (
  context: RouteContext
) => Promise<any> | any;

type RouteMiddleware =
  | RequestHandler
  | RouteHandler;

function createContext(
  req: Request,
  res: Response
): RouteContext {
  return {
    req,
    res,
    user: (req as any).user || null,
    params: req.params || {},
    query: req.query || {},
    body: req.body || {},
  };
}

export function json(
  data: any,
  status = 200
) {
  return {
    __type: 'json',
    data,
    status,
  };
}

export function error(
  message: string,
  status = 400
) {
  return {
    __type: 'error',
    message,
    status,
  };
}

function routePatternToExpress(pattern: string) {
  const [method, ...pathParts] = pattern.split(' ');
  const path = pathParts.join(' ');

  return {
    method: method.toLowerCase(),
    path,
  };
}

function executeResult(
  res: Response,
  result: any
) {
  if (result === undefined) {
    return;
  }

  if (result?.__type === 'error') {
    res.status(result.status || 400).json({
      error: result.message,
    });
    return;
  }

  if (result?.__type === 'json') {
    res
      .status(result.status || 200)
      .json(result.data);
    return;
  }

  res.json(result);
}

async function executeHandler(
  handler: RouteMiddleware,
  req: Request,
  res: Response
): Promise<any> {
  const context = createContext(req, res);

  /*
   * All Gamersify middleware and route handlers use
   * the RouteContext signature.
   */
  return handler(context);
}

export function router(
  routes: Record<string, RouteMiddleware[]>
) {
  const app = express();

  app.use(cookieParser());

  app.use(
    express.json({
      limit: '10mb',
    })
  );

  app.use(
    express.urlencoded({
      extended: true,
    })
  );

  for (const [route, handlers] of Object.entries(routes)) {
    const { method, path } =
      routePatternToExpress(route);

    const routeHandler: RequestHandler =
      async (req, res, next) => {
        try {
          for (const handler of handlers) {
            const result =
              await executeHandler(
                handler,
                req,
                res
              );

            /*
             * A middleware returning an error/json
             * response ends the request.
             */
            if (result !== undefined) {
              executeResult(res, result);
              return;
            }

            /*
             * If a middleware has already sent a
             * response, stop processing the chain.
             */
            if (res.headersSent) {
              return;
            }
          }

          /*
           * Every successful route should eventually
           * produce a response.
           */
          if (!res.headersSent) {
            res.status(204).end();
          }
        } catch (err) {
          next(err);
        }
      };

    switch (method) {
      case 'get':
        app.get(path, routeHandler);
        break;

      case 'post':
        app.post(path, routeHandler);
        break;

      case 'put':
        app.put(path, routeHandler);
        break;

      case 'patch':
        app.patch(path, routeHandler);
        break;

      case 'delete':
        app.delete(path, routeHandler);
        break;

      default:
        throw new Error(
          `Unsupported HTTP method: ${method}`
        );
    }
  }

  app.use(
    (
      err: any,
      _req: Request,
      res: Response,
      _next: NextFunction
    ) => {
      console.error('[API ERROR]', err);

      if (res.headersSent) {
        return;
      }

      res.status(err?.status || 500).json({
        error:
          err?.message ||
          'Internal server error',
      });
    }
  );

  return app;
}
