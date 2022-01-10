const style = getComputedStyle(document.body);

const TestResult = {
  PASSED: "passed",
  FAILED: "failed",
  SKIPPED: "skipped",
  METADATA_ERROR: "metadata_error",
  HARNESS_ERROR: "harness_error",
  TIMEOUT_ERROR: "timeout_error",
  PROCESS_ERROR: "process_error",
  RUNNER_EXCEPTION: "runner_exception",
  TODO_ERROR: "todo_error",
  DURATION: "duration",
};

const TestResultColors = {
  [TestResult.PASSED]: style.getPropertyValue("--color-chart-passed"),
  [TestResult.FAILED]: style.getPropertyValue("--color-chart-failed"),
  [TestResult.SKIPPED]: style.getPropertyValue("--color-chart-skipped"),
  [TestResult.METADATA_ERROR]: style.getPropertyValue(
    "--color-chart-metadata-error"
  ),
  [TestResult.HARNESS_ERROR]: style.getPropertyValue(
    "--color-chart-harness-error"
  ),
  [TestResult.TIMEOUT_ERROR]: style.getPropertyValue(
    "--color-chart-timeout-error"
  ),
  [TestResult.PROCESS_ERROR]: style.getPropertyValue(
    "--color-chart-process-error"
  ),
  [TestResult.RUNNER_EXCEPTION]: style.getPropertyValue(
    "--color-chart-runner-exception"
  ),
  [TestResult.TODO_ERROR]: style.getPropertyValue("--color-chart-todo-error"),
};

const TestResultLabels = {
  [TestResult.PASSED]: "Passed",
  [TestResult.FAILED]: "Failed",
  [TestResult.SKIPPED]: "Skipped",
  [TestResult.METADATA_ERROR]: "Metadata failed to parse",
  [TestResult.HARNESS_ERROR]: "Harness file failed to parse or run",
  [TestResult.TIMEOUT_ERROR]: "Timed out",
  [TestResult.PROCESS_ERROR]: "Crashed",
  [TestResult.RUNNER_EXCEPTION]: "Unhandled runner exception",
  [TestResult.TODO_ERROR]: "Not yet implemented",
  [TestResult.DURATION]: "Duration (seconds)",
};
