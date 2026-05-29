import { startServer } from './server/http.server.js';

const port = Number(process.env.PORT) || 4000;

startServer(port).catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});
