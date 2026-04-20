import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';


interface jwtpayload {
  id: string ,
  role: string
}

export interface AuthRequest extends Request {
  user?: jwtpayload
}

//protect
export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  
  const token = req.headers.authorization?.split(' ')[1]; 

  if(!token) {
    return res.status(401).json({ message: 'No token ' });
  }

  try{
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwtpayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });

  }
}



export const restrictTo = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'not access' });
    }

    next();
  };
};