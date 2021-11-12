const utils = require('./utils')

const users = utils.loadUsers()
const policiesMap = utils.loadPolicies()
const groupsMap = utils.loadAccessGroups()

let policies = []
policiesMap.forEach((x) => {
    policies.push(x)
})

let groups = []
groupsMap.forEach((x) => {
    groups.push(x)
})

// const IAM_PLATFORM_ADMIN = 6
const IAM_ACCOUNT_ADMIN = 4
const IAM_RESOURCES_ADMIN = 2
const IAM_SOME_ADMIN = 1
const NO_ADMIN = 0

const classificationList = [
    'iam-no-admin',
    'iam-some-admin',
    'iam-resources-admin',
    'iam-resources-admin',
    'iam-account-admin',
    'iam-account-admin', 
    'iam-platform-admin',
    'iam-platform-admin'
]

let adminLevelList = []
for(const user of users.values()) {
    const policiesByUser = utils.policiesForUser(user, groups, policies);

    let adminLevel = NO_ADMIN

    if(policiesByUser.length > 0) {
        for(const policy of policiesByUser) {
            if( policy.roles.indexOf('Manager') >= 0) {
                adminLevel |= IAM_SOME_ADMIN
            }
            if(policy.roles.indexOf('Administrator') >= 0) {
                if(policy.service_type == "all_iam_services" && policy.resource == "all") {
                  adminLevel |= IAM_RESOURCES_ADMIN
                } else {
                    if(policy.service_type == "all_account_services" && policy.resource == "all") {
                        adminLevel |= IAM_ACCOUNT_ADMIN
                    } else {
                        adminLevel |= IAM_SOME_ADMIN
                    }
                }
            }
        }
    }

    adminLevelList.push({
        userId : user.id,
        userEmail : user.email,
        adminLevel: adminLevel,
        adminLevelName: classificationList[adminLevel]
    })
}

console.log(JSON.stringify(adminLevelList))

