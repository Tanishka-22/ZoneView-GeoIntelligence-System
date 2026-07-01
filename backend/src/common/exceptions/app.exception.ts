import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * ZoneView standard application exception.
 *
 * Use this instead of throwing raw HttpException throughout the app.
 * It enforces the standard error response shape defined in the API design:
 * { success: false, message: string, error: { code: string } }
 */
export class AppException extends HttpException {
  constructor(
    message: string,
    errorCode: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        success: false,
        message,
        error: { code: errorCode },
      },
      httpStatus,
    );
  }
}