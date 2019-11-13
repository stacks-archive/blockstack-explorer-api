cd $HOME
if [ -d "pgloader" ]; then
  git -C pgloader pull
else
  git clone https://github.com/dimitri/pgloader
fi
cd pgloader
docker build -f Dockerfile -t pgloader:local .
mkdir -p ./srv