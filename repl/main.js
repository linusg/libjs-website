const inputTemplate = document.getElementById("repl-input-template");
const staticInputTemplate = document.getElementById(
  "repl-static-input-template"
);
const outputTemplate = document.getElementById("repl-output-template");
const inputElement = document.getElementById("input");
const inputTextArea = inputElement.querySelector("textarea");
const outputElement = document.getElementById("repl-contents");

(async function () {
  const repl = await createREPL({
    inputTemplate,
    staticInputTemplate,
    outputTemplate,
    inputElement,
    inputTextArea,
    outputElement,
  });

  repl.display("Ready!");
  inputTextArea.focus();

  const inputToggleButton = document.getElementById("input-toggle");
  const inputEditorTip = document.getElementById("input-editor-tip");
  const inputTip = document.getElementById("input-tip");

  inputToggleButton.addEventListener("click", () => {
    if (inputToggleButton.classList.contains("input-shown")) {
      inputToggleButton.classList.remove("input-shown");
      inputToggleButton.classList.add("input-hidden");
      inputToggleButton.textContent = ">";
      inputElement.style.display = "none";
      inputEditorTip.style.display = "none";
      inputTip.style.display = "";
      repl.allowDirectInput();
    } else {
      inputToggleButton.classList.remove("input-hidden");
      inputToggleButton.classList.add("input-shown");
      inputToggleButton.textContent = "<";
      inputElement.style.display = "";
      inputEditorTip.style.display = "";
      inputTip.style.display = "none";
      repl.prohibitDirectInput();
      inputTextArea.focus();
    }
  });
})();
