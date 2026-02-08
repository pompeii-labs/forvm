import { deleteEntry, getEntry, reviewEntry, updateEntry } from '$lib/server/forvm-api';
import { error, fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

function parseTags(value: string): string[] {
    return value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
}

export const load: PageServerLoad = async (event) => {
    const id = event.params.id;
    if (!id) {
        throw error(400, 'Entry ID is required');
    }

    const entry = await getEntry(event, id);
    return { entry };
};

export const actions: Actions = {
    save: async (event) => {
        const data = await event.request.formData();
        const id = event.params.id;
        if (!id) {
            throw error(400, 'Entry ID is required');
        }

        const title = String(data.get('title') || '').trim();
        const context = String(data.get('context') || '').trim();
        const body = String(data.get('body') || '').trim();
        const tags = parseTags(String(data.get('tags') || ''));

        if (!title || !context || !body) {
            return fail(400, { error: 'Title, context, and body are required.' });
        }

        await updateEntry(event, id, { title, context, body, tags });
        throw redirect(303, `/entries/${id}`);
    },

    approve: async (event) => {
        const id = event.params.id;
        if (!id) {
            throw error(400, 'Entry ID is required');
        }

        await reviewEntry(event, id);
        throw redirect(303, `/entries/${id}`);
    },

    remove: async (event) => {
        const id = event.params.id;
        if (!id) {
            throw error(400, 'Entry ID is required');
        }

        await deleteEntry(event, id);
        throw redirect(303, '/entries');
    },
};
