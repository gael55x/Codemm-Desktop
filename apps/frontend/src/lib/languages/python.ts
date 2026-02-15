export const PYTHON_FILENAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*\.py$/;

export function buildPythonMainTemplate(): string {
  return `import json\nimport sys\nimport traceback\n\nfrom solution import solve\n\n\ndef _parse_stdin() -> object:\n    raw = sys.stdin.read()\n    s = raw.strip()\n    if s == \"\":\n        return None\n    try:\n        return json.loads(s)\n    except Exception:\n        return raw\n\n\ndef main() -> None:\n    data = _parse_stdin()\n    try:\n        if isinstance(data, dict):\n            try:\n                solve(**data)\n            except TypeError:\n                solve(data)\n        elif isinstance(data, (list, tuple)):\n            try:\n                solve(*data)\n            except TypeError:\n                solve(data)\n        else:\n            solve(data)\n    except Exception:\n        traceback.print_exc(file=sys.stderr)\n        raise\n\n\nif __name__ == \"__main__\":\n    main()\n`;
}
