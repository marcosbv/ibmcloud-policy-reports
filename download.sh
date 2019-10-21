#!/bin/bash

 echo '* Downloading script files...'

for i in gatherData.sh policiesForResource.js resourceAccessForUser.js utils.js policiesForRole.js
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
