import json
import os
import sqlite3
import sys
from typing import Any, Dict, List, Tuple


def _normalize_cell(x: Any) -> Any:
    if x is None:
        return None
    if isinstance(x, (int, float, str)):
        return x
    return str(x)


def _normalize_rows(rows: List[Tuple[Any, ...]]) -> List[List[Any]]:
    return [[_normalize_cell(c) for c in row] for row in rows]


def _stable_sort_rows(rows: List[List[Any]]) -> List[List[Any]]:
    def key(row: List[Any]) -> Tuple[Any, ...]:
        # None sorts before strings/numbers consistently.
        return tuple("" if v is None else v for v in row)

    return sorted(rows, key=key)


def _print_table(columns: List[str], rows: List[List[Any]]) -> None:
    sys.stdout.write("\t".join(columns) + "\n")
    for r in rows:
        sys.stdout.write("\t".join("" if v is None else str(v) for v in r) + "\n")


def run_tests(mode: str) -> int:
    ws = os.environ.get("CODEMM_WORKDIR", "/workspace")
    solution_path = os.path.join(ws, "solution.sql")
    suite_path = os.path.join(ws, "test_suite.json")

    with open(solution_path, "r", encoding="utf-8") as f:
        user_sql = f.read().strip()

    with open(suite_path, "r", encoding="utf-8") as f:
        suite = json.load(f)

    schema_sql = suite.get("schema_sql", "")
    cases = suite.get("cases", [])
    if not isinstance(schema_sql, str) or not schema_sql.strip():
        raise ValueError("Invalid test suite: missing schema_sql")
    if not isinstance(cases, list) or len(cases) == 0:
        raise ValueError("Invalid test suite: missing cases")

    if mode == "run":
        case = cases[0]
        return _run_single_case(schema_sql, case, user_sql, print_result=True)

    failures = 0
    for case in cases:
        name = str(case.get("name", "")).strip() or "test_case"
        rc = _run_single_case(schema_sql, case, user_sql, print_result=False)
        if rc == 0:
            sys.stdout.write(f"[PASS] {name}\n")
        else:
            sys.stdout.write(f"[FAIL] {name}\n")
            failures += 1
    return 0 if failures == 0 else 1


def _run_single_case(schema_sql: str, case: Dict[str, Any], user_sql: str, print_result: bool) -> int:
    seed_sql = case.get("seed_sql", "")
    expected = case.get("expected", {})
    expected_columns = expected.get("columns", [])
    expected_rows = expected.get("rows", [])
    order_matters = bool(case.get("order_matters", False))

    if not isinstance(seed_sql, str):
        raise ValueError("Invalid case: seed_sql must be string")
    if not isinstance(expected_columns, list) or not isinstance(expected_rows, list):
        raise ValueError("Invalid case: expected must contain columns and rows")

    con = sqlite3.connect(":memory:")
    con.row_factory = sqlite3.Row
    try:
        con.executescript(schema_sql)
        con.executescript(seed_sql)

        cur = con.execute(user_sql)
        cols = [d[0] for d in cur.description] if cur.description else []
        rows_raw = cur.fetchall()
        rows = _normalize_rows([tuple(r) for r in rows_raw])

        if print_result:
            _print_table(cols, rows)
            return 0

        exp_rows_norm = _normalize_rows([tuple(r) for r in expected_rows])
        if not order_matters:
            rows = _stable_sort_rows(rows)
            exp_rows_norm = _stable_sort_rows(exp_rows_norm)

        if cols != expected_columns or rows != exp_rows_norm:
            sys.stderr.write("Expected columns/rows did not match.\n")
            sys.stderr.write("Expected columns: " + repr(expected_columns) + "\n")
            sys.stderr.write("Actual columns: " + repr(cols) + "\n")
            sys.stderr.write("Expected rows: " + repr(exp_rows_norm) + "\n")
            sys.stderr.write("Actual rows: " + repr(rows) + "\n")
            return 1
        return 0
    finally:
        con.close()


def main() -> None:
    mode = os.environ.get("CODEMM_SQL_MODE", "test")
    try:
        rc = run_tests(mode)
        raise SystemExit(rc)
    except Exception as e:
        sys.stderr.write(str(e) + "\n")
        raise SystemExit(1)


if __name__ == "__main__":
    main()

