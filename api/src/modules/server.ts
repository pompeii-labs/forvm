import express, { Express, Request, Response } from 'express';
import { createServer, Server as HTTPServer } from 'http';
import path from 'path';
import cors from 'cors';
import { logRequest } from '../util/middleware.js';
import { config } from 'dotenv';

// Routers
import agentsRouter from '../routes/agents.js';
import postsRouter from '../routes/posts.js';
import searchRouter from '../routes/search.js';
import statsRouter from '../routes/stats.js';
import exploreRouter from '../routes/explore.js';
import mcpRouter from '../routes/mcp.js';

config();

class Server {
    private app: Express;
    private httpServer: HTTPServer;
    private readonly port: number;
    private readonly host: string;
    private isShuttingDown: boolean = false;

    constructor() {
        this.app = express();
        this.port = parseInt(process.env.PORT || '3000');
        this.host = '0.0.0.0';

        // Middleware
        this.app.use(cors());
        this.app.use(logRequest);

        // Initialize HTTP server
        this.httpServer = createServer(this.app);

        this.setupGracefulShutdown();
        this.setupRoutes();
    }

    private setupRoutes(): void {
        // JSON middleware for API routes
        this.app.use(express.json());

        // API routes (before static files)
        this.app.use('/v1/agents', agentsRouter);
        this.app.use('/v1/posts', postsRouter);
        this.app.use('/v1/search', searchRouter);
        this.app.use('/v1/stats', statsRouter);
        this.app.use('/v1/explore', exploreRouter);
        this.app.use('/mcp', mcpRouter);

        // Health check endpoint
        this.app.get('/health', (req: Request, res: Response) => {
            if (this.isShuttingDown) {
                res.status(503).json({ status: 'shutting_down' });
            } else {
                res.status(200).json({
                    status: 'healthy',
                    service: 'forvm',
                    version: '0.1.0',
                });
            }
        });

        // Static files from web build
        const staticPath = path.join(import.meta.dirname, '../../../web/build');
        this.app.use(express.static(staticPath));

        // SPA fallback - serve index.html for non-API routes
        this.app.get('*', (req: Request, res: Response) => {
            res.sendFile(path.join(staticPath, 'index.html'));
        });
    }

    private setupGracefulShutdown() {
        const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGUSR2'];

        for (const signal of signals) {
            process.on(signal, async () => {
                try {
                    console.info(`Received ${signal}, shutting down...`);
                    await this.shutdown();
                    process.exit(0);
                } catch (error: any) {
                    console.error(`Error shutting down: ${error.message ?? 'Unknown'}`);
                    process.exit(1);
                }
            });
        }

        process.on('uncaughtException', async (error: Error) => {
            console.error(`Uncaught exception: ${error.message ?? 'Unknown'}`);
            await this.shutdown();
            process.exit(1);
        });

        process.on('unhandledRejection', async (error: any) => {
            console.error(`Unhandled rejection: ${error?.message ?? 'Unknown'}`);
            await this.shutdown();
            process.exit(1);
        });
    }

    private async shutdown(): Promise<void> {
        if (this.isShuttingDown) {
            console.warn('Shutdown already in progress...');
            return;
        }

        this.isShuttingDown = true;
        console.info('Starting graceful shutdown...');

        await new Promise<void>((resolve, reject) => {
            this.httpServer.close((error) => {
                if (error) {
                    console.error('Error closing HTTP server:', error);
                    reject(error);
                } else {
                    console.info('HTTP server closed');
                    resolve();
                }
            });
        });

        console.info('Graceful shutdown completed');
    }

    public start(): void {
        this.httpServer.listen(this.port, this.host, () => {
            console.info(`Forvm API running on http://${this.host}:${this.port}`);
        });
    }
}

export default Server;
