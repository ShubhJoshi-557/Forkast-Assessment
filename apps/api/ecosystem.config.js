module.exports = {
  apps: [
    {
      // This is your main API Gateway
      name: 'api-cluster',
      script: 'dist/src/main.js',
      instances: 4, // Reduced from 'max' to leave resources for matching engine
      exec_mode: 'cluster',
      node_args: '-r dotenv/config',
      max_memory_restart: '512M', // Limit memory per instance
    },
    {
      // This is your dedicated Matching Engine service
      name: 'matching-engine',
      script: 'dist/src/matching/matching.engine.main.js',
      instances: 1, // Keep single instance to prevent rebalancing
      exec_mode: 'fork', // Use fork mode for single instance
      node_args: '-r dotenv/config --max-old-space-size=2048', // Double memory allocation
      max_memory_restart: '2500M', // Increased memory limit for single instance
      min_uptime: '10s', // Minimum uptime before considering stable
      max_restarts: 5, // Maximum restarts in 1 minute
    },
    {
      // This is your dedicated Events/WebSocket consumer service
      name: 'events-service',
      script: 'dist/src/websocket/events.main.js',
      instances: 1, // Single instance to prevent rebalancing
      exec_mode: 'fork', // Use fork mode instead of cluster for single instance
      node_args: '-r dotenv/config --max-old-space-size=512', // Optimize memory usage
      max_memory_restart: '768M', // Reduced memory limit
      min_uptime: '10s', // Minimum uptime before considering stable
      max_restarts: 5, // Maximum restarts in 1 minute
    },
  ],
};
