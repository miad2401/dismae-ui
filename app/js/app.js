var process = require('process');
var ipc = require('electron').ipcRenderer;
const dialog = require('electron').remote.dialog;
var dismae = require('dismae');
var config;
var fs = require("fs");
var path = require('path');
var Download = require('download');

var app = new Vue({
  el: '#app',
  data: {
    projects: [],
    status: null,
    uiVersion: null
  },
  methods: {
    updateProjectList: function updateProjectList(projects) {
      this.projects = projects;
    },
    updateUIVersion: function updateUIVersion(uiVersion) {
      console.log(uiVersion);
      this.uiVersion = uiVersion;
    },
    addProject: function addProject(paths) {
      if(paths){
        config.projects.push(paths[0]);
        this.projects = config.projects;

        ipc.send('update-config', config);
      }
    },
    createProject: function createProject(paths) {
      var _this = this;
      if(paths){
        fs.readdir(paths[0], function(err, files){
          if(err){
            console.log(err);
            //throw error
          } else {
            function isHiddenFile(file) {
              return !file.startsWith('.');
            }
            var nonHiddenFiles = files.filter(isHiddenFile);
            if(nonHiddenFiles.length > 0) {
              console.log(files);
              //throw error (must be empty directory)
            } else {
              _this.status = 'Downloading and extracting base project...';
              var zipPath = path.join(paths[0], 'base.zip');
              new Download({mode: '755', extract: true, strip: 1})
              .get('https://github.com/Dischan/dismae-base/archive/master.zip')
              .dest(paths[0])
              .run(function(){
                config.projects.push(paths[0]);
                this.projects = config.projects;

                ipc.send('update-config', config);
                _this.status = null;
              });
            }
          }
        })
      }
    },
    removeProject: function removeProject(index) {
      config.projects.splice(index, 1);
      this.projects = config.projects;
      ipc.send('update-config', config);
    },
    startProject: function startProject(path) {
      var _this = this;
      var config = require(path + '/config');
      config.gameDir = path;
      var game = new dismae(config);
      game.on('update', (event) => {
        switch(event) {
          case 'checking dependencies':
            _this.status = 'Checking dependencies...';
          break;
          case 'downloading dependencies':
            _this.status = 'Downloading dependencies...';
          break;
          case 'extracting files':
            _this.status = 'Extracting files...';
          break;
          case 'cleaning':
            _this.status = 'Removing old build...';
          break;
          case 'building':
            _this.status = 'Building...';
          break;
          case 'starting':
            _this.status = 'Starting';
          break;
          case 'closed':
            _this.status = null;
          break;
        }
      });
      game.start();
    },
    addProjectDialog: function addProjectDialog() {
      dialog.showOpenDialog({
          title: 'Choose Project Directory',
          properties: ['openDirectory', 'createDirectory']
        },
        this.addProject
      );
    },
    createProjectDialog: function createProjectDialog() {
      dialog.showOpenDialog({
          title: 'Choose Project Directory',
          properties: ['openDirectory', 'createDirectory']
        },
        this.createProject
      );
    }
  }
});

ipc.on('config-loaded', function(event, conf) {
  config = conf;
  app.updateProjectList(config.projects);
  app.updateUIVersion(config.uiVersion);
});

ipc.on('updater', function(event, msg) {
  console.log(msg);
});
