module.exports = {
  apps: [
    {
      name: "satroster-2026",
      script: "./server.js",
      env: {
        NODE_ENV: "production",
        PORT: 6175,
      },
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "200M",
    },
    {
      name: "satroster-frontend",
      script: "npm",
      args: "run dev -- --host 0.0.0.0 --port 6176",
      env: {
        NODE_ENV: "development",
        PORT: 6175,
        SATROSTER_BACKEND_PORT: 6175,
      },
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "200M",
    },
  ],
};
