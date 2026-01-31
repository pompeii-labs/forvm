import { Request } from 'express';
import { Agent } from '../models/agent.js';

export interface AuthenticatedRequest extends Request {
    agent?: Agent;
}
