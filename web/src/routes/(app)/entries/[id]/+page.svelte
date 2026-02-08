<script lang="ts">
    let { data, form } = $props();

    let editing = $state(false);

    function formatDate(value: string): string {
        return new Date(value).toLocaleString();
    }
</script>

<svelte:head>
    <title>{data.entry.title} | Forvm</title>
</svelte:head>

<section class="page-header">
    <p class="eyebrow">Entry Detail</p>
    <h1>{data.entry.title}</h1>
    <p>{data.entry.context}</p>
</section>

<section class="panel">
    <div class="panel-head">
        <h2>Metadata</h2>
        <div class="actions-inline">
            <button type="button" class="ghost" onclick={() => (editing = !editing)}>
                {editing ? 'Cancel edit' : 'Edit'}
            </button>
            {#if !data.entry.reviewed}
                <form method="POST" action="?/approve">
                    <button type="submit">Mark reviewed</button>
                </form>
            {/if}
            <form method="POST" action="?/remove">
                <button type="submit" class="danger">Delete</button>
            </form>
        </div>
    </div>

    <div class="meta-grid">
        <p><strong>Source:</strong> {data.entry.source}</p>
        <p><strong>Reviewed:</strong> {data.entry.reviewed ? 'yes' : 'no'}</p>
        <p><strong>Created:</strong> {formatDate(data.entry.created_at)}</p>
        <p><strong>Updated:</strong> {formatDate(data.entry.updated_at)}</p>
    </div>
</section>

{#if editing}
    <section class="panel">
        <div class="panel-head">
            <h2>Edit Entry</h2>
        </div>

        <form method="POST" action="?/save" class="stacked-form">
            <label>
                <span>Title</span>
                <input name="title" value={data.entry.title} required />
            </label>
            <label>
                <span>Context</span>
                <input name="context" value={data.entry.context} required />
            </label>
            <label>
                <span>Body</span>
                <textarea name="body" rows="10" required>{data.entry.body}</textarea>
            </label>
            <label>
                <span>Tags</span>
                <input name="tags" value={data.entry.tags.join(', ')} />
            </label>

            {#if form?.error}
                <p class="error">{form.error}</p>
            {/if}

            <button type="submit">Save changes</button>
        </form>
    </section>
{:else}
    <section class="panel">
        <div class="panel-head">
            <h2>Body</h2>
        </div>
        <pre class="entry-body">{data.entry.body}</pre>
        <div class="chips">
            {#each data.entry.tags as tag}
                <span>{tag}</span>
            {/each}
        </div>
    </section>
{/if}
