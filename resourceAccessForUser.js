
let utils = require('./utils.js')
let userNameList = process.argv.length > 1 ? process.argv.slice(2) : []

// Load main objects

let users = utils.loadUsers()
console.log(`Loaded ${users.size} users.`)


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

console.log(`Loaded ${resources.size} resources.`)
console.log(`Loaded ${policies.size} policies.`)

for(let i=0; i<usersToCheck.length; i++) {
    let r = usersToCheck[i]
    console.log(`*** User: ${r.name} (${r.email})`)
    let policiesForUser = utils.policiesForUser(r, accessGroups, policies)

    /// continua

    let checkedResources = 0
    resources.forEach(function(resource, key) {

        let policiesForResource = utils.policiesByResource(resource, policiesForUser);

      
        if(policiesForResource.length > 0) {
           console.log(`     RESOURCE: ${resource.name} (${resource.id})`)
           policiesForResource.forEach(function(resourcePolicy, key) {
              console.log(`          Policy: Subject=${resourcePolicy.subject.indexOf("AccessGroup") >=0 ? accessGroups.get(resourcePolicy.subject).name : resourcePolicy.subject}  Roles=${resourcePolicy.roles} (${resourcePolicy.id})`)
           })
           console.log(`     (${policiesForResource.length} policies)`)
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
    console.log("\n     ALL POLICIES FOR USER:")
    policiesForUser.forEach(function(policy, key) {
            console.log(`     Policy: Id=${policy.id} Subject=${policy.subject} Roles=${policy.roles} 
             Target=[Service: ${policy.service_type}, Region: ${policy.region}, ${resourceGroups.get(policy.resource)!=null ? "ResourceGroup" : "Resource"}: ${resourceGroups.get(policy.resource)!=null ? resourceGroups.get(policy.resource).name : policy.resource}]`)
    })
    console.log(`(${checkedResources} resources, ${policiesForUser.length} policies)`)
}
