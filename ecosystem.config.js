module.exports = {
  apps: [{
    name: 'gibby-chat',
    script: 'npm',
    args: 'start',
    env: {
      PORT: 3000,
      NODE_ENV: 'production'
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    time: true,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}