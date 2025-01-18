#!/usr/bin/env python3
import os
import time
from pathlib import Path
import argparse
from google.cloud import compute_v1
from google.cloud import storage
import paramiko
import requests

class GCPDeployer:
    def __init__(self, project_id, zone="us-central1-a"):
        self.project_id = project_id
        self.zone = zone
        self.region = "-".join(zone.split("-")[:-1])
        self.instance_client = compute_v1.InstancesClient()
        self.firewall_client = compute_v1.FirewallsClient()

    def create_instance(self, instance_name, machine_type="e2-medium"):
        """Create a GCP VM instance."""
        print(f"Creating instance {instance_name}...")

        # Generate a startup script URL
        startup_script = self.get_bigbang_script()

        # Configure the machine
        instance = {
            "name": instance_name,
            "machine_type": f"zones/{self.zone}/machineTypes/{machine_type}",
            "disks": [{
                "boot": True,
                "auto_delete": True,
                "initialize_params": {
                    "source_image": "projects/debian-cloud/global/images/debian-11-bullseye-v20240110"
                }
            }],
            "network_interfaces": [{
                "network": "global/networks/default",
                "access_configs": [{"name": "External NAT"}]
            }],
            "metadata": {
                "items": [{
                    "key": "startup-script",
                    "value": startup_script
                }]
            },
            "service_accounts": [{
                "email": "default",
                "scopes": ["https://www.googleapis.com/auth/cloud-platform"]
            }],
            "tags": {
                "items": ["http-server"]
            }
        }

        # Create the instance
        operation = self.instance_client.insert(
            project=self.project_id,
            zone=self.zone,
            instance_resource=instance
        )

        # Wait for the operation to complete
        operation.result()
        print(f"Instance {instance_name} created successfully!")
        return self.get_instance(instance_name)

    def get_instance(self, instance_name):
        """Get instance details."""
        return self.instance_client.get(
            project=self.project_id,
            zone=self.zone,
            instance=instance_name
        )

    def create_firewall_rule(self):
        """Create firewall rule for HTTP access."""
        print("Creating firewall rule...")

        firewall_rule = {
            "name": "allow-http",
            "network": f"projects/{self.project_id}/global/networks/default",
            "allowed": [{
                "IP_protocol": "tcp",
                "ports": ["80", "8080"]
            }],
            "source_ranges": ["0.0.0.0/0"],
            "target_tags": ["http-server"]
        }

        try:
            operation = self.firewall_client.insert(
                project=self.project_id,
                firewall_resource=firewall_rule
            )
            operation.result()
            print("Firewall rule created successfully!")
        except Exception as e:
            if "alreadyExists" not in str(e):
                raise e
            print("Firewall rule already exists.")

    def get_external_ip(self, instance):
        """Get the external IP of the instance."""
        return instance.network_interfaces[0].access_configs[0].nat_ip

    def wait_for_ssh(self, ip_address, max_attempts=30):
        """Wait for SSH to become available."""
        print("Waiting for SSH to become available...")
        attempt = 0
        while attempt < max_attempts:
            try:
                client = paramiko.SSHClient()
                client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                client.connect(ip_address, username="your-username", timeout=5)
                client.close()
                print("SSH is available!")
                return True
            except:
                attempt += 1
                time.sleep(10)
        raise Exception("Timeout waiting for SSH")

    @staticmethod
    def get_bigbang_script():
        """Get the content of the bigbang.sh script."""
        script_path = Path(__file__).parent / "bigbang.sh"
        if script_path.exists():
            return script_path.read_text()
        else:
            # If script doesn't exist locally, you could fetch it from a URL
            response = requests.get("https://raw.githubusercontent.com/miguelemosreverte/pulumi-k8s-websocket/main/bigbang.sh")
            return response.text

def main():
    parser = argparse.ArgumentParser(description='Deploy a GCP VM with Pulumi setup')
    parser.add_argument('--project-id', required=True, help='GCP Project ID')
    parser.add_argument('--zone', default='us-central1-a', help='GCP Zone')
    parser.add_argument('--instance-name', default='pulumi-websocket-vm', help='VM Instance name')
    args = parser.parse_args()

    deployer = GCPDeployer(args.project_id, args.zone)

    try:
        # Create firewall rule
        deployer.create_firewall_rule()

        # Create instance
        instance = deployer.create_instance(args.instance_name)

        # Get the external IP
        ip_address = deployer.get_external_ip(instance)
        print(f"\nInstance external IP: {ip_address}")

        # Wait for SSH to become available
        deployer.wait_for_ssh(ip_address)

        print("\nSetup complete! Your VM is ready.")
        print(f"You can SSH into it using: ssh {ip_address}")

    except Exception as e:
        print(f"Error: {str(e)}")
        raise

if __name__ == "__main__":
    main()
