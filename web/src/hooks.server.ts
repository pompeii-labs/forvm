import { env } from '$env/dynamic/public';
import { createServerClient } from '@supabase/ssr';
import { redirect, type Handle } from '@sveltejs/kit';

function withNext(pathname: string, search: string): string {
    const next = encodeURIComponent(`${pathname}${search}`);
    return `/auth/login?next=${next}`;
}

export const handle: Handle = async ({ event, resolve }) => {
    const supabaseUrl = env.PUBLIC_SUPABASE_URL;
    const supabasePublishableKey = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabasePublishableKey) {
        throw new Error(
            'Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variables',
        );
    }

    event.locals.supabase = createServerClient(
        supabaseUrl,
        supabasePublishableKey,
        {
            cookies: {
                getAll: () => event.cookies.getAll(),
                setAll: (cookiesToSet) => {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        event.cookies.set(name, value, { ...options, path: '/' });
                    });
                },
            },
            cookieOptions: {
                sameSite: 'lax',
                httpOnly: true,
            },
        },
    );

    event.locals.safeGetSession = async () => {
        const {
            data: { user },
            error,
        } = await event.locals.supabase.auth.getUser();

        if (error || !user) {
            return { session: null, user: null };
        }

        const {
            data: { session },
        } = await event.locals.supabase.auth.getSession();

        return { session, user };
    };

    const { session } = await event.locals.safeGetSession();
    const pathname = event.url.pathname;
    const isAuthRoute = pathname.startsWith('/auth/');
    const isPublicAsset =
        pathname.startsWith('/_app/') || pathname.startsWith('/favicon') || pathname.includes('.');

    if (!session && !isAuthRoute && !isPublicAsset) {
        throw redirect(303, withNext(pathname, event.url.search));
    }

    if (session && pathname === '/auth/login') {
        throw redirect(303, event.url.searchParams.get('next') || '/');
    }

    return resolve(event, {
        filterSerializedResponseHeaders(name) {
            return name === 'content-range' || name === 'x-supabase-api-version';
        },
    });
};
