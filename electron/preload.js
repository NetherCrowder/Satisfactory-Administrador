// Archivo de precarga de Electron
// Puedes exponer APIs nativas al motor JS del frontend aquí

window.ipcRenderer = require('electron').ipcRenderer;

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency])
  }
})
