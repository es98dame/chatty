import { json } from '@sveltejs/kit';
import { OPENAI_KEY, ASSISTANT_ID } from '$env/static/private';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: OPENAI_KEY
});

const threadResponses = {};

export async function POST({ request }) {
    const { userMessage, threadId } = await request.json();
    let currentThreadId = threadId;

    try {
        if (!currentThreadId || !threadResponses[currentThreadId]) {
            const threadResponse = await openai.beta.threads.create({
                assistant_id: ASSISTANT_ID
            });
            currentThreadId = threadResponse.id;
            console.log("New thread created with ID:", currentThreadId);

            threadResponses[currentThreadId] = { events: [], clients: [] };
        }

        const messageResponse = await openai.beta.threads.messages.create(currentThreadId, {
            role: "user",
            content: 'Hi there!',
        });

        return json({ threadId: currentThreadId });
    } catch (error) {
        console.error("Error handling POST request:", error);
        return json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET({ url }) {
    const threadId = url.searchParams.get('threadId');
    const headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
    };

    const stream = new ReadableStream({
        start(controller) {
            if (threadResponses[threadId]) {
                threadResponses[threadId].clients.push(controller);
                threadResponses[threadId].events.forEach(event => {
                    controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
                });
                controller.close(); 
            } else {
                controller.enqueue("data: No active thread found.\n\n");
                controller.close();
            }
        }
    });

    return new Response(stream, { headers });
}
