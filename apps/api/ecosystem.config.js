module.exports = {
  apps: [
    {
      // This is your main API Gateway
      name: 'api-cluster',
      script: 'dist/src/main.js',
      instances: 'max', // Run in cluster mode on all available cores
      exec_mode: 'cluster',
      node_args: '-r dotenv/config',
    },
    {
      // This is your dedicated Matching Engine service
      name: 'matching-engine',
      script: 'dist/src/matching/matching.engine.main.js',
      instances: 4, // Usually you run one dedicated matching engine
      node_args: '-r dotenv/config',
    },
    {
      // This is your dedicated Events/WebSocket consumer service
      name: 'events-service',
      script: 'dist/src/websocket/events.main.js',
      instances: 4,
      node_args: '-r dotenv/config',
    },
  ],
};
