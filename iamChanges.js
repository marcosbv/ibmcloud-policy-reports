let utils = require('./utils.js')
const fs = require('fs')

let https = require('https')
let now = new Date()

let users = utils.loadUsers()
let accessGroups = utils.loadAccessGroups()
let policies = utils.loadPolicies()

let programParams = utils.extractParameters(process.argv)

var params = {
    url : "https://api.eu-de.logging.cloud.ibm.com/v1/export",
    filters : "action:user-management.user.create OR action:user-management.user.delete OR (action:iam-am.policy -action:iam-am.policy.read) OR action:iam-groups.member OR action:iam-groups.group.create OR action:iam-groups.group.update OR action:iam-groups.group.delete -failure",
    service_key: programParams.args[0],
}

let timestamp = now.getTime() - 2592000000;
let userLogins = new Map()

// utils.output(programParams.format, `Loaded ${users.size} users.`)

mainLoop()

async function mainLoop() {
    // CSV header
    utils.output(programParams.format,"", ["User", "Email", "Last Token Refresh", "Groups"])
    const actions = await collectLogDNARecord(params)

    const outputEvents = []
    const userMapping = new Map()

    for(const action of actions) {
        if(action.action == "iam-groups.member.update") {
            const previousId = action.requestData.previous_iam_id
            const nextId = action.requestData.next_iam_id

            userMapping.set(previousId, nextId)
        } 
    }


    for(const json of actions) {
        let obj = commonProperties(json)
        switch(json.action) {
            case "iam-groups.group.create": obj.details = processIAMGroups('create', json); break;
            case "iam-groups.group.delete": obj.details = processIAMGroups('delete', json); break;
            case "iam-groups.member.add" : obj.details = processIAMGroupAddMember(json, userMapping); break;
            case "iam-groups.member.delete" : obj.details = processIAMGroupDeleteMember(json, userMapping); break;
            case "iam-groups.member.update" : obj.details = processIAMGroupUpdateMember(json); break;
            case "user-management.user.create" : obj.details = processIAMUsers('add', json); break;
            case "user-management.user.delete" : obj.details = processIAMUsers('remove', json); break;
            case "iam-am.policy.update" : obj.details = processUpdatePolicy(json); break;
            case "iam-am.policy.create" : obj.details = processCreatePolicy(json); break;
            case "iam-am.policy.delete" : obj.details = await processDeletePolicy(json); break;
            default: break;
        }

        outputEvents.push(obj)
    }
   
    await fs.writeFileSync('./data/iamEvents.json',Buffer.from(JSON.stringify(outputEvents)))

}

function commonProperties(json) {
    return {
        action: json.action,
        eventTime : json.eventTime,
        author: json.initiator.name,
        event_id: `${json.correlationId}_${json.action}`,
        transaction_id: json.correlationId
    }
}

function processIAMGroups(actionName, json) {
    const targetName = json.target.name
    return {
        targetName: targetName,
        action: actionName,
        targetType: 'group',
        message: `Access Group ${actionName}d: ${targetName}`
    }
}

function processIAMGroupDeleteMember(json) {
    const targetName = json.target.name
    const user = users.get(json.responseData.iam_id)

    return {
        targetName: targetName,
        action: 'delete',
        targetType: 'group',
        message: `User ${user ? user : json.responseData.iam_id} deleted from Group ${targetName}`,
        member: user,
        iam_id: json.responseData.iam_id
    }
}

function processIAMGroupAddMember(json, userMapping) {
    const targetName = json.target.name
    const iam_id = json.requestData.iam_id || json.requestData.id
    
    let user = users.get(iam_id)
    if(!user) {
        const nextId = userMapping.get(iam_id)
        if(nextId) {
            user = users.get(nextId)
        }
    }

    return {
        targetName: targetName,
        action: 'add',
        targetType: 'group',
        message: `User ${user ? user.email : iam_id} added to Group ${targetName}`,
        member: user,
        iam_id: iam_id
    }
}

function processIAMGroupUpdateMember(json) {
    const targetId = json.target.id.split(':')
    const accessGroup = accessGroups.get(targetId[9])

    const targetName = accessGroup ? accessGroup.name : targetId[9]

    const iam_id = json.requestData.next_iam_id
    
    let user = users.get(iam_id)

    return {
        targetName: targetName,
        action: 'update',
        targetType: 'group',
        message: `User ${user ? user.email : iam_id} updated in Group ${targetName}`,
        member: user,
        iam_id: iam_id
    }
}

function processIAMUsers(actionName, json) {
    const user = users.get(json.target.name)
    const email = user ? user.email : json.target.name
    return {
        targetName: email,
        action: actionName,
        targetType: 'user',
        message: `User ${email} ${actionName}${actionName == 'add' ? 'ed' : 'd'} ${actionName == 'remove' ? 'from' : 'to'} account`
    }
}

function lookupPolicyOwner(policy) {
    if(!policy || policy == null) {
        return null
    }

    const subject = policy.subject
    let name = subject
    let type = "policy"

    if(subject.indexOf('AccessGroup') >= 0) {
        const accessGroup = accessGroups.get(subject)
        if(accessGroup) {
            name = accessGroup.name
            type = "group"
        }
    } else {
        const user = users.get(subject)
        if(user) {
            name = user.email
            type = "user"
        }
    }

    return {
        name: name,
        type: type
    };
}

function processUpdatePolicy(json) {
    const targetId = json.target.id.split(":")[9]
    const policy = policies.get(targetId)

    const initialValue = json.requestData.initialValue
    const finalValue = json.requestData.newValue

    const initialRoles = initialValue.roles
    const finalRoles = finalValue.roles

    const initialResources = initialValue.resources
    const finalResources = finalValue.resources

    //console.log(JSON.stringify(initialResources))
    //console.log(JSON.stringify(finalResources))

    const changeRoles = []
    if(initialRoles.length != finalRoles.length) {
        changeRoles.push(`Role Assign Change: from [${initialRoles.map(x => x.role_id.split(":")[9])}] to [${finalRoles.map(x =>  x.role_id.split(":")[9])}]`)
    } else {
        let found = []
        for(let i=0;i<initialRoles.length;i++) {
            const o = initialRoles[i].role_id
            let foundResource = false
            
            for(let j=0;j<finalRoles.length;j++) {
                const p = finalRoles[j].role_id
                if (p==o) {
                    foundResource = true
                    break;
                }

            }

            found.push(foundResource)

        }
        for(const foundResource of found) {
            if(!foundResource) {
                changeRoles.push(`Role Assign Change: from [${initialRoles.map(x => x.role_id.split(":")[9])}] to [${finalRoles.map(x => x.role_id.split(":")[9])}]`) 
                break;
            }
        }
        
    }

    if(initialResources[0].attributes.length != finalResources[0].attributes.length) {
         changeRoles.push(`Subject Assign Change: from [${initialResources[0].attributes.map(x => {return '(' + x.name + '=' + x.value + ')'})}] to [${finalResources[0].attributes.map(x => {return '(' + x.name + '=' + x.value + ')'})}]`)
    } else {
        let found = []
        for(let i=0;i<initialResources[0].attributes.length; i++) {
            const o = initialResources[0].attributes[i]

            let foundResource = false;
            for(let j=0;j<finalResources[0].attributes.length; j++) {
                const p = finalResources[0].attributes[j]
                if(p.name == o.name && p.value == o.value) {
                    foundResource = true;
                    break;
                }
            }

            found.push(foundResource)
        }

        for(const foundResource of found) {
            if(!foundResource) {
                changeRoles.push(`Subject Assign Change: from [${initialResources[0].attributes.map(x => {return '(' + x.name + '=' + x.value + ')'})}] to [${finalResources[0].attributes.map(x => {return '(' + x.name + '=' + x.value + ')'})}]`) 
                break;
            }
        }
        
    }

    

    const owner = lookupPolicyOwner(policy)
    return {
        targetName: owner == null ? targetId : owner.name,
        oldValue: initialValue,
        newValue: finalValue,
        action: 'update',
        targetType: owner == null ? 'policy' : owner.type,

        message: `Policy ${targetId} [${finalResources[0].attributes.map(x => {return '(' + x.name + '=' + x.value + ')'})}]: ${changeRoles.join(",")}`
    }


} 

async function policyGetRequest(url, token) {
    return new Promise((resolve, reject) => {
        let options = {
            method : 'GET',
            headers : {
               'Content-Type' : 'application/json',
               'Authorization' : 'Bearer ' + token
            }
        }
        
        let buffer=[];
        // console.log("Calling IAM Activity Tracker at " + newUrl)
        
        const req = https.request(url, options,function(response) {
            response.on('data', function(chunk) {
                buffer.push(chunk)
            })
            response.on('end', function() {
                const result = JSON.parse(buffer.toString())
                resolve(result)
            })
        })

        req.on('error', (e) => {
            reject(e)
        });
        req.end();
        
    })
}
async function processDeletePolicy(json) {
    const targetId = json.target.id.split(":")[9]
    const url = json.requestData.url

    const token = process.env.TOKEN

    let policy = null;
    try {
        policy = await policyGetRequest(url, token)
        policy.subject = policy.subjects[0].attributes[0].value
    } catch(err) {
        policy = null
    }

    //console.log(policy)
    const owner = lookupPolicyOwner(policy)

    return {
        targetName: owner == null ? targetId : owner.name,
        oldValue: policy,
        action: 'delete',
        targetType: owner == null ? 'policy' : owner.type,
        message: `Policy ${targetId} deleted ${policy != null ? ': Attributes : [' + policy.resources[0].attributes.map(x => {return '(' + x.name + '=' + x.value + ')'}) + ']'
        + ' Roles: [' + policy.roles.map(x => x.role_id.split(":")[9]) + ']' : ''}`
    }
    
}

function processCreatePolicy(json) {
    const targetId = json.target.id.split(":")[9]
    const requestData = json.requestData.body
    const policy = {
        subject: requestData.subjects[0].attributes[0].value
    }

    const owner = lookupPolicyOwner(policy)
    return {
        targetName: owner == null ? targetId : owner.name,
        newValue: requestData,
        action: 'create',
        targetType: owner == null ? 'policy' : owner.type,
        message: `Policy ${targetId} created: Attributes: [${requestData.resources[0].attributes.map(x => {return '(' + x.name + '=' + x.value + ')'})}] Roles: [${requestData.roles.map(x => x.role_id.split(":")[9])}]`
    }
}

async function collectLogDNARecord(params) {
   
    return promise = new Promise(function(resolve,reject) {
        let newUrl = `${params.url}?prefer=tail&to=${now.getTime()}&from=${timestamp}&query=${encodeURIComponent(params.filters)}&size=20000`
        let options = {
            method : 'GET',
            headers : {
               'Content-Type' : 'application/json',
               'Authorization' : 'Basic ' + Buffer.from(params.service_key + ':').toString('base64')
            }
        }
        
        let buffer=[];
        // console.log("Calling IAM Activity Tracker at " + newUrl)
        
        const actions = []
        const req = https.request(newUrl, options,function(response) {
            response.on('data', function(chunk) {
                buffer.push(chunk)
            })
            response.on('end', function() {
                // console.log(Buffer.concat(buffer).toString())

                let data = Buffer.concat(buffer).toString().trim().split('\n')
                let lastLogin = null
                if(data!="") {
                    
                   // console.log(`User: ${user.name} (${user.email})\nLast token refresh: no LogDNA record`)
                   // resolve()
                
                    for(const line of data) {
                        const jsonB = JSON.parse(line)
                       
                        const json = JSON.parse(jsonB._line)
                        actions.push(json)
                    }
                    
                }

                resolve(actions) 
              
            })
           
           
            // console.log(logMetrics)
        })

        req.on('error', (e) => {
            reject(e)
        });
        req.end();

    })
    
}