const electron = require('electron')

var ipc = electron.ipcRenderer
const dialog = electron.remote.dialog
var Dismae = require('dismae')
var config
var fs = require('fs')
var request = require('request')
var progress = require('request-progress')
const shell = electron.shell
var path = require('path')
const decompress = require('decompress')

window.Vue.directive('mdl', {
  bind: function () {
    window.componentHandler.upgradeElement(this.el)
  }
})

window.Vue.directive('progress', function (val) {
  // The directive may be called before the element have been upgraded
  if (!this.el.MaterialProgress) {
    window.componentHandler.upgradeElement(this.el)
  }

  this.el.MaterialProgress.setProgress(val)
})

window.Vue.filter('formatBytes', function (value) {
  value = Number(value)
  if (value > 1000000) {
    return Math.round(value / 10000) / 100 + ' MB'
  } else if (value > 1000) {
    return Math.round(value / 10) / 100 + ' kB'
  } else {
    return value + ' Bytes'
  }
})

var app = new window.Vue({
  el: '#app',
  data: {
    projects: [],
    status: null,
    uiVersion: null,
    create: false,
    updateMessage: null,
    progress: {percentage: 0, speed: 0},
    path: path
  },
  methods: {
    openLink: function openLink (link) {
      shell.openExternal(link)
    },
    updateProjectList: function updateProjectList (projects) {
      this.projects = projects
    },
    updateUIVersion: function updateUIVersion (uiVersion) {
      this.uiVersion = uiVersion
    },
    setUpdaterMessage: function setUpdaterMessage (message) {
      this.updateMessage = message
    },
    addProject: function addProject (paths) {
      function isHiddenFile (file) {
        return !file.startsWith('.')
      }

      var _this = this
      if (paths) {
        fs.readdir(paths[0], function (err, files) {
          if (err) {
            console.log(err)
          // throw error
          } else {
            var nonHiddenFiles = files.filter(isHiddenFile)
            if (nonHiddenFiles.length > 0) {
              // there's files in it, so assume it's a legit project and check if the config can be loaded
              var configFile = require(paths[0] + '/config.json')
              if (configFile) {
                // it's legit
                config.projects.push(paths[0])
                this.projects = config.projects

                ipc.send('update-config', config)
                _this.create = false
              } else {
                // throw an error
              }
            } else {
              _this.status = 'Downloading base project...'
              _this.create = false
              progress(request('https://github.com/Dischan/dismae-base/archive/0.0.5.zip', function () {
                _this.projects = config.projects
                _this.status = 'Extracting...'
                _this.progress = null
                decompress(path.join(paths[0], 'base.zip'), paths[0], {strip: 1}).then(files => {
                  _this.status = null
                  fs.unlinkSync(path.join(paths[0], 'base.zip'))
                  config.projects.push(paths[0])
                  ipc.send('update-config', config)
                })
              }), {throttle: 300})
              .on('progress', function (state) {
                // The state is an object that looks like this:
                // {
                //     percentage: 0.5,           // Overall percentage (between 0 to 1)
                //     speed: 554732,             // The download speed in bytes/sec
                //     size: {
                //         total: 90044871,       // The total payload size in bytes
                //         transferred: 27610959  // The transferred payload size in bytes
                //     },
                //     time: {
                //         elapsed: 36.235,      // The total elapsed seconds since the start (3 decimals)
                //         remaining: 81.403     // The remaining seconds to finish (3 decimals)
                //     }
                // }
                _this.progress = state
              })
              .on('error', function (err) {
                console.log(err)
                // deal with the error
              })
              .pipe(fs.createWriteStream(path.join(paths[0], 'base.zip')))
            }
          }
        })
      }
    },
    createNew: function createNew () {
      this.create = true
    },
    cancelCreate: function cancelCreate () {
      this.create = false
    },
    removeProject: function removeProject (index) {
      config.projects.splice(index, 1)
      this.projects = config.projects
      ipc.send('update-config', config)
    },
    startProject: function startProject (path) {
      var _this = this
      delete require.cache[require.resolve(path + '/config.json')]
      var config = require(path + '/config.json')
      var game = new Dismae(config, path)
      game.on('progress', (event) => {
        _this.progress = event
      })

      game.on('update', (event) => {
        _this.progress = null
        switch (event) {
          case 'checking dependencies':
            _this.status = 'Checking dependencies...'
            break
          case 'downloading dependencies':
            _this.status = 'Downloading dependencies...'
            break
          case 'extracting files':
            _this.status = 'Extracting files...'
            break
          case 'cleaning':
            _this.status = 'Removing old build...'
            break
          case 'building':
            _this.status = 'Building...'
            break
          case 'starting':
            _this.status = 'Starting...'
            break
          case 'closed':
            _this.status = null
            break
        }
      })
      game.start()
    },
    addProjectDialog: function addProjectDialog () {
      dialog.showOpenDialog({
        title: 'Choose Project Directory',
        properties: ['openDirectory', 'createDirectory']
      },
        this.addProject
      )
    }
  }
})

ipc.on('config-loaded', function (event, conf) {
  config = conf
  app.updateProjectList(config.projects)
  app.updateUIVersion(config.uiVersion)
})

ipc.on('updater', function (event, msg) {
  app.setUpdaterMessage(msg)
})
