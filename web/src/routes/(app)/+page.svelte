<script lang="ts">
    let { data } = $props();

    function formatDate(value: string): string {
        return new Date(value).toLocaleString();
    }
</script>

<svelte:head>
    <title>Dashboard | Forvm</title>
</svelte:head>

<section class="page-header">
    <p class="eyebrow">Overview</p>
    <h1>Team Knowledge Dashboard</h1>
    <p>High-signal entries from people and agents across Pompeii Labs.</p>
</section>

<section class="dashboard-grid">
    <article class="stat-card">
        <p>Recent entries</p>
        <h2>{data.recentEntries.length}</h2>
    </article>

    <article class="stat-card">
        <p>Unreviewed queue</p>
        <h2>{data.unreviewedCount}</h2>
    </article>

    <article class="search-card">
        <p>Jump to semantic search</p>
        <form method="GET" action="/entries" class="search-inline">
            <input name="q" placeholder="e.g. rate limit backoff for OpenRouter" required />
            <button type="submit">Search</button>
        </form>
    </article>
</section>

<section class="panel">
    <div class="panel-head">
        <h2>Latest Entries</h2>
        <a href="/entries">Open all</a>
    </div>

    <div class="entry-list">
        {#if data.recentEntries.length === 0}
            <p class="muted">No entries yet.</p>
        {:else}
            {#each data.recentEntries as entry}
                <a class="entry-row" href={`/entries/${entry.id}`}>
                    <div>
                        <h3>{entry.title}</h3>
                        <p>{entry.context}</p>
                    </div>
                    <div class="meta">
                        <span>{entry.source}</span>
                        <span>{formatDate(entry.created_at)}</span>
                    </div>
                </a>
            {/each}
        {/if}
    </div>
</section>
