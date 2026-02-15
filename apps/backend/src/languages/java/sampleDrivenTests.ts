import { runJavaCodeOnly } from "./run";

function normalizeNewlines(s: string): string {
  return String(s ?? "").replace(/\r\n/g, "\n");
}

function escapeJavaStringLiteral(value: string): string {
  // Produce a Java string literal body with common escapes.
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/\r/g, "\\r");
}

export async function computeJavaStdoutSamplesByExecutingReference(args: {
  referenceSolution: string;
  stdinSamples: string[];
  maxSamples: number;
}): Promise<{ stdoutSamples: string[] }> {
  const stdin = args.stdinSamples.slice(0, Math.max(0, args.maxSamples));
  const out: string[] = [];

  for (const s of stdin) {
    const res = await runJavaCodeOnly(args.referenceSolution, s);
    const stderr = String(res.stderr ?? "").trim();
    if (stderr) {
      throw new Error(`Reference execution produced stderr (stdin sample): ${stderr.slice(0, 400)}`);
    }
    out.push(normalizeNewlines(String(res.stdout ?? "")).trim());
  }

  return { stdoutSamples: out };
}

export function buildJavaStdinSampleDrivenJUnitTestSuite(args: {
  testClassName: string;
  mainClassName: string;
  cases: Array<{ stdin: string; expectedStdout: string }>;
}): string {
  const testClass = args.testClassName.trim();
  const mainClass = args.mainClassName.trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(testClass)) {
    throw new Error(`Invalid testClassName "${args.testClassName}".`);
  }
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(mainClass)) {
    throw new Error(`Invalid mainClassName "${args.mainClassName}".`);
  }

  const cases = args.cases.slice(0, 8);
  if (cases.length !== 8) {
    throw new Error(`Expected exactly 8 stdin/stdout cases for sample-driven tests; got ${cases.length}.`);
  }

  const tests = cases
    .map((c, idx) => {
      const stdinLit = escapeJavaStringLiteral(normalizeNewlines(c.stdin));
      const expectedLit = escapeJavaStringLiteral(normalizeNewlines(c.expectedStdout));
      const n = idx + 1;
      return `  @Test void test_case_${n}(){ assertEquals("${expectedLit}", runWithStdin("${stdinLit}").trim()); }`;
    })
    .join("\n");

  return `
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import java.io.*;
import java.nio.charset.StandardCharsets;

public class ${testClass} {
  private static String runWithStdin(String stdin) {
    InputStream oldIn = System.in;
    PrintStream oldOut = System.out;
    ByteArrayInputStream in = new ByteArrayInputStream(stdin.getBytes(StandardCharsets.UTF_8));
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    System.setIn(in);
    System.setOut(new PrintStream(out));
    try {
      ${mainClass}.main(new String[0]);
    } finally {
      System.setIn(oldIn);
      System.setOut(oldOut);
    }
    return out.toString();
  }

${tests}
}
`.trim();
}

