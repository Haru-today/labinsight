const path = require("path");
const { app, BrowserWindow, shell } = require("electron");

let mainWindow;
let localServer;
let localAddress;

async function createWindow() {
  if (!localServer) {
    process.env.LABINSIGHT_DATA_DIR = path.join(app.getPath("userData"), "data");
    const serverModule = require("../server");
    localServer = serverModule.server;
    localAddress = await serverModule.startServer(0, "127.0.0.1");
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 390,
    minHeight: 640,
    backgroundColor: "#f6f8fb",
    show: false,
    title: "LabInsight",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (process.platform !== "darwin") mainWindow.removeMenu();
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("mailto:")) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const target = new URL(url);
    if (target.origin === `http://127.0.0.1:${localAddress.port}`) return;
    event.preventDefault();
    if (target.protocol === "https:" || target.protocol === "mailto:") shell.openExternal(url);
  });
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  await mainWindow.loadURL(`http://127.0.0.1:${localAddress.port}/?desktop=1`);
}

app.whenReady().then(createWindow).catch((error) => {
  console.error(error);
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (localServer?.listening) localServer.close();
});
