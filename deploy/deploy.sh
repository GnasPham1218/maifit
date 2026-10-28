#!/usr/bin/env bash
# deploy/deploy.sh
# Chạy trên VPS, được GitHub Actions gọi qua SSH (forced command).
# Bản đang chạy nằm ở ~/bin/maifit-deploy, cài tay từ file này; KHÔNG chạy thẳng từ repo
# (script có git pull, chạy từ repo thì có thể tự sửa chính nó giữa chừng).
#
# Tham số: commit SHA 40 ký tự hex
#   - CI truyền qua SSH:  ssh maifit-deploy <sha>   (đọc từ SSH_ORIGINAL_COMMAND)
#   - Chạy tay / rollback: ~/bin/maifit-deploy <sha>
set -euo pipefail

main() {
  local tag="${SSH_ORIGINAL_COMMAND:-${1:-}}"
  if [[ ! "$tag" =~ ^[0-9a-f]{40}$ ]]; then
    echo "deploy: tham số phải là commit SHA 40 ký tự hex" >&2
    exit 2
  fi

  local repo="$HOME/maifit"
  local compose=(docker compose -f "$repo/deploy/docker-compose.prod.yml" --env-file "$repo/deploy/.env")

  echo "==> Cập nhật repo (file compose) từ main"
  git -C "$repo" pull --ff-only

  echo "==> Đặt IMAGE_TAG=$tag"
  sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$tag/" "$repo/deploy/.env"

  echo "==> Pull image mới"
  "${compose[@]}" pull backend frontend

  echo "==> Khởi động lại container"
  "${compose[@]}" up -d --remove-orphans

  echo "==> Chờ backend UP"
  for _ in $(seq 1 30); do
    if curl -fsS http://127.0.0.1:8080/api/actuator/health | grep -q '"status":"UP"'; then
      docker image prune -f > /dev/null
      echo "==> Deploy xong: $tag"
      exit 0
    fi
    sleep 3
  done

  # Không in log backend: log của GitHub Actions ở repo public là public.
  echo "deploy: backend không UP sau 90 giây. Xem log trên VPS:" >&2
  echo "  docker compose -f ~/maifit/deploy/docker-compose.prod.yml logs backend" >&2
  "${compose[@]}" ps >&2
  exit 1
}

main "$@"