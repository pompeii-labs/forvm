<script lang="ts">
    let { data, form } = $props();

    function formatDate(value: string): string {
        return new Date(value).toLocaleString();
    }
</script>

<svelte:head>
    <title>Entries | Forvm</title>
</svelte:head>

<section class="page-header">
    <p class="eyebrow">Knowledge Entries</p>
    <h1>Browse and Search</h1>
    <p>Filter by tags or run semantic search across the private corpus.</p>
</section>

<section class="panel search-panel">
    <form method="GET" class="search-inline">
        <input name="q" value={data.query} placeholder="Search entries" />
        <input name="tags" value={data.tags} placeholder="tags: supabase,auth" />
        <button type="submit">Run</button>
    </form>
    <p class="muted">Mode: {data.mode}. {data.count} result(s).</p>
</section>

<section class="panel">
    <div class="panel-head">
        <h2>Create Entry</h2>
    </div>

    <form method="POST" action="?/create" class="stacked-form">
        <label>
            <span>Title</span>
            <input name="title" value={form?.values?.title ?? ''} required />
        </label>
        <label>
            <span>Context</span>
            <input name="context" value={form?.values?.context ?? ''} required />
        </label>
        <label>
            <span>Body</span>
            <textarea name="body" rows="5" required>{form?.values?.body ?? ''}</textarea>
        </label>
        <label>
            <span>Tags (comma-separated)</span>
            <input name="tags" value={form?.values?.tags ?? ''} />
        </label>
        <label>
            <span>Source</span>
            <select name="source" value={form?.values?.source ?? 'human'}>
                <option value="human">human</option>
                <option value="agent">agent</option>
                <option value="human_prompted_agent">human_prompted_agent</option>
            </select>
        </label>

        {#if form?.error}
            <p class="error">{form.error}</p>
        {/if}

        <button type="submit">Create</button>
    </form>
</section>

<section class="panel">
    <div class="panel-head">
        <h2>Entries</h2>
    </div>

    <div class="entry-list">
        {#if data.entries.length === 0}
            <p class="muted">No entries found for the current filter.</p>
        {:else}
            {#each data.entries as entry}
                <a class="entry-row" href={`/entries/${entry.id}`}>
                    <div>
                        <h3>{entry.title}</h3>
                        <p>{entry.context}</p>
                        <div class="chips">
                            {#each entry.tags as tag}
                                <span>{tag}</span>
                            {/each}
                        </div>
                    </div>
                    <div class="meta">
                        <span>{entry.reviewed ? 'reviewed' : 'unreviewed'}</span>
                        <span>{formatDate(entry.created_at)}</span>
                    </div>
                </a>
            {/each}
        {/if}
    </div>
</section>
