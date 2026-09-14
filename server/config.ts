import dotenv from 'dotenv';

// Firebase-backed modules can be evaluated before server.ts reaches its
// dotenv.config() call, so load environment variables at the configuration
// boundary as well.
dotenv.config();
