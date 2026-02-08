<script lang="ts">
    import { page } from '$app/stores';

    let { data, children } = $props();

    const navItems = [
        { href: '/', label: 'Dashboard' },
        { href: '/entries', label: 'Entries' },
        { href: '/review', label: 'Review Queue' },
        { href: '/settings', label: 'Settings' },
    ];

    function isActive(pathname: string, href: string): boolean {
        if (href === '/') {
            return pathname === '/';
        }
        return pathname.startsWith(href);
    }
</script>

<div class="app-shell">
    <aside class="app-sidebar">
        <a href="/" class="brand">FORVM</a>
        <p class="brand-subtitle">Pompeii Knowledge Base</p>

        <nav>
            {#each navItems as item}
                <a href={item.href} class={isActive($page.url.pathname, item.href) ? 'active' : ''}>{item.label}</a>
            {/each}
        </nav>
    </aside>

    <div class="app-main">
        <header class="topbar">
            <div>
                <p class="label">Signed in</p>
                <p class="user">{data.user.email}</p>
            </div>
            <form method="POST" action="/auth/logout">
                <button class="ghost" type="submit">Sign out</button>
            </form>
        </header>

        <main class="content">
            {@render children()}
        </main>
    </div>
</div>
