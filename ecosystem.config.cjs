module.exports = {
  apps: [
    {
      name: "gabe manager.",
      script: "dist/pm2/ext.js",
      autorestart: true,
      exp_backoff_restart_delay: 1000,
      watch: false,
      exec_mode: "fork",
    },
  ],
};
