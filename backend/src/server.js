require('dotenv').config();

const MongoStore = require('connect-mongo');
const { createApp } = require('./app');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { loadEnv } = require('./config/env');

const env = loadEnv();
let server;

async function start() {
  await connectDatabase(env.MONGODB_URI);
  const sessionStore = MongoStore.create({ mongoUrl: env.MONGODB_URI });
  const app = createApp({
    frontendOrigin: env.FRONTEND_ORIGIN,
    nodeEnv: env.NODE_ENV,
    sessionSecret: env.SESSION_SECRET,
    sessionMaxAgeMs: env.SESSION_MAX_AGE_MS,
    uploadMaxBytes: env.UPLOAD_MAX_BYTES,
    sessionStore,
  });

  server = app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
  });
}

async function shutdown(signal) {
  console.log(`${signal} received, shutting down.`);
  if (server) {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
  await disconnectDatabase();
}

process.on('SIGINT', () => shutdown('SIGINT').catch(console.error));
process.on('SIGTERM', () => shutdown('SIGTERM').catch(console.error));

start().catch((error) => {
  console.error('Unable to start the API.', error);
  process.exitCode = 1;
});
