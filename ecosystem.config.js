module.exports = {
  apps: [{
    name: 'dramagen-ai',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/AI-DramaCut',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/www/AI-DramaCut/logs/pm2-error.log',
    out_file: '/var/www/AI-DramaCut/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // 合并日志
    merge_logs: true,
    // 日志轮转
    log_file_pattern: '/var/www/AI-DramaCut/logs/app-__DATE__.log',
  }]
};
