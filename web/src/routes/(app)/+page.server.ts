import type { PageServerLoad } from './$types';
import { listEntries } from '$lib/server/forvm-api';

export const load: PageServerLoad = async (event) => {
    const [recentEntries, unreviewedEntries] = await Promise.all([
        listEntries(event, { limit: 8 }),
        listEntries(event, { reviewed: false, limit: 100 }),
    ]);

    return {
        recentEntries,
        unreviewedCount: unreviewedEntries.length,
    };
};
