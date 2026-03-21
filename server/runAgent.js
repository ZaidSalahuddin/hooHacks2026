import { InMemorySessionService, Runner } from '@google/adk';
import { randomUUID } from 'crypto';

const APP_NAME = 'ecoscan';

export async function runAgent(agent, promptText, imageBase64 = null, mimeType = 'image/jpeg') {
  const userId = 'server';
  const sessionId = randomUUID();

  const sessionService = new InMemorySessionService();
  await sessionService.createSession({ appName: APP_NAME, userId, sessionId });

  const runner = new Runner({ agent, appName: APP_NAME, sessionService });

  const parts = [{ text: promptText }];
  if (imageBase64) {
    parts.push({ inlineData: { mimeType, data: imageBase64 } });
  }

  const newMessage = { role: 'user', parts };

  let finalText = '';
  for await (const event of runner.runAsync({ userId, sessionId, newMessage })) {
    if (event.isFinalResponse?.()) {
      finalText = event.content?.parts?.[0]?.text ?? '';
    }
  }

  if (!finalText) throw new Error(`Agent "${agent.name}" returned empty response`);
  return finalText;
}
