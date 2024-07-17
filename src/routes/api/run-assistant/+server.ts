
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

        //run for streaming
        const run = openai.beta.threads.runs.stream(thread.id , {
            assistant_id: ASSISTANT_ID
        });

        const headers = {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        };
console.log('stream started');

        const stream = new ReadableStream({
            start(controller) {
                console.log('stream started');
                run.on('textCreated', text => {
                    controller.enqueue(`data: {"type":"textCreated","content":"${text.value}"}\n\n`);
                });
                run.on('textDelta', (textDelta, snapshot) => {
                    controller.enqueue(`data: {"type":"textDelta","content":"${textDelta.value}"}\n\n`);
                });
                run.on('toolCallCreated', toolCall => {
                    controller.enqueue(`data: {"type":"toolCall","content":"${toolCall.type}"}\n\n`);
                });
                run.on('toolCallDelta', (toolCallDelta, snapshot) => {
                    if (toolCallDelta.type === 'code_interpreter') {
                        let content = `Input: ${toolCallDelta.code_interpreter.input}\nOutputs: `;
                        toolCallDelta.code_interpreter.outputs.forEach(output => {
                            content += `${output.logs}\n`;
                        });
                        controller.enqueue(`data: {"type":"toolCallDelta","content":"${content}"}\n\n`);
                    }
                });
                run.on('end', () => {
                    controller.close();
                });
                run.on('error', (err) => {
                    controller.error(err);
                });
            }
        });

        return new Response(stream, { headers });
    } catch (err) {
        return new Response(null, { status: 500 });
    }
}
