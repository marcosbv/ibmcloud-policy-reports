/**
 * Utilities for governance report
 */
let utils = {}

/**
 * Load services and clusters from JSON files
 */
utils.loadResources = function() {

    let resources = require("./data/resources.json")
    let clusters = require("./data/clusters.json")
    

    let objects = new Map()

    for(let i=0;i<resources.length; i++) {
        let resource = resources[i]
        let object = {}
        object.name = resource.name
        
        let id = resource.crn
        let id_parts = id.split(":")
   
        object.service_type = id_parts[4]
        object.region = id_parts[5]
        object.id = id_parts[7]
        object.created_at = resource.created_at
        object.resource_group = resource.resource_group_id

        objects.set(object.id, object)
    }

    for(let i=0;i<clusters.length; i++) {
        let cluster = clusters[i]
        let object = {}
        object.name = cluster.name
        
        let id = cluster.crn
        let id_parts = id.split(":")
   
        object.service_type = id_parts[4]
        object.region = id_parts[5]
        object.id = id_parts[7]
        object.created_at = cluster.createdDate
        object.resource_group = cluster.resourceGroup

        objects.set(object.id, object)
    }

    resources = null;
    clusters = null;
    delete resources;
    delete clusters;

    return objects
}

/**
 * Load users into a Map object
 */
utils.loadUsers = function() {
   let users = require("./data/users.json")

   let objects = new Map()
   for(let i=0;i<users.length;i++) {
       let user = users[i]

       let object = {}
       object.id = user.ibmUniqueId
       object.name = `${user.firstname} ${user.lastname}`
       object.email = user.userId
       
       objects.set(object.id, object)
   }

   users = null;
   delete users
   return objects
}

/**
 * Load access groups with their members into a Map object
 */
utils.loadAccessGroups = function() {
    let groups = require("./data/groups.json")
    
    let objects = new Map()
    for(let i=0;i<groups.length;i++) {
           let group = groups[i]
    
           let object = {}
           object.id = group.id
           object.name = group.name

           // load members
           let memberList = []
           let memberObjList = require(`./data/${group.id}_members.json`)
           for(let j=0; j<memberObjList.members.length; j++) {
               memberList.push(memberObjList.members[j].iam_id)
           }

           object.members = memberList
           objects.set(object.id, object)
    }
    
    groups = null;
    delete groups
    return objects
}

/**
 * Load resource groups into a Map object
 */
utils.loadResourceGroups = function() {
    let groups = require("./data/resource_groups.json")
    
    let objects = new Map()
    for(let i=0;i<groups.length;i++) {
           let group = groups[i]
    
           let object = {}
           object.id = group.id
           object.name = group.name
           object.created_at = group.created_at
           
           objects.set(object.id, object)
    }
    
    groups = null;
    delete groups
    return objects
}

utils.groupsUserBelongsTo = function(user, access_groups) {
   let id = user.id
   let access_groups_user_belongs = []
   
   access_groups.forEach(function (value, key) {
       if(value.members.includes(id)) {
           access_groups_user_belongs.push(value.id)
       }
   })

   return access_groups_user_belongs
}

/**
 * Load policies into a Map object
 */
utils.loadPolicies = function() {

    let policies = require("./data/policies.json")

    let objects = new Map()

    for(let i=0;i<policies.policies.length;i++) {
        let policy = policies.policies[i]
        let object = {}

        object.id = policy.id
        object.service_type = "all_iam_services"
        object.region = "all"
        object.resource = "all"

        let resource_attributes = policy.resources[0].attributes

        for(let j=0;j<resource_attributes.length;j++) {
            let resource_attribute = resource_attributes[j]
            if(resource_attribute.name == "serviceName") {
                object.service_type = resource_attribute.value
            }

            if(resource_attribute.name == "region") {
                object.region = resource_attribute.value
            }

            if(resource_attribute.name == "serviceInstance" || resource_attribute.name == "resourceGroupId" || resource_attribute.name == "resource") {
                // asterisk is the same of all, so we won't change it by now
                if(resource_attribute.value != "*") {
                    object.resource = resource_attribute.value
                }
               
            }

            // capture policies for ALL Platform Services access
            if(resource_attribute.name == "serviceType") {
                if(resource_attribute.value == "platform_service") {
                    object.service_type = "all_account_services" 
                }
            }

            if(resource_attribute.name == "resourceType") {
               object.resource_type = resource_attribute.value
            }
        }

        if(policy.subjects[0].attributes[0]) {
            object.subject = policy.subjects[0].attributes[0].value
        }

        object.roles = []
        if(policy.roles) {
            for(let j=0;j<policy.roles.length; j++) {
                object.roles.push(policy.roles[j].display_name)
            }
        }

        objects.set(object.id, object)
    }
    return objects
}

/**
 * Get policies that applies to a specific resource.
 * These policies will merge the ones targeted to the resource itself, 
 * the ones applied to its resource group and the ones to service or all platform.
 */
utils.policiesByResource = function (resource, policies) {
    let resourceGroupId = resource.resource_group
    let region = resource.region
    let serviceType = resource.service_type
    let policiesList = []

    policies.forEach(function (policy, key) {

        
        // 1. matches resource id?
        if(policy.resource == resource.id) {
            policiesList.push(policy)
            return
        }

        // 2. matches all resources in platform?
        if(policy.resource == "all" && policy.resource_type != "resource-group") {
            if(policy.service_type == resource.service_type || policy.service_type == "all") {
                if(policy.region == "all" || policy.region == resource.region) {
                   policiesList.push(policy)
                   return
                }
            }
        }


        // 3. matches resource group ?
        if(policy.resource == resource.resource_group && policy.resource_type != "resource-group") {
            if(policy.service_type == resource.service_type || policy.service_type == "all") {
                if(policy.region == "all" || policy.region == resource.region) {
                   policiesList.push(policy)
                   return
                }
            }
        }

    })

    return policiesList
}

/**
 * Get policies which subject is an user.
 * It merges user policies and user access groups.
 */
utils.policiesForUser = function(user, accessGroups, policies) {

    let idsToCheck = []
    idsToCheck = idsToCheck.concat([user.id], this.groupsUserBelongsTo(user, accessGroups))
    let matchedPolicies = []

    policies.forEach(function(policy, key) {
        if(idsToCheck.indexOf(policy.subject) >= 0) {
            matchedPolicies.push(policy)
        }
    })

    return matchedPolicies
} 

/**
 * Get all resources that belongs to a resource group
 */
utils.resourcesInResourceGroup = function(resourceGroup, resources) {
    let matchedResources = []

    resources.forEach(function(resource, key) {
        if(resource.resource_group == resourceGroup.id) {
            matchedResources.push(resource)
        }
    })

    return matchedResources
}

/**
 * Get all policies that applies to a role (i.e. Administrator)
 */
utils.policiesForRole = function(roles, policies) {
    let matchedPolicies = []
    let rolesArr = roles.split(",")

    policies.forEach(function (policy, map) {
        for(let j=0;j<rolesArr.length;j++) {
            if(policy.roles.indexOf(rolesArr[j]) >= 0) {
                matchedPolicies.push(policy)
                break;
            } 
        }
    })

    return matchedPolicies;
}

/**
 * Get all policies for an array of services
 */
utils.policiesForServices = function(services, policies) {

    

    for(let i=0;i<services.length;i++) {
       
       if(services[i] == "account") {
           services = services.concat([
              "iam-groups",
              "iam-identity",
              "support",
              "entitlement",
              "user-management",
              "billing",
              "all_account_services",
              "enterprise",
              "globalcatalog"
           ])
           console.log(services)
           break;
       }
    }

    let matchedPolicies = []
    policies.forEach(function (policy, map) {
        if(services.indexOf(policy.service_type) >= 0) {
            matchedPolicies.push(policy)
        }
    })

    return matchedPolicies
}

/**
 *  Extract format from program args. The format (--csv or --json) must be the first item in array.
 * @param args Args received from command-line
 * @returns an object with format and remaining arguments 
 */
utils.extractParameters = function(args) {

    let result = {}
    result.format = "stdout"
    result.args = []
    if(args.length > 1) {
       if(args.length > 2) {
           if(args[2].indexOf("--") == 0) {
               result.format = args[2].substring(2)
               result.args = args.slice(3)
           } else {
               result.args = args.slice(2)
           }
       } else {
           result.args = args.slice(2)
       }
    }

    return result
}

/**
 * Performs report output, according to format.
 * @param format   Report output format. Implemented values: stdout, csv
 * @param line     Line to send to console (only stdout)
 * @param csvArr   Array of strings to return into CSV output (it will be logged in Node console)
 */
utils.output = function(format, line, csvArr) {
    if(format == "stdout" && line.trim() != "") {
        console.log(line)
    }

    if(format == "csv") {
        // only non-empty arrays will be printed out. This is useful 
        // when normal stdout messages must be suppressed from file output.
        if(csvArr) {
            if(csvArr.length > 0) {
                console.log(csvArr.join(";"))
            }
        }
    }
}

module.exports = utils