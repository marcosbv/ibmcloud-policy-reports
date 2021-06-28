const utils = require('./utils')

const users = process.argv.slice(2)

const orgInfo = utils.loadCFOrgsSpaces()

const usersMap = new Map()

const REMOVE_SELF_ORGANIZATION = process.env.CF_REMOVE_SELF_ORGANIZATION || "true"

function userInMap(user, organization, space, role, space_uuid) {

    // remove self-organization if flag is true 
    if(REMOVE_SELF_ORGANIZATION=="true" && user == organization) {
        return;
    }

    const item = usersMap.get(user)
    if(item==null) {
        const obj = {
            organization: organization,
            space: space,
            space_uuid: space_uuid,
            roles: [role]
        }
        usersMap.set(user, [obj])
    } else {
        const orgSpace = item.filter((x) => x.organization == organization && (x.space == space))
        if(orgSpace.length > 0) {
            orgSpace[0].roles.push(role)
        } else {
            const obj = {
                organization: organization,
                space: space,
                space_uuid: space_uuid,
                roles: [role]
            }
            item.push(obj)
        }
    }
}

//console.log(`Organization;Space;Role;User`)
for(const org of orgInfo) {
    const orgName = org.name
    for(const role of ['auditors','billing_managers','managers']) {
        const users = org[role]
        for(const user of users) {
            userInMap(user, orgName, null, role, null)
        }
    }

    for(const space of org.spaces) {
        const spaceName = space.name
        const space_uuid = space.uuid
        for(const role of ['auditors','developers','managers']) {
            const users = space[role]
            for(const user of users) {
                userInMap(user, orgName, spaceName, role, space_uuid)
            }
        }
    }
}

const cfApps = require('./data/cfapps.json')

console.log('User;Organization;Space;Roles;Apps')
usersMap.forEach((values, key) => {
    if(users.length > 0) {
        if(users.indexOf(key) == -1) {
            return;
        }
    }
    for(const value of values) {
        const apps = cfApps.resources.filter((x) => {
            if(value.space_uuid != null) {
                return x.entity.space_guid == value.space_uuid
            } else {
                false
            }
        })
        console.log(`${key};${value.organization};${value.space};${value.roles.join(',')};${apps.map((x) => x.entity.name).join(',')}`)
    }
})