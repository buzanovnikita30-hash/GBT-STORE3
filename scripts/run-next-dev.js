const { spawn } = require("child_process");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const cleanScript = path.join(projectRoot, "scripts", "clean-next.js");

const clean = spawn(process.execPath, [cleanScript], {
  cwd: projectRoot,
  stdio: "inherit",
  env: process.env,
});

clean.on("exit", (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
    return;
  }

  const devPort = process.env.PORT || "3000";
  const devHost = process.env.HOST || "127.0.0.1";

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

