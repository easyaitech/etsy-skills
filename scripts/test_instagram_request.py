"""Instagram 请求包装器必须使用运行时租户且不把令牌放进进程参数。"""
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location('instagram_request', Path(__file__).resolve().parents[1] / 'instagram-publish/scripts/request.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class InstagramRequestTests(unittest.TestCase):
    def test_runtime_binding_and_private_token(self):
        env = {'YANGGEDIANZHANG_API_BASE': 'https://example.test', 'YANGGEDIANZHANG_HERMES_TOOL_TOKEN': 'fixture-secret', 'YANGGEDIANZHANG_TENANT_ID': 'tenant-a'}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'input.json'
            path.write_text(json.dumps({'action': 'create', 'idempotencyKey': 'stable-key', 'caption': 'a_b →'}))
            def run(args, **kwargs):
                self.assertNotIn('fixture-secret', ' '.join(args))
                self.assertIn('fixture-secret', kwargs['input'])
                payload = json.loads(Path(args[-1][1:]).read_text())
                self.assertEqual(payload['tenantId'], 'tenant-a')
                self.assertEqual(payload['idempotencyKey'], 'stable-key')
                self.assertEqual(payload['caption'], 'a_b →')
                return SimpleNamespace(stdout='{}', stderr='', returncode=0)
            with patch.dict(os.environ, env), patch('sys.argv', ['request.py', str(path)]), patch.object(module.subprocess, 'run', side_effect=run) as called:
                self.assertEqual(module.main(), 0)
                self.assertEqual(called.call_count, 1)
                path.write_text('{"tenantId":"tenant-b"}')
                with self.assertRaises(SystemExit): module.main()
                self.assertEqual(called.call_count, 1)

if __name__ == '__main__': unittest.main()
