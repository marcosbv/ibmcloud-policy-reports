/**
 * Script to test Utils methods
 */

 
 let utils = require("./utils.js")

 let resources = utils.loadResources();

 console.log("============> RESOURCES")
 
 resources.forEach(function(value, key) {
    let service_type = value.service_type
    let region = value.region
    let guid = value.id
    let name = value.name

    console.log(`${service_type}, ${region}, ${guid}, ${name}`)
 })

 console.log("============> RESOURCE GROUPS")
 let resource_groups = utils.loadResourceGroups()

 resource_groups.forEach(function(value, key) {
     console.log(`${value.id}, ${value.name}`)
 })

 console.log("============> ACCESS GROUPS")
 let access_groups = utils.loadAccessGroups()
 
  access_groups.forEach(function(value, key) {
      console.log(`${value.id}, ${value.name}`)
      console.log(`MEMBERS: ${value.members}`)
  })


 console.log("============> USERS")
 let users = utils.loadUsers()
 
  users.forEach(function(value, key) {
      console.log(`${value.id}, ${value.email}, ${value.name}`)
      console.log("=====>>>GROUPS INSERTED: " + utils.groupsUserBelongsTo(value, access_groups))
  })

  console.log("============> POLICIES")
  let policies = utils.loadPolicies()
  console.log(policies)
   policies.forEach(function(value, key) {
      console.log(value)
   })

   console.log("Loaded "+ policies.size + " policies.")


console.log("========================>>> POLICIES FOR RESOURCES")

resources.forEach(function (resource, key) {
    console.log("=================== RESOURCE: " + resource.name)
    let policiesByResource = utils.policiesByResource(resource, policies)
    console.log(policiesByResource)    
    console.log("-----------------------------------------------------")
})

console.log("=========================>>> POLICIES FOR USERS") 

    users.forEach(function(user, key) {
        console.log("======================== USER: " + user.email)
        let policiesForUser = utils.policiesForUser(user, access_groups, policies)
        console.log(policiesForUser)    
        console.log("-----------------------------------------------------")
    })
    

console.log("============================>>> ADMINISTRATOR POLICIES ") 

console.log(utils.policiesForRole("Administrator", policies))



let argsTest = ["node", "myProgram.js", "--csv", "param1", "param2"]
console.log("============================>>>>>>> EXTRACT PARAMETERS")
console.log(process.argv)
let argsRet = utils.extractParameters(argsTest)
console.log(`Format=${argsRet.format} Params=${argsRet.args}`)

argsTest = ["node","myProgram.js", "param0", "param1", "param2"]
argsRet = utils.extractParameters(argsTest)
console.log(`Format=${argsRet.format} Params=${argsRet.args}`)

argsTest = ["node","myProgram.js", "param0", "param1"]
argsRet = utils.extractParameters(argsTest)
console.log(`Format=${argsRet.format} Params=${argsRet.args}`)

argsTest = ["node","myProgram.js", "--json", "param1"]
argsRet = utils.extractParameters(argsTest)
console.log(`Format=${argsRet.format} Params=${argsRet.args}`)

argsTest = ["node","myProgram.js", "param0"]
argsRet = utils.extractParameters(argsTest)
console.log(`Format=${argsRet.format} Params=${argsRet.args}`)

