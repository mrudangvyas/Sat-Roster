import { spawn } from "node:child_process";
import process from "node:process";
import path from "node:path";
import net from "node:net";

const backendPort =
  process.env.SATROSTER_BACKEND_PORT ||
  process.env.VITE_BACKEND_PORT ||
  "6175";
const vitePort = process.env.VITE_PORT || "6176";

const children = [];
let stopping = false;
let poller = null;

const stopAll = () => {
  if (stopping) return;
  stopping = true;
  if (poller) clearInterval(poller);
  poller = null;
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
};

const onChildExit = (name, code) => {
  if (!stopping) {
    console.log(`[dev-full] ${name} exited with code ${code ?? "null"}. Stopping all.`);
    stopAll();
  }
};

const isPortInUse = (port) =>
  new Promise((resolve) => {
    const socket = net.createConnection({
      host: "127.0.0.1",
      port: Number(port),
    });
    socket.setTimeout(500);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
  });

const startBackendIfNeeded = async () => {
  const backendRunning = await isPortInUse(backendPort);
  if (backendRunning) {
    console.log(
      `[dev-full] backend port ${backendPort} already in use. Reusing existing backend.`,
    );
    return;
  }

  const backend = spawn(process.execPath, ["server.js"], {
    env: { ...process.env, PORT: backendPort },
    stdio: "inherit",
  });
  console.log(`[dev-full] starting backend on http://localhost:${backendPort}`);
  children.push(backend);
  backend.on("exit", (code) => onChildExit("backend", code));
  backend.on("error", (error) => {
    console.error(`[dev-full] backend failed to start: ${error.message}`);
    stopAll();
  });
};

const startVite = () => {
  const viteBin = path.join("node_modules", "vite", "bin", "vite.js");
  const vite = spawn(process.execPath, [viteBin, "--port", vitePort], {
    env: { ...process.env, SATROSTER_BACKEND_PORT: backendPort },
    stdio: "inherit",
  });
  console.log(
    `[dev-full] starting vite on http://localhost:${vitePort} (proxy -> ${backendPort})`,
  );
  children.push(vite);
  vite.on("exit", (code) => onChildExit("vite", code));
  vite.on("error", (error) => {
    console.error(`[dev-full] vite failed to start: ${error.message}`);
    stopAll();
  });
};

process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);

poller = setInterval(() => {
  if (!children.length) return;
  const alive = children.some((child) => child.exitCode === null);
  if (!alive) {
    process.exit(0);
  }
}, 250);

await startBackendIfNeeded();
setTimeout(startVite, 300);
