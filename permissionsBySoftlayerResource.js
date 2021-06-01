const sl_users = require('./data/sl_users.json')
const hardwares = require('./data/hardware.json')
const vsis = require('./data/vsi.json')

const superUserPermissions = require('./permission_sets/super_user.json')
const viewUserPermissions = require('./permission_sets/view_user.json')
const basicUserPermissions = require('./permission_sets/basic_user.json')

function guessPermissionSet(permissions) {

    let basicPermission = true
    let viewUserPermission = true
    let superUserPermission = true

    if(permissions.length == 0) {
        return 'No Permission Set';
    }

    for(const b of basicUserPermissions) {
        const filter = permissions.filter(x => x.keyName == b.keyName)
        if(filter.length == 0) {
            basicPermission = false
            break
        }
    }

    for(const v of viewUserPermissions) {
        const filter = permissions.filter(x => x.keyName == v.keyName)
        if(filter.length == 0) {
            viewUserPermission = false
            break
        }
    }

    for(const s of superUserPermissions) {
        const filter = permissions.filter(x => x.keyName == s.keyName)
        if(filter.length == 0) {
            superUserPermission = false
            break
        }
    }

    if(superUserPermission) {
        return 'Super_User'
    } else {
        const additionalPermissions = []
        if(basicPermission) {
            for(const permission of permissions) {
                const d = basicUserPermissions.filter(x => x.keyName == permission.keyName)
                if(d.length == 0) {
                    additionalPermissions.push(permission.keyName)
                }
            }

            return ['Basic_User'].concat(additionalPermissions).join(',')
        } else {
            if(viewUserPermission) {
                for(const permission of permissions) {
                    const d = viewUserPermissions.filter(x => x.keyName == permission.keyName)
                    if(d.length == 0) {
                        additionalPermissions.push(permission.keyName)
                    }
                }
                return ['View_User'].concat(additionalPermissions).join(',')
            } else {
                return permissions.map(x => x.keyName).join(',')
            }
        }
    }
}


console.log(`DeviceName;UserEmail;Permissions`)
for(const hardware of hardwares) {
    const fullName = `${hardware.domain}.${hardware.hostname}`

    for(const user of sl_users) {
        const permissions = require(`./data/${user.id}_permissions.json`)
        const allowedHWIds = require(`./data/${user.id}_allowedhardwareids.json`).filter(x => x == hardware.id)

        if(allowedHWIds.length > 0) {
            const role = guessPermissionSet(permissions)
            console.log(`${fullName};${user.email};${role}`)
        }
    }  
}

for(const vsi of vsis) {
    const fullName = `${vsi.domain}.${vsi.hostname}`
    for(const user of sl_users) {
        const permissions = require(`./data/${user.id}_permissions.json`)
        const allowedHWIds = require(`./data/${user.id}_allowedvirtualguestids.json`).filter(x => x == vsi.id)

        if(allowedHWIds.length > 0) {
            const role = guessPermissionSet(permissions)
            console.log(`${fullName};${user.email};${role}`)
        }
    }
}

for(const user of sl_users) {
    const permissions = require(`./data/${user.id}_permissions.json`)
    const allowedHWIds = require(`./data/${user.id}_allowedhardwareids.json`)
    const vsis = require(`./data/${user.id}_allowedvirtualguestids.json`)

    if(allowedHWIds.length == 0 && vsis.length == 0 && permissions.length > 0) {
        const role = guessPermissionSet(permissions)
        console.log(`No_Explicit_Device;${user.email};${role}`)
    }

}

