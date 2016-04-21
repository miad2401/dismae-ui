var process = require('process');
var ipc = require('electron').ipcRenderer;
const dialog = require('electron').remote.dialog;
var dismae = require('dismae');
var config;

var app = new Vue({
  el: '#app',
  data: {
    projects: []
  },
  methods: {
    updateProjectList: function updateProjectList(projects) {
      this.projects = projects;
    },
    addProject: function addProject(paths) {
      if(paths){
        config.projects.push(paths[0]);
        this.projects = config.projects;

        ipc.send('update-config', config);
      }
    },
    removeProject: function removeProject(index) {
      config.projects.splice(index, 1);
      this.projects = config.projects;
      ipc.send('update-config', config);
    },
    startProject: function startProject(path) {
      var config = require(path + '/config');
      config.gameDir = path;
      var game = dismae(config);
      game.start();
    },
    addProjectDialog: function addProjectDialog() {
      dialog.showOpenDialog({
          title: 'Choose Project Directory',
          properties: ['openDirectory', 'createDirectory']
        },
        this.addProject
      );
    }
  }
});

ipc.on('config-loaded', function(event, conf) {
  config = conf;
  app.updateProjectList(config.projects);
});
