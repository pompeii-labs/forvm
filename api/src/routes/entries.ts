import { Response, Router } from 'express';
import { Entry, EntryData, EntrySource } from '../models/entry.js';
import { buildError } from '../util/error.js';
import { generateEntryEmbedding } from '../util/embeddings.js';
import { authenticateRequest } from '../util/middleware.js';
import { AuthenticatedRequest } from '../util/request.js';

const router = Router();

router.use(authenticateRequest());

function parseTags(input: unknown): string[] {
    if (!input) return [];
    if (Array.isArray(input)) {
        return input
            .map((tag) => String(tag).trim())
            .filter((tag) => tag.length > 0);
    }
    if (typeof input === 'string') {
        return input
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);
    }
    return [];
}

function parseReviewed(input: unknown): boolean | undefined {
    if (typeof input === 'boolean') return input;
    if (typeof input === 'string') {
        const normalized = input.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
    }
    return undefined;
}

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.userId) {
            return buildError(res, new Error('Authentication required'), 401);
        }

        const { title, context, body } = req.body;
        const tags = parseTags(req.body?.tags);
        const source =
            (req.body?.source as EntrySource | undefined) ||
            (req.agentKeyLabel ? 'agent' : 'human');

        const validSources: EntrySource[] = ['human', 'agent', 'human_prompted_agent'];

        if (!title || !context || !body) {
            return buildError(res, new Error('title, context, and body are required'), 400);
        }

        if (!validSources.includes(source)) {
            return buildError(res, new Error(`source must be one of: ${validSources.join(', ')}`), 400);
        }

        const embedding = await generateEntryEmbedding({ title, context, body, tags });
        const autoReviewed = source === 'human';

        const entry = await Entry.create({
            title,
            context,
            body,
            tags,
            source,
            reviewed: autoReviewed,
            reviewed_by: autoReviewed ? req.userId : null,
            reviewed_at: autoReviewed ? new Date().toISOString() : null,
            author_user_id: req.userId,
            author_agent_name: req.agentKeyLabel || null,
            embedding,
            updated_at: new Date().toISOString(),
        });

        res.status(201).json(entry);
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const tags = parseTags(req.query.tags);
        const reviewed = parseReviewed(req.query.reviewed);
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

        const entries = await Entry.browse({
            tags: tags.length > 0 ? tags : undefined,
            reviewed,
            limit,
            offset,
        });

        res.json(entries);
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const entry = await Entry.get(req.params.id as string);
        if (!entry) {
            return buildError(res, null, 404);
        }

        res.json(entry);
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const entry = await Entry.get(req.params.id as string);
        if (!entry) {
            return buildError(res, null, 404);
        }

        const updates: Partial<EntryData> = {};

        if (typeof req.body?.title === 'string' && req.body.title.trim()) {
            updates.title = req.body.title;
        }
        if (typeof req.body?.context === 'string' && req.body.context.trim()) {
            updates.context = req.body.context;
        }
        if (typeof req.body?.body === 'string' && req.body.body.trim()) {
            updates.body = req.body.body;
        }
        if (typeof req.body?.source === 'string') {
            const source = req.body.source as EntrySource;
            if (!['human', 'agent', 'human_prompted_agent'].includes(source)) {
                return buildError(res, new Error('Invalid source'), 400);
            }
            updates.source = source;
        }
        if (req.body?.tags !== undefined) {
            updates.tags = parseTags(req.body.tags);
        }

        const shouldReEmbed =
            updates.title !== undefined ||
            updates.context !== undefined ||
            updates.body !== undefined ||
            updates.tags !== undefined;

        if (shouldReEmbed) {
            const title = updates.title ?? entry.title;
            const context = updates.context ?? entry.context;
            const body = updates.body ?? entry.body;
            const tags = updates.tags ?? entry.tags;
            updates.embedding = await generateEntryEmbedding({ title, context, body, tags });
        }

        await entry.update(updates);

        const updatedEntry = await Entry.get(entry.id);
        res.json(updatedEntry);
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

router.delete('/:id', async (_req: AuthenticatedRequest, res: Response) => {
    try {
        const entry = await Entry.get(_req.params.id as string);
        if (!entry) {
            return buildError(res, null, 404);
        }

        await entry.delete();
        res.json({ success: true });
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

router.post('/:id/review', async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.userId) {
            return buildError(res, new Error('Authentication required'), 401);
        }

        const entry = await Entry.get(req.params.id as string);
        if (!entry) {
            return buildError(res, null, 404);
        }

        await entry.markReviewed(req.userId);
        const updated = await Entry.get(entry.id);

        res.json({
            success: true,
            entry: updated,
        });
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

export default router;
