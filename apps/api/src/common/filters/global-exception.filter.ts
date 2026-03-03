import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { DomainError } from '../../shared/domain/errors/domain-error';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    if (exception instanceof DomainError) {
      response.status(exception.statusCode).send({
        type: exception.code,
        title: 'Domain Error',
        status: exception.statusCode,
        detail: exception.message,
        instance: request.url,
        details: exception.details,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      response.status(status).send({
        type: 'http_exception',
        title: exception.name,
        status,
        detail: exception.message,
        instance: request.url,
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      type: 'internal_server_error',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'Unexpected error',
      instance: request.url,
    });
  }
}
