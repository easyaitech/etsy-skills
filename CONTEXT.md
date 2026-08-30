# etsy-skills(电商运营 skill stack)

跑在 Hermes Agent 上的多租户电商运营技能仓:飞书 Base 承载业务状态,skill 只持有语义与流程契约。本文件是全仓统一词汇表,只收敛"用哪个词";术语的完整协议内容活在 `shared/` 对应文件里,这里不复述。

## Language

**封存(shelved)**:
能力已建成但整体不对用户开放;相关请求统一拒绝并引导回经营主线,不提供任何半开放出口。
_Avoid_: 下线、禁用、deprecated(含义不同:下线=已移除,deprecated=不推荐但可用)

**判据**:
运行时决定一条请求走哪条路径所依据的唯一字段(如 adapter-registry 的平台状态列)。
_Avoid_: 开关、flag(暗示一处翻转全局生效,与"解封要走验收清单"的事实相反)

**真源(source of truth)**:
一个事实被授权存在的唯一位置;其他位置只能引用,不能复述。
_Avoid_: 权威文件、master copy

**Foundation / Application / Utility-input**:
skill 的三层归属枚举(frontmatter `layer`,唯一合法值):Foundation 拥有基座文件或店铺总 Base 的表;Application 围绕基座运行;Utility-input 只为基座提供自动化外部输入。
_Avoid_: 自造第四种叫法或中英混写的变体(如 tool-layer、支撑层)
