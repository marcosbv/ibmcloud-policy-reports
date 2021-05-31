set -x
# Hardware:
ibmcloud sl hardware list --output json > data/hardware.json

# Virtual Servers:
ibmcloud sl vs list --output json > data/vsi.json

# Softlayer users
ibmcloud sl user list --output json > data/sl_users.json

for i in `cat data/sl_users.json | grep \"id\" | cut -d ':' -f2 | cut -d ',' -f1`
do
    ibmcloud sl call-api User_Customer getPermissions --init $i > data/${i}_permissions.json
    ibmcloud sl call-api User_Customer getAllowedHardwareIds --init $i > data/${i}_allowedhardwareids.json
    ibmcloud sl call-api User_Customer getAllowedVirtualGuestIds --init $i > data/${i}_allowedvirtualguestids.json
    ibmcloud sl call-api User_Customer getAllowedDedicatedHostIds --init $i > data/${i}_alloweddedicatedhostids.json
    # ibmcloud sl call-api User_Customer getObject --init $i > ${i}_usercustomer.json
done

mv *.json ./data