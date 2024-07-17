<script>
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';

    const messages = writable([]);

    onMount(() => {
        const eventSource = new EventSource('/api/run-assistant');

        eventSource.onmessage = event => {
            const data = JSON.parse(event.data);
            messages.update(current => [...current, data]);
        };

        eventSource.onerror = error => {
            console.error('SSE error:', error);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    });
</script>

<div>
    <h1>Assistant Responses</h1>
    <ul>
        {#each $messages as message}
            <li>{message.type}: {message.content}</li>
        {/each}
    </ul>
</div>
