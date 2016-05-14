const electron = require('electron')
const app = electron.app
var autoUpdater = electron.autoUpdater
var BrowserWindow = electron.BrowserWindow
var ipc = electron.ipcMain
var fs = require('fs')
var config = {projects: []}
var userData = app.getPath('userData')
var configFile = app.getPath('userData') + '/config.json'
var os = require('os')
var path = require('path')
var spawn = require('child_process').spawn

var run = function (args, done) {
  var updateExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe')
  spawn(updateExe, args, {
    detached: true
  }).on('close', done)
}

var check = function () {
  if (process.platform === 'win32') {
    var cmd = process.argv[1]
    var target = path.basename(process.execPath)

    if (cmd === '--squirrel-install' || cmd === '--squirrel-updated') {
      run(['--createShortcut=' + target + ''], app.quit)
      return true
    }
    if (cmd === '--squirrel-uninstall') {
      run(['--removeShortcut=' + target + ''], app.quit)
      return true
    }
    if (cmd === '--squirrel-obsolete') {
      app.quit()
      return true
    }
  }
  return false
}

if (check()) {
  return
}

const UPDATE_SERVER_HOST = 'dismae-update-server.herokuapp.com'

function checkUpdates () {
  var platform = os.platform()
  var url
  const version = app.getVersion()

  if (platform === 'linux') {
    return
  } else if (platform === 'darwin') {
    url = `https://${UPDATE_SERVER_HOST}/update/darwin_x64/${version}`
  } else if (platform === 'win32') {
    url = `https://${UPDATE_SERVER_HOST}/update/win32/${version}`
  }

  autoUpdater.addListener('update-available', function (event) {
    mainWindow.webContents.send('updater', 'A new update is available. It will be downloaded in the background.')
    console.log('A new update is available')
  })
  autoUpdater.addListener('update-downloaded', function (event, releaseNotes, releaseName, releaseDate, updateURL) {
    mainWindow.webContents.send('updater', 'Dismae ' + `version ${releaseName} is downloaded and will be automatically installed on quit`)
    console.log('A new update is ready to install', `Version ${releaseName} is downloaded and will be automatically installed on Quit`)
  })
  autoUpdater.addListener('error', function (event, message) {
    mainWindow.webContents.send('updater', 'Up to Date')
    console.log(message)
  })
  autoUpdater.addListener('checking-for-update', function (event) {
    mainWindow.webContents.send('updater', 'Checking for update...')
    console.log('checking-for-update')
  })
  autoUpdater.addListener('update-not-available', function () {
    mainWindow.webContents.send('updater', 'Up to Date')
    console.log('update-not-available')
  })
  mainWindow.webContents.send('updater', 'setting feed url to: ' + url)
  autoUpdater.setFeedURL(url)
  autoUpdater.checkForUpdates()
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null

function writeConfig (config) {
  fs.writeFileSync(configFile, JSON.stringify(config), 'utf8')
}

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  app.quit()
})

ipc.on('update-config', function (event, conf) {
  writeConfig(conf)
})

app.on('ready', function () {
  // get screen info
  var windowSize = {}

  windowSize.width = 1024
  windowSize.height = 576

  // Create the browser window.
  mainWindow = new BrowserWindow({
    title: 'Dismae ' + app.getVersion(),
    width: windowSize.width,
    height: windowSize.height,
    x: 0,
    y: 0,
    resizable: true,
    useContentSize: true,
    show: false
  })

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/index.html')  // eslint-disable-line no-path-concat

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  mainWindow.focus()

  // load config file
  try {
    fs.lstatSync(userData)
  } catch (e) {
    fs.mkdirSync(userData)
  }
  try {
    fs.lstatSync(configFile)
    config = require(configFile)
  } catch (e) {}

  mainWindow.webContents.on('did-finish-load', function () {
    mainWindow.show()
    config.uiVersion = app.getVersion()
    mainWindow.webContents.send('config-loaded', config)
    checkUpdates(mainWindow)
  })

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
})
