import { Request } from 'express';

export interface Auth {
  id: number;
  name: string;
  createdAt: string;
}
export interface UserInput {
  name: string;
  email: string;
  password: string;
  salt: string;
  phone?: string; // Optional field
  is_verified: boolean;
}

export interface loginuserInput {
  password: string;
  email: string;
  refreshToken?: string;
}

export interface Requestuser extends Request {
  user?: any;
}
