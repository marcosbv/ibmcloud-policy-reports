
let utils = require('./utils.js')
let resourceNameList = process.argv.length > 1 ? process.argv.slice(2) : []

// Load main objects

let resources = utils.loadResources()
console.log(`Loaded ${resources.size} resources.`)


let resourcesToCheck = []

resources.forEach(function(resource, key) {
    if(resourceNameList.length > 0) {
        if(resourceNameList.indexOf(resource.name) >= 0) {
            resourcesToCheck.push(resource)
        }
    } else {
        resourcesToCheck.push(resource)
    }
})

if(resourcesToCheck.length == 0) {
    console.log("Resource not found")
    process.exit(1)
}

resources = null
delete resources

let users = utils.loadUsers()
let policies = utils.loadPolicies()
let accessGroups = utils.loadAccessGroups()
let resourceGroups = utils.loadResourceGroups()

console.log(`Loaded ${policies.size} policies.`)

for(let i=0; i<resourcesToCheck.length; i++) {
    let r = resourcesToCheck[i]
    console.log(`*** Resource: ${r.name} (${r.id})`)
    let policiesForResource = utils.policiesByResource(r, policies)
    let usersToCheck = []
    policiesForResource.forEach(function(policy, key) {
       if(policy.subject.indexOf("IBMid") >= 0) {
           if(usersToCheck.indexOf(policy.subject) == -1) {
             usersToCheck.push(policy.subject)
           }
       }

       if(policy.subject.indexOf("AccessGroup") >= 0) {
           let accessGroup = accessGroups.get(policy.subject) 
           if(accessGroup ==null) {
               return
           }

           let agMembers = accessGroup.members

           for(let l=0;l<agMembers.length;l++) {
               if(agMembers[l].indexOf("IBMid") >=0 && usersToCheck.indexOf(agMembers[l]) == -1) {
                   usersToCheck.push(agMembers[l])
               }
           }
       }
    })

    
    for(let j=0;j<usersToCheck.length;j++) {
       let userId = usersToCheck[j]
       let user = users.get(userId)

       if(user == null) {
           continue
       }
       console.log(`     USER: ${user.name} (${user.email})`)

       let policiesForUser = utils.policiesForUser(user, accessGroups, policiesForResource);
       policiesForUser.forEach(function(userPolicy, key) {
           console.log(`          Policy: Subject=${userPolicy.subject.indexOf("AccessGroup") >=0 ? accessGroups.get(userPolicy.subject).name : user.name}  Roles=${userPolicy.roles} (${userPolicy.id})`)
       })

       console.log(`     (${policiesForUser.length} policies)`)
    }

    console.log("\n     SERVICE IDS:")
    policiesForResource.forEach(function(policy, key) {
        if(policy.subject.indexOf("ServiceId") >= 0) {
            console.log(`          Policy: Subject=${policy.subject}  Roles=${policy.roles} (${policy.id})`)
        }
    })

    console.log("\n     ALL POLICIES FOR RESOURCE:")
    policiesForResource.forEach(function(policy, key) {
            console.log(`     Policy: Id=${policy.id} Subject=${policy.subject} Roles=${policy.roles} 
             Target=[Service: ${policy.service_type}, Region: ${policy.region}, ${resourceGroups.get(policy.resource)!=null ? "ResourceGroup" : "Resource"}: ${resourceGroups.get(policy.resource)!=null ? resourceGroups.get(policy.resource).name : policy.resource}]`)
    })
    console.log(`(${usersToCheck.length} users, ${policiesForResource.length} policies)`)
}
