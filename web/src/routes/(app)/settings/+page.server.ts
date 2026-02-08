import { createAgentKey, listAgentKeys, revokeAgentKey } from '$lib/server/forvm-api';
import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const keys = await listAgentKeys(event);
    return { keys };
};

export const actions: Actions = {
    create: async (event) => {
        const data = await event.request.formData();
        const label = String(data.get('label') || '').trim();

        if (!label) {
            return fail(400, { error: 'Key label is required.' });
        }

        const created = await createAgentKey(event, label);

        return {
            created,
        };
    },

    revoke: async (event) => {
        const data = await event.request.formData();
        const id = String(data.get('id') || '').trim();

        if (!id) {
            return fail(400, { error: 'Key ID is required.' });
        }

        await revokeAgentKey(event, id);
        throw redirect(303, '/settings');
    },
};
