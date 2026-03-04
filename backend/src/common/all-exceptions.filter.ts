import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { GqlArgumentsHost } from '@nestjs/graphql';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const contextType = host.getType<'http' | 'graphql' | string>();

    // Normalize exception
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const isClientError = status >= 400 && status < 500;

    const rawMessage = isHttpException
      ? (exception.getResponse() as any)?.message ?? (exception as any).message
      : 'Internal server error';

    // For 4xx, keep message (validation, auth, etc.)
    // For 5xx or unknown errors, always return a generic message
    const safeMessage = isClientError ? rawMessage : 'Internal server error';

    // Log full details on the server
    if (contextType === 'http') {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();
      const request = ctx.getRequest<Request & { url?: string; method?: string }>();

      this.logger.error(
        `Error handling ${request.method} ${request.url}: ${
          (exception as Error).message
        }`,
        (exception as Error).stack,
      );

      if (response) {
        response.status(status).json({
          statusCode: status,
          path: request.url,
          message: safeMessage,
        });
      }
      return;
    }

    if (contextType === 'graphql') {
      const gqlHost = GqlArgumentsHost.create(host);
      const ctx = gqlHost.getContext<{ req?: { url?: string; method?: string } }>();
      const req = ctx?.req;

      this.logger.error(
        `GraphQL error on ${req?.method ?? 'GRAPHQL'} ${req?.url ?? ''}: ${
          (exception as Error).message
        }`,
        (exception as Error).stack,
      );

      // Re‑throw a sanitized HttpException so GraphQL only sees safe messages
      throw new HttpException(safeMessage, status);
    }

    // Fallback for other transports (just log and rethrow a generic error)
    this.logger.error(
      `Unhandled error in context ${contextType}: ${(exception as Error).message}`,
      (exception as Error).stack,
    );
    throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

