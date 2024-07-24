<script>
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';

    const messages = writable([]);
    let answer = '';

    onMount(() => {
        const eventSource = new EventSource('/api/run-assistant');

        eventSource.onmessage = event => {
            const data = JSON.parse(event.data);
            answer += data.content;
        };

        eventSource.addEventListener('end', event => {
            messages.update(messages => [...messages, answer]);
            answer = '';
            console.log('Stream ended');
            eventSource.close()
        });


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

            {#if answer !== ''}
                <li>{answer}</li>
                {:else}
                <li>{$messages}</li>
            {/if}

    </ul>
</div>
