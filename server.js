import 'dotenv/config';
import app from './src/app.js';
import { connectDatabase } from './src/config/database.js';
import { createServer } from 'node:http';
import { attachRooms } from './src/routes/socket.js';
import { jwtKey } from './src/services/tokenService.js';

jwtKey();

const server = createServer(app);

attachRooms(server);

connectDatabase().catch((error) =>
  console.error('MongoDB startup connection failed:', error.message),
);

if (!process.env.VERCEL) {
  const port = process.env.PORT || 3000;

  server.listen(port, '0.0.0.0', () => {
    console.log(`Playroom: http://localhost:${port}`);
  });

  process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
  });
}

export default server;
