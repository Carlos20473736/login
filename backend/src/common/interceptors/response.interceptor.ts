import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface ApiResponse<T> {
  level: 'success' | 'info' | 'warning' | 'error';
  message: string;
  data: T;
  error: { fields: string[] } | null;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        level: 'success' as const,
        message: 'Operação realizada com sucesso',
        data: data ?? null,
        error: null,
      })),
      catchError((err) => {
        const status =
          err instanceof HttpException
            ? err.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        const response = err instanceof HttpException ? err.getResponse() : null;

        let message = 'Erro interno do servidor';
        let fields: string[] = [];

        if (typeof response === 'string') {
          message = response;
        } else if (typeof response === 'object' && response !== null) {
          const res = response as Record<string, any>;
          message = res.message
            ? Array.isArray(res.message)
              ? res.message.join(', ')
              : res.message
            : message;
          fields = Array.isArray(res.message) ? res.message : [];
        }

        const errorResponse: ApiResponse<null> = {
          level: 'error',
          message,
          data: null,
          error: { fields },
        };

        const httpContext = context.switchToHttp();
        const httpResponse = httpContext.getResponse();
        httpResponse.status(status).json(errorResponse);

        return throwError(() => err);
      }),
    );
  }
}
