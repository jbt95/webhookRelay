import type { Env, DeliveryMessage } from '../types';

export const deliveryConsumer = {
  async queue(batch: MessageBatch<DeliveryMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const { webhookId, attempt } = message.body;

      try {
        // TODO: Implement delivery logic
        // 1. Fetch webhook from D1
        // 2. Fetch integration config
        // 3. Forward to target URL
        // 4. Record delivery attempt
        // 5. Update webhook status
        // 6. Handle retries on failure

        console.log(`Processing webhook ${webhookId}, attempt ${attempt}`);

        // Acknowledge message
        message.ack();
      } catch (error) {
        console.error(`Failed to process webhook ${webhookId}:`, error);

        // Retry the message
        message.retry();
      }
    }
  },
};
