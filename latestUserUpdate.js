let utils = require('./utils.js')

let https = require('https')
let now = new Date()

let users = utils.loadUsers()

let programParams = utils.extractParameters(process.argv)

var params = {
    url : "https://api.eu-de.logging.cloud.ibm.com/v1/export",
    filters : "action:user-management.user.update",
    service_key: programParams.args[0],
    regex: "user"
}

var params2 = {
    url : "https://api.eu-de.logging.cloud.ibm.com/v1/export",
    filters : "action:user-management.user.create",
    service_key: programParams.args[0],
    regex: "user"
}

let timestamp = now.getTime() - 2592000000;
let userLogins = new Map()

utils.output(programParams.format, `Loaded ${users.size} users.`)
let usersArr= []

users.forEach(function(user, key) {
    usersArr.push(user)
})

mainLoop(usersArr)

async function mainLoop(usersArr) {
    // CSV header
    utils.output(programParams.format,"", ["User", "Email", "Status", "Last Update", "Last Invite"])
    for(let i=0;i<usersArr.length;i++) {
        let user = usersArr[i]
        try {
            let lastUpdate = await collectLogDNARecord(user.id, params)
            let lastInvite = await collectLogDNARecord(user.email, params2)

            utils.output(programParams.format, `User: ${user.name} (${user.email})\nStatus: ${user.state} Latest Update: ${lastUpdate} Latest Invite: ${lastInvite}\n`,
                  [user.name, user.email, user.state, lastUpdate, lastInvite ])
        } catch(e) {
            console.log(e.message)
            return;
        }
        
        utils.output(programParams.format, "-----------")
    }
}

async function collectLogDNARecord(user, p) {
   
    return promise = new Promise(function(resolve,reject) {
        let newUrl = `${params.url}?prefer=tail&to=${now.getTime()}&from=${timestamp}&query=${encodeURIComponent(p.filters + " target.name:" + user)}&size=1`
        let options = {
            method : 'GET',
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
                let lastLogin = null
                if(data=="") {
                    lastLogin = "no LogDNA record"
                   // console.log(`User: ${user.name} (${user.email})\nLast token refresh: no LogDNA record`)
                   // resolve()
                } else {
                    let logMetrics = JSON.parse(data)
                    // console.log(logMetrics)
                    // console.log(typeof logMetrics)
                    delete buffer
                    buffer = null;

                    if(logMetrics.error) {
                        reject(new Error(logMetrics.error))
                        return;
                    }
                    
                    let timestamp = new Date(logMetrics._ts).toISOString()
                    lastLogin = timestamp
                    // console.log(`User: ${user.name} (${user.email})\nLast token refresh: ${timestamp}`)
                   // resolve(logMetrics)
                }

                resolve(lastLogin)
              
            })
           
           
            // console.log(logMetrics)
        })

        req.on('error', (e) => {
            reject(e)
        });
        req.end();

    })
    
}