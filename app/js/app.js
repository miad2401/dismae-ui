var process = require('process');
var ipc = require('electron').ipcRenderer;
const dialog = require('electron').remote.dialog;
var dismae = require('dismae');

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
        ipc.send('add-project', paths[0]);
      }
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

ipc.on('config-loaded', function(event, config) {
  app.updateProjectList(config.projects);
});
