### Install

Go to [podman.io](https://podman.io/). You will need to install both the CLI + the Podman Desktop UI.

NOTE: In this case it is recommended that you _not_ use Homebrew to install.

Restart your editor, terminal, podman desktop and stuff.

Run 'podman machine init'. If you're given options, make sure your memory allocation is high enough: 8 GiB should do it.

Open podman desktop. You'll be prompted to install extensions, choose Podman and Compose. For instructions on how to do the initial install and set up of the Podman Desktop UI, here are the [official docs](https://podman-desktop.io/docs/installation/macos-install) with images. You might need to close and restart your terminal, VS Code (or other editor), and the podman desktop after getting all your setting right in order for your CLI to register the `podman` commands.

#### Podman setup
On the Desktop, you'll be prompted to start a machine. Leave the defaults, although you will need to up the memory to 8GiB, and hit Next.

If you didn't get the memory set correctly and your `just init` commands are failing, try these commands:

```bash
podman machine stop podman-machine-default
podman machine set --memory 8192 podman-machine-default
podman machine start podman-machine-default
just init
```

#### MiniStack with Podman

The base Compose configuration uses Podman's `k8s-file` logging driver for application, database, and Redis logs. These are available through `podman compose logs`; Fluent Bit's Forward input is available on port 24224 for containers or processes explicitly configured to send Forward messages. It
does not automatically collect `k8s-file` logs. Direct OpenTelemetry trace exports are unaffected. 

MiniStack needs access to the container engine to create services such as RDS and Lambda containers. It keeps the `docker` executor because Podman exposes a Docker-compatible API. On this macOS Podman Machine setup, `/var/run/docker.sock` inside the VM points to the active Podman socket. The Compose bind source is resolved inside that VM.

If your engine host does not provide that compatibility path, set `MINISTACK_CONTAINER_SOCKET` to its actual socket path (for example, `/run/user/1000/podman/podman.sock` for a rootless Linux user with UID 1000). The socket must exist and its API service must be active. Do not use an SSH or TCP connection URL as a bind-mount path. Socket access gives MiniStack control over the local engine; use only trusted images. SELinux label isolation is disabled for MiniStack to permit socket access without relabeling the socket.

Bridge networks work with Podman unchanged. MiniStack joins both its private network and `weathergov-django_weather.gov`, which is also the network configured for the containers it creates. Keep the Compose project name unchanged unless you also update MiniStack's `DOCKER_NETWORK` setting.

#### MiniStack image registry

MiniStack serves its local registry over HTTP at `localhost:4566`. While Docker allows HTTP registries out of the box, Podman does not. So we need to configure the Podman engine to allow HTTP for that registry only. With a rootless Podman machine (what we're set up with), run:

```bash
just ministack-registry-setup
```

Run this opt-in setup once before `just ministack` (after starting your Podman machine). It will not overwrite a different existing MiniStack registry drop-in, and restarting the API service may briefly interrupt API calls. 

For a rootful connection or another machine, configure that engine's registry settings separately. Restarting the API service loads the setting for MiniStack's Docker-compatible pulls. Remove the drop-in and restart the service when the local registry is no longer needed. Do not mark remote registries insecure.
