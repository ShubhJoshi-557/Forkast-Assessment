module.exports = {
  apps: [
    {
      // This is your main API Gateway
      name: 'api-cluster',
      script: 'dist/src/main.js',
      instances: 'max', // Run in cluster mode on all available cores
      exec_mode: 'cluster',
    },
    {
      // This is your dedicated Matching Engine service
      name: 'matching-engine',
      script: 'dist/src/matching/matching.engine.main.js',
      instances: 4, // Usually you run one dedicated matching engine
    },
    {
      // This is your dedicated Events/WebSocket consumer service
      name: 'events-service',
      script: 'dist/src/websocket/events.main.js',
      instances: 4,
    },
  ],
};
