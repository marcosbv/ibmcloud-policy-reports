let utils = require('./utils.js')
let programParams = utils.extractParameters(process.argv)

let roles = programParams.args
// Load main objects

let policies = utils.loadPolicies()
let users = utils.loadUsers()
let accessGroups = utils.loadAccessGroups()
let resourceGroups = utils.loadResourceGroups()
let resources = utils.loadResources()

utils.output(programParams.format, `Loaded ${policies.size} policies.`)

let rolePolicies = utils.policiesForRole(roles.join(","), policies)

utils.output(programParams.format, `Matched ${rolePolicies.length} policies. Grouping by user...`)

// CSV Header
utils.output(programParams.format, "", ["User Name", "Email", "Policy ID", "Policy Subject", "Policy Target", "Policy Roles"])

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
        if(rolePolicy.subject.indexOf("AccessGroup") == -1 && rolePolicy.subject.indexOf("iam-Profile") == -1 && rolePolicy.subject.indexOf("ServiceId") == -1) {
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
    utils.output(programParams.format, `*** User: ${userObj.name} (${userObj.email})`)
    let userAndRolePolicies = utils.policiesForUser(userObj, accessGroups, rolePolicies)

    utils.output(programParams.format, "\n     USER POLICIES:")
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

        let resourceGroup = null
        if(policy.resource_group) {
            if(resourceGroups.get(policy.resource_group) != null) {
                resourceGroup = resourceGroups.get(policy.resource_group).name
            } else {
                resourceGroup = policy.resource_group
            }
        }

        // CSV line is written here
        utils.output(programParams.format, `     Policy: Id=${policy.id} Subject=${agName} Roles=${policy.roles} 
             Target=[Service: ${policy.service_type}${policy.service_subtype ? ", Subtype: " + policy.service_subtype : ""}, Region: ${policy.region}, ${resourceGroups.get(policy.resource)!=null ? "ResourceGroup" : "Resource"}: ${rName}${resourceGroup!=null ? ", ResourceGroup: " + resourceGroup : ""}]`,
            [userObj.name, userObj.email, policy.id, agName, 
               `[Service: ${policy.service_type}${policy.service_subtype ? ", Subtype: " + policy.service_subtype : ""}, Region: ${policy.region}, ${resourceGroups.get(policy.resource)!=null ? "ResourceGroup" : "Resource"}: ${rName}${resourceGroup!=null ? ", ResourceGroup: " + resourceGroup : ""}]`,
               policy.roles.join(",")
            ]
        )
    })
    utils.output(programParams.format, `(${userAndRolePolicies.length} policies) \n\n`)

}