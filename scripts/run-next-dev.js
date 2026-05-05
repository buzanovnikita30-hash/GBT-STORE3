const { spawn } = require("child_process");
const net = require("net");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const cleanScript = path.join(projectRoot, "scripts", "clean-next.js");

function canListenOnPort(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

async function getAvailablePort(startPort, host, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const candidate = startPort + i;
    // eslint-disable-next-line no-await-in-loop
    const isFree = await canListenOnPort(candidate, host);
    if (isFree) {
      return String(candidate);
    }
  }

  throw new Error(`No free port found from ${startPort} to ${startPort + maxAttempts - 1}`);
}

const clean = spawn(process.execPath, [cleanScript], {
  cwd: projectRoot,
  stdio: "inherit",
  env: process.env,
});

clean.on("exit", async (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
    return;
  }

  const devHost = process.env.HOST || "127.0.0.1";
  const basePort = Number(process.env.PORT || "3000");

  let devPort;
  try {
    devPort = await getAvailablePort(basePort, devHost);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
    return;
  }

  if (devPort !== String(basePort)) {
    console.log(`Port ${basePort} is busy, starting dev server on ${devPort}`);
  }

  const dev = spawn(process.execPath, [nextBin, "dev", "-p", devPort, "-H", devHost], {
    cwd: projectRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      WATCHPACK_POLLING: "true",
      CHOKIDAR_USEPOLLING: "1",
      CHOKIDAR_INTERVAL: "500",
    },
  });

  dev.on("exit", (devCode) => process.exit(devCode ?? 0));
});

