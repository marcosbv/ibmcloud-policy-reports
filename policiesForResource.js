
let utils = require('./utils.js')

let programParams = utils.extractParameters(process.argv)
let resourceNameList = programParams.args

// Load main objects

let resources = utils.loadResources()
utils.output(programParams.format, `Loaded ${resources.size} resources.`)


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

utils.output(programParams.format,`Loaded ${policies.size} policies.`)

// CSV header
utils.output(programParams.format, "", ["Resource", "Username","Email", "Policy ID", "Policy Subject", "Policy Target", "Policy Roles"])

for(let i=0; i<resourcesToCheck.length; i++) {
    let r = resourcesToCheck[i]
    utils.output(programParams.format,`*** Resource: ${r.name} (${r.id})`)
    let policiesForResource = utils.policiesByResource(r, policies)
    let usersToCheck = []
    policiesForResource.forEach(function(policy, key) {
       if(policy.subject.indexOf("AccessGroup") == -1 && policy.subject.indexOf("iam-Profile") == -1 && policy.subject.indexOf("ServiceId") == -1) {
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
               if(agMembers[l].indexOf("ServiceId") == -1 && usersToCheck.indexOf(agMembers[l]) == -1) {
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
       utils.output(programParams.format,`     USER: ${user.name} (${user.email})`)

       let policiesForUser = utils.policiesForUser(user, accessGroups, policiesForResource);
       policiesForUser.forEach(function(userPolicy, key) {
           // CSV user line printed HERE!!
           utils.output(programParams.format,`          Policy: Subject=${userPolicy.subject.indexOf("AccessGroup") >=0 ? accessGroups.get(userPolicy.subject).name : user.name}  Roles=${userPolicy.roles} (${userPolicy.id})`,
                       [r.name, user.name, user.email, userPolicy.id, 
                        userPolicy.subject.indexOf("AccessGroup") >=0 ? accessGroups.get(userPolicy.subject).name : user.name,
                        `[Service: ${userPolicy.service_type}${userPolicy.service_subtype ? ", Subtype: " + userPolicy.service_subtype : ""}, Region: ${userPolicy.region}, ${resourceGroups.get(userPolicy.resource)!=null ? "ResourceGroup" : "Resource"}: ${resourceGroups.get(userPolicy.resource)!=null ? resourceGroups.get(userPolicy.resource).name : userPolicy.resource}${userPolicy.resource_group ? ", ResourceGroup: " + (resourceGroups.get(userPolicy.resource_group) != null ? resourceGroups.get(userPolicy.resource_group).name : userPolicy.resource_group) : ""}]`,
                        userPolicy.roles.join(",")
                        ])
       })

       utils.output(programParams.format,`     (${policiesForUser.length} policies)`)
    }

    utils.output(programParams.format,"\n     SERVICE IDS:")
    policiesForResource.forEach(function(policy, key) {
        if(policy.subject.indexOf("ServiceId") >= 0) {
            // CSV service user line printed HERE!!
            utils.output(programParams.format,`          Policy: Subject=${policy.subject}  Roles=${policy.roles} (${policy.id})`,
            [r.name, policy.subject, "", policy.id, policy.subject,
                `[Service: ${policy.service_type}${policy.service_subtype ? ", Subtype: " + policy.service_subtype : ""}, Region: ${policy.region}, ${resourceGroups.get(policy.resource)!=null ? "ResourceGroup" : "Resource"}: ${resourceGroups.get(policy.resource)!=null ? resourceGroups.get(policy.resource).name : policy.resource}${policy.resource_group ? ", ResourceGroup: " + (resourceGroups.get(policy.resource_group) != null ? resourceGroups.get(policy.resource_group).name : policy.resource_group) : ""}]`,
                policy.roles.join(",")
            ])
        }
    })

    utils.output(programParams.format,"\n     ALL POLICIES FOR RESOURCE:")
    policiesForResource.forEach(function(policy, key) {
        utils.output(programParams.format,`     Policy: Id=${policy.id} Subject=${policy.subject} Roles=${policy.roles} 
             Target=[Service: ${policy.service_type}${policy.service_subtype ? ", Subtype: " + policy.service_subtype : ""}, Region: ${policy.region}, ${resourceGroups.get(policy.resource)!=null ? "ResourceGroup" : "Resource"}: ${resourceGroups.get(policy.resource)!=null ? resourceGroups.get(policy.resource).name : policy.resource}${policy.resource_group ? ", ResourceGroup: " + (resourceGroups.get(policy.resource_group) != null ? resourceGroups.get(policy.resource_group).name : policy.resource_group) : ""}]`)
    })
    utils.output(programParams.format,`(${usersToCheck.length} users, ${policiesForResource.length} policies)`)
}
