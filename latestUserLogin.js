let utils = require('./utils.js')

let https = require('https')
let now = new Date()

let users = utils.loadUsers()
let accessGroups = utils.loadAccessGroups()

var params = {
    url : "https://api.eu-de.logging.cloud.ibm.com/v1/export",
    filters : "login user-refreshtoken",
    service_key: process.argv[2],
    regex: "user"
}

let timestamp = now.getTime() - 2592000000;
let userLogins = new Map()

console.log(`Loaded ${users.size} users.`)
let usersArr= []

users.forEach(function(user, key) {
    usersArr.push(user)
})

mainLoop(usersArr)

async function mainLoop(usersArr) {
    for(let i=0;i<usersArr.length;i++) {
        let user = usersArr[i]
        await collectLogDNARecord(user)
        console.log("-----------")
    }
}

async function collectLogDNARecord(user) {
   
    return promise = new Promise(function(resolve,reject) {
        let newUrl = `${params.url}?prefer=tail&to=${now.getTime()}&from=${timestamp}&query=${encodeURIComponent(params.filters + " " + user.email)}&size=1`
        let options = {
            method : 'POST',
            headers : {
               'Content-Type' : 'application/json',
               'Authorization' : 'Basic ' + Buffer.from(params.service_key + ':').toString('base64')
            }
        }
        
        let buffer=[];
        // console.log("Calling IAM Activity Tracker at " + newUrl)
        
        const req = https.request(newUrl, options,function(response) {
            response.on('data', function(chunk) {
                buffer.push(chunk)
            })
            response.on('end', function() {
                // console.log(Buffer.concat(buffer).toString())

                let data = Buffer.concat(buffer).toString().trim()
                if(data=="") {
                    console.log(`User: ${user.name} (${user.email})\nLast token refresh: no LogDNA record`)
                    resolve()
                } else {
                    let logMetrics = JSON.parse(data)
                    // console.log(logMetrics)
                    // console.log(typeof logMetrics)
                    delete buffer
                    buffer = null;
        
                    let message = logMetrics.message
                    let userM = message.substring(message.indexOf('refreshtoken') + 13)
                    let timestamp = new Date(logMetrics._ts).toISOString()
                    console.log(`User: ${user.name} (${user.email})\nLast token refresh: ${timestamp}`)
                    resolve(logMetrics)
                }
                
                let userAccessGroups = utils.groupsUserBelongsTo(user, accessGroups)
                let accessGroupNames = []
                for(let j=0;j<userAccessGroups.length;j++) {
                    let agID = userAccessGroups[j]
                    let accessGroup = accessGroups.get(agID)
                    accessGroupNames.push(accessGroup.name)
                }
    
                console.log("Groups: " + accessGroupNames.join(","))
              
            })
           
           
            // console.log(logMetrics)
        })

        req.on('error', (e) => {
            reject(e)
        });
        req.end();

    })
    
}