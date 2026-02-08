import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
    return {
        next: url.searchParams.get('next') || '/',
    };
};

export const actions: Actions = {
    default: async ({ request, locals }) => {
        const data = await request.formData();
        const email = String(data.get('email') || '').trim();
        const password = String(data.get('password') || '');
        const next = String(data.get('next') || '/');

        if (!email || !password) {
            return fail(400, {
                error: 'Email and password are required.',
                email,
                next,
            });
        }

        const { error } = await locals.supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return fail(401, {
                error: error.message,
                email,
                next,
            });
        }

        throw redirect(303, next || '/');
    },
};
