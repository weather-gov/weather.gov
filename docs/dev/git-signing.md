# Git commit signing

Our repo is configured to require signed commits, so if you want to contribute
any code, you'll need to make sure you have commit signing configured. If you
already have git commit signing configured and your public key is in GitHub,
great! You can just keep using your existing setup. Otherwise, we recommend
using SSH keys for commit signing because it's easier to setup.

First, create an SSH key pair. If you already have SSH keys you use for GitHub
authentication, feel free to reuse them! Otherwise, run this command:

```sh
ssh-keygen -t ed25519 -C "your_email@noaa.gov"
```

You'll be prompted for a place to save the file. Traditionally these keys are
stored in your home directory under the `.ssh` folder. The prompt will likely
be for this location by default. Feel free to accept the defaults, but make a
note of the file locations because you'll need them again in a moment.

Next you'll be asked to provide a password. This password protects your private
key file in the event that someone else manages to get their hands on it.

Once your keys are generated, we need to grab the public key ID. This is how git
figures out which private key to use for signing. To find the key ID, you can
look inside the `.pub` file that was created. For example, if your files were
saved to `/Users/WeatherPerson/.ssh/ed25519`, you can get the ID like so:

```sh
cat /Users/WeatherPerson/.ssh/ed25519.pub
```

The entire output is the key ID. Now it's time to setup commit signing. You can
modify your global git configuration, or you can setup signing for only this
repo.

```sh
git config --global commit.gpgsign true
git config --global gpg.format ssh
git config --global user.signingkey "<your key ID >"
```

> [!NOTE]  
> If you only want to configure commit signing on this repo and not globally for
> all of your repos, replace `--global` with `--local` in the above commands.
> This note pplies to all `git config` commands.
