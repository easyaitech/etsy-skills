"""Inventory skill 的文档锚点契约。

背景（2026-08-15 真实事故）：后端库存品系统（两张表 + 订单自动扣减）v0.6.37/38 就上线了，
但技能层一个字没提，店主问「你有库存 skill 吗」时 bot 照 listing-catalog 的旧描述回答
「库存挂在 listing-catalog 下，读写商品 Base 的库存列」——把平台在售数量当成了实物库存。

这里钉住的是**语义边界**，不是措辞美感：一旦有人把商品表「库存」列重新写成实物库存、
或把服务端专列的禁写约定删掉，就会重演同一类误导。
"""

import json
import pathlib
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]


class InventoryContractTest(unittest.TestCase):
    def test_inventory_skill_is_registered_in_manifest_and_readme(self):
        manifest = json.loads((ROOT / "etsy-stack.json").read_text(encoding="utf-8"))
        # 只有进了 manifest 的 skills 数组，install.sh 才会把目录软链进 ~/.hermes/skills；
        # 漏登记 = bot 根本看不到这个 skill（install.sh 还会把它当陈旧软链清掉）。
        self.assertIn("inventory", manifest["skills"])

        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("[`inventory`](inventory/SKILL.md)", readme)

    def test_skill_states_the_two_tables_and_the_ledger_only_rule(self):
        skill = (ROOT / "inventory" / "SKILL.md").read_text(encoding="utf-8")

        for anchor in (
            "Inventory 库存品",
            "Inventory Ledger 库存流水",
            "logicalTable=accessories",
            "logicalTable=accessory_ledger",
            # 流水是事实源、当前库存是派生快照——整套系统的地基。
            "流水是唯一事实源",
            "BITABLE_FIELD_SERVER_GENERATED",
            # 人工只能记这三类；销售扣减是系统专用值。
            "采购入库",
            "盘点调整",
            "绝不改已有流水行",
        ):
            self.assertIn(anchor, skill)

    def test_skill_separates_physical_stock_from_the_products_stock_column(self):
        skill = (ROOT / "inventory" / "SKILL.md").read_text(encoding="utf-8")
        schema = (ROOT / "inventory" / "references" / "base-schema.md").read_text(encoding="utf-8")

        # 这条边界是本次事故的根因，两份文档都必须写死。
        self.assertIn("不是实物库存", skill)
        self.assertIn("平台在售", skill)
        self.assertIn("平台在售", schema)
        for anchor in ("当前库存", "流水 ID", "禁止写入"):
            self.assertIn(anchor, schema)

    def test_listing_catalog_no_longer_claims_ownership_of_physical_stock(self):
        skill = (ROOT / "listing-catalog" / "SKILL.md").read_text(encoding="utf-8")
        schema = (ROOT / "listing-catalog" / "references" / "base-schema.md").read_text(
            encoding="utf-8"
        )

        # 旧 frontmatter 的第 3 类触发写的是「改 SKU / 调价 / 调库存」，bot 就是照它答的。
        self.assertNotIn("调库存", skill)
        self.assertIn("inventory", skill)
        # 商品表「库存」列的定义必须自带边界说明，不能再是裸的「在售数量」。
        self.assertIn("平台在售挂牌数量", schema)
        self.assertIn("Inventory 库存品", schema)

    def test_store_base_architecture_registers_both_logical_keys(self):
        arch = (ROOT / "shared" / "store-base-architecture.md").read_text(encoding="utf-8")
        for anchor in ("`accessories`", "`accessory_ledger`", "Inventory 库存品", "Inventory Ledger 库存流水"):
            self.assertIn(anchor, arch)


if __name__ == "__main__":
    unittest.main()
