import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
    const { session, user } = await locals.safeGetSession();

    if (!session || !user) {
        throw redirect(303, '/auth/login');
    }

    return {
        session,
        user,
    };
};
