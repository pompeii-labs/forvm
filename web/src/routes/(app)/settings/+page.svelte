<script lang="ts">
    let { data, form } = $props();

    let copied = $state(false);

    async function copyKey(value: string) {
        await navigator.clipboard.writeText(value);
        copied = true;
        setTimeout(() => {
            copied = false;
        }, 1500);
    }

    function formatDate(value: string): string {
        return new Date(value).toLocaleString();
    }
</script>

<svelte:head>
    <title>Settings | Forvm</title>
</svelte:head>

<section class="page-header">
    <p class="eyebrow">Settings</p>
    <h1>Agent API Keys</h1>
    <p>Create, copy, and revoke keys used by your local/hosted agents.</p>
</section>

<section class="panel">
    <div class="panel-head">
        <h2>Create key</h2>
    </div>

    <form method="POST" action="?/create" class="stacked-form">
        <label>
            <span>Label</span>
            <input name="label" placeholder="e.g. cursor-prod-agent" required />
        </label>
        <button type="submit">Generate key</button>

        {#if form?.error}
            <p class="error">{form.error}</p>
        {/if}
    </form>

    {#if form?.created}
        <div class="new-key">
            <p class="eyebrow">New key (shown once)</p>
            <code>{form.created.key}</code>
            <button type="button" class="ghost" onclick={() => copyKey(form.created.key)}>
                {copied ? 'Copied' : 'Copy key'}
            </button>
        </div>
    {/if}
</section>

<section class="panel">
    <div class="panel-head">
        <h2>Existing keys</h2>
    </div>

    <div class="key-list">
        {#if data.keys.length === 0}
            <p class="muted">No keys yet.</p>
        {:else}
            {#each data.keys as key}
                <div class="key-row">
                    <div>
                        <h3>{key.label}</h3>
                        <p>{formatDate(key.created_at)}</p>
                    </div>
                    <form method="POST" action="?/revoke">
                        <input type="hidden" name="id" value={key.id} />
                        <button class="danger" type="submit">Revoke</button>
                    </form>
                </div>
            {/each}
        {/if}
    </div>
</section>
