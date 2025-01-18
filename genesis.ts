#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env --allow-run

import { parse } from "https://deno.land/std/flags/mod.ts";
import { encode as base64Encode } from "https://deno.land/std/encoding/base64.ts";
import { delay } from "https://deno.land/std/async/delay.ts";

interface Instance {
  name: string;
  machineType: string;
  networkInterfaces: Array<{
    accessConfigs: Array<{
      natIP?: string;
    }>;
  }>;
}

class GCPDeployer {
  private projectId: string;
  private zone: string;
  private region: string;
  private accessToken: string;

  constructor(projectId: string, zone = "us-central1-a") {
    this.projectId = projectId;
    this.zone = zone;
    this.region = zone.split("-").slice(0, -1).join("-");
  }

  private async checkGcloudInstalled(): Promise<boolean> {
    try {
      const process = Deno.run({
        cmd: ["which", "gcloud"],
        stdout: "piped",
        stderr: "piped",
      });
      const status = await process.status();
      process.close();
      return status.success;
    } catch {
      return false;
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    // Check if gcloud is installed
    if (!(await this.checkGcloudInstalled())) {
      console.error("\nError: Google Cloud SDK (gcloud) is not installed.");
      console.error("\nPlease install it following these steps:");
      console.error("\nFor macOS:");
      console.error("  brew install --cask google-cloud-sdk");
      console.error("\nFor Debian/Ubuntu:");
      console.error(
        "  sudo apt-get install apt-transport-https ca-certificates gnupg",
      );
      console.error(
        '  echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list',
      );
      console.error(
        "  curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -",
      );
      console.error(
        "  sudo apt-get update && sudo apt-get install google-cloud-sdk",
      );
      console.error("\nAfter installation, run:");
      console.error("  gcloud init");
      console.error("  gcloud auth application-default login");
      Deno.exit(1);
    }

    // Check if user is authenticated
    try {
      const authProcess = Deno.run({
        cmd: ["gcloud", "config", "get-value", "account"],
        stdout: "piped",
        stderr: "piped",
      });
      const [authStatus, authStdout] = await Promise.all([
        authProcess.status(),
        authProcess.output(),
      ]);
      authProcess.close();

      if (
        !authStatus.success ||
        new TextDecoder().decode(authStdout).trim() === ""
      ) {
        console.error("\nError: Not authenticated with Google Cloud.");
        console.error("\nPlease run:");
        console.error("  gcloud auth login");
        console.error("  gcloud auth application-default login");
        Deno.exit(1);
      }
    } catch (error) {
      console.error("Error checking authentication:", error);
      Deno.exit(1);
    }

    const process = Deno.run({
      cmd: ["gcloud", "auth", "print-access-token"],
      stdout: "piped",
      stderr: "piped",
    });

    const [status, stdout, stderr] = await Promise.all([
      process.status(),
      process.output(),
      process.stderrOutput(),
    ]);

    process.close();

    if (!status.success) {
      throw new Error(
        `Failed to get access token: ${new TextDecoder().decode(stderr)}`,
      );
    }

    this.accessToken = new TextDecoder().decode(stdout).trim();
    return this.accessToken;
  }

  private async fetchGCP(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<any> {
    const token = await this.getAccessToken();
    const response = await fetch(
      `https://compute.googleapis.com/compute/v1/${endpoint}`,
      {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GCP API error: ${error}`);
    }

    return response.json();
  }

  public async getBigBangScript(): Promise<string> {
    try {
      // First try to read local file
      return await Deno.readTextFile("./bigbang.sh");
    } catch {
      // If local file doesn't exist, fetch from GitHub
      const response = await fetch(
        "https://raw.githubusercontent.com/miguelemosreverte/pulumi-k8s-websocket/main/bigbang.sh",
      );
      return await response.text();
    }
  }

  public async createInstance(
    instanceName: string,
    machineType = "e2-medium",
  ): Promise<Instance> {
    console.log(`Creating instance ${instanceName}...`);

    const startupScript = await this.getBigBangScript();
    const instanceConfig = {
      name: instanceName,
      machineType: `zones/${this.zone}/machineTypes/${machineType}`,
      disks: [
        {
          boot: true,
          autoDelete: true,
          initializeParams: {
            sourceImage:
              "projects/debian-cloud/global/images/debian-11-bullseye-v20240110",
          },
        },
      ],
      networkInterfaces: [
        {
          network: "global/networks/default",
          accessConfigs: [{ name: "External NAT" }],
        },
      ],
      metadata: {
        items: [
          {
            key: "startup-script",
            value: startupScript,
          },
        ],
      },
      serviceAccounts: [
        {
          email: "default",
          scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        },
      ],
      tags: {
        items: ["http-server"],
      },
    };

    const operation = await this.fetchGCP(
      `projects/${this.projectId}/zones/${this.zone}/instances`,
      {
        method: "POST",
        body: JSON.stringify(instanceConfig),
      },
    );

    await this.waitForOperation(operation.name);
    return this.getInstance(instanceName);
  }

  public async getInstance(instanceName: string): Promise<Instance> {
    return await this.fetchGCP(
      `projects/${this.projectId}/zones/${this.zone}/instances/${instanceName}`,
    );
  }

  public async createFirewallRule(): Promise<void> {
    console.log("Creating firewall rule...");

    const firewallConfig = {
      name: "allow-http",
      network: `projects/${this.projectId}/global/networks/default`,
      allowed: [
        {
          IPProtocol: "tcp",
          ports: ["80", "8080"],
        },
      ],
      sourceRanges: ["0.0.0.0/0"],
      targetTags: ["http-server"],
    };

    try {
      const operation = await this.fetchGCP(
        `projects/${this.projectId}/global/firewalls`,
        {
          method: "POST",
          body: JSON.stringify(firewallConfig),
        },
      );
      await this.waitForOperation(operation.name, "global");
    } catch (error) {
      if (!error.message.includes("alreadyExists")) {
        throw error;
      }
      console.log("Firewall rule already exists.");
    }
  }

  private async waitForOperation(
    operationName: string,
    scope = "zones",
  ): Promise<void> {
    while (true) {
      const operation = await this.fetchGCP(
        scope === "global"
          ? `projects/${this.projectId}/global/operations/${operationName}`
          : `projects/${this.projectId}/zones/${this.zone}/operations/${operationName}`,
      );

      if (operation.status === "DONE") {
        if (operation.error) {
          throw new Error(
            `Operation failed: ${JSON.stringify(operation.error)}`,
          );
        }
        break;
      }

      await delay(2000); // Wait 2 seconds before checking again
    }
  }

  public async waitForSSH(ip: string, maxAttempts = 30): Promise<void> {
    console.log("Waiting for SSH to become available...");

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const process = Deno.run({
          cmd: ["nc", "-zv", ip, "22"],
          stdout: "null",
          stderr: "null",
        });
        const status = await process.status();
        process.close();

        if (status.success) {
          console.log("SSH is available!");
          return;
        }
      } catch {
        // Ignore errors and continue trying
      }
      await delay(10000); // Wait 10 seconds between attempts
    }
    throw new Error("Timeout waiting for SSH");
  }
}

async function main() {
  const args = parse(Deno.args, {
    string: ["project-id", "zone", "instance-name"],
    default: {
      zone: "us-central1-a",
      "instance-name": "pulumi-websocket-vm",
    },
  });

  if (!args["project-id"]) {
    console.error("Error: --project-id is required");
    Deno.exit(1);
  }

  const deployer = new GCPDeployer(args["project-id"], args.zone);

  try {
    // Create firewall rule
    await deployer.createFirewallRule();

    // Create instance
    const instance = await deployer.createInstance(args["instance-name"]);

    // Get the external IP
    const ip = instance.networkInterfaces[0]?.accessConfigs[0]?.natIP;
    if (!ip) {
      throw new Error("Could not get instance IP address");
    }

    console.log(`\nInstance external IP: ${ip}`);

    // Wait for SSH to become available
    await deployer.waitForSSH(ip);

    console.log("\nSetup complete! Your VM is ready.");
    console.log(`You can SSH into it using: ssh ${ip}`);
  } catch (error) {
    console.error("Error:", error.message);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
