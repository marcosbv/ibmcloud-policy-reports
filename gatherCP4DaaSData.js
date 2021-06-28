const https = require('https')
const users = require('./data/users.json')



function getRequest(hostname, port, path, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: hostname,
            port: port,
            method: 'GET',
            path: path,
            headers: {
                authorization: `Bearer ${token}`
            }
        }

        let chunk = []
        const req = https.request(options, res => {
            res.on('data', d => {
                chunk.push(d)
            })

            res.on('end', () => {
                let json = JSON.parse(Buffer.concat(chunk).toString())
                resolve(json)
            })
        })

        req.on('error', err => {
            reject(err)
        })

        req.end()
        
    })
}

function lookupUserById(userId) {
    const userInList = users.filter(x => x.ibmUniqueId == userId)
    if(userInList.length > 0) {
        return userInList[0]
    } else {
        return {
            userId: userId
        }
    }
}

async function main() {

    const token = process.env.TOKEN
    const projects = await getRequest('api.dataplatform.cloud.ibm.com', 443, '/v2/projects', token)

    console.log(`Type;Name;UserEmail;Roles`)
    if(projects.resources) {
        for(const project of projects.resources) {
            const projectId = project.metadata.guid
    
            const projectMembers = await getRequest('api.dataplatform.cloud.ibm.com', 443, `/v2/projects/${projectId}/members`, token)
            for(const projectMember of projectMembers.members) {
                const user = lookupUserById(projectMember.id)
                console.log(`CP4DaaS_Project;${project.entity.name};${user.userId};${projectMember.role}`)
            }
        } 
    
    }
  
    const catalogs = await getRequest('api.dataplatform.cloud.ibm.com', 443, '/v2/catalogs', token)
  
    if(catalogs.catalogs) {
        for(const catalog of catalogs.catalogs) {
            const catalogId = catalog.metadata.guid
    
            const catalogMembers = await getRequest('api.dataplatform.cloud.ibm.com', 443, `/v2/catalogs/${catalogId}/members`, token)
            for(const catalogMember of catalogMembers.members) {
                const user = lookupUserById(catalogMember.memberUniqueId)
                console.log(`CP4DaaS_Catalog;${catalog.entity.name};${user.userId};${catalogMember.role}`)
            }
        }       
    }

    const deploymentSpaces = await getRequest('api.dataplatform.cloud.ibm.com', 443, '/v2/spaces', token)
    if(deploymentSpaces.resources) {
        for(const space of deploymentSpaces.resources) {
            const spaceId = space.metadata.id
    
            const spaceMembers = await getRequest('api.dataplatform.cloud.ibm.com', 443, `/v2/spaces/${spaceId}/members`, token)
            for(const spaceMember of spaceMembers.resources) {
                const user = lookupUserById(spaceMember.id)
                console.log(`CP4DaaS_DeploymentSpace;${space.entity.name};${user.userId};${spaceMember.role}`)
            }
        } 
    }
    
}


main()