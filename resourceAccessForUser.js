
let utils = require('./utils.js')
let programParams = utils.extractParameters(process.argv)

let userNameList = programParams.args

// Load main objects

let users = utils.loadUsers()
utils.output(programParams.format, `Loaded ${users.size} users.`)


let usersToCheck = []

users.forEach(function(resource, key) {
    if(userNameList.length > 0) {
        if(userNameList.indexOf(resource.email) >= 0) {
            usersToCheck.push(resource)
        }
    } else {
        usersToCheck.push(resource)
    }
})

if(usersToCheck.length == 0) {
    console.log("User not found")
    process.exit(1)
}

users = null
delete users

let resources = utils.loadResources()
let policies = utils.loadPolicies()
let accessGroups = utils.loadAccessGroups()
let resourceGroups = utils.loadResourceGroups()

utils.output(programParams.format, `Loaded ${resources.size} resources.`)
utils.output(programParams.format, `Loaded ${policies.size} policies.`)

// CSV Header
utils.output(programParams.format, "", ["User Name", "Email", "Resource", "Policy ID", "Policy Subject", "Policy Target", "Policy Roles"])
for(let i=0; i<usersToCheck.length; i++) {
    let r = usersToCheck[i]
    utils.output(programParams.format, `*** User: ${r.name} (${r.email})`)
    let policiesForUser = utils.policiesForUser(r, accessGroups, policies)

    let checkedResources = 0
    resources.forEach(function(resource, key) {

        let policiesForResource = utils.policiesByResource(resource, policiesForUser);

        
        if(policiesForResource.length > 0) {
            utils.output(programParams.format, `     RESOURCE: ${resource.name} (${resource.id})`)
            policiesForResource.forEach(function(resourcePolicy, key) {
               // CSV line will be printed out HERE!
               utils.output(programParams.format, `          Policy: Subject=${resourcePolicy.subject.indexOf("AccessGroup") >=0 ? accessGroups.get(resourcePolicy.subject).name : resourcePolicy.subject}  Roles=${resourcePolicy.roles} (${resourcePolicy.id})`,
                            [
                               r.name, r.email, resource.name, resourcePolicy.id, 
                               resourcePolicy.subject.indexOf("AccessGroup") >=0 ? accessGroups.get(resourcePolicy.subject).name : resourcePolicy.subject,
                               `[Service: ${resourcePolicy.service_type}, Region: ${resourcePolicy.region}, ${resourceGroups.get(resourcePolicy.resource)!=null ? "ResourceGroup" : "Resource"}: ${resourceGroups.get(resourcePolicy.resource)!=null ? resourceGroups.get(resourcePolicy.resource).name : resourcePolicy.resource}]`,
                               resourcePolicy.roles.join(",")
                            ])
           })
           utils.output(programParams.format, `     (${policiesForResource.length} policies)`)
           checkedResources++
        }
    })

    /*
    console.log("\n     SERVICE IDS:")
    policiesForResource.forEach(function(policy, key) {
        if(policy.subject.indexOf("ServiceId") >= 0) {
            console.log(`          Policy: Subject=${policy.subject}  Roles=${policy.roles} (${policy.id})`)
        }
    })
*/
    utils.output(programParams.format, "\n     ALL POLICIES FOR USER:")
    policiesForUser.forEach(function(policy, key) {
        utils.output(programParams.format, `     Policy: Id=${policy.id} Subject=${policy.subject} Roles=${policy.roles} 
             Target=[Service: ${policy.service_type}, Region: ${policy.region}, ${resourceGroups.get(policy.resource)!=null ? "ResourceGroup" : "Resource"}: ${resourceGroups.get(policy.resource)!=null ? resourceGroups.get(policy.resource).name : policy.resource}]`)
    })
    utils.output(programParams.format, `(${checkedResources} resources, ${policiesForUser.length} policies)`)
}
