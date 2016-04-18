var electron = require('electron');
var app = require('app');
var BrowserWindow = require('browser-window');
var ipc = require("electron").ipcMain;
var fs = require("fs");

var handleStartupEvent = function() {
  if (process.platform !== 'win32') {
    return false;
  }

  var squirrelCommand = process.argv[1];
  switch (squirrelCommand) {
    case '--squirrel-install':
    case '--squirrel-updated':

      // Optionally do things such as:
      //
      // - Install desktop and start menu shortcuts
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus

      // Always quit when done
      app.quit();

      return true;
    case '--squirrel-uninstall':
      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers

      // Always quit when done
      app.quit();

      return true;
    case '--squirrel-obsolete':
      // This is called on the outgoing version of your app before
      // we update to the new version - it's the opposite of
      // --squirrel-updated
      app.quit();
      return true;
  }
};

if (handleStartupEvent()) {
  return;
}

var config = {projects: []};
var userData = app.getPath("userData");
var configFile = app.getPath("userData") + '/config.json';

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

ipc.on('add-project', function(event, arg) {
  config.projects.push(arg);
  writeConfig(config);
});

app.on('ready', function() {
  //get screen info
  var electronScreen = electron.screen;
  var size = electronScreen.getPrimaryDisplay().bounds;
  var windowSize = {};

  windowSize.width = 1024;
  windowSize.height = 576;

  // Create the browser window.
  mainWindow = new BrowserWindow({width: windowSize.width, height: windowSize.height, x:0, y:0, resizable: true, useContentSize: true});

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
    mainWindow.webContents.send('config-loaded', config);
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
});
