# Plan: Update Tutorials for CDKTF → CDKTN Rename

## Summary

Update all 4 tutorial files in `content/tutorials/` to reflect the CDKTF → CDKTN rename per `plans/fork-overview.md`. The existing concept/docs pages already use "CDK Terrain (CDKTN)" naming — tutorials are the last area still using old CDKTF references.

## Decisions

- **GitHub clone URLs**: Keep original `hashicorp-education/*` URLs (repos still exist).
- **Go/C#/Java provider paths**: Follow existing concept docs patterns (see mapping below).
- **Tutorial directory names**: Rename to `learn-cdktn-*`.

## Scope of Changes

### What changes

| Category | Old | New |
|----------|-----|-----|
| CLI binary | `cdktf` | `cdktn` |
| CLI package (npm) | `cdktf-cli` | `cdktn-cli` |
| Core lib (npm) | `cdktf` | `cdktn` |
| Prose name | "CDK for Terraform (CDKTF)" | "CDK Terrain (CDKTN)" |

**Provider import mappings (per existing concept docs):**

| Language | Old import | New import |
|----------|-----------|------------|
| TypeScript | `from "cdktf"` | `from "cdktn"` |
| TypeScript | `@cdktf/provider-*/lib/*` | `@cdktn/provider-*/lib/*` |
| Python | `from cdktf import` | `from cdktn import` |
| Python | `from cdktf_cdktf_provider_*.* import` | `from cdktn_provider_*.* import` |
| Go core | `github.com/hashicorp/terraform-cdk-go/cdktf` | `github.com/open-constructs/cdk-terrain-go/cdktn` |
| Go providers | `github.com/hashicorp/cdktf-provider-*-go/*/v*/*` | `github.com/cdktn-io/cdktn-provider-*-go/*/v*/*` |
| Go API refs | `cdktf.NewApp`, `cdktf.NewTerraformStack` | `cdktn.NewApp`, `cdktn.NewTerraformStack` |
| C# core | `using HashiCorp.Cdktf;` | `using Io.Cdktn;` |
| C# providers | `using HashiCorp.Cdktf.Providers.Docker.*` | `using Io.Cdktn.Providers.Docker.*;`, `using Io.Cdktn.Providers.Docker.Image;` |
| Java core | `import com.hashicorp.cdktf.*` | `import io.cdktn.cdktn.*` |
| Java providers | `import com.hashicorp.cdktf.providers.docker.*.*` | `import io.cdktn.providers.docker.*.*` |


### What stays the same (per fork-overview.md)

- `cdktf.json` config file
- `cdktf.out/` output directory
- `CDKTF_*` environment variables
- `~/.cdktf` home directory
- Terraform provider sources (`hashicorp/aws`, `kreuzwerker/docker`, etc.)
- Terraform state files
- GitHub clone URLs (keep `hashicorp-education/*`)

---

## File-by-File Changes

### 1. `content/tutorials/install.mdx`

**Metadata:**
- title: "Install CDK for Terraform and run a quick start demo" → "Install CDK Terrain and run a quick start demo"
- description: "Install the CDK for Terraform CLI..." → "Install the CDK Terrain CLI..."

**Wayback Machine note (line 7-8):** Keep as historical reference.

**Prose:**
- "The Cloud Development Kit for Terraform (CDKTF)" → "CDK Terrain (CDKTN)" (line 10)
- "CDKTF CLI" → "CDKTN CLI" / "CDKTN" throughout
- Section headers: "Install CDKTF" → "Install CDKTN", "Verify the installation" stays
- "CDKTF language toolchain" → "CDKTN language toolchain" (prerequisites)

**CLI commands and output (all shell blocks):**
- `cdktf-cli@latest` → `cdktn-cli@latest`
- `cdktf-cli@next` → `cdktn-cli@next`
- `brew install cdktf` → `brew install cdktn`
- All `cdktf help/init/deploy/destroy/synth` → `cdktn`
- CLI help output: "cdktf" → "cdktn" in command names and descriptions
- Init output: "Your cdktf typescript project" → "Your cdktn typescript project" (all languages)

**Directory names:**
- `learn-cdktf-docker` → `learn-cdktn-docker` (mkdir, cd, init output, deploy/destroy commands)

**TypeScript code (lines 171-205):**
- `import { App, TerraformStack } from "cdktf"` → `from "cdktn"`
- `import { DockerProvider } from "@cdktf/provider-docker/lib/provider"` → `"@cdktn/provider-docker/lib/provider"`
- `import { Image } from "@cdktf/provider-docker/lib/image"` → `"@cdktn/provider-docker/lib/image"`
- `import { Container } from "@cdktf/provider-docker/lib/container"` → `"@cdktn/provider-docker/lib/container"`

**Python code (lines 207-247):**
- `from cdktf import App, TerraformStack` → `from cdktn import`
- `from cdktf_cdktf_provider_docker.image import Image` → `from cdktn_provider_docker.image import Image`
- `from cdktf_cdktf_provider_docker.container import Container` → `from cdktn_provider_docker.container import Container`
- `from cdktf_cdktf_provider_docker.provider import DockerProvider` → `from cdktn_provider_docker.provider import DockerProvider`

**Go code (lines 249-292):**
- Core: `"github.com/hashicorp/terraform-cdk-go/cdktf"` → `"github.com/open-constructs/cdk-terrain-go/cdktn"`
- Docker container: `dockercontainer "github.com/hashicorp/cdktf-provider-docker-go/docker/v3/container"` → `dockercontainer "github.com/cdktn-io/cdktn-provider-docker-go/docker/v3/container"`
- Docker image: `dockerimage "github.com/hashicorp/cdktf-provider-docker-go/docker/v3/image"` → `dockerimage github.com/cdktn-io/cdktn-provider-docker-go/docker/v3/image"`
- Docker provider: `dockerprovider "github.com/hashicorp/cdktf-provider-docker-go/docker/v3/provider"` → `github.com/cdktn-io/cdktn-provider-docker-go/docker/v3/provider"`
- All `cdktf.New*` → `cdktn.New*`, `cdktf.TerraformStack` → `cdktn.TerraformStack`

**C# code (lines 294-350):**
- `using HashiCorp.Cdktf;` → `using Io.Cdktn;`
- `using HashiCorp.Cdktf.Providers.Docker.Provider;` → `using Io.Cdktn.Providers.Docker.Provider;`
- `using HashiCorp.Cdktf.Providers.Docker.Image;` → `using Io.Cdktn.Providers.Docker.Image;`
- `using HashiCorp.Cdktf.Providers.Docker.Container;` → `using Io.Cdktn.Providers.Docker.Container;`

**Java code (lines 352-401):**
- `import com.hashicorp.cdktf.TerraformStack;` → `import io.cdktn.cdktn.TerraformStack;`
- `import com.hashicorp.cdktf.providers.docker.provider.DockerProvider;` → `import io.cdktn.providers.docker.provider.DockerProvider;`
- `import com.hashicorp.cdktf.providers.docker.image.Image;` → `import io.cdktn.providers.docker.image.Image;`
- `import com.hashicorp.cdktf.providers.docker.container.Container;` → `import io.cdktn.providers.docker.container.Container;`
- `import com.hashicorp.cdktf.providers.docker.container.ContainerPorts;` → `import io.cdktn.providers.docker.container.ContainerPorts;`
- `import com.hashicorp.cdktf.App;` → `import io.cdktn.cdktn.App;`

### 2. `content/tutorials/build-aws.mdx`

**Metadata:**
- title: "Build AWS infrastructure with CDK for Terraform" → "Build AWS infrastructure with CDK Terrain"
- description: update "CDKTF" → "CDKTN"

**Prose:** "CDK for Terraform (CDKTF)" → "CDK Terrain (CDKTN)", "CDKTF" → "CDKTN" throughout.

**Directory names:** `learn-cdktf` → `learn-cdktn`

**CLI commands:** All `cdktf` → `cdktn` (init, deploy, destroy)

**TypeScript code:**
- `from "cdktf"` → `from "cdktn"` (App, TerraformOutput, TerraformStack, RemoteBackend)
- `from "@cdktf/provider-aws/lib/provider"` → `from "@cdktn/provider-aws/lib/provider"`
- `from "@cdktf/provider-aws/lib/instance"` → `from "@cdktn/provider-aws/lib/instance"`

**Python code:**
- `from cdktf import` → `from cdktn import`
- `from cdktf_cdktf_provider_aws.provider import` → `from cdktn_provider_aws.provider import`
- `from cdktf_cdktf_provider_aws.instance import` → `from cdktn_provider_aws.instance import`

**Go code:**
- Core: `"github.com/hashicorp/terraform-cdk-go/cdktf"` → `"github.com/open-constructs/cdk-terrain-go/cdktn"`
- AWS instance: `"github.com/cdktf/cdktf-provider-aws-go/aws/v10/instance"` → `"github.com/cdktn-io/cdktn-provider-aws-go/aws/v10/instance"`
- AWS provider: `awsprovider "github.com/cdktf/cdktf-provider-aws-go/aws/v10/provider"` → `awsprovider "github.com/cdktn-io/cdktn-provider-aws-go/aws/v10/provider"`
- All `cdktf.*` → `cdktn.*`

**C# code:**
- `using HashiCorp.Cdktf;` → `using Io.Cdktn;`
- `using HashiCorp.Cdktf.Providers.Aws.Provider;` → `using Io.Cdktn.Providers.Aws.Provider;`
- `using HashiCorp.Cdktf.Providers.Aws.Instance;` → `using Io.Cdktn.Providers.Aws.Instance;`

**Java code:**
- `import com.hashicorp.cdktf.*;` → `import io.cdktn.cdktn.*;` (TerraformStack, TerraformOutput, App, RemoteBackend, etc.)
- `import com.hashicorp.cdktf.providers.aws.provider.AwsProvider;` → `import io.cdktn.providers.aws.provider.AwsProvider;`
- `import com.hashicorp.cdktf.providers.aws.instance.Instance;` → `import io.cdktn.providers.aws.instance.Instance;`

### 3. `content/tutorials/deploy-applications.mdx`

TypeScript-only tutorial.

**Metadata:**
- title: "Deploy an application with CDK for Terraform" → "Deploy an application with CDK Terrain"
- description: update "CDKTF" → "CDKTN"

**Prose:** "CDK for Terraform (CDKTF)" → "CDK Terrain (CDKTN)" throughout.

**GitHub clone URL:** Keep `hashicorp-education/learn-terraform-cdktf-applications` as-is.

**CLI commands:** All `cdktf` → `cdktn` (init, deploy, destroy, synth, convert, list, provider add)

**Code imports (TypeScript):**
- `import { App, TerraformStack } from "cdktf"` → `from "cdktn"` (multiple locations)
- `import { TerraformOutput } from "cdktf"` → `from "cdktn"`
- `import * as kubernetes from "@cdktf/provider-kubernetes"` → `"@cdktn/provider-kubernetes"`
- `import "cdktf/lib/testing/adapters/jest"` → `"cdktn/lib/testing/adapters/jest"`
- `const cdktf = require('cdktf')` → `const cdktn = require('cdktn')`
- `cdktf.Testing.setupJest()` → `cdktn.Testing.setupJest()`
- `import { Testing } from "cdktf"` → `from "cdktn"`

### 4. `content/tutorials/lambda-functions.mdx`

**Metadata:**
- title: "Deploy Lambda functions with TypeScript and CDK for Terraform" → "...CDK Terrain"
- description: update "CDKTF" → "CDKTN"

**Prose:** "CDK for Terraform (CDKTF)" → "CDK Terrain (CDKTN)" throughout.

**GitHub clone URL:** Keep `hashicorp-education/learn-cdktf-assets-stacks-lambda` as-is.

**CLI commands:** All `cdktf` → `cdktn` (deploy, destroy, list, synth, provider add)

**Provider packages in CLI output:**
- `@cdktf/provider-aws` → `@cdktn/provider-aws`
- `@cdktf/provider-random` → `@cdktn/provider-random`

**Note:** `cdktf.out/` directory stays the same per fork-overview.md.

---

## Verification

1. `grep -rn "cdktf" content/tutorials/ --include="*.mdx"` — remaining matches should ONLY be:
   - `cdktf.json` (config file)
   - `cdktf.out/` (output directory)
   - `CDKTF_*` (env vars)
   - `~/.cdktf` (home dir)
   - Wayback Machine URLs (historical references)
   - `hashicorp-education/learn-*cdktf*` (kept GitHub URLs)
2. Confirm all internal links work (`/tutorials/install`, `/docs/concepts/*`, etc.)
3. Run `npx mintlify dev` and verify all 4 tutorial pages render correctly
4. Verify code blocks have correct syntax highlighting
