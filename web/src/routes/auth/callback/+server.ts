import { redirect, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, locals }) => {
    const code = url.searchParams.get('code');
    const next = url.searchParams.get('next') || '/';

    if (!code) {
        throw redirect(303, '/auth/login');
    }

    const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
    if (error) {
        throw redirect(303, '/auth/login');
    }

    throw redirect(303, next);
};
