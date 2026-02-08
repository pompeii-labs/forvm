import { redirect, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ locals }) => {
    await locals.supabase.auth.signOut();
    throw redirect(303, '/auth/login');
};
