import { app, BrowserWindow } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname$1 = dirname(fileURLToPath(import.meta.url));
const preload = join(__dirname$1, "preload.js");
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Satisfactory Planner",
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(join(__dirname$1, "../dist/index.html"));
  }
}
app.on("window-all-closed", () => {
  win = null;
  if (process.platform !== "darwin") app.quit();
});
app.whenReady().then(createWindow);
