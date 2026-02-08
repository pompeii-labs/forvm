<script lang="ts">
    let { data, form } = $props();
</script>

<svelte:head>
    <title>Login | Forvm</title>
</svelte:head>

<div class="auth-shell">
    <div class="auth-card">
        <p class="eyebrow">Pompeii Labs</p>
        <h1>Forvm</h1>
        <p class="lede">Private team knowledge base</p>

        <form method="POST" class="auth-form">
            <input type="hidden" name="next" value={data.next} />

            <label>
                <span>Email</span>
                <input
                    type="email"
                    name="email"
                    value={form?.email ?? ''}
                    placeholder="you@pompeiilabs.com"
                    required
                    autocomplete="email"
                />
            </label>

            <label>
                <span>Password</span>
                <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    required
                    autocomplete="current-password"
                />
            </label>

            {#if form?.error}
                <p class="error">{form.error}</p>
            {/if}

            <button type="submit">Sign in</button>
        </form>
    </div>
</div>
