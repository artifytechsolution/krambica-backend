import { Router } from 'express';

export interface IModule {
  getRouter(): Router;
  initialize(): void;
}
