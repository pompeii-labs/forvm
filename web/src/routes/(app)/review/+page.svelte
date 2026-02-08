<script lang="ts">
    let { data, form } = $props();

    function formatDate(value: string): string {
        return new Date(value).toLocaleString();
    }
</script>

<svelte:head>
    <title>Review Queue | Forvm</title>
</svelte:head>

<section class="page-header">
    <p class="eyebrow">Review Queue</p>
    <h1>Unreviewed Entries</h1>
    <p>Approve quickly, edit and approve, or delete low-signal entries.</p>
</section>

{#if form?.error}
    <section class="panel">
        <p class="error">{form.error}</p>
    </section>
{/if}

<section class="panel">
    <div class="panel-head">
        <h2>{data.entries.length} waiting</h2>
    </div>

    <div class="queue-list">
        {#if data.entries.length === 0}
            <p class="muted">Queue is clear.</p>
        {:else}
            {#each data.entries as entry}
                <details class="queue-item">
                    <summary>
                        <div>
                            <h3>{entry.title}</h3>
                            <p>{entry.context}</p>
                        </div>
                        <span>{formatDate(entry.created_at)}</span>
                    </summary>

                    <div class="queue-body">
                        <pre class="entry-body">{entry.body}</pre>

                        <form method="POST" action="?/approve" class="actions-inline">
                            <input type="hidden" name="id" value={entry.id} />
                            <button type="submit">Approve</button>
                        </form>

                        <form method="POST" action="?/approve_edit" class="stacked-form">
                            <input type="hidden" name="id" value={entry.id} />
                            <label>
                                <span>Title</span>
                                <input name="title" value={entry.title} required />
                            </label>
                            <label>
                                <span>Context</span>
                                <input name="context" value={entry.context} required />
                            </label>
                            <label>
                                <span>Body</span>
                                <textarea name="body" rows="8" required>{entry.body}</textarea>
                            </label>
                            <label>
                                <span>Tags</span>
                                <input name="tags" value={entry.tags.join(', ')} />
                            </label>
                            <button type="submit">Edit and approve</button>
                        </form>

                        <form method="POST" action="?/remove">
                            <input type="hidden" name="id" value={entry.id} />
                            <button type="submit" class="danger">Delete entry</button>
                        </form>
                    </div>
                </details>
            {/each}
        {/if}
    </div>
</section>
