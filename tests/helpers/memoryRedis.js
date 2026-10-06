import { EventEmitter } from 'node:events';
// Deterministic transport double for coordinator unit tests, NOT a Redis server.
export function memoryRedisFactory() {
  const entries = new Map(),
    clients = new Set();
  return () => {
    const client = new EventEmitter();
    client.channels = new Set();
    clients.add(client);
    client.connect = async () => {};
    client.subscribe = async (...channels) => channels.forEach((c) => client.channels.add(c));
    client.get = async (key) => {
      const value = entries.get(key);
      if (value && value.expires > Date.now()) return value.value;
      entries.delete(key);
      return null;
    };
    client.set = async (key, value, ...options) => {
      if (options.includes('NX') && (await client.get(key))) return null;
      const px = options.indexOf('PX'),
        ex = options.indexOf('EX');
      entries.set(key, {
        value,
        expires: Date.now() + (px >= 0 ? options[px + 1] : ex >= 0 ? options[ex + 1] * 1000 : 1e12),
      });
      return 'OK';
    };
    client.publish = async (channel, raw) => {
      for (const c of clients)
        if (c.channels.has(channel)) queueMicrotask(() => c.emit('message', channel, raw));
      return 1;
    };
    client.eval = async (script, count, ...values) => {
      const keys = values.slice(0, count),
        args = values.slice(count);
      if ((await client.get(keys[0])) !== args[0]) return 0;
      if (script.includes('pexpire')) entries.get(keys[0]).expires = Date.now() + Number(args[1]);
      else if (script.includes("'del'")) entries.delete(keys[0]);
      else await client.set(keys[1], args[1], 'EX', 86400);
      return 1;
    };
    client.disconnect = () => {
      clients.delete(client);
      client.channels.clear();
    };
    return client;
  };
}
