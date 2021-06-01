#!/bin/bash

 echo '* Downloading script files...'

mkdir -p permission_sets
for i in cfUserPolicies.js gatherData.sh policiesForResource.js resourceAccessForUser.js utils.js policiesForRole.js latestUserLogin.js saveAndUploadCSVReports.sh policiesForService.js policiesByUserAndAccessGroup.js generateReports.sh permissionsBySoftlayerResource.js gatherSoftlayerData.sh permission_sets/basic_user.json permission_sets/view_user.json permission_sets/super_user.json gatherCP4DaaSData.js gatherCP4DaaSData.sh
do
    curl -sL https://raw.githubusercontent.com/marcosbv/ibmcloud-policy-reports/master/$i -o $i
done

chmod 755 *.sh

if [ $# -gt 0 ]
then
     echo '** Gathering data...'
     ./gatherData.sh $1
else
     echo 'Files sucessfully downloaded. Now type ./gatherData.sh '\''<AccountName>'\'' to collect data from account'
     echo ' NOTE: Before running this command, you must log in in your IBM Cloud account using IBM CLI.'
fi
