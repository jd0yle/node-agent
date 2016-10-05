#!/usr/bin/env node
const fs = require('fs');
const updateNotifier = require('update-notifier');
const ScreepsAPI = require('screeps-api')
const request = require('request')
const editor = require('editor')
const pkg = require('./package.json');
let api = new ScreepsAPI()
let setupRan = false

if(process.argv[2] == 'test') process.exit(0) // Placeholder ;)

let {file,config} = loadConfig()
if(config)
  start()
else
  setup()

function start(){
  if(config.sampleConfig || !config.screeps || !config.service){
    console.log(file,"doe not have a valid config")
    return setup()
  }
  if(config.checkForUpdates)
    updateNotifier({pkg}).notify();
  api.auth(config.screeps.username,config.screeps.password,(res)=>{
    console.log(res,'Authenticated')
    tick()
    setInterval(tick,15000)
  })
}
function tick(){
  Promise.resolve()
    .then(()=>console.log('Fetching Stats'))
    .then(()=>api.memory.get('stats'))
    .then(pushStats)
    .catch(err=>console.error(err))
}

function pushStats(stats){
  if(!stats) return console.log('No stats found, is Memory.stats defined?')
  if(config.showRawStats) console.log('Stats:',JSON.stringify(stats,null,3))
  console.log('Pushing stats')
  let sconfig = config.service
  request({
    method: 'POST',
    url: sconfig.url + '/api/stats/submit',
    auth: {
      user: 'token',
      pass: sconfig.token
    },
    json: true,
    body: stats
  },(err,res,data)=>{
    console.log('Result:',data)
    if(err) console.error(err)
  })
}

function setup(){
  if(setupRan){
    console.log('Agent not configured. Did you forget to edit the config?')
    process.exit()
  }
  setupRan = true
  let path = getConfigPaths().create
  if(path){
    fs.writeFileSync(path,fs.readFileSync(__dirname + '/config.js.sample'))
    editor(path,(code)=>{
      if(!code) start()
    })
  }else{
    console.log('Please setup config.js before running.')
  }
}

function getConfigPaths(){
  let paths = [
    './config'
  ]
  let create = ''
  if(process.platform == 'linux'){
    create = `${process.env.HOME}/.screepsplus-agent`
    paths.push(create)
    paths.push(`/etc/screepsplus-agent/config.js`)
  }
  create = ''
  return { paths, create }
}


function loadConfig(){
  let {paths} = getConfigPaths()
  for(let i in paths){
    let file = paths[i]
    try{
      // console.log('Try',file)
      let config = require(file)
      // console.log(config)
      return { config, file }
    }catch(e){}
  }
  return false
}