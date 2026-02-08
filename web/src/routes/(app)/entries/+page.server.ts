import { createEntry, listEntries, searchEntries } from '$lib/server/forvm-api';
import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

function parseTags(value: string | null): string[] {
    if (!value) return [];
    return value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
}

export const load: PageServerLoad = async (event) => {
    const query = event.url.searchParams.get('q')?.trim() || '';
    const tagsRaw = event.url.searchParams.get('tags') || '';
    const tags = parseTags(tagsRaw);

    if (query) {
        const search = await searchEntries(event, query, {
            tags: tags.length > 0 ? tags : undefined,
            limit: 50,
        });

        return {
            entries: search.results,
            query,
            tags: tagsRaw,
            mode: 'search' as const,
            count: search.count,
        };
    }

    const entries = await listEntries(event, {
        tags: tags.length > 0 ? tags : undefined,
        limit: 100,
    });

    return {
        entries,
        query,
        tags: tagsRaw,
        mode: 'browse' as const,
        count: entries.length,
    };
};

export const actions: Actions = {
    create: async (event) => {
        const formData = await event.request.formData();
        const title = String(formData.get('title') || '').trim();
        const context = String(formData.get('context') || '').trim();
        const body = String(formData.get('body') || '').trim();
        const tags = parseTags(String(formData.get('tags') || ''));
        const source = String(formData.get('source') || 'human').trim();

        if (!title || !context || !body) {
            return fail(400, {
                error: 'Title, context, and body are required.',
                values: { title, context, body, tags: tags.join(', '), source },
            });
        }

        const entry = await createEntry(event, {
            title,
            context,
            body,
            tags,
            source,
        });

        throw redirect(303, `/entries/${entry.id}`);
    },
};
