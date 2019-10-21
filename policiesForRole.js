let utils = require('./utils.js')
let roles = process.argv.length > 1 ? process.argv.slice(2) : []

// Load main objects

let policies = utils.loadPolicies()
let users = utils.loadUsers()
let accessGroups = utils.loadAccessGroups()
let resourceGroups = utils.loadResourceGroups()
let resources = utils.loadResources()

console.log(`Loaded ${policies.size} policies.`)

let rolePolicies = utils.policiesForRole(roles.join(","), policies)

console.log(`Matched ${rolePolicies.length} policies. Grouping by user...`)
let usersToCheck = []

for(let i=0;i<rolePolicies.length; i++) {
    let rolePolicy = rolePolicies[i]

    if(rolePolicy.subject.indexOf("AccessGroup") >= 0) {
        let accessGroupObj = accessGroups.get(rolePolicy.subject)
        if(accessGroupObj == null) {
            continue
        }
        let members = accessGroupObj.members
        for(let j=0;j<members.length; j++) {
            if(usersToCheck.indexOf(members[j]) == -1) {
                usersToCheck.push(members[j])
            }
        }
    }
    else {
        if(rolePolicy.subject.indexOf("IBMid") >= 0) {
            if(usersToCheck.indexOf(rolePolicy.subject) == -1) {
                usersToCheck.push(rolePolicy.subject)
            }
        }
    }
}

for(let m=0;m<usersToCheck.length;m++) {
    let userid = usersToCheck[m]
    let userObj = users.get(userid)

    if(userObj == null) {
        continue
    }
    console.log(`*** User: ${userObj.name} (${userObj.email})`)
    let userAndRolePolicies = utils.policiesForUser(userObj, accessGroups, rolePolicies)

    console.log("\n     USER POLICIES:")
    userAndRolePolicies.forEach(function(policy, key) {
        let rName = null
        if(resourceGroups.get(policy.resource) != null) {
           rName = resourceGroups.get(policy.resource).name
        } else {
            if(resources.get(policy.resource) != null) {
                rName = resources.get(policy.resource).name
            } else {
                rName = policy.resource
            }
        }

        let agName = policy.subject;

        if(accessGroups.get(policy.subject) != null) {
            agName = accessGroups.get(policy.subject).name
        }

        console.log(`     Policy: Id=${policy.id} Subject=${agName} Roles=${policy.roles} 
             Target=[Service: ${policy.service_type}, Region: ${policy.region}, ${resourceGroups.get(policy.resource)!=null ? "ResourceGroup" : "Resource"}: ${rName}]`)
    })
    console.log(`(${userAndRolePolicies.length} policies) \n\n`)

}