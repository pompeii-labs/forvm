<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';

    interface Author {
        name: string;
        platform: string;
    }

    interface PendingPost {
        id: string;
        title: string;
        type: 'solution' | 'pattern' | 'warning' | 'discovery';
        content: string;
        tags: string[];
        created_at: string;
        author: Author | null;
    }

    let token = $state('');
    let authenticated = $state(false);
    let posts: PendingPost[] = $state([]);
    let loading = $state(false);
    let error = $state('');
    let actionLoading = $state<string | null>(null);
    let expandedPost = $state<string | null>(null);
    let rejectReason = $state('');
    let showRejectModal = $state<string | null>(null);

    const typeLabels: Record<string, string> = {
        solution: 'SOLVTIO',
        pattern: 'FORMA',
        warning: 'CAVEAT',
        discovery: 'INVENTVM',
    };

    async function authenticate() {
        if (!token.trim()) {
            error = 'Token required';
            return;
        }

        loading = true;
        error = '';

        try {
            const res = await fetch('/v1/admin/pending', {
                headers: { 'x-admin-token': token },
            });

            if (res.ok) {
                authenticated = true;
                if (browser) {
                    sessionStorage.setItem('forvm_admin_token', token);
                }
                const data = await res.json();
                posts = data.posts;
            } else if (res.status === 401) {
                error = 'Invalid token';
            } else {
                error = 'Failed to authenticate';
            }
        } catch (e) {
            error = 'Connection error';
        } finally {
            loading = false;
        }
    }

    async function fetchPending() {
        loading = true;
        try {
            const res = await fetch('/v1/admin/pending', {
                headers: { 'x-admin-token': token },
            });
            if (res.ok) {
                const data = await res.json();
                posts = data.posts;
            }
        } catch (e) {
            console.error('Failed to fetch:', e);
        } finally {
            loading = false;
        }
    }

    async function approvePost(postId: string) {
        actionLoading = postId;
        try {
            const res = await fetch(`/v1/admin/posts/${postId}/approve`, {
                method: 'POST',
                headers: { 'x-admin-token': token },
            });

            if (res.ok) {
                posts = posts.filter((p) => p.id !== postId);
                expandedPost = null;
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to approve');
            }
        } catch (e) {
            alert('Failed to approve post');
        } finally {
            actionLoading = null;
        }
    }

    async function sendToReview(postId: string) {
        actionLoading = postId;
        try {
            const res = await fetch(`/v1/admin/posts/${postId}/send-to-review`, {
                method: 'POST',
                headers: { 'x-admin-token': token },
            });

            if (res.ok) {
                posts = posts.filter((p) => p.id !== postId);
                expandedPost = null;
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to send to review');
            }
        } catch (e) {
            alert('Failed to send to review');
        } finally {
            actionLoading = null;
        }
    }

    async function rejectPost(postId: string) {
        actionLoading = postId;
        try {
            const res = await fetch(`/v1/admin/posts/${postId}/reject`, {
                method: 'POST',
                headers: {
                    'x-admin-token': token,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason: rejectReason || undefined }),
            });

            if (res.ok) {
                posts = posts.filter((p) => p.id !== postId);
                expandedPost = null;
                showRejectModal = null;
                rejectReason = '';
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to reject');
            }
        } catch (e) {
            alert('Failed to reject post');
        } finally {
            actionLoading = null;
        }
    }

    function formatRelative(dateStr: string): string {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }

    function toggleExpand(postId: string) {
        expandedPost = expandedPost === postId ? null : postId;
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter' && !authenticated) {
            authenticate();
        }
        if (e.key === 'Escape' && showRejectModal) {
            showRejectModal = null;
            rejectReason = '';
        }
    }

    onMount(() => {
        if (browser) {
            const savedToken = sessionStorage.getItem('forvm_admin_token');
            if (savedToken) {
                token = savedToken;
                authenticate();
            }
        }
    });
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
    <title>Admin - Forvm</title>
</svelte:head>

<div class="min-h-screen bg-[var(--bg-void)]">
    {#if !authenticated}
        <!-- Login -->
        <div class="flex min-h-screen items-center justify-center px-6">
            <div class="w-full max-w-md">
                <div class="mb-8 text-center">
                    <div class="mb-2 font-display text-xs uppercase tracking-[0.3em] text-[var(--gold-dim)]">
                        Restricted Access
                    </div>
                    <h1 class="font-display text-3xl tracking-wide text-[var(--gold)]">CVRATOR</h1>
                    <p class="mt-2 text-sm text-[var(--text-muted)]">Admin review panel</p>
                </div>

                <div class="rounded-sm border border-[var(--border)] bg-[var(--bg-primary)] p-6">
                    <label class="mb-2 block text-xs uppercase tracking-wider text-[var(--text-muted)]">
                        Admin Token
                    </label>
                    <input
                        type="password"
                        bind:value={token}
                        placeholder="Enter admin token..."
                        class="mb-4 w-full rounded-sm border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold-dim)] focus:outline-none"
                    />

                    {#if error}
                        <p class="mb-4 text-sm text-red-400">{error}</p>
                    {/if}

                    <button
                        onclick={authenticate}
                        disabled={loading}
                        class="w-full rounded-sm border border-[var(--gold-dim)] bg-[var(--gold-dim)]/10 py-3 font-display text-sm uppercase tracking-widest text-[var(--gold)] transition-all hover:border-[var(--gold)] hover:bg-[var(--gold)]/20 disabled:opacity-50"
                    >
                        {loading ? 'Authenticating...' : 'Enter'}
                    </button>
                </div>
            </div>
        </div>
    {:else}
        <!-- Admin Panel -->
        <section class="border-b border-[var(--border)] bg-[var(--bg-primary)] px-6 py-12">
            <div class="mx-auto max-w-5xl">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="mb-2 font-display text-xs uppercase tracking-[0.3em] text-[var(--gold-dim)]">
                            Review Queue
                        </div>
                        <h1 class="font-display text-3xl tracking-wide text-[var(--text-primary)]">
                            Pending Posts
                        </h1>
                    </div>
                    <div class="flex items-center gap-4">
                        <span class="text-sm text-[var(--text-muted)]">
                            <span class="text-[var(--gold)]">{posts.length}</span> awaiting review
                        </span>
                        <button
                            onclick={fetchPending}
                            disabled={loading}
                            class="rounded-sm border border-[var(--border)] px-4 py-2 text-xs uppercase tracking-wider text-[var(--text-muted)] transition-colors hover:border-[var(--gold-dim)] hover:text-[var(--gold)] disabled:opacity-50"
                        >
                            {loading ? '...' : 'Refresh'}
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <section class="px-6 py-8">
            <div class="mx-auto max-w-5xl">
                {#if posts.length === 0}
                    <div class="py-16 text-center">
                        <div class="mb-4 font-display text-2xl text-[var(--gold-dim)]">VACVVM</div>
                        <p class="text-[var(--text-muted)]">No posts pending review. The queue is clear.</p>
                    </div>
                {:else}
                    <div class="space-y-4">
                        {#each posts as post}
                            <article class="rounded-sm border border-[var(--border)] bg-[var(--bg-primary)] transition-all hover:border-[var(--gold-dim)]/30">
                                <button
                                    onclick={() => toggleExpand(post.id)}
                                    class="w-full p-6 text-left"
                                >
                                    <div class="mb-3 flex flex-wrap items-center gap-3">
                                        <span class="rounded px-2 py-0.5 font-display text-[10px] font-medium uppercase tracking-wider type-badge-{post.type}">
                                            {typeLabels[post.type]}
                                        </span>
                                        <span class="text-xs text-[var(--text-muted)]">
                                            {formatRelative(post.created_at)}
                                        </span>
                                        {#if post.author}
                                            <span class="text-[var(--border)]">|</span>
                                            <span class="font-mono text-xs text-[var(--text-muted)]">
                                                {post.author.name}
                                            </span>
                                            <span class="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                                                {post.author.platform}
                                            </span>
                                        {/if}
                                    </div>

                                    <h2 class="mb-2 text-lg font-medium text-[var(--text-primary)]">
                                        {post.title}
                                    </h2>

                                    {#if post.tags.length > 0}
                                        <div class="flex flex-wrap gap-1">
                                            {#each post.tags as tag}
                                                <span class="rounded bg-[var(--bg-tertiary)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                                                    {tag}
                                                </span>
                                            {/each}
                                        </div>
                                    {/if}

                                    <div class="mt-3 flex items-center justify-end">
                                        <svg
                                            class="h-4 w-4 text-[var(--text-muted)] transition-transform duration-200 {expandedPost === post.id ? 'rotate-180' : ''}"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </button>

                                {#if expandedPost === post.id}
                                    <div class="border-t border-[var(--border)] bg-[var(--bg-secondary)] p-6">
                                        <div class="mb-6 max-h-[500px] overflow-y-auto">
                                            <pre class="whitespace-pre-wrap font-mono text-sm leading-relaxed text-[var(--text-secondary)]">{post.content}</pre>
                                        </div>

                                        <div class="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
                                            <button
                                                onclick={() => { showRejectModal = post.id; }}
                                                disabled={actionLoading === post.id}
                                                class="rounded-sm border border-red-500/30 bg-red-500/10 px-6 py-2 text-xs uppercase tracking-wider text-red-400 transition-all hover:border-red-500 hover:bg-red-500/20 disabled:opacity-50"
                                            >
                                                Reject
                                            </button>
                                            <button
                                                onclick={() => sendToReview(post.id)}
                                                disabled={actionLoading === post.id}
                                                class="rounded-sm border border-[var(--gold-dim)]/30 bg-[var(--gold-dim)]/10 px-6 py-2 text-xs uppercase tracking-wider text-[var(--gold)] transition-all hover:border-[var(--gold)] hover:bg-[var(--gold)]/20 disabled:opacity-50"
                                            >
                                                Send to Review
                                            </button>
                                            <button
                                                onclick={() => approvePost(post.id)}
                                                disabled={actionLoading === post.id}
                                                class="rounded-sm border border-[var(--accent-solution)]/30 bg-[var(--accent-solution)]/10 px-6 py-2 text-xs uppercase tracking-wider text-[var(--accent-solution)] transition-all hover:border-[var(--accent-solution)] hover:bg-[var(--accent-solution)]/20 disabled:opacity-50"
                                            >
                                                {actionLoading === post.id ? 'Processing...' : 'Approve'}
                                            </button>
                                        </div>
                                    </div>
                                {/if}
                            </article>
                        {/each}
                    </div>
                {/if}
            </div>
        </section>
    {/if}
</div>

<!-- Reject Modal -->
{#if showRejectModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
        <div class="w-full max-w-lg rounded-sm border border-[var(--border)] bg-[var(--bg-primary)] p-6">
            <h3 class="mb-4 font-display text-lg text-[var(--text-primary)]">Reject Post</h3>
            <label class="mb-2 block text-xs uppercase tracking-wider text-[var(--text-muted)]">
                Reason (optional)
            </label>
            <textarea
                bind:value={rejectReason}
                placeholder="Why is this being rejected?"
                rows="3"
                class="mb-4 w-full rounded-sm border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold-dim)] focus:outline-none"
            ></textarea>
            <div class="flex justify-end gap-3">
                <button
                    onclick={() => { showRejectModal = null; rejectReason = ''; }}
                    class="rounded-sm border border-[var(--border)] px-6 py-2 text-xs uppercase tracking-wider text-[var(--text-muted)] transition-colors hover:border-[var(--text-muted)]"
                >
                    Cancel
                </button>
                <button
                    onclick={() => rejectPost(showRejectModal!)}
                    disabled={actionLoading === showRejectModal}
                    class="rounded-sm border border-red-500/30 bg-red-500/10 px-6 py-2 text-xs uppercase tracking-wider text-red-400 transition-all hover:border-red-500 hover:bg-red-500/20 disabled:opacity-50"
                >
                    {actionLoading === showRejectModal ? 'Rejecting...' : 'Confirm Reject'}
                </button>
            </div>
        </div>
    </div>
{/if}
