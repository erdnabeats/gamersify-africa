import { WebSocketServer, WebSocket } from 'ws';
import Redis from 'ioredis';

type Subscriber = {
  ws: WebSocket;
  channel: string;
};

const subscribers = new Set<Subscriber>();

let redisPublisher: Redis | null = null;
let redisSubscriber: Redis | null = null;

function getRedisUrl() {
  return process.env.REDIS_URL || 'redis://localhost:6379';
}

function initRedis() {
  if (redisPublisher && redisSubscriber) {
    return;
  }

  redisPublisher = new Redis(getRedisUrl());
  redisSubscriber = new Redis(getRedisUrl());

  redisSubscriber.on('message', (channel, message) => {
    for (const subscriber of subscribers) {
      if (
        subscriber.channel === channel &&
        subscriber.ws.readyState === WebSocket.OPEN
      ) {
        subscriber.ws.send(message);
      }
    }
  });

  redisPublisher.on('error', error => {
    console.error('[REDIS PUBLISHER]', error);
  });

  redisSubscriber.on('error', error => {
    console.error('[REDIS SUBSCRIBER]', error);
  });
}

export async function notifySubscribers(
  resource: string,
  resourceId: string,
  payload: Record<string, unknown>
) {
  initRedis();

  const channel = `gamersify:${resource}:${resourceId}`;

  const message = JSON.stringify({
    resource,
    resourceId,
    payload,
    timestamp: new Date().toISOString(),
  });

  await redisPublisher!.publish(channel, message);
}

export function attachRealtime(
  server: any
) {
  initRedis();

  const wss = new WebSocketServer({
    server,
    path: '/ws',
  });

  wss.on('connection', async ws => {
    let subscribedChannel = '';

    ws.send(
      JSON.stringify({
        type: 'connected',
        message: 'Gamersify realtime connection established',
      })
    );

    ws.on('message', async raw => {
      try {
        const message = JSON.parse(
          raw.toString()
        );

        if (
          message.type === 'subscribe' &&
          message.resource &&
          message.resourceId
        ) {
          const channel =
            `gamersify:${message.resource}:${message.resourceId}`;

          if (subscribedChannel) {
            await redisSubscriber!.unsubscribe(
              subscribedChannel
            );

            for (const subscriber of subscribers) {
              if (subscriber.ws === ws) {
                subscribers.delete(subscriber);
              }
            }
          }

          subscribedChannel = channel;

          await redisSubscriber!.subscribe(channel);

          subscribers.add({
            ws,
            channel,
          });

          ws.send(
            JSON.stringify({
              type: 'subscribed',
              resource: message.resource,
              resourceId: message.resourceId,
            })
          );
        }
      } catch {
        ws.send(
          JSON.stringify({
            type: 'error',
            message: 'Invalid realtime message',
          })
        );
      }
    });

    ws.on('close', async () => {
      if (subscribedChannel) {
        try {
          await redisSubscriber!.unsubscribe(
            subscribedChannel
          );
        } catch {
          // Connection is already closed.
        }
      }

      for (const subscriber of subscribers) {
        if (subscriber.ws === ws) {
          subscribers.delete(subscriber);
        }
      }
    });
  });

  console.log('[REALTIME] WebSocket server attached at /ws');

  return wss;
}