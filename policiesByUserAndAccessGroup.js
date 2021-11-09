let utils = require('./utils.js')
let programParams = utils.extractParameters(process.argv)

let userNameList = programParams.args

// Load main objects

let users = utils.loadUsers()
utils.output(programParams.format, `Loaded ${users.size} users.`)
utils.output(programParams.format, "", ["PolicyID", "User", "Email", "AccessGroup", "Roles", "Service", "Region", "Resource"])

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

let policies = utils.loadPolicies()
let accessGroups = utils.loadAccessGroups()
let resources = utils.loadResources()
let resourceGroups = utils.loadResourceGroups()

for(let i=0;i<usersToCheck.length;i++) {
    let user = usersToCheck[i]
    let policiesByUser = utils.policiesForUser(user, accessGroups, policies)
    utils.output(programParams.format, `\n\n\nPolicies for User ${user.name} (${user.email})`)
    for(j=0;j<policiesByUser.length;j++) {
       let policy = policiesByUser[j]
       let resourceName = policy.resource;
       // lookup
       if(resourceGroups.get(policy.resource)!=null) {
           resourceName = resourceGroups.get(policy.resource).name
       } else {
           if(resources.get(policy.resource)) {
              resourceName = resources.get(policy.resource).name
           }
       }

       let resourceGroup = null
       if(policy.resource_group) {
           if(resourceGroups.get(policy.resource_group)) {
               resourceGroup = resourceGroups.get(policy.resource_group).name
           } else {
               resourceGroup = policy.resource_group
           }
       }

       utils.output(programParams.format,`Id=${policy.id}, Access Group=${policy.subject.indexOf('AccessGroup') == 0 ? accessGroups.get(policy.subject).name : 'Nenhum'} Roles=${policy.roles}\n    [Service: ${policy.service_type}${policy.service_subtype ? ", Subtype: " + policy.service_subtype : ""}, Region: ${policy.region}, ${resourceGroups.get(policy.resource)!=null ? "ResourceGroup" : "Resource"}: ${resourceName}${resourceGroup!=null ? ", ResourceGroup: " + resourceGroup : ""}]`,
       [policy.id, `${user.name}`, user.email, policy.subject.indexOf('AccessGroup') == 0 ? accessGroups.get(policy.subject).name : 'None',
       policy.roles, policy.service_type + (policy.service_subtype ? `/${policy.service_subtype}` : ""), policy.region, `${resourceGroups.get(policy.resource)!=null ? "ResourceGroup" : "Resource"}: ${resourceName}${resourceGroup!=null ? ", ResourceGroup: " + resourceGroup : ""}`])
    }
}