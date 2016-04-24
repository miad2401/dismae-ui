if (require('electron-squirrel-startup')) return;
var electron = require('electron');
var autoUpdater = require('electron').autoUpdater;
var app = require('app');
var BrowserWindow = require('browser-window');
var ipc = require("electron").ipcMain;
var fs = require("fs");
var config = {projects: []};
var userData = app.getPath("userData");
var configFile = app.getPath("userData") + '/config.json';
var os = require("os");

const UPDATE_SERVER_HOST = "dismae-update-server.herokuapp.com"

function checkUpdates() {
  if (os.platform() === "linux") {
    return;
  }

  const version = app.getVersion();
  autoUpdater.addListener("update-available", function (event) {
    mainWindow.webContents.send('updater', "A new update is available");
    console.log("A new update is available")
  })
  autoUpdater.addListener("update-downloaded", function (event, releaseNotes, releaseName, releaseDate, updateURL) {
    mainWindow.webContents.send('updater', "A new update is ready to install" + `Version ${releaseName} is downloaded and will be automatically installed on Quit`);
    console.log("A new update is ready to install", `Version ${releaseName} is downloaded and will be automatically installed on Quit`)
  })
  autoUpdater.addListener("error", function (event, message) {
    mainWindow.webContents.send('updater', message);
    console.log(message)
  })
  autoUpdater.addListener("checking-for-update", function (event) {
    mainWindow.webContents.send('updater', "checking-for-update");
    console.log("checking-for-update")
  })
  autoUpdater.addListener("update-not-available", function () {
    mainWindow.webContents.send('updater', "update-not-available");
    console.log("update-not-available")
  })
  mainWindow.webContents.send('updater', "setting feed url to: " + `https://${UPDATE_SERVER_HOST}/update/${os.platform()}_${os.arch()}/${version}`);
  autoUpdater.setFeedURL(`https://${UPDATE_SERVER_HOST}/update/${os.platform()}_${os.arch()}/${version}`)
  autoUpdater.checkForUpdates()
}


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;

function writeConfig(config) {
  fs.writeFileSync(configFile, JSON.stringify(config), 'utf8');
}

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  app.quit();
});

ipc.on('update-config', function(event, conf) {
  writeConfig(conf);
});

app.on('ready', function() {
  //get screen info
  var electronScreen = electron.screen;
  var size = electronScreen.getPrimaryDisplay().bounds;
  var windowSize = {};

  windowSize.width = 1024;
  windowSize.height = 576;

  // Create the browser window.
  mainWindow = new BrowserWindow({title: 'Dismae ' + app.getVersion(), width: windowSize.width, height: windowSize.height, x:0, y:0, resizable: true, useContentSize: true});

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/index.html');

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  mainWindow.focus();

  //load config file
  try {
    stats = fs.lstatSync(userData);
  } catch (e) {
    fs.mkdirSync(userData);
  }
  try {
    stats = fs.lstatSync(configFile);
    config = require(configFile);
  } catch (e) {}

  mainWindow.webContents.on('did-finish-load', function() {
    config.uiVersion = app.getVersion();
    mainWindow.webContents.send('config-loaded', config);
    checkUpdates(mainWindow);
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
});
