// Minimal structured (JSON) logger. Never log passwords, tokens, or file contents.
const write = (level, msg, meta) =>
  console[level === 'error' ? 'error' : 'log'](
    JSON.stringify({ level, time: new Date().toISOString(), msg, ...meta })
  );

const quiet = () => process.env.NODE_ENV === 'test';

export const logger = {
  info: (msg, meta) => !quiet() && write('info', msg, meta),
  warn: (msg, meta) => !quiet() && write('warn', msg, meta),
  error: (msg, meta) => !quiet() && write('error', msg, meta),
};