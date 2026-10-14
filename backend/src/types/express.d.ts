import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      email: string;
      role: Role;
    }

    interface Request {
      user?: UserPayload;
      rawBody?: Buffer;
    }
  }
}

export {};
