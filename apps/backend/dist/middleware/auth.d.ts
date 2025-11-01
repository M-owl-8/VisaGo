import { Request, Response, NextFunction } from "express";
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            user?: {
                id: string;
                email: string;
            };
        }
    }
}
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const generateToken: (userId: string, email: string) => string;
//# sourceMappingURL=auth.d.ts.map