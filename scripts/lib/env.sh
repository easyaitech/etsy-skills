# 电商 skill stack 的共享环境解析（旧 etsy-* → 新 ecommerce-* 变量兼容映射的单一事实源）。
#
# 被 scripts/etsy-stack 和 scripts/check-update.sh source。
# 用 `:=` 赋值：仅在变量未设置时才落默认，尊重调用方预设的 env 覆盖。
#
# ⚠️ install.sh 不 source 本文件：它是 `curl … | bash` 引导脚本，在 clone 仓库之前运行，
#    此时磁盘上还没有本文件。install.sh 顶部保留同一套映射的副本——
#    改这里的旧变量兼容映射时，记得同步 install.sh。

: "${INSTALL_DIR:=${ECOMMERCE_SKILLS_HOME:-${ETSY_SKILLS_HOME:-$HOME/.local/share/etsy-skills}}}"
: "${CACHE_DIR:=${ECOMMERCE_STACK_CACHE_DIR:-${XDG_CACHE_HOME:-$HOME/.cache}/ecommerce-skills}}"
: "${HERMES_SKILLS_DIR:=${HERMES_HOME:-$HOME/.hermes}/skills}"
