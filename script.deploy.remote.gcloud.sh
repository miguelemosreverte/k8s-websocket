#!/bin/bash

# Check if the stack exists
if ! pulumi stack select gcloud 2>/dev/null; then
    pulumi stack init gcloud
fi

pulumi stack select gcloud
pulumi up
