# NOTE: This script does not work with cf v8. We recommend using cf v7 for all cloud.gov commands.
if [ ! $(command -v gh) ] || [ ! $(command -v jq) ] || [ ! $(command -v cf) ]; then
    echo "jq, cf, and gh packages must be installed. Please install via your preferred manager."
    exit 1
fi

if [ -z "$1" ]; then
    echo 'Please specify a space to target (i.e. lmm, staging)' >&2
    exit 1
fi

cf target -o cisa-dotgov -s $1
read -p "Are you logged in to the cisa-dotgov CF org above and targeting the correct space? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    cf login -a https://api.fr.cloud.gov --sso
fi

gh auth status
read -p "Are you logged into a Github account with access to weathergov/weather.gov? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    gh auth login
fi

echo "Great, removing and replacing Github CD account..."
cf target -s $1
cf delete-service-key github-cd-account github-cd-key
cf create-service-key github-cd-account github-cd-key
cf service-key github-cd-account github-cd-key
read -p "Please confirm we should set the above username and key to Github secrets. (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi

upcase_space=$(printf "%s" "$1" | tr '[:lower:]' '[:upper:]')
cf service-key github-cd-account github-cd-key | sed 1,2d  | jq -r '[.username, .password]|@tsv' | 
while read -r username password; do
    gh secret --repo weathergov/weather.gov set CF_${upcase_space}_USERNAME --body $username
    gh secret --repo weathergov/weather.gov set CF_${upcase_space}_PASSWORD --body $password
done