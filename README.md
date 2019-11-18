# Utility to get policy and user information

## Description
IBM Cloud provides a flexible way to grant permissions to users to access resources defining policies in *Access Groups* and *Resource Groups*. However, it is not easy to track all users a resource have been granted access to or all resources a user has access based on policies defined at user and access group level.
Auditors expect to have answers to a couple of questions:
* What cloud resources does a user has access to?
* Looking for resource X, what users can view, edit or remove it?
* What users have any kind of Administrator policy set to them?
* What was the user latest login?
* What users can see account service X?

This utility gathers account data through *IBM Cloud CLI* and uses Node.js programs to cross information among resources, users, access groups, resource groups and policies to get a rapid answer for above questions.

## Pre-requisites
In order to use this utility, you must have:
* IBM command-line interface installed;
* Node.js vesion 10 or superior;
* User must be authenticated in IBM CLI;
* Linux Bash interpreter;
* curl utility installed

## Usage
The utility can be downloaded using the following command:
```curl https://raw.githubusercontent.com/marcosbv/ibmcloud-policy-reports/master/download.sh | bash -s ["<partial_account_name>"]```
Partial account name is an optional parameter that contains the acount name you want to retrieve data from. The reason of this parameter is in use cases where an user has access to more than one account. Download shell script will grep that string in *ibmcloud account list* command to get the correct account. If this parameter is not passed, script *gatherData.sh* is not called from *download.sh* script; therefore, you have to run data collection before using report programs.

There are two phases when using this utility:
1) Information collect: informatin about resources, users, access groups, group membership, clusters, policies are captured using IBM CLI command-line and REST API calls using curl. All JSON files generated from capturing process are stored under **data** directory as a snapshot.
This step can be run anytime using the *gatherData.sh* script. It also runs when you use the *download.sh* script using the account partial name as a parameter as described above.
To invoke data collection, once you have downloaded this utility, execute this command from the folder where utility resides:
```./gatherData.sh "<partial_account_name>"```
In this command, (partial) account name is required; otherwise, an error is thrown.

2) Report Node.js programs to analyze data: once snapshot is taken, you can run the following programs to retrieve your data:

policiesForResource.js:

policiesForRole.js:

resourceAccessForUser.js:

latestUserLogin.js:


## Limitations and Known Issues


