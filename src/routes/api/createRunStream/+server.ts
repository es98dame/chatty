
import { json, error } from '@sveltejs/kit';
import { OPENAI_KEY, ASSISTANT_ID } from '$env/static/private';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: OPENAI_KEY
});

export async function GET({ request }) {
    try {
        //make a thread
        const thread = await openai.beta.threads.create();

        await openai.beta.threads.messages.create(thread.id, {
			role: 'user',
			content: `Hi who are you?`
		});

        const headers = {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        };

        const stream = await openai.beta.threads.runs.create(
            thread.id,
            { assistant_id: ASSISTANT_ID, stream: true }
          );

          return new Response(
            new ReadableStream({
                async start(controller) {
                    // Send headers
                    controller.enqueue(new TextEncoder().encode(`event: thread.run.created\n\n`));

                    for await (const event of stream) {
                        if (event.event === 'thread.message.delta') {
                            const data = JSON.parse(event.data);
                            const content = data.delta.content.map(c => c.text.value).join('');
                            controller.enqueue(new TextEncoder().encode(`event: message\ndata: ${JSON.stringify({ text: content })}\n\n`));
                        } else if (event.event === 'done') {
                            controller.enqueue(new TextEncoder().encode(`event: done\ndata: [DONE]\n\n`));
                            controller.close();
                            break;
                        } else {
                            // Handle other events if needed
                        }
                    }
                }
            }),
            { headers }
        );
    } catch (err) {
        return new Response(null, { status: 500 });
    }
}
