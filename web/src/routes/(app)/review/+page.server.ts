import { deleteEntry, listEntries, reviewEntry, updateEntry } from '$lib/server/forvm-api';
import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

function parseTags(raw: string): string[] {
    return raw
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
}

export const load: PageServerLoad = async (event) => {
    const entries = await listEntries(event, {
        reviewed: false,
        limit: 100,
    });

    return { entries };
};

export const actions: Actions = {
    approve: async (event) => {
        const form = await event.request.formData();
        const id = String(form.get('id') || '');
        if (!id) {
            return fail(400, { error: 'Entry ID is required.' });
        }

        await reviewEntry(event, id);
        throw redirect(303, '/review');
    },

    approve_edit: async (event) => {
        const form = await event.request.formData();
        const id = String(form.get('id') || '');
        const title = String(form.get('title') || '').trim();
        const context = String(form.get('context') || '').trim();
        const body = String(form.get('body') || '').trim();
        const tags = parseTags(String(form.get('tags') || ''));

        if (!id || !title || !context || !body) {
            return fail(400, { error: 'ID, title, context, and body are required.' });
        }

        await updateEntry(event, id, { title, context, body, tags });
        await reviewEntry(event, id);

        throw redirect(303, '/review');
    },

    remove: async (event) => {
        const form = await event.request.formData();
        const id = String(form.get('id') || '');
        if (!id) {
            return fail(400, { error: 'Entry ID is required.' });
        }

        await deleteEntry(event, id);
        throw redirect(303, '/review');
    },
};
